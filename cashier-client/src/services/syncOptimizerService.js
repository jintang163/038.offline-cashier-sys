import pako from 'pako'
import db from '../db/dexie'
import loggerService from './loggerService'

const COMPRESS_THRESHOLD = 1024
const SYNC_SESSION_KEY = 'sync_session_state'

class SyncOptimizerService {
  constructor() {
    this.activeSessions = new Map()
  }

  async compressIfNeeded(data) {
    try {
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
      const originalSize = new Blob([jsonStr]).size

      if (originalSize < COMPRESS_THRESHOLD) {
        return {
          compressed: false,
          payload: data,
          originalSize,
          compressedSize: originalSize,
          ratio: 1,
        }
      }

      const encoder = new TextEncoder()
      const uint8arr = encoder.encode(jsonStr)
      const compressed = pako.gzip(uint8arr)
      const compressedSize = compressed.length

      const base64 = this._uint8ArrayToBase64(compressed)

      loggerService.info('SyncOptimizer', 'Data compressed', {
        originalSize,
        compressedSize,
        ratio: ((compressedSize / originalSize) * 100).toFixed(2) + '%',
      })

      return {
        compressed: true,
        payload: base64,
        originalSize,
        compressedSize,
        ratio: compressedSize / originalSize,
      }
    } catch (error) {
      loggerService.warn('SyncOptimizer', 'Compression failed, falling back to uncompressed', {
        error: error.message,
      })
      return {
        compressed: false,
        payload: data,
        originalSize: 0,
        compressedSize: 0,
        ratio: 1,
      }
    }
  }

  _uint8ArrayToBase64(bytes) {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk)
    }
    return btoa(binary)
  }

  computeDiff(newRecord, oldRecord, fieldsToCheck) {
    if (!oldRecord) {
      return newRecord
    }

    const diff = {}
    let hasChanges = false

    const fields = fieldsToCheck || Object.keys(newRecord)

    for (const field of fields) {
      if (!(field in newRecord)) continue

      const newVal = newRecord[field]
      const oldVal = oldRecord[field]

      if (Array.isArray(newVal) || typeof newVal === 'object') {
        const newStr = JSON.stringify(newVal)
        const oldStr = JSON.stringify(oldVal)
        if (newStr !== oldStr) {
          diff[field] = newVal
          hasChanges = true
        }
      } else if (newVal !== oldVal) {
        diff[field] = newVal
        hasChanges = true
      }
    }

    return hasChanges ? diff : null
  }

  buildIncrementalSyncData(records, { primaryKey = 'id', getOldRecord = null, fieldsToCheck = null } = {}) {
    const incrementalRecords = []
    const unchangedCount = { count: 0 }

    for (const record of records) {
      const oldRecord = getOldRecord
        ? getOldRecord(record[primaryKey])
        : null

      if (oldRecord && fieldsToCheck) {
        const diff = this.computeDiff(record, oldRecord, fieldsToCheck)
        if (diff) {
          incrementalRecords.push({
            [primaryKey]: record[primaryKey],
            ...diff,
            _isPartial: true,
          })
        } else {
          unchangedCount.count++
        }
      } else {
        incrementalRecords.push(record)
      }
    }

    return {
      records: incrementalRecords,
      unchangedCount: unchangedCount.count,
      totalCount: records.length,
    }
  }

  async createSession(sessionType) {
    const sessionId = `${sessionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session = {
      sessionId,
      type: sessionType,
      status: 'active',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      totalRecords: 0,
      processedRecords: 0,
      successRecords: 0,
      failedRecords: 0,
      failedRecordIds: [],
      checkpoint: 0,
      data: {},
    }

    this.activeSessions.set(sessionId, session)
    await this._persistSession(session)

    loggerService.info('SyncOptimizer', `Session created: ${sessionId}`, { type: sessionType })
    return session
  }

  async updateSession(sessionId, updates) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return null

    Object.assign(session, updates, { updatedAt: Date.now() })
    await this._persistSession(session)
    return session
  }

  async markCheckpoint(sessionId, checkpointIndex, processedCount, successCount, failedCount, failedIds = []) {
    return this.updateSession(sessionId, {
      checkpoint: checkpointIndex,
      processedRecords: processedCount,
      successRecords: successCount,
      failedRecords: failedCount,
      failedRecordIds: [...(session?.failedRecordIds || []), ...failedIds],
    })
  }

  async completeSession(sessionId, finalStats = {}) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return null

    session.status = 'completed'
    session.completedAt = Date.now()
    Object.assign(session, finalStats)

    await this._persistSession(session)
    this.activeSessions.delete(sessionId)

    await db.setSetting(`${SYNC_SESSION_KEY}_${sessionId}`, null)
    const sessions = await this._getAllSessions()
    delete sessions[sessionId]
    await db.setSetting(SYNC_SESSION_KEY, JSON.stringify(sessions))

    loggerService.info('SyncOptimizer', `Session completed: ${sessionId}`, {
      duration: session.completedAt - session.startedAt,
      success: session.successRecords,
      failed: session.failedRecords,
    })
    return session
  }

  async failSession(sessionId, error) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return null

    session.status = 'failed'
    session.error = error?.message || String(error)
    session.failedAt = Date.now()

    await this._persistSession(session)
    this.activeSessions.delete(sessionId)

    loggerService.error('SyncOptimizer', `Session failed: ${sessionId}`, {
      error: session.error,
      checkpoint: session.checkpoint,
    })
    return session
  }

  async getResumeableSessions() {
    const sessions = await this._getAllSessions()
    return Object.values(sessions).filter((s) => s.status === 'active' || s.status === 'interrupted')
  }

  async resumeSession(sessionId) {
    const sessions = await this._getAllSessions()
    const session = sessions[sessionId]
    if (!session) return null

    session.status = 'active'
    session.resumedAt = Date.now()
    this.activeSessions.set(sessionId, session)
    await this._persistSession(session)

    loggerService.info('SyncOptimizer', `Session resumed: ${sessionId}`, {
      fromCheckpoint: session.checkpoint,
    })
    return session
  }

  async _persistSession(session) {
    const sessions = await this._getAllSessions()
    sessions[session.sessionId] = session
    await db.setSetting(SYNC_SESSION_KEY, JSON.stringify(sessions))
  }

  async _getAllSessions() {
    try {
      const raw = await db.getSetting(SYNC_SESSION_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      return {}
    }
  }

  async cleanOldSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
    const sessions = await this._getAllSessions()
    const now = Date.now()
    const kept = {}

    for (const [id, session] of Object.entries(sessions)) {
      const age = now - (session.updatedAt || session.startedAt || 0)
      if (age < maxAgeMs) {
        kept[id] = session
      }
    }

    await db.setSetting(SYNC_SESSION_KEY, JSON.stringify(kept))
    const removed = Object.keys(sessions).length - Object.keys(kept).length
    if (removed > 0) {
      loggerService.info('SyncOptimizer', `Cleaned ${removed} old sync sessions`)
    }
  }
}

export default new SyncOptimizerService()

import apiService from '../api/request'

class LoggerService {
  constructor() {
    this.isElectron = !!(window.electronAPI)
    this.pendingLogs = []
    this.deviceNo = this.loadDeviceNo()
    this.uploadTimer = null
    this.pullCheckTimer = null
  }

  loadDeviceNo() {
    let deviceNo = localStorage.getItem('cashier_device_no')
    if (!deviceNo) {
      deviceNo = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      localStorage.setItem('cashier_device_no', deviceNo)
    }
    return deviceNo
  }

  getDeviceNo() {
    return this.deviceNo
  }

  async writeLog(level, module, message, data) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    }
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.logWrite(level, module, message, data)
        if (!result.success) {
          this.consoleFallback(level, module, message, data)
        }
      } else {
        this.consoleFallback(level, module, message, data)
        this.pendingLogs.push(logData)
        if (this.pendingLogs.length > 1000) {
          this.pendingLogs = this.pendingLogs.slice(-500)
        }
      }
    } catch (e) {
      this.consoleFallback(level, module, message, data)
    }
  }

  consoleFallback(level, module, message, data) {
    const prefix = `[${new Date().toISOString()}] [${level}] [${module}]`
    const logFn = {
      DEBUG: console.debug,
      INFO: console.info,
      WARN: console.warn,
      ERROR: console.error,
    }[level] || console.log
    if (data !== undefined) {
      logFn(prefix, message, data)
    } else {
      logFn(prefix, message)
    }
  }

  debug(module, message, data) {
    return this.writeLog('DEBUG', module, message, data)
  }

  info(module, message, data) {
    return this.writeLog('INFO', module, message, data)
  }

  warn(module, message, data) {
    return this.writeLog('WARN', module, message, data)
  }

  error(module, message, data) {
    return this.writeLog('ERROR', module, message, data)
  }

  async getLogDir() {
    if (this.isElectron) {
      const result = await window.electronAPI.logGetDir()
      return result.success ? result.data : null
    }
    return null
  }

  async listLogFiles() {
    if (this.isElectron) {
      const result = await window.electronAPI.logListFiles()
      return result.success ? result.data : []
    }
    return []
  }

  async readLogFile(fileName, limit = 1000) {
    if (this.isElectron) {
      const result = await window.electronAPI.logReadFile(fileName, limit)
      return result.success ? result.data : ''
    }
    return ''
  }

  async compressLogFile(fileName) {
    if (this.isElectron) {
      const result = await window.electronAPI.logCompressFile(fileName)
      return result.success ? result.data : null
    }
    return null
  }

  async compressLogsByDate(dateStr) {
    if (this.isElectron) {
      const result = await window.electronAPI.logCompressDate(dateStr)
      return result.success ? result.data : null
    }
    return null
  }

  async deleteLogFile(fileName) {
    if (this.isElectron) {
      const result = await window.electronAPI.logDeleteFile(fileName)
      return result.success ? result.data : false
    }
    return false
  }

  async cleanupOldLogs(daysToKeep = 30) {
    if (this.isElectron) {
      const result = await window.electronAPI.logCleanupOld(daysToKeep)
      return result.success ? result.data : 0
    }
    return 0
  }

  async uploadLogsForDate(dateStr) {
    try {
      this.info('LoggerService', 'Starting log upload', { date: dateStr })

      const logType = 'ALL'
      const createResult = await apiService.createLogUploadRecord(this.deviceNo, dateStr, logType)
      if (!createResult || !createResult.data) {
        throw new Error('Failed to create upload record')
      }
      const uploadRecord = createResult.data
      const uploadNo = uploadRecord.uploadNo

      const compressed = await this.compressLogsByDate(dateStr)
      if (!compressed) {
        this.warn('LoggerService', 'No log file found for date', { date: dateStr })
        return null
      }

      const uploadResult = await this.uploadLogFile(uploadNo, compressed.path)
      return uploadResult
    } catch (error) {
      this.error('LoggerService', 'Log upload failed', { date: dateStr, error: error.message })
      throw error
    }
  }

  async uploadLogFile(uploadNo, filePath) {
    try {
      if (this.isElectron) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
        const token = localStorage.getItem('token') || ''
        const result = await window.electronAPI.logUpload(uploadNo, filePath, apiBaseUrl, token)
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }
        return result.data
      } else {
        throw new Error('Log upload only supported in Electron environment')
      }
    } catch (error) {
      this.error('LoggerService', 'Upload log file failed', { uploadNo, error: error.message })
      throw error
    }
  }

  async uploadTodayLogs() {
    const today = new Date().toISOString().split('T')[0]
    return await this.uploadLogsForDate(today)
  }

  async uploadYesterdayLogs() {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    return await this.uploadLogsForDate(yesterday)
  }

  async checkPendingPullRequests() {
    try {
      const result = await apiService.getPendingPullLogs(this.deviceNo)
      if (result && result.data && result.data.length > 0) {
        this.info('LoggerService', 'Found pending log pull requests', { count: result.data.length })
        for (const pullRequest of result.data) {
          try {
            await apiService.updateLogPullStatus(pullRequest.uploadNo, 2, null)
            const dateStr = pullRequest.logDate
            if (typeof dateStr === 'string' && dateStr.includes('T')) {
              dateStr = dateStr.split('T')[0]
            }
            await this.uploadLogsForDate(dateStr)
            await apiService.updateLogPullStatus(pullRequest.uploadNo, 3, null)
            this.info('LoggerService', 'Log pull request completed', { uploadNo: pullRequest.uploadNo })
          } catch (error) {
            this.error('LoggerService', 'Log pull request failed', { uploadNo: pullRequest.uploadNo, error: error.message })
            await apiService.updateLogPullStatus(pullRequest.uploadNo, 4, error.message)
          }
        }
      }
    } catch (error) {
      this.error('LoggerService', 'Check pending pull requests failed', { error: error.message })
    }
  }

  startAutoUpload() {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer)
    }
    this.uploadTimer = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 2 && now.getMinutes() < 10) {
        this.uploadYesterdayLogs().catch(err => {
          this.error('LoggerService', 'Auto upload failed', err)
        })
      }
    }, 5 * 60 * 1000)

    if (this.pullCheckTimer) {
      clearInterval(this.pullCheckTimer)
    }
    this.pullCheckTimer = setInterval(() => {
      this.checkPendingPullRequests()
    }, 60 * 1000)

    this.info('LoggerService', 'Auto upload started')
  }

  stopAutoUpload() {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer)
      this.uploadTimer = null
    }
    if (this.pullCheckTimer) {
      clearInterval(this.pullCheckTimer)
      this.pullCheckTimer = null
    }
    this.info('LoggerService', 'Auto upload stopped')
  }
}

export default new LoggerService()

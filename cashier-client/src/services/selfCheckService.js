import loggerService from './loggerService'
import apiService from '../api/request'
import db from '../db/dexie'

class SelfCheckService {
  constructor() {
    this.isElectron = !!(window.electronAPI)
    this.checkTimer = null
    this.listeners = new Set()
    this.lastCheckResult = null
  }

  subscribe(callback) {
    this.listeners.add(callback)
    if (this.lastCheckResult) {
      callback(this.lastCheckResult)
    }
    return () => this.listeners.delete(callback)
  }

  notifyListeners(result) {
    this.lastCheckResult = result
    this.listeners.forEach((listener) => {
      try {
        listener(result)
      } catch (e) {
        console.error('SelfCheck listener error:', e)
      }
    })
  }

  async checkNetwork() {
    const result = {
      status: 1,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      latency: null,
      speed: null,
      error: null,
    }

    if (!result.isOnline) {
      result.status = 0
      result.error = '网络断开连接'
      return result
    }

    try {
      const startTime = Date.now()
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
      const pingURL = baseURL + '/device/heartbeat'

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(pingURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceNo: loggerService.getDeviceNo() }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      result.latency = Date.now() - startTime
      result.status = response.ok ? 1 : 0
      if (!response.ok) {
        result.error = `服务器响应异常: HTTP ${response.status}`
      }

      if (navigator.connection) {
        result.speed = navigator.connection.effectiveType
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        result.status = 0
        result.error = '网络连接超时'
      } else {
        result.status = 0
        result.error = error.message
      }
    }

    return result
  }

  async checkPrinter() {
    const result = {
      status: 1,
      printerName: null,
      online: false,
      error: null,
      printers: [],
    }

    try {
      const settings = JSON.parse(localStorage.getItem('printerSettings') || '{}')
      result.printerName = settings.defaultPrinter || '默认打印机'

      let printers = []
      try {
        printers = await db.getPrinters() || []
      } catch (e) {
        loggerService.warn('SelfCheckService', 'Failed to get printers from db', { error: e.message })
      }

      if (printers.length === 0) {
        result.status = 3
        result.error = '未配置任何打印机'
        result.online = false
        loggerService.warn('SelfCheckService', 'Printer check failed: no printers configured')
        return result
      }

      let totalStatus = 1
      let hasError = false
      const printerDetails = []

      for (const printer of printers) {
        const printerStatus = {
          id: printer.id,
          printerCode: printer.printer_code,
          printerName: printer.printer_name,
          connectionType: printer.connection_type,
          status: 1,
          error: null,
        }

        try {
          if (this.isElectron && window.electronAPI?.checkPrinterStatus) {
            const checkResult = await window.electronAPI.checkPrinterStatus(printer)
            if (checkResult && checkResult.success && checkResult.data) {
              printerStatus.status = checkResult.data.status
              printerStatus.error = checkResult.data.error
            }
          } else {
            printerStatus.status = printer.status === 1 ? 1 : 3
            printerStatus.error = printer.status !== 1 ? '打印机已禁用' : null
          }
        } catch (e) {
          printerStatus.status = 3
          printerStatus.error = e.message
        }

        if (printerStatus.status === 0) {
          totalStatus = Math.max(totalStatus, 0)
          hasError = true
        } else if (printerStatus.status === 3) {
          totalStatus = Math.max(totalStatus, 3)
          hasError = true
        } else if (printerStatus.status === 2) {
          if (totalStatus !== 0 && totalStatus !== 3) {
            totalStatus = 2
          }
        }

        printerDetails.push(printerStatus)
      }

      result.printers = printerDetails
      result.status = totalStatus
      result.online = !hasError

      const activePrinters = printerDetails.filter(p => p.status === 1 || p.status === 2)
      if (activePrinters.length > 0) {
        result.printerName = activePrinters[0].printerName
      }

      if (hasError) {
        const errorMsgs = printerDetails
          .filter(p => p.status === 0 || p.status === 3)
          .map(p => `${p.printerName || p.printerCode}: ${p.error || '状态异常'}`)
        result.error = errorMsgs.join('; ')
        loggerService.warn('SelfCheckService', 'Printer check found issues', {
          total: printers.length,
          online: activePrinters.length,
          errors: errorMsgs,
        })
      } else {
        loggerService.info('SelfCheckService', 'Printer check passed', {
          total: printers.length,
          online: activePrinters.length,
        })
      }
    } catch (error) {
      result.status = 3
      result.error = error.message
      result.online = false
      loggerService.error('SelfCheckService', 'Printer check exception', { error: error.message })
    }

    return result
  }

  async checkStorage() {
    const result = {
      status: 0,
      total: 0,
      used: 0,
      free: 0,
      usageRate: 0,
      error: null,
    }

    if (this.isElectron) {
      try {
        const diskResult = await window.electronAPI.getDiskInfo()
        if (diskResult.success) {
          const disk = diskResult.data
          result.total = disk.total || 0
          result.used = disk.used || 0
          result.free = disk.free || 0
          result.usageRate = disk.usageRate || 0
          result.status = disk.status || 0
        } else {
          result.error = diskResult.error
          result.status = 3
        }
      } catch (error) {
        result.error = error.message
        result.status = 3
      }
    } else {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate()
          result.total = estimate.quota || 0
          result.used = estimate.usage || 0
          result.free = result.total - result.used
          result.usageRate = result.total > 0 ? (result.used / result.total * 100).toFixed(2) : 0
          if (result.usageRate >= 90) {
            result.status = 2
          } else if (result.usageRate >= 75) {
            result.status = 1
          } else {
            result.status = 0
          }
        }
      } catch (error) {
        result.error = error.message
        result.status = 3
      }
    }

    return result
  }

  async runFullCheck() {
    loggerService.info('SelfCheckService', 'Starting full self-check')

    const [networkResult, printerResult, storageResult] = await Promise.all([
      this.checkNetwork(),
      this.checkPrinter(),
      this.checkStorage(),
    ])

    let overallStatus = 2
    const errors = []

    if (networkResult.status === 0) {
      overallStatus = 3
      errors.push('网络异常: ' + (networkResult.error || '无法连接'))
    }

    if (printerResult.status === 2 || printerResult.status === 3) {
      if (overallStatus !== 3) {
        overallStatus = 3
      }
      errors.push('打印机异常: ' + (printerResult.error || '状态异常'))
    }

    if (storageResult.status === 2) {
      if (overallStatus !== 3) {
        overallStatus = 3
      }
      errors.push('存储空间不足')
    } else if (storageResult.status === 1) {
      if (overallStatus === 2) {
        overallStatus = 3
      }
      errors.push('存储空间告警')
    }

    const checkResult = {
      deviceNo: loggerService.getDeviceNo(),
      checkType: 'FULL',
      checkStatus: overallStatus,
      checkTime: new Date().toISOString(),
      network: networkResult,
      printer: printerResult,
      storage: storageResult,
      errors,
      errorDetails: JSON.stringify({
        network: networkResult,
        printer: printerResult,
        storage: storageResult,
      }),
    }

    try {
      await apiService.saveSelfCheckLog({
        deviceNo: checkResult.deviceNo,
        checkType: checkResult.checkType,
        checkStatus: checkResult.checkStatus,
        networkStatus: networkResult.status,
        networkLatency: networkResult.latency,
        networkSpeed: networkResult.speed,
        printerStatus: printerResult.status,
        printerName: printerResult.printerName,
        printerError: printerResult.error,
        storageTotal: storageResult.total,
        storageUsed: storageResult.used,
        storageFree: storageResult.free,
        storageUsageRate: storageResult.usageRate,
        storageStatus: storageResult.status,
        errorDetails: checkResult.errorDetails,
      })
      loggerService.info('SelfCheckService', 'Self-check log saved', { status: overallStatus })
    } catch (error) {
      loggerService.warn('SelfCheckService', 'Failed to save self-check log', { error: error.message })
    }

    this.notifyListeners(checkResult)
    return checkResult
  }

  startAutoCheck(intervalMs = 5 * 60 * 1000) {
    this.stopAutoCheck()
    this.runFullCheck()
    this.checkTimer = setInterval(() => {
      this.runFullCheck()
    }, intervalMs)
    loggerService.info('SelfCheckService', 'Auto self-check started', { intervalMs })
  }

  stopAutoCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
      loggerService.info('SelfCheckService', 'Auto self-check stopped')
    }
  }

  hasAbnormalities(checkResult) {
    const result = checkResult || this.lastCheckResult
    if (!result) return false
    return result.checkStatus === 3
  }

  getAbnormalMessage(checkResult) {
    const result = checkResult || this.lastCheckResult
    if (!result || !result.errors || result.errors.length === 0) {
      return null
    }
    return result.errors.join('\n')
  }
}

export default new SelfCheckService()

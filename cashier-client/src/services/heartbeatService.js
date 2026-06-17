import loggerService from './loggerService'
import apiService from '../api/request'

class HeartbeatService {
  constructor() {
    this.isElectron = !!(window.electronAPI)
    this.heartbeatTimer = null
    this.deviceInfo = null
    this.ipAddress = null
    this.lastHeartbeatTime = null
    this.listeners = new Set()
    this.isRunning = false
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners(status) {
    this.listeners.forEach((listener) => {
      try {
        listener(status)
      } catch (e) {
        console.error('Heartbeat listener error:', e)
      }
    })
  }

  async getDeviceInfo() {
    if (this.deviceInfo) {
      return this.deviceInfo
    }

    const info = {
      deviceNo: loggerService.getDeviceNo(),
      deviceName: '收银终端',
      deviceType: 'cashier',
      deviceModel: 'PC-Desktop',
      osType: 'Unknown',
      osVersion: '',
      appVersion: '1.0.0',
      macAddress: '',
      location: '',
    }

    try {
      if (this.isElectron) {
        const platform = await window.electronAPI.getPlatform()
        const version = await window.electronAPI.getAppVersion()
        info.osType = platform || info.osType
        info.appVersion = version || info.appVersion

        const sysInfo = await window.electronAPI.getSystemInfo()
        if (sysInfo && sysInfo.success && sysInfo.data) {
          const sys = sysInfo.data
          info.deviceModel = sys.cpuModel || info.deviceModel
          info.osVersion = sys.release || info.osVersion
          if (sys.networkInterfaces && sys.networkInterfaces.length > 0) {
            info.macAddress = sys.networkInterfaces[0].mac || ''
            info.ipAddress = sys.networkInterfaces[0].address || ''
          }
          info.deviceName = sys.hostname || info.deviceName
        }
      } else {
        info.osType = navigator.platform || info.osType
        info.appVersion = navigator.userAgent || info.appVersion
      }
    } catch (error) {
      loggerService.warn('HeartbeatService', 'Failed to get device info', { error: error.message })
    }

    const savedDeviceName = localStorage.getItem('device_name')
    if (savedDeviceName) {
      info.deviceName = savedDeviceName
    }

    this.deviceInfo = info
    return info
  }

  async getIpAddress() {
    if (this.ipAddress) {
      return this.ipAddress
    }
    try {
      if (this.isElectron) {
        const sysInfo = await window.electronAPI.getSystemInfo()
        if (sysInfo && sysInfo.success && sysInfo.data && sysInfo.data.networkInterfaces) {
          const iface = sysInfo.data.networkInterfaces.find(i => i.address && i.address !== '127.0.0.1')
          if (iface) {
            this.ipAddress = iface.address
          }
        }
      }
    } catch (error) {
      loggerService.warn('HeartbeatService', 'Failed to get IP address', { error: error.message })
    }
    return this.ipAddress || '127.0.0.1'
  }

  async sendHeartbeat() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!isOnline) {
      loggerService.warn('HeartbeatService', 'Heartbeat skipped: network offline')
      this.notifyListeners({
        success: false,
        lastHeartbeat: this.lastHeartbeatTime ? this.lastHeartbeatTime.toISOString() : null,
        offline: true,
        error: '网络离线，心跳未发送',
      })
      return false
    }

    try {
      const deviceInfo = await this.getDeviceInfo()
      const ipAddress = await this.getIpAddress()

      const result = await apiService.deviceHeartbeat({
        deviceNo: deviceInfo.deviceNo,
        ipAddress,
        deviceInfo,
      })

      this.lastHeartbeatTime = new Date()
      this.notifyListeners({
        success: true,
        lastHeartbeat: this.lastHeartbeatTime.toISOString(),
        offline: false,
        serverResponse: result?.data || null,
      })

      loggerService.debug('HeartbeatService', 'Heartbeat sent successfully', { timestamp: this.lastHeartbeatTime.toISOString() })
      return true
    } catch (error) {
      this.notifyListeners({
        success: false,
        lastHeartbeat: this.lastHeartbeatTime ? this.lastHeartbeatTime.toISOString() : null,
        offline: false,
        error: error.message,
      })
      loggerService.warn('HeartbeatService', 'Heartbeat failed', { error: error.message })
      return false
    }
  }

  async start(intervalMs = 30 * 1000) {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    loggerService.info('HeartbeatService', 'Starting heartbeat service', { intervalMs })

    await this.sendHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, intervalMs)
  }

  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.isRunning = false
    loggerService.info('HeartbeatService', 'Heartbeat service stopped')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      deviceNo: loggerService.getDeviceNo(),
      lastHeartbeat: this.lastHeartbeatTime ? this.lastHeartbeatTime.toISOString() : null,
    }
  }

  async registerDevice() {
    try {
      const deviceInfo = await this.getDeviceInfo()
      const result = await apiService.registerDevice({
        deviceNo: deviceInfo.deviceNo,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        deviceInfo: JSON.stringify(deviceInfo),
      })
      loggerService.info('HeartbeatService', 'Device registered successfully')
      return result
    } catch (error) {
      loggerService.warn('HeartbeatService', 'Device registration failed', { error: error.message })
      throw error
    }
  }
}

export default new HeartbeatService()

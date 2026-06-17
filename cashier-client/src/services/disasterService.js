import api from '../api/request'
import db from '../db/dexie'
import { setToken, setUserInfo, getToken } from '../utils/auth'
import { message } from 'antd'
import QRCode from 'qrcode'

const DEVICE_ID_KEY = 'cashier_device_id'
const DEVICE_INFO_KEY = 'cashier_device_info'
const DISASTER_MODE_KEY = 'cashier_disaster_mode'
const DISASTER_TOKEN_KEY = 'cashier_disaster_token'
const HEARTBEAT_INTERVAL = 30 * 1000

class DisasterService {
  constructor() {
    this.heartbeatTimer = null
    this.mainDeviceMonitorTimer = null
    this.listeners = new Map()
  }

  generateDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase()
      const timestamp = Date.now().toString(36).toUpperCase()
      deviceId = 'DEV-' + timestamp + '-' + randomStr
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  }

  getDeviceInfo() {
    const cached = localStorage.getItem(DEVICE_INFO_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch (e) {}
    }

    const info = {
      deviceNo: this.generateDeviceId(),
      deviceType: this.detectDeviceType(),
      osType: this.detectOS(),
      osVersion: navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || 'Unknown',
      appVersion: process.env.REACT_APP_VERSION || '1.0.0',
      deviceModel: navigator.platform || 'Unknown',
      userAgent: navigator.userAgent,
    }

    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info))
    return info
  }

  detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('ipad') || ua.includes('tablet')) {
      return 'backup'
    }
    if (ua.includes('mobile') || ua.includes('phone')) {
      return 'tablet'
    }
    if (ua.includes('electron') || ua.includes('windows') || ua.includes('mac')) {
      return 'cashier'
    }
    return 'tablet'
  }

  detectOS() {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('windows')) return 'Windows'
    if (ua.includes('mac')) return 'macOS'
    if (ua.includes('ipad') || ua.includes('iphone')) return 'iOS'
    if (ua.includes('android')) return 'Android'
    if (ua.includes('linux')) return 'Linux'
    return 'Unknown'
  }

  async registerCurrentDevice(customDeviceName = null) {
    const deviceInfo = this.getDeviceInfo()
    try {
      const response = await api.registerDevice({
        deviceNo: deviceInfo.deviceNo,
        deviceName: customDeviceName || this.getDefaultDeviceName(),
        deviceType: deviceInfo.deviceType,
        deviceInfo: JSON.stringify(deviceInfo),
      })
      return response.data
    } catch (error) {
      console.warn('注册设备失败:', error)
      return {
        id: Date.now(),
        deviceNo: deviceInfo.deviceNo,
        deviceName: customDeviceName || this.getDefaultDeviceName(),
        deviceType: deviceInfo.deviceType,
        deviceStatus: 3,
      }
    }
  }

  getDefaultDeviceName() {
    const type = this.detectDeviceType()
    if (type === 'cashier') return '主收银机'
    if (type === 'backup') return '备用iPad-' + this.generateDeviceId().slice(-4)
    return '平板设备-' + this.generateDeviceId().slice(-4)
  }

  async createDisasterToken(dataHours = 1, syncScope = null) {
    const deviceInfo = this.getDeviceInfo()
    try {
      const response = await api.createDisasterToken({
        dataHours,
        syncScope,
        deviceNo: deviceInfo.deviceNo,
      })

      const result = response.data
      if (result?.qrcodeContent) {
        const qrcodeImage = await this.generateQrcodeImage(result.qrcodeContent)
        result.qrcodeImage = qrcodeImage
      }
      return result
    } catch (error) {
      console.error('生成灾备Token失败:', error)
      throw error
    }
  }

  async generateQrcodeImage(content) {
    try {
      return await QRCode.toDataURL(content, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1677ff',
          light: '#ffffff',
        },
      })
    } catch (e) {
      console.warn('生成二维码图片失败:', e)
      return ''
    }
  }

  async verifyDisasterToken(token) {
    const deviceInfo = this.getDeviceInfo()
    try {
      const response = await api.verifyDisasterToken(token, deviceInfo.deviceNo)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async useDisasterToken(token) {
    const deviceInfo = this.getDeviceInfo()
    try {
      const response = await api.useDisasterToken({
        token,
        deviceNo: deviceInfo.deviceNo,
        deviceInfo: JSON.stringify(deviceInfo),
      })

      const result = response.data
      if (result?.token && result?.userInfo) {
        setToken(result.token)
        setUserInfo(result.userInfo)
        this.enterDisasterMode(result)
        message.success('灾备登录成功，正在同步数据...')
      }
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  enterDisasterMode(disasterInfo) {
    localStorage.setItem(
      DISASTER_MODE_KEY,
      JSON.stringify({
        active: true,
        drToken: disasterInfo.drToken,
        mainDeviceId: disasterInfo.mainDeviceId,
        mainDeviceNo: disasterInfo.mainDeviceNo,
        dataHours: disasterInfo.dataHours,
        syncScope: disasterInfo.syncScope,
        startTime: new Date().toISOString(),
        deviceInfo: disasterInfo.deviceInfo,
      })
    )
    if (disasterInfo.drToken) {
      localStorage.setItem(DISASTER_TOKEN_KEY, disasterInfo.drToken)
    }
    this.emit('disasterModeChange', true)
    this.startHeartbeat()
    this.startMainDeviceMonitor()
  }

  exitDisasterMode() {
    localStorage.removeItem(DISASTER_MODE_KEY)
    localStorage.removeItem(DISASTER_TOKEN_KEY)
    this.emit('disasterModeChange', false)
    this.stopHeartbeat()
    this.stopMainDeviceMonitor()
  }

  isDisasterMode() {
    try {
      const mode = localStorage.getItem(DISASTER_MODE_KEY)
      return mode ? JSON.parse(mode).active === true : false
    } catch (e) {
      return false
    }
  }

  getDisasterModeInfo() {
    try {
      const mode = localStorage.getItem(DISASTER_MODE_KEY)
      return mode ? JSON.parse(mode) : null
    } catch (e) {
      return null
    }
  }

  getDisasterToken() {
    return localStorage.getItem(DISASTER_TOKEN_KEY) || ''
  }

  async syncDisasterData(token, dataHours) {
    const drToken = token || this.getDisasterToken()
    if (!drToken) {
      throw new Error('灾备Token不存在')
    }

    try {
      const response = await api.getDisasterRecoveryData(drToken, dataHours)
      const data = response.data
      await this.importRecoveryData(data)
      return { success: true, data }
    } catch (error) {
      console.error('同步灾备数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  async importRecoveryData(data) {
    const batchSize = 100

    try {
      if (data.products && data.products.length > 0) {
        const products = data.products.map((p) => ({
          ...p,
          sync_status: 1,
          updated_at: data.sync_time || new Date().toISOString(),
        }))
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize)
          await db.products.bulkPut(batch)
        }
      }

      if (data.stocks && data.stocks.length > 0) {
        const stocks = data.stocks.map((s) => ({
          ...s,
          sync_status: 1,
          updated_at: data.sync_time || new Date().toISOString(),
        }))
        for (let i = 0; i < stocks.length; i += batchSize) {
          const batch = stocks.slice(i, i + batchSize)
          await db.product_stocks.bulkPut(batch)
        }
      }

      if (data.orders && data.orders.length > 0) {
        for (const order of data.orders) {
          let items = []
          try {
            if (order.itemsJson) {
              items = JSON.parse(order.itemsJson)
            }
          } catch (e) {
            items = []
          }

          const orderData = {
            id: order.id,
            order_no: order.orderNo,
            erp_order_id: order.erpOrderId,
            order_type: order.orderType || 1,
            total_amount: order.orderAmount,
            pay_amount: order.payAmount,
            discount_amount: order.discountAmount,
            pay_status: order.payStatus,
            pay_type: order.payType,
            buyer_name: order.buyerName,
            buyer_phone: order.buyerPhone,
            item_count: order.itemCount,
            remark: order.remark,
            sync_status: 1,
            sync_time: data.sync_time,
            created_at: order.createTime,
            items: items,
          }

          const existing = await db.orders.get(order.id)
          if (!existing) {
            await db.orders.put(orderData)
            for (const item of items) {
              await db.order_items.put({
                ...item,
                order_id: order.id,
                order_no: order.orderNo,
              })
            }
          }
        }
      }

      if (data.refund_orders && data.refund_orders.length > 0) {
        for (const refund of data.refund_orders) {
          let items = []
          try {
            if (refund.itemsJson) {
              items = JSON.parse(refund.itemsJson)
            }
          } catch (e) {
            items = []
          }

          const existing = await db.refund_orders.get(refund.id)
          if (!existing) {
            const refundId = await db.refund_orders.put({
              id: refund.id,
              refund_no: refund.refundNo,
              order_id: refund.orderId,
              order_no: refund.orderNo,
              refund_type: refund.refundType,
              refund_amount: refund.refundAmount,
              original_pay_amount: refund.originalPayAmount,
              refund_reason: refund.refundReason,
              audit_status: refund.auditStatus,
              sync_status: 1,
              erp_push_status: 0,
              created_at: refund.createTime,
              items: items,
            })
            for (const item of items) {
              await db.refund_order_items.put({
                ...item,
                refund_order_id: refund.id || refundId,
                refund_no: refund.refundNo,
              })
            }
          }
        }
      }

      if (data.payments && data.payments.length > 0) {
        for (let i = 0; i < data.payments.length; i += batchSize) {
          const batch = data.payments.slice(i, i + batchSize).map((p) => ({
            id: p.id,
            order_id: p.orderId,
            order_no: p.orderNo,
            pay_method: p.payMethod,
            pay_amount: p.payAmount,
            transaction_id: p.transactionId,
            pay_status: p.payStatus,
            pay_time: p.payTime,
          }))
          await db.order_payments.bulkPut(batch)
        }
      }

      await db.setSetting('lastDisasterSyncTime', new Date().toISOString())
      message.success(`灾备数据同步完成，共恢复：订单 ${data.orders?.length || 0} 单，商品 ${data.products?.length || 0} 个`)
      return true
    } catch (error) {
      console.error('导入灾备数据失败:', error)
      throw error
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    const deviceInfo = this.getDeviceInfo()
    const sendHeartbeat = async () => {
      try {
        await api.disasterHeartbeat({
          deviceNo: deviceInfo.deviceNo,
          ipAddress: this.getLocalIp(),
        })
        this.emit('heartbeat', { success: true, timestamp: Date.now() })
      } catch (e) {
        this.emit('heartbeat', { success: false, error: e.message, timestamp: Date.now() })
      }
    }
    sendHeartbeat()
    this.heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  startMainDeviceMonitor() {
    if (this.mainDeviceMonitorTimer) {
      clearInterval(this.mainDeviceMonitorTimer)
    }
    const checkMainDevice = async () => {
      try {
        const response = await api.getMainDevice()
        const mainDevice = response.data
        if (mainDevice) {
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          const lastHeartbeat = mainDevice.lastHeartbeat ? new Date(mainDevice.lastHeartbeat).getTime() : 0
          const isOnline = mainDevice.deviceStatus === 1 && lastHeartbeat > fiveMinutesAgo
          this.emit('mainDeviceStatusChange', {
            device: mainDevice,
            isOnline,
            lastHeartbeat,
          })
        }
      } catch (e) {
        this.emit('mainDeviceStatusChange', {
          device: null,
          isOnline: false,
          error: e.message,
        })
      }
    }
    checkMainDevice()
    this.mainDeviceMonitorTimer = setInterval(checkMainDevice, 60 * 1000)
  }

  stopMainDeviceMonitor() {
    if (this.mainDeviceMonitorTimer) {
      clearInterval(this.mainDeviceMonitorTimer)
      this.mainDeviceMonitorTimer = null
    }
  }

  getLocalIp() {
    try {
      const hostname = window.location.hostname
      if (hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return hostname
      }
    } catch (e) {}
    return '127.0.0.1'
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Event ${event} listener error:`, e)
        }
      })
    }
  }

  destroy() {
    this.stopHeartbeat()
    this.stopMainDeviceMonitor()
    this.listeners.clear()
  }
}

export default new DisasterService()

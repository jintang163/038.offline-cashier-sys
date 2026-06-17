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

  async syncDisasterData(token, dataHours, onProgress) {
    const drToken = token || this.getDisasterToken()
    if (!drToken) {
      throw new Error('灾备Token不存在')
    }

    if (onProgress) onProgress(10)

    const verified = await this.verifyDisasterToken(drToken)
    const mainDeviceIp = verified?.data?.mainDevice?.ipAddress || verified?.data?.mainDevice?.ip_address

    if (onProgress) onProgress(20)

    let recoveryData = null
    let source = 'cloud'

    try {
      const result = await this._syncFromCloud(drToken, dataHours)
      recoveryData = result.data
      source = 'cloud'
    } catch (cloudError) {
      console.warn('云端同步失败，尝试局域网同步:', cloudError.message)

      if (mainDeviceIp && mainDeviceIp !== '127.0.0.1' && mainDeviceIp !== 'localhost') {
        try {
          recoveryData = await this._syncFromLocalNetwork(mainDeviceIp, drToken, dataHours)
          source = 'lan'
        } catch (lanError) {
          console.error('局域网同步也失败:', lanError.message)
          return {
            success: false,
            error: `云端同步失败: ${cloudError.message}，局域网同步失败: ${lanError.message}`,
          }
        }
      } else {
        return { success: false, error: cloudError.message }
      }
    }

    if (onProgress) onProgress(50)

    if (!recoveryData) {
      return { success: false, error: '未获取到灾备数据' }
    }

    await this.importRecoveryData(recoveryData, onProgress)

    return { success: true, data: recoveryData, source }
  }

  async _syncFromCloud(token, dataHours) {
    return await api.getDisasterRecoveryData(token, dataHours)
  }

  async _syncFromLocalNetwork(mainDeviceIp, token, dataHours) {
    const originalBaseURL = api.baseURL
    const lanBaseURL = `http://${mainDeviceIp}:8080`

    try {
      const response = await fetch(`${lanBaseURL}/api/disaster/data?token=${encodeURIComponent(token)}&dataHours=${dataHours || 1}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()
      if (json.code === 200 || json.success) {
        return json.data
      }
      throw new Error(json.message || '局域网同步失败')
    } finally {
    }
  }

  async importRecoveryData(data, onProgress) {
    const batchSize = 100
    let processedCount = 0
    const totalItems = (data.products?.length || 0) + (data.orders?.length || 0) +
      (data.refund_orders?.length || 0) + (data.payments?.length || 0)

    const updateProgress = () => {
      if (onProgress && totalItems > 0) {
        const progress = Math.min(95, 50 + Math.floor((processedCount / totalItems) * 45))
        onProgress(progress)
      }
    }

    try {
      if (data.products && data.products.length > 0) {
        const stockMap = {}
        if (data.stocks && data.stocks.length > 0) {
          for (const s of data.stocks) {
            const productId = s.productId || s.product_id || s.id
            if (productId) {
              stockMap[productId] = s.stock ?? s.availableQty ?? s.available_qty ?? 0
            }
          }
        }

        const products = data.products.map((p) => ({
          id: p.id,
          erp_goods_id: p.erpGoodsId || p.erp_goods_id || '',
          product_name: p.productName || p.product_name || p.name || '',
          category_id: p.categoryId || p.category_id || 0,
          category_name: p.categoryName || p.category_name || '',
          barcode: p.barcode || '',
          price: p.price ?? 0,
          original_price: p.originalPrice ?? p.price ?? 0,
          unit: p.unit || '',
          image: p.image || '',
          description: p.description || '',
          stock: stockMap[p.id] ?? stockMap[p.erpGoodsId] ?? p.stock ?? 0,
          status: p.status ?? 1,
          sort: p.sort ?? 0,
          created_at: p.createdAt || p.createTime || p.created_at || new Date().toISOString(),
          updated_at: data.syncTime || data.sync_time || new Date().toISOString(),
          sync_status: 1,
        }))

        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize)
          await db.products.bulkPut(batch)
          processedCount += batch.length
          updateProgress()
        }
      }

      if (data.categories && data.categories.length > 0) {
        const categories = data.categories.map((c) => ({
          id: c.id,
          name: c.name || c.categoryName || '',
          sort: c.sort ?? 0,
          status: c.status ?? 1,
          created_at: c.createdAt || c.createTime || new Date().toISOString(),
          updated_at: data.syncTime || data.sync_time || new Date().toISOString(),
        }))
        for (let i = 0; i < categories.length; i += batchSize) {
          await db.categories.bulkPut(categories.slice(i, i + batchSize))
        }
      }

      if (data.orders && data.orders.length > 0) {
        for (const order of data.orders) {
          let items = []
          try {
            if (order.itemsJson) {
              items = JSON.parse(order.itemsJson)
            } else if (order.items && Array.isArray(order.items)) {
              items = order.items
            }
          } catch (e) {
            items = []
          }

          const orderStatus = order.orderStatus ?? order.order_status ?? 2
          const payStatus = order.payStatus ?? order.pay_status ?? (orderStatus === 2 ? 1 : 0)

          const orderData = {
            id: order.id,
            order_no: order.orderNo || order.order_no || '',
            erp_order_id: order.erpOrderId || order.erp_order_id || '',
            total_amount: order.totalAmount ?? order.total_amount ?? order.orderAmount ?? 0,
            discount_amount: order.discountAmount ?? order.discount_amount ?? 0,
            pay_amount: order.payAmount ?? order.pay_amount ?? 0,
            pay_type: order.payType ?? order.pay_type ?? order.pay_method ?? 1,
            pay_status: payStatus,
            order_status: orderStatus,
            sync_status: 1,
            sync_attempts: 0,
            sync_error: '',
            cashier_id: order.cashierId || order.cashier_id || 0,
            cashier_name: order.cashierName || order.cashier_name || '',
            member_id: order.memberId || order.member_id || 0,
            member_name: order.memberName || order.member_name || '',
            remark: order.remark || '',
            created_at: order.createdAt || order.createTime || order.created_at || new Date().toISOString(),
            synced_at: data.syncTime || data.sync_time || new Date().toISOString(),
          }

          const existing = await db.orders.get(order.id)
          if (!existing) {
            await db.orders.put(orderData)
            processedCount++
            updateProgress()

            if (items.length > 0) {
              for (const item of items) {
                await db.order_items.put({
                  id: item.id,
                  order_id: order.id,
                  product_id: item.productId || item.product_id || item.id || 0,
                  erp_goods_id: item.erpGoodsId || item.erp_goods_id || '',
                  product_name: item.productName || item.product_name || item.name || '',
                  barcode: item.barcode || '',
                  image: item.image || '',
                  price: item.price ?? 0,
                  quantity: item.quantity ?? item.qty ?? 1,
                  subtotal: item.subtotal ?? (item.price || 0) * (item.quantity || item.qty || 1),
                  total_amount: item.totalAmount ?? item.total_amount ?? item.subtotal ?? 0,
                  discount_amount: item.discountAmount ?? item.discount_amount ?? 0,
                  pay_amount: item.payAmount ?? item.pay_amount ?? item.subtotal ?? 0,
                  category_id: item.categoryId || item.category_id || 0,
                  created_at: item.createdAt || order.createdAt || new Date().toISOString(),
                })
              }
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
            } else if (refund.items && Array.isArray(refund.items)) {
              items = refund.items
            }
          } catch (e) {
            items = []
          }

          const existing = await db.refund_orders.get(refund.id)
          if (!existing) {
            const refundId = await db.refund_orders.put({
              id: refund.id,
              refund_no: refund.refundNo || refund.refund_no || '',
              erp_refund_id: refund.erpRefundId || refund.erp_refund_id || '',
              order_id: refund.orderId || refund.order_id || 0,
              order_no: refund.orderNo || refund.order_no || '',
              erp_order_id: refund.erpOrderId || refund.erp_order_id || '',
              refund_type: refund.refundType ?? refund.refund_type ?? 1,
              refund_amount: refund.refundAmount ?? refund.refund_amount ?? 0,
              original_pay_amount: refund.originalPayAmount ?? refund.original_pay_amount ?? 0,
              refund_reason: refund.refundReason || refund.refund_reason || '',
              audit_status: refund.auditStatus ?? refund.audit_status ?? 0,
              auditor_id: refund.auditorId || refund.auditor_id || 0,
              auditor_name: refund.auditorName || refund.auditor_name || '',
              audit_time: refund.auditTime || refund.audit_time || null,
              audit_remark: refund.auditRemark || refund.audit_remark || '',
              sync_status: 1,
              sync_attempts: 0,
              sync_error: '',
              sync_time: data.syncTime || data.sync_time || new Date().toISOString(),
              erp_push_status: refund.erpPushStatus ?? refund.erp_push_status ?? 0,
              erp_push_error: '',
              erp_push_time: null,
              cashier_id: refund.cashierId || refund.cashier_id || 0,
              cashier_name: refund.cashierName || refund.cashier_name || '',
              manager_id: refund.managerId || refund.manager_id || 0,
              manager_name: refund.managerName || refund.manager_name || '',
              remark: refund.remark || '',
              created_at: refund.createdAt || refund.createTime || refund.created_at || new Date().toISOString(),
              updated_at: refund.updatedAt || refund.updateTime || new Date().toISOString(),
            })
            processedCount++
            updateProgress()

            for (const item of items) {
              await db.refund_order_items.put({
                id: item.id,
                refund_order_id: refund.id || refundId,
                refund_no: refund.refundNo || refund.refund_no || '',
                order_item_id: item.orderItemId || item.order_item_id || 0,
                product_id: item.productId || item.product_id || item.id || 0,
                erp_goods_id: item.erpGoodsId || item.erp_goods_id || '',
                product_name: item.productName || item.product_name || item.name || '',
                barcode: item.barcode || '',
                image: item.image || '',
                price: item.price ?? 0,
                original_quantity: item.originalQuantity ?? item.original_quantity ?? item.quantity ?? 1,
                refund_quantity: item.refundQuantity ?? item.refund_quantity ?? item.quantity ?? 1,
                original_amount: item.originalAmount ?? item.original_amount ?? (item.price || 0) * (item.originalQuantity || item.quantity || 1),
                refund_amount: item.refundAmount ?? item.refund_amount ?? (item.price || 0) * (item.refundQuantity || item.quantity || 1),
                discount_amount: item.discountAmount ?? item.discount_amount ?? 0,
                remark: item.remark || '',
                created_at: item.createdAt || refund.createdAt || new Date().toISOString(),
              })
            }
          }
        }
      }

      if (data.payments && data.payments.length > 0) {
        const payments = data.payments.map((p) => ({
          id: p.id,
          order_id: p.orderId || p.order_id || 0,
          payment_no: p.paymentNo || p.payment_no || '',
          pay_type: p.payType ?? p.pay_type ?? p.pay_method ?? 1,
          pay_amount: p.payAmount ?? p.pay_amount ?? 0,
          pay_status: p.payStatus ?? p.pay_status ?? 1,
          pay_time: p.payTime || p.pay_time || null,
          transaction_id: p.transactionId || p.transaction_id || '',
          created_at: p.createdAt || p.createTime || new Date().toISOString(),
        }))

        for (let i = 0; i < payments.length; i += batchSize) {
          const batch = payments.slice(i, i + batchSize)
          await db.order_payments.bulkPut(batch)
          processedCount += batch.length
          updateProgress()
        }
      }

      if (onProgress) onProgress(100)

      await db.setSetting('lastDisasterSyncTime', new Date().toISOString())
      message.success(`灾备数据同步完成，共恢复：订单 ${data.orders?.length || 0} 单，商品 ${data.products?.length || 0} 个`)
      return true
    } catch (error) {
      console.error('导入灾备数据失败:', error)
      message.error('数据导入失败: ' + error.message)
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

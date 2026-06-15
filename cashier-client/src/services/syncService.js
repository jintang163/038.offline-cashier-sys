import db from '../db/dexie'
import api from '../api/request'

class SyncService {
  constructor() {
    this.syncing = false
    this.listeners = new Map()
    this.autoSyncEnabled = true
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.off(event, callback)
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
          console.error('Sync event listener error:', e)
        }
      })
    }
  }

  isSyncing() {
    return this.syncing
  }

  async syncProducts() {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    this.emit('syncStart', { type: 'products' })
    this.emit('statusChange', { type: 'products', status: 'syncing' })

    try {
      const lastSyncTime = await db.getSetting('lastProductSyncTime')
      const params = lastSyncTime ? { updated_since: lastSyncTime } : {}

      const response = await api.getProducts({ ...params, pageSize: 1000 })
      const products = response.data?.items || response.data || []

      if (products.length > 0) {
        await db.bulkUpsertProducts(products)
      }

      const categoryResponse = await api.getCategories()
      const categories = categoryResponse.data || []
      if (categories.length > 0) {
        await db.bulkUpsertCategories(categories)
      }

      await db.setSetting('lastProductSyncTime', new Date().toISOString())
      await db.addSyncRecord('products', 'success', { count: products.length })

      this.emit('syncComplete', { type: 'products', success: true, count: products.length })
      this.emit('statusChange', { type: 'products', status: 'success' })

      return { success: true, count: products.length }
    } catch (error) {
      await db.addSyncRecord('products', 'failed', { error: error.message })
      this.emit('syncComplete', { type: 'products', success: false, error: error.message })
      this.emit('statusChange', { type: 'products', status: 'failed', error: error.message })
      throw error
    }
  }

  async syncOrders(orderIds = null) {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    this.emit('syncStart', { type: 'orders' })
    this.emit('statusChange', { type: 'orders', status: 'syncing' })

    try {
      let ordersToSync = []

      if (orderIds && orderIds.length > 0) {
        for (const id of orderIds) {
          const order = await db.getOrderById(id)
          if (order && order.sync_status !== 1) {
            ordersToSync.push(order)
          }
        }
      } else {
        ordersToSync = await db.getUnsyncedOrders()
        const failedOrders = await db.getFailedOrders()
        ordersToSync = [...ordersToSync, ...failedOrders]
      }

      const results = { success: 0, failed: 0, errors: [] }

      for (const order of ordersToSync) {
        try {
          const orderData = {
            order_no: order.order_no,
            total_amount: order.total_amount,
            discount_amount: order.discount_amount || 0,
            pay_amount: order.pay_amount,
            pay_type: order.pay_type,
            cashier_id: order.cashier_id,
            cashier_name: order.cashier_name,
            status: order.status,
            items: order.items || [],
            created_at: order.created_at,
          }

          await api.createOrder(orderData)
          await db.updateOrderSyncStatus(order.id, 1)
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push({ orderId: order.id, orderNo: order.order_no, error: error.message })
          await db.updateOrderSyncStatus(order.id, 2, error.message)
        }
      }

      await db.setSetting('lastOrderSyncTime', new Date().toISOString())
      await db.addSyncRecord('orders', results.failed > 0 ? 'partial' : 'success', results)

      this.emit('syncComplete', { type: 'orders', success: results.failed === 0, results })
      this.emit('statusChange', {
        type: 'orders',
        status: results.failed === 0 ? 'success' : 'partial',
        results,
      })

      return results
    } catch (error) {
      await db.addSyncRecord('orders', 'failed', { error: error.message })
      this.emit('syncComplete', { type: 'orders', success: false, error: error.message })
      this.emit('statusChange', { type: 'orders', status: 'failed', error: error.message })
      throw error
    }
  }

  async syncAll() {
    if (this.syncing) {
      return { success: false, message: '正在同步中，请稍后再试' }
    }

    this.syncing = true
    this.emit('allSyncStart')

    try {
      const productResult = await this.syncProducts().catch((e) => ({
        success: false,
        error: e.message,
      }))
      const orderResult = await this.syncOrders().catch((e) => ({
        success: false,
        error: e.message,
        success: 0,
        failed: 0,
      }))

      return {
        success: true,
        products: productResult,
        orders: orderResult,
      }
    } finally {
      this.syncing = false
      this.emit('allSyncComplete')
    }
  }

  async retryFailedOrder(orderId) {
    return this.syncOrders([orderId])
  }

  async retryAllFailedOrders() {
    const failedOrders = await db.getFailedOrders()
    const orderIds = failedOrders.map((o) => o.id)
    return this.syncOrders(orderIds)
  }

  async getSyncStatus() {
    const unsyncedCount = await db.getUnsyncedOrderCount()
    const failedCount = await (async () => {
      const failed = await db.getFailedOrders()
      return failed.length
    })()
    const lastProductSyncTime = await db.getSetting('lastProductSyncTime')
    const lastOrderSyncTime = await db.getSetting('lastOrderSyncTime')

    return {
      unsyncedOrderCount: unsyncedCount,
      failedOrderCount: failedCount,
      lastProductSyncTime,
      lastOrderSyncTime,
      isOnline: navigator.onLine,
      isSyncing: this.syncing,
    }
  }

  setAutoSyncEnabled(enabled) {
    this.autoSyncEnabled = enabled
  }

  isAutoSyncEnabled() {
    return this.autoSyncEnabled
  }

  async handleNetworkRestore() {
    if (this.autoSyncEnabled && navigator.onLine) {
      try {
        await this.syncAll()
      } catch (error) {
        console.error('Auto sync failed:', error)
      }
    }
  }
}

const syncService = new SyncService()
export default syncService

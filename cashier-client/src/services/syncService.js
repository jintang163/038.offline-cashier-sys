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
      const params = lastSyncTime ? { updateTime: lastSyncTime } : {}

      const response = await api.getProductSyncList({ ...params, status: 1 })
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

  async syncSalesSummaries() {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    this.emit('syncStart', { type: 'salesSummaries' })
    this.emit('statusChange', { type: 'salesSummaries', status: 'syncing' })

    try {
      const summariesToSync = await db.getUnsyncedSalesSummaries(100)

      if (summariesToSync.length === 0) {
        this.emit('syncComplete', { type: 'salesSummaries', success: true, count: 0 })
        this.emit('statusChange', { type: 'salesSummaries', status: 'success' })
        return { success: true, count: 0 }
      }

      const results = { success: 0, failed: 0, errors: [] }

      const batchSize = 50
      for (let i = 0; i < summariesToSync.length; i += batchSize) {
        const batch = summariesToSync.slice(i, i + batchSize)
        
        try {
          await api.post('/order/sales-summary', batch)
          
          for (const summary of batch) {
            await db.updateSalesSummarySyncStatus(summary.id, 1)
            results.success++
          }
        } catch (error) {
          for (const summary of batch) {
            results.failed++
            results.errors.push({ id: summary.id, error: error.message })
            await db.updateSalesSummarySyncStatus(summary.id, 2, error.message)
          }
        }
      }

      await db.setSetting('lastSalesSummarySyncTime', new Date().toISOString())
      await db.addSyncRecord('salesSummaries', results.failed > 0 ? 'partial' : 'success', results)

      this.emit('syncComplete', { type: 'salesSummaries', success: results.failed === 0, results })
      this.emit('statusChange', {
        type: 'salesSummaries',
        status: results.failed === 0 ? 'success' : 'partial',
        results,
      })

      return results
    } catch (error) {
      await db.addSyncRecord('salesSummaries', 'failed', { error: error.message })
      this.emit('syncComplete', { type: 'salesSummaries', success: false, error: error.message })
      this.emit('statusChange', { type: 'salesSummaries', status: 'failed', error: error.message })
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

      if (ordersToSync.length === 0) {
        this.emit('syncComplete', { type: 'orders', success: true, count: 0 })
        this.emit('statusChange', { type: 'orders', status: 'success' })
        return { success: true, count: 0 }
      }

      const results = { success: 0, failed: 0, errors: [] }

      const batchSize = 20
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        const batch = ordersToSync.slice(i, i + batchSize)
        
        try {
          const orderDataList = batch.map((order) => ({
            order_no: order.order_no,
            erp_order_id: order.erp_order_id,
            total_amount: order.total_amount,
            discount_amount: order.discount_amount || 0,
            pay_amount: order.pay_amount,
            pay_type: order.pay_type,
            pay_status: order.pay_status ?? 1,
            order_status: order.order_status ?? 2,
            cashier_id: order.cashier_id,
            cashier_name: order.cashier_name,
            member_id: order.member_id,
            member_name: order.member_name,
            remark: order.remark,
            created_at: order.created_at,
            items: (order.items || []).map((item) => ({
              product_id: item.product_id,
              erp_goods_id: item.erp_goods_id,
              product_name: item.product_name,
              barcode: item.barcode,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.subtotal,
              total_amount: item.total_amount || item.subtotal,
              discount_amount: item.discount_amount || 0,
              pay_amount: item.pay_amount || item.subtotal,
            })),
            payments: (order.payments || []).map((payment) => ({
              payment_no: payment.payment_no,
              pay_type: payment.pay_type,
              pay_amount: payment.pay_amount || payment.amount,
              pay_status: payment.pay_status ?? 1,
              pay_time: payment.pay_time,
              transaction_id: payment.transaction_id,
            })),
            sync_status: order.sync_status,
            sync_attempts: order.sync_attempts || 0,
            sync_error: order.sync_error,
          }))

          const response = await api.batchSyncOrders(orderDataList)
          const result = response.data || {}
          
          const failOrderMap = new Map()
          if (result.failOrders) {
            result.failOrders.forEach((fail) => {
              failOrderMap.set(fail.order_no, fail.error)
            })
          }

          for (const order of batch) {
            if (failOrderMap.has(order.order_no)) {
              results.failed++
              const error = failOrderMap.get(order.order_no)
              results.errors.push({ orderId: order.id, orderNo: order.order_no, error })
              await db.updateOrderSyncStatus(order.id, 2, error)
            } else {
              await db.updateOrderSyncStatus(order.id, 1)
              results.success++
            }
          }
        } catch (error) {
          for (const order of batch) {
            results.failed++
            results.errors.push({ orderId: order.id, orderNo: order.order_no, error: error.message })
            await db.updateOrderSyncStatus(order.id, 2, error.message)
          }
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

  async syncMembers() {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    this.emit('syncStart', { type: 'members' })
    this.emit('statusChange', { type: 'members', status: 'syncing' })

    try {
      const lastSyncTime = await db.getSetting('lastMemberSyncTime')
      const params = lastSyncTime ? { updateTime: lastSyncTime } : {}

      const memberResponse = await api.getMemberSyncList({ ...params, status: 1 })
      const members = memberResponse.data?.items || memberResponse.data || []

      if (members.length > 0) {
        await db.bulkUpsertMembers(members)
      }

      const levelResponse = await api.getMemberLevels()
      const levels = levelResponse.data || []
      if (levels.length > 0) {
        await db.bulkUpsertMemberLevels(levels)
      }

      const ruleResponse = await api.getPointRules()
      const rules = ruleResponse.data || []
      if (rules.length > 0) {
        await db.bulkUpsertPointRules(rules)
      }

      const allMemberIds = members.map((m) => m.id).filter(Boolean)
      for (let i = 0; i < allMemberIds.length; i += 50) {
        const batchIds = allMemberIds.slice(i, i + 50)
        for (const mid of batchIds) {
          try {
            const cardRes = await api.getMemberCards(mid)
            if (cardRes?.data?.length) {
              await db.bulkUpsertMemberCards(cardRes.data)
            }
          } catch (e) {
            console.warn(`Failed to sync cards for member ${mid}:`, e)
          }
        }
      }

      await db.setSetting('lastMemberSyncTime', new Date().toISOString())
      await db.addSyncRecord('members', 'success', { count: members.length })

      this.emit('syncComplete', { type: 'members', success: true, count: members.length })
      this.emit('statusChange', { type: 'members', status: 'success' })

      return { success: true, count: members.length, levels: levels.length, rules: rules.length }
    } catch (error) {
      await db.addSyncRecord('members', 'failed', { error: error.message })
      this.emit('syncComplete', { type: 'members', success: false, error: error.message })
      this.emit('statusChange', { type: 'members', status: 'failed', error: error.message })
      throw error
    }
  }

  async syncPointRecords() {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    this.emit('syncStart', { type: 'pointRecords' })
    this.emit('statusChange', { type: 'pointRecords', status: 'syncing' })

    try {
      const recordsToSync = await db.getUnsyncedPointRecords(200)

      if (recordsToSync.length === 0) {
        this.emit('syncComplete', { type: 'pointRecords', success: true, count: 0 })
        this.emit('statusChange', { type: 'pointRecords', status: 'success' })
        return { success: true, count: 0 }
      }

      const results = { success: 0, failed: 0, errors: [] }
      const batchSize = 50

      for (let i = 0; i < recordsToSync.length; i += batchSize) {
        const batch = recordsToSync.slice(i, i + batchSize)

        const batchData = batch.map((r) => ({
          record_no: r.record_no,
          member_id: r.member_id,
          phone: r.phone,
          change_type: r.change_type,
          change_points: r.change_points,
          before_points: r.before_points,
          after_points: r.after_points,
          order_no: r.order_no,
          source_type: r.source_type,
          remark: r.remark,
          cashier_id: r.cashier_id,
          created_at: r.created_at,
          sync_attempts: r.sync_attempts || 0,
          sync_error: r.sync_error,
        }))

        try {
          const response = await api.batchSyncPointRecords(batchData)
          const result = response.data || {}

          const failRecordMap = new Map()
          if (result.failRecords) {
            result.failRecords.forEach((fail) => {
              failRecordMap.set(fail.record_no, fail.error)
            })
          }

          for (const record of batch) {
            if (failRecordMap.has(record.record_no)) {
              results.failed++
              const error = failRecordMap.get(record.record_no)
              results.errors.push({ id: record.id, recordNo: record.record_no, error })
              await db.updatePointRecordSyncStatus(record.id, 2, error)
            } else {
              await db.updatePointRecordSyncStatus(record.id, 1)
              results.success++
            }
          }
        } catch (error) {
          for (const record of batch) {
            results.failed++
            results.errors.push({ id: record.id, recordNo: record.record_no, error: error.message })
            await db.updatePointRecordSyncStatus(record.id, 2, error.message)
          }
        }
      }

      await db.setSetting('lastPointRecordSyncTime', new Date().toISOString())
      await db.addSyncRecord('pointRecords', results.failed > 0 ? 'partial' : 'success', results)

      this.emit('syncComplete', { type: 'pointRecords', success: results.failed === 0, results })
      this.emit('statusChange', {
        type: 'pointRecords',
        status: results.failed === 0 ? 'success' : 'partial',
        results,
      })

      return results
    } catch (error) {
      await db.addSyncRecord('pointRecords', 'failed', { error: error.message })
      this.emit('syncComplete', { type: 'pointRecords', success: false, error: error.message })
      this.emit('statusChange', { type: 'pointRecords', status: 'failed', error: error.message })
      throw error
    }
  }

  async fullSync() {
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

      const memberResult = await this.syncMembers().catch((e) => ({
        success: false,
        error: e.message,
        count: 0,
      }))
      
      const salesSummaryResult = await this.syncSalesSummaries().catch((e) => ({
        success: false,
        error: e.message,
        success: 0,
        failed: 0,
      }))
      
      const orderResult = await this.syncOrders().catch((e) => ({
        success: false,
        error: e.message,
        success: 0,
        failed: 0,
      }))

      const pointRecordResult = await this.syncPointRecords().catch((e) => ({
        success: false,
        error: e.message,
        success: 0,
        failed: 0,
      }))

      return {
        success: true,
        products: productResult,
        members: memberResult,
        salesSummaries: salesSummaryResult,
        orders: orderResult,
        pointRecords: pointRecordResult,
      }
    } finally {
      this.syncing = false
      this.emit('allSyncComplete')
    }
  }

  async syncAll() {
    return this.fullSync()
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
    const lastSalesSummarySyncTime = await db.getSetting('lastSalesSummarySyncTime')

    return {
      unsyncedOrderCount: unsyncedCount,
      failedOrderCount: failedCount,
      lastProductSyncTime,
      lastOrderSyncTime,
      lastSalesSummarySyncTime,
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
        await this.fullSync()
      } catch (error) {
        console.error('Auto sync failed:', error)
      }
    }
  }
}

const syncService = new SyncService()
export default syncService

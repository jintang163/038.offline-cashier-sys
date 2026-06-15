import Dexie from 'dexie'

const db = new Dexie('CashierCacheDB')

db.version(4).stores({
  products: '++id, erp_goods_id, product_name, category_id, category_name, barcode, price, original_price, unit, image, description, stock, status, sort, created_at, updated_at',
  categories: '++id, name, sort, status, created_at, updated_at',
  orders: '++id, order_no, erp_order_id, total_amount, discount_amount, pay_amount, pay_type, pay_status, order_status, sync_status, sync_attempts, sync_error, cashier_id, cashier_name, member_id, member_name, remark, created_at, synced_at',
  order_items: '++id, order_id, product_id, erp_goods_id, product_name, barcode, image, price, quantity, subtotal, total_amount, discount_amount, pay_amount, created_at',
  order_payments: '++id, order_id, payment_no, pay_type, pay_amount, pay_status, pay_time, transaction_id, created_at',
  sales_summary: '++id, erp_goods_id, product_name, quantity, total_amount, order_date, sync_status, created_at',
  offlineQueue: '++id, action, status, retry_count, created_at',
  settings: 'key',
  syncRecords: '++id, type, status, created_at',
})

class DexieCache {
  constructor() {
    this.initialized = false
  }

  async initDexieCache() {
    if (this.initialized) {
      return
    }
    
    try {
      await this.syncFromSQLite()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize Dexie cache:', error)
      throw error
    }
  }

  async syncFromSQLite() {
    if (!window.electronAPI?.sqliteExec) {
      console.warn('electronAPI not available, skipping SQLite sync')
      return
    }

    try {
      const [products, categories, orders, orderItems, orderPayments, salesSummaries, settings] = await Promise.all([
        window.electronAPI.sqliteExec('getAllProducts'),
        window.electronAPI.sqliteExec('getAllCategories'),
        window.electronAPI.sqliteExec('getAllOrders'),
        window.electronAPI.sqliteExec('getAllOrderItems'),
        window.electronAPI.sqliteExec('getAllOrderPayments'),
        window.electronAPI.sqliteExec('getSalesSummaryByDate'),
        window.electronAPI.sqliteExec('getAllSettings'),
      ])

      await db.transaction('rw', db.products, db.categories, db.orders, db.order_items, db.order_payments, db.sales_summary, db.settings, async () => {
        await db.products.clear()
        await db.categories.clear()
        await db.orders.clear()
        await db.order_items.clear()
        await db.order_payments.clear()
        await db.sales_summary.clear()
        await db.settings.clear()

        if (products.success && products.data) {
          await db.products.bulkAdd(products.data)
        }
        if (categories.success && categories.data) {
          await db.categories.bulkAdd(categories.data)
        }
        if (orders.success && orders.data) {
          await db.orders.bulkAdd(orders.data)
        }
        if (orderItems.success && orderItems.data) {
          await db.order_items.bulkAdd(orderItems.data)
        }
        if (orderPayments.success && orderPayments.data) {
          await db.order_payments.bulkAdd(orderPayments.data)
        }
        if (salesSummaries.success && salesSummaries.data) {
          await db.sales_summary.bulkAdd(salesSummaries.data)
        }
        if (settings.success && settings.data) {
          const settingsArray = Object.entries(settings.data).map(([key, value]) => ({ key, value }))
          await db.settings.bulkAdd(settingsArray)
        }
      })
    } catch (error) {
      console.error('Failed to sync from SQLite:', error)
      throw error
    }
  }

  async execSQLite(method, ...params) {
    if (!window.electronAPI?.sqliteExec) {
      throw new Error('electronAPI not available')
    }
    
    const result = await window.electronAPI.sqliteExec(method, ...params)
    
    if (!result.success) {
      throw new Error(result.error || `SQLite execution failed: ${method}`)
    }
    
    return result.data
  }

  async getProducts(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', categoryId = null } = params
    
    try {
      const data = await this.execSQLite('getProducts', params)
      await this._cacheProducts(data.items)
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getProducts:', error)
      return this._getProductsFromCache(params)
    }
  }

  async _getProductsFromCache(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', categoryId = null } = params
    let collection = db.products.where('status').equals(1)

    if (categoryId) {
      collection = collection.and((p) => p.category_id === categoryId)
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      collection = collection.and(
        (p) =>
          p.product_name.toLowerCase().includes(lowerKeyword) ||
          p.barcode?.toLowerCase().includes(lowerKeyword)
      )
    }

    const items = await collection
      .reverse()
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()

    let total
    if (keyword || categoryId) {
      total = (await collection.toArray()).length
    } else {
      total = await db.products.where('status').equals(1).count()
    }

    return { items, total, page, pageSize }
  }

  async _cacheProducts(products) {
    if (!products || products.length === 0) return
    
    for (const product of products) {
      const existing = await db.products.get(product.id)
      if (existing) {
        await db.products.update(product.id, product)
      } else {
        await db.products.add(product)
      }
    }
  }

  async getProductById(id) {
    try {
      const data = await this.execSQLite('getProductById', id)
      if (data) {
        await this._cacheProducts([data])
      }
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getProductById:', error)
      return await db.products.get(id)
    }
  }

  async getProductByBarcode(barcode) {
    try {
      const data = await this.execSQLite('getProductByBarcode', barcode)
      if (data) {
        await this._cacheProducts([data])
      }
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getProductByBarcode:', error)
      return await db.products.where('barcode').equals(barcode).first()
    }
  }

  async addProduct(product) {
    const data = await this.execSQLite('addProduct', product)
    await this._cacheProducts([data])
    return data
  }

  async updateProduct(id, product) {
    const data = await this.execSQLite('updateProduct', id, product)
    await this._cacheProducts([data])
    return data
  }

  async deleteProduct(id) {
    const result = await this.execSQLite('deleteProduct', id)
    if (result) {
      await db.products.update(id, { status: 0 })
    }
    return result
  }

  async getCategories() {
    try {
      const data = await this.execSQLite('getCategories')
      await this._cacheCategories(data)
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getCategories:', error)
      return this._getCategoriesFromCache()
    }
  }

  async _getCategoriesFromCache() {
    return await db.categories
      .where('status')
      .equals(1)
      .sortBy('sort')
  }

  async _cacheCategories(categories) {
    if (!categories || categories.length === 0) return
    
    for (const category of categories) {
      const existing = await db.categories.get(category.id)
      if (existing) {
        await db.categories.update(category.id, category)
      } else {
        await db.categories.add(category)
      }
    }
  }

  async addCategory(name, sort = 0) {
    const data = await this.execSQLite('addCategory', name, sort)
    await this._cacheCategories([data])
    return data
  }

  async updateCategory(id, name, sort) {
    const data = await this.execSQLite('updateCategory', id, name, sort)
    await this._cacheCategories([data])
    return data
  }

  async deleteCategory(id) {
    const result = await this.execSQLite('deleteCategory', id)
    if (result) {
      await db.categories.update(id, { status: 0 })
    }
    return result
  }

  async getOrders(params = {}) {
    try {
      const data = await this.execSQLite('getOrders', params)
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getOrders:', error)
      return this._getOrdersFromCache(params)
    }
  }

  async _getOrdersFromCache(params = {}) {
    const { page = 1, pageSize = 20, startDate, endDate, keyword = '' } = params
    let collection = db.orders.orderBy('id').reverse()

    if (startDate) {
      collection = collection.filter((o) => o.created_at >= startDate)
    }
    if (endDate) {
      collection = collection.filter((o) => o.created_at <= endDate)
    }
    if (keyword) {
      collection = collection.filter((o) => o.order_no.includes(keyword))
    }

    const allItems = await collection.toArray()
    const items = allItems.slice((page - 1) * pageSize, page * pageSize)

    return { items, total: allItems.length, page, pageSize }
  }

  async getOrderById(id) {
    try {
      const data = await this.execSQLite('getOrderById', id)
      return data
    } catch (error) {
      console.warn('Falling back to Dexie cache for getOrderById:', error)
      return this._getOrderByIdFromCache(id)
    }
  }

  async _getOrderByIdFromCache(id) {
    const order = await db.orders.get(id)
    if (order) {
      order.items = await db.orderItems.where('order_id').equals(id).toArray()
      order.payments = await db.orderPayments.where('order_id').equals(id).toArray()
    }
    return order
  }

  async createOrder(orderData) {
    const data = await this.execSQLite('createOrder', orderData)
    await this.syncFromSQLite()
    return data
  }

  async getOrdersWithItemsAndPayments(syncStatus = 0) {
    return await this.execSQLite('getOrdersWithItemsAndPayments', syncStatus)
  }

  async getUnsyncedOrders() {
    return await this.execSQLite('getUnsyncedOrders')
  }

  async getFailedOrders() {
    return await this.execSQLite('getFailedOrders')
  }

  async updateOrderSyncStatus(orderId, syncStatus, syncError = null) {
    const result = await this.execSQLite('updateOrderSyncStatus', orderId, syncStatus, syncError)
    if (result) {
      const updateData = {
        sync_status: syncStatus,
        sync_error: syncError,
      }
      if (syncStatus === 1) {
        updateData.synced_at = new Date().toISOString()
      }
      await db.orders.update(orderId, updateData)
    }
    return result
  }

  async getUnsyncedOrderCount() {
    try {
      return await this.execSQLite('getUnsyncedOrderCount')
    } catch (error) {
      console.warn('Falling back to Dexie cache for getUnsyncedOrderCount:', error)
      return await db.orders.where('sync_status').equals(0).count()
    }
  }

  async addSalesSummary(summary) {
    return await this.execSQLite('addSalesSummary', summary)
  }

  async addSalesSummaries(summaries) {
    return await this.execSQLite('addSalesSummaries', summaries)
  }

  async getUnsyncedSalesSummaries(limit = 100) {
    return await this.execSQLite('getUnsyncedSalesSummaries', limit)
  }

  async updateSalesSummarySyncStatus(id, status, error = null) {
    return await this.execSQLite('updateSalesSummarySyncStatus', id, status, error)
  }

  async getSalesSummaryByDate(startDate, endDate) {
    try {
      return await this.execSQLite('getSalesSummaryByDate', startDate, endDate)
    } catch (error) {
      console.warn('Falling back to Dexie cache for getSalesSummaryByDate:', error)
      return this._getSalesSummaryByDateFromCache(startDate, endDate)
    }
  }

  async _getSalesSummaryByDateFromCache(startDate, endDate) {
    let collection = db.sales_summary.orderBy('order_date').reverse()
    
    if (startDate) {
      collection = collection.filter((s) => s.order_date >= startDate)
    }
    if (endDate) {
      collection = collection.filter((s) => s.order_date <= endDate)
    }
    
    return await collection.toArray()
  }

  async getOfflineQueue(status = 0) {
    try {
      return await this.execSQLite('getOfflineQueue', status)
    } catch (error) {
      console.warn('Falling back to Dexie cache for getOfflineQueue:', error)
      return await db.offlineQueue.where('status').equals(status).sortBy('id')
    }
  }

  async addOfflineQueue(action, data) {
    return await this.execSQLite('addOfflineQueue', action, data)
  }

  async updateOfflineQueueStatus(id, status, error = null) {
    return await this.execSQLite('updateOfflineQueueStatus', id, status, error)
  }

  async getSetting(key) {
    try {
      return await this.execSQLite('getSetting', key)
    } catch (error) {
      console.warn('Falling back to Dexie cache for getSetting:', error)
      const item = await db.settings.get(key)
      return item ? item.value : null
    }
  }

  async setSetting(key, value) {
    const result = await this.execSQLite('setSetting', key, value)
    if (result) {
      await db.settings.put({ key, value, updated_at: new Date().toISOString() })
    }
    return result
  }

  async getAllSettings() {
    try {
      return await this.execSQLite('getAllSettings')
    } catch (error) {
      console.warn('Falling back to Dexie cache for getAllSettings:', error)
      const items = await db.settings.toArray()
      const result = {}
      items.forEach((item) => {
        result[item.key] = item.value
      })
      return result
    }
  }

  async bulkUpsertProducts(products) {
    const result = await this.execSQLite('bulkUpsertProducts', products)
    await this.syncFromSQLite()
    return result
  }

  async bulkUpsertCategories(categories) {
    const result = await this.execSQLite('bulkUpsertCategories', categories)
    await this.syncFromSQLite()
    return result
  }

  async bulkInsertProducts(products) {
    return this.bulkUpsertProducts(products)
  }

  async bulkInsertCategories(categories) {
    return this.bulkUpsertCategories(categories)
  }

  async addSyncRecord(type, status, details = null) {
    return await db.syncRecords.add({
      type,
      status,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString(),
    })
  }

  async getSyncRecords(limit = 20) {
    const records = await db.syncRecords.orderBy('id').reverse().limit(limit).toArray()
    return records.map((r) => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    }))
  }

  async clearAll() {
    await db.products.clear()
    await db.categories.clear()
    await db.orders.clear()
    await db.order_items.clear()
    await db.order_payments.clear()
    await db.sales_summary.clear()
    await db.offlineQueue.clear()
    await db.syncRecords.clear()
    await db.settings.clear()
    this.initialized = false
  }
}

export default new DexieCache()

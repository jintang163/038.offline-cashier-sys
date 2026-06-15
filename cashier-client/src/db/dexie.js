import Dexie from 'dexie'

const db = new Dexie('CashierDB')

db.version(2).stores({
  products: '++id, barcode, name, category_id, price, stock, status',
  categories: '++id, name, sort, status',
  orders: '++id, order_no, total_amount, status, sync_status, created_at',
  orderItems: '++id, order_id, product_id, product_name, price, quantity',
  offlineQueue: '++id, action, status, retry_count, created_at',
  settings: 'key',
  syncRecords: '++id, type, status, created_at',
})

class DexieDB {
  async getProducts(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', categoryId = null } = params
    let collection = db.products.where('status').equals(1)

    if (categoryId) {
      collection = collection.and((p) => p.category_id === categoryId)
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      collection = collection.and(
        (p) =>
          p.name.toLowerCase().includes(lowerKeyword) ||
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

  async getProductById(id) {
    return await db.products.get(id)
  }

  async getProductByBarcode(barcode) {
    return await db.products.where('barcode').equals(barcode).first()
  }

  async addProduct(product) {
    const id = await db.products.add({
      ...product,
      status: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return this.getProductById(id)
  }

  async updateProduct(id, product) {
    await db.products.update(id, {
      ...product,
      updated_at: new Date().toISOString(),
    })
    return this.getProductById(id)
  }

  async deleteProduct(id) {
    await db.products.update(id, { status: 0 })
    return true
  }

  async getCategories() {
    return await db.categories
      .where('status')
      .equals(1)
      .sortBy('sort')
  }

  async addCategory(name, sort = 0) {
    const id = await db.categories.add({
      name,
      sort,
      status: 1,
      created_at: new Date().toISOString(),
    })
    return { id, name, sort, status: 1 }
  }

  async updateCategory(id, name, sort) {
    await db.categories.update(id, { name, sort })
    return { id, name, sort }
  }

  async deleteCategory(id) {
    await db.categories.update(id, { status: 0 })
    return true
  }

  async getOrders(params = {}) {
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
    const order = await db.orders.get(id)
    if (order) {
      order.items = await db.orderItems.where('order_id').equals(id).toArray()
    }
    return order
  }

  async createOrder(orderData) {
    const { items, ...orderInfo } = orderData
    const orderNo = this.generateOrderNo()

    return await db.transaction('rw', db.orders, db.orderItems, db.products, async () => {
      const orderId = await db.orders.add({
        ...orderInfo,
        order_no: orderNo,
        status: 1,
        sync_status: 0,
        created_at: new Date().toISOString(),
      })

      for (const item of items) {
        await db.orderItems.add({
          order_id: orderId,
          product_id: item.product_id || null,
          product_name: item.product_name,
          barcode: item.barcode || null,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          created_at: new Date().toISOString(),
        })

        if (item.product_id) {
          const product = await db.products.get(item.product_id)
          if (product) {
            await db.products.update(item.product_id, {
              stock: product.stock - item.quantity,
            })
          }
        }
      }

      return this.getOrderById(orderId)
    })
  }

  generateOrderNo() {
    const now = new Date()
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `OD${dateStr}${random}`
  }

  async getOfflineQueue(status = 0) {
    return await db.offlineQueue.where('status').equals(status).sortBy('id')
  }

  async addOfflineQueue(action, data) {
    return await db.offlineQueue.add({
      action,
      data: JSON.stringify(data),
      status: 0,
      retry_count: 0,
      created_at: new Date().toISOString(),
    })
  }

  async updateOfflineQueueStatus(id, status) {
    await db.offlineQueue.update(id, {
      status,
      retry_count: (db.offlineQueue.retry_count || 0) + 1,
      last_retry_at: new Date().toISOString(),
    })
    return true
  }

  async getSetting(key) {
    const item = await db.settings.get(key)
    return item ? item.value : null
  }

  async setSetting(key, value) {
    await db.settings.put({ key, value, updated_at: new Date().toISOString() })
    return true
  }

  async getAllSettings() {
    const items = await db.settings.toArray()
    const result = {}
    items.forEach((item) => {
      result[item.key] = item.value
    })
    return result
  }

  async bulkInsertProducts(products) {
    return await db.products.bulkAdd(products)
  }

  async bulkInsertCategories(categories) {
    return await db.categories.bulkAdd(categories)
  }

  async clearAll() {
    await db.products.clear()
    await db.categories.clear()
    await db.orders.clear()
    await db.orderItems.clear()
    await db.offlineQueue.clear()
    await db.syncRecords.clear()
  }

  async getUnsyncedOrders() {
    return await db.orders.where('sync_status').equals(0).sortBy('id')
  }

  async getFailedOrders() {
    return await db.orders.where('sync_status').equals(2).sortBy('id')
  }

  async updateOrderSyncStatus(orderId, syncStatus, syncError = null) {
    const updateData = {
      sync_status: syncStatus,
      synced_at: syncStatus === 1 ? new Date().toISOString() : undefined,
    }
    if (syncError !== null) {
      updateData.sync_error = syncError
    }
    await db.orders.update(orderId, updateData)
    return true
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

  async getUnsyncedOrderCount() {
    return await db.orders.where('sync_status').equals(0).count()
  }

  async bulkUpsertProducts(products) {
    for (const product of products) {
      const existing = product.id
        ? await db.products.get(product.id)
        : product.barcode
        ? await db.products.where('barcode').equals(product.barcode).first()
        : null

      if (existing) {
        await db.products.update(existing.id, {
          ...product,
          updated_at: new Date().toISOString(),
        })
      } else {
        await db.products.add({
          ...product,
          status: product.status ?? 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
    return true
  }

  async bulkUpsertCategories(categories) {
    for (const category of categories) {
      const existing = category.id
        ? await db.categories.get(category.id)
        : null

      if (existing) {
        await db.categories.update(existing.id, {
          ...category,
          updated_at: new Date().toISOString(),
        })
      } else {
        await db.categories.add({
          ...category,
          status: category.status ?? 1,
          created_at: new Date().toISOString(),
        })
      }
    }
    return true
  }
}

export default new DexieDB()

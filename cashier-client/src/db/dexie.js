import Dexie from 'dexie'

const db = new Dexie('CashierCacheDB')

db.version(7).stores({
  products: '++id, erp_goods_id, product_name, category_id, category_name, barcode, price, original_price, unit, image, description, stock, status, sort, created_at, updated_at',
  categories: '++id, name, sort, status, created_at, updated_at',
  orders: '++id, order_no, erp_order_id, total_amount, discount_amount, pay_amount, pay_type, pay_status, order_status, sync_status, sync_attempts, sync_error, cashier_id, cashier_name, member_id, member_name, remark, created_at, synced_at',
  order_items: '++id, order_id, product_id, erp_goods_id, product_name, barcode, image, price, quantity, subtotal, total_amount, discount_amount, pay_amount, created_at',
  order_payments: '++id, order_id, payment_no, pay_type, pay_amount, pay_status, pay_time, transaction_id, created_at',
  sales_summary: '++id, erp_goods_id, product_name, quantity, total_amount, order_date, sync_status, created_at',
  offlineQueue: '++id, action, status, retry_count, created_at',
  settings: 'key',
  syncRecords: '++id, type, status, created_at',
  members: '++id, erp_member_id, phone, card_no, member_name, gender, birthday, level_id, level_name, points, balance, status, last_used_at, sync_status, last_sync_at',
  member_levels: '++id, erp_level_id, level_code, level_name, min_points, max_points, discount_rate, status, sync_status',
  point_rules: '++id, rule_code, rule_name, rule_type, rule_value, min_amount, max_amount, start_date, end_date, status, sync_status',
  point_records: '++id, record_no, member_id, phone, change_type, change_points, before_points, after_points, order_no, source_type, remark, sync_status, sync_attempts, sync_error, cashier_id, created_at',
  member_cards: '++id, erp_card_id, card_no, member_id, card_type, balance, reserved_balance, credit_limit, used_credit, status, sync_status, last_sync_at',
  member_card_records: '++id, record_no, card_id, card_no, member_id, trade_type, trade_amount, before_balance, after_balance, before_reserved, after_reserved, order_no, related_record_no, sync_status, sync_attempts, sync_error, cashier_id, created_at',
  recommend_cache: '++id, [type+period], type, period, data, generated_at, expires_at',
  stock_forecast: '++id, product_id, product_name, forecast_days, forecast_qty, current_stock, suggested_purchase, confidence, generated_at',
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

  async getMembers(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status = 1 } = params
    let collection = db.members

    if (status !== undefined && status !== null) {
      collection = collection.where('status').equals(status)
    }

    let items = await collection.toArray()

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      items = items.filter(
        (m) =>
          m.phone?.includes(keyword) ||
          m.card_no?.includes(keyword) ||
          m.member_name?.toLowerCase().includes(lowerKeyword)
      )
    }

    const total = items.length
    const pagedItems = items
      .sort((a, b) => (b.last_used_at || '').localeCompare(a.last_used_at || ''))
      .slice((page - 1) * pageSize, page * pageSize)

    return { items: pagedItems, total, page, pageSize }
  }

  async getMemberById(id) {
    return await db.members.get(id)
  }

  async getMemberByPhone(phone) {
    const member = await db.members.where('phone').equals(phone).first()
    if (member) {
      await this._updateMemberLastUsed(member.id)
    }
    return member
  }

  async getMemberByCardNo(cardNo) {
    const member = await db.members.where('card_no').equals(cardNo).first()
    if (member) {
      await this._updateMemberLastUsed(member.id)
    }
    return member
  }

  async searchMember(keyword) {
    if (!keyword) return null
    if (/^\d{11}$/.test(keyword)) {
      return await this.getMemberByPhone(keyword)
    }
    return await this.getMemberByCardNo(keyword)
  }

  async _updateMemberLastUsed(memberId) {
    await db.members.update(memberId, { last_used_at: new Date().toISOString() })
  }

  async saveMember(member) {
    const existing = member.id ? await db.members.get(member.id) : null
    if (existing) {
      await db.members.update(member.id, { ...member, updated_at: new Date().toISOString() })
      return member.id
    } else {
      return await db.members.add({
        ...member,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  async bulkUpsertMembers(members) {
    if (!members || members.length === 0) return
    for (const member of members) {
      const existing = member.erp_member_id
        ? await db.members.where('erp_member_id').equals(member.erp_member_id).first()
        : member.id
        ? await db.members.get(member.id)
        : null

      if (existing) {
        await db.members.update(existing.id, {
          ...member,
          id: existing.id,
          updated_at: new Date().toISOString(),
          sync_status: 1,
          last_sync_at: new Date().toISOString(),
        })
      } else {
        await db.members.add({
          ...member,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 1,
          last_sync_at: new Date().toISOString(),
        })
      }
    }
  }

  async updateMemberPoints(memberId, pointsDelta) {
    const member = await db.members.get(memberId)
    if (!member) throw new Error('会员不存在')
    const newPoints = Math.max(0, (member.points || 0) + pointsDelta)
    await db.members.update(memberId, {
      points: newPoints,
      updated_at: new Date().toISOString(),
      sync_status: 0,
    })
    return newPoints
  }

  async updateMemberBalance(memberId, balanceDelta) {
    const member = await db.members.get(memberId)
    if (!member) throw new Error('会员不存在')
    const newBalance = Math.max(0, (member.balance || 0) + balanceDelta)
    await db.members.update(memberId, {
      balance: newBalance,
      updated_at: new Date().toISOString(),
      sync_status: 0,
    })
    return newBalance
  }

  async getMemberLevels() {
    return await db.member_levels.where('status').equals(1).sortBy('min_points')
  }

  async bulkUpsertMemberLevels(levels) {
    if (!levels || levels.length === 0) return
    for (const level of levels) {
      const existing = level.erp_level_id
        ? await db.member_levels.where('erp_level_id').equals(level.erp_level_id).first()
        : level.id
        ? await db.member_levels.get(level.id)
        : null

      if (existing) {
        await db.member_levels.update(existing.id, { ...level, id: existing.id, sync_status: 1 })
      } else {
        await db.member_levels.add({ ...level, sync_status: 1 })
      }
    }
  }

  async getPointRules() {
    const now = new Date().toISOString()
    return await db.point_rules
      .where('status')
      .equals(1)
      .filter((r) => {
        if (r.start_date && r.start_date > now) return false
        if (r.end_date && r.end_date < now) return false
        return true
      })
      .toArray()
  }

  async bulkUpsertPointRules(rules) {
    if (!rules || rules.length === 0) return
    for (const rule of rules) {
      const existing = rule.id ? await db.point_rules.get(rule.id) : null
      if (existing) {
        await db.point_rules.update(rule.id, { ...rule, sync_status: 1 })
      } else {
        await db.point_rules.add({ ...rule, sync_status: 1 })
      }
    }
  }

  async addPointRecord(record) {
    const recordNo = record.record_no || `PT${Date.now()}${Math.random().toString(36).substr(2, 6)}`
    return await db.point_records.add({
      ...record,
      record_no: recordNo,
      sync_status: 0,
      sync_attempts: 0,
      created_at: record.created_at || new Date().toISOString(),
    })
  }

  async getUnsyncedPointRecords(limit = 100) {
    return await db.point_records
      .where('sync_status')
      .below(1)
      .limit(limit)
      .sortBy('created_at')
  }

  async updatePointRecordSyncStatus(id, status, error = null) {
    const updateData = { sync_status: status }
    if (error) {
      updateData.sync_error = error
      updateData.sync_attempts = (await db.point_records.get(id))?.sync_attempts + 1 || 1
    }
    return await db.point_records.update(id, updateData)
  }

  async getMemberCards(memberId) {
    let collection = db.member_cards.where('status').equals(1)
    if (memberId) {
      collection = collection.and((c) => c.member_id === memberId)
    }
    return await collection.toArray()
  }

  async getMemberCardByCardNo(cardNo) {
    return await db.member_cards.where('card_no').equals(cardNo).first()
  }

  async bulkUpsertMemberCards(cards) {
    if (!cards || cards.length === 0) return
    for (const card of cards) {
      const existing = card.erp_card_id
        ? await db.member_cards.where('erp_card_id').equals(card.erp_card_id).first()
        : card.id
        ? await db.member_cards.get(card.id)
        : null

      if (existing) {
        await db.member_cards.update(existing.id, {
          ...card,
          id: existing.id,
          sync_status: 1,
          last_sync_at: new Date().toISOString(),
        })
      } else {
        await db.member_cards.add({
          ...card,
          sync_status: 1,
          last_sync_at: new Date().toISOString(),
        })
      }
    }
  }

  async updateMemberCardBalance(cardId, balanceDelta, reserveDelta = 0) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')

    const newBalance = (card.balance || 0) + balanceDelta
    const newReserved = (card.reserved_balance || 0) + reserveDelta

    const availableBalance = newBalance - newReserved - (card.used_credit || 0)
    if (availableBalance < 0) {
      throw new Error('储值卡余额不足')
    }

    await db.member_cards.update(cardId, {
      balance: newBalance,
      reserved_balance: newReserved,
      sync_status: 0,
    })
    return { balance: newBalance, reserved_balance: newReserved }
  }

  async reserveCardBalance(cardId, amount) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')

    const available = (card.balance || 0) - (card.reserved_balance || 0)
    if (available < amount) {
      throw new Error('储值卡可用余额不足')
    }

    await db.member_cards.update(cardId, {
      reserved_balance: (card.reserved_balance || 0) + amount,
      sync_status: 0,
    })
    return true
  }

  async consumeReservedBalance(cardId, amount) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')
    if ((card.reserved_balance || 0) < amount) {
      throw new Error('预授权金额不足')
    }

    await db.member_cards.update(cardId, {
      balance: (card.balance || 0) - amount,
      reserved_balance: (card.reserved_balance || 0) - amount,
      sync_status: 0,
    })
    return (card.balance || 0) - amount
  }

  async releaseReservedBalance(cardId, amount) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')

    const beforeReserved = card.reserved_balance || 0
    const afterReserved = Math.max(0, beforeReserved - amount)

    await db.member_cards.update(cardId, {
      reserved_balance: afterReserved,
      sync_status: 0,
    })

    await this._addCardRecord(card, {
      trade_type: 6,
      trade_amount: -amount,
      before_balance: card.balance || 0,
      after_balance: card.balance || 0,
      before_reserved: beforeReserved,
      after_reserved: afterReserved,
      remark: '预授权取消',
    })

    return true
  }

  _generateCardRecordNo() {
    return 'CR' + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  }

  async _addCardRecord(card, recordData) {
    const record = {
      record_no: this._generateCardRecordNo(),
      card_id: card.id,
      card_no: card.card_no,
      member_id: card.member_id,
      trade_type: recordData.trade_type,
      trade_amount: recordData.trade_amount,
      before_balance: recordData.before_balance,
      after_balance: recordData.after_balance,
      before_reserved: recordData.before_reserved,
      after_reserved: recordData.after_reserved,
      order_no: recordData.order_no || null,
      related_record_no: recordData.related_record_no || null,
      sync_status: 0,
      sync_attempts: 0,
      sync_error: null,
      cashier_id: recordData.cashier_id || null,
      remark: recordData.remark || '',
      created_at: new Date().toISOString(),
    }
    return await db.member_card_records.add(record)
  }

  async getUnsyncedMemberCardRecords(limit = 200) {
    return await db.member_card_records
      .where('sync_status')
      .below(1)
      .limit(limit)
      .sortBy('created_at')
  }

  async updateMemberCardRecordSyncStatus(id, status, error = null) {
    const updateData = { sync_status: status }
    if (error) {
      updateData.sync_error = error
      const rec = await db.member_card_records.get(id)
      updateData.sync_attempts = (rec?.sync_attempts || 0) + 1
    }
    return await db.member_card_records.update(id, updateData)
  }

  async addMemberCardRecord(record) {
    const rec = {
      ...record,
      record_no: record.record_no || this._generateCardRecordNo(),
      sync_status: record.sync_status ?? 0,
      sync_attempts: record.sync_attempts || 0,
      created_at: record.created_at || new Date().toISOString(),
    }
    return await db.member_card_records.add(rec)
  }

  async bulkUpsertMemberCardRecords(records) {
    if (!records || records.length === 0) return
    for (const rec of records) {
      const existing = rec.record_no
        ? await db.member_card_records.where('record_no').equals(rec.record_no).first()
        : null
      if (existing) {
        await db.member_card_records.update(existing.id, rec)
      } else {
        await db.member_card_records.add({
          ...rec,
          sync_status: 1,
        })
      }
    }
  }

  async reserveCardBalance(cardId, amount, orderNo = null) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')

    const available = (card.balance || 0) - (card.reserved_balance || 0)
    if (available < amount) {
      throw new Error('储值卡可用余额不足')
    }

    const beforeReserved = card.reserved_balance || 0
    const afterReserved = beforeReserved + amount
    const beforeBalance = card.balance || 0

    await db.member_cards.update(cardId, {
      reserved_balance: afterReserved,
      sync_status: 0,
    })

    await this._addCardRecord(card, {
      trade_type: 4,
      trade_amount: amount,
      before_balance: beforeBalance,
      after_balance: beforeBalance,
      before_reserved: beforeReserved,
      after_reserved: afterReserved,
      order_no: orderNo,
      remark: '预授权冻结',
    })

    return true
  }

  async consumeReservedBalance(cardId, amount, orderNo = null) {
    const card = await db.member_cards.get(cardId)
    if (!card) throw new Error('储值卡不存在')
    if ((card.reserved_balance || 0) < amount) {
      throw new Error('预授权金额不足')
    }

    const beforeBalance = card.balance || 0
    const afterBalance = beforeBalance - amount
    const beforeReserved = card.reserved_balance || 0
    const afterReserved = beforeReserved - amount

    await db.member_cards.update(cardId, {
      balance: afterBalance,
      reserved_balance: afterReserved,
      sync_status: 0,
    })

    await this._addCardRecord(card, {
      trade_type: 5,
      trade_amount: -amount,
      before_balance: beforeBalance,
      after_balance: afterBalance,
      before_reserved: beforeReserved,
      after_reserved: afterReserved,
      order_no: orderNo,
      remark: '预授权完成扣款',
    })

    return afterBalance
  }

  async getBirthdayMembers(days = 7) {
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    const targetDate = new Date()
    targetDate.setDate(today.getDate() + days)
    const targetMonth = targetDate.getMonth() + 1
    const targetDay = targetDate.getDate()

    const members = await db.members.where('status').equals(1).toArray()
    return members.filter((m) => {
      if (!m.birthday) return false
      const bd = new Date(m.birthday)
      const bdMonth = bd.getMonth() + 1
      const bdDay = bd.getDate()

      const toNum = (month, day) => month * 100 + day
      const todayNum = toNum(todayMonth, todayDay)
      const targetNum = toNum(targetMonth, targetDay)
      const bdNum = toNum(bdMonth, bdDay)

      if (todayNum <= targetNum) {
        return bdNum >= todayNum && bdNum <= targetNum
      } else {
        return bdNum >= todayNum || bdNum <= targetNum
      }
    })
  }

  async getProductSalesRanking(days = 7, limit = 50) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startStr = startDate.toISOString()

    const orderItems = await db.order_items
      .where('created_at')
      .aboveOrEqual(startStr)
      .toArray()

    const productMap = new Map()
    for (const item of orderItems) {
      if (!productMap.has(item.product_id)) {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          erp_goods_id: item.erp_goods_id,
          total_quantity: 0,
          total_amount: 0,
          order_count: 0,
          price: item.price,
          image: item.image,
          category_id: item.category_id,
          _orderSet: new Set(),
        })
      }
      const stats = productMap.get(item.product_id)
      stats.total_quantity += item.quantity || 0
      stats.total_amount += item.pay_amount || item.subtotal || 0
      if (!stats._orderSet.has(item.order_id)) {
        stats.order_count++
        stats._orderSet.add(item.order_id)
      }
    }

    const result = Array.from(productMap.values())
      .map((s) => ({
        ...s,
        _orderSet: undefined,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, limit)

    return result
  }

  async getOrderItemGroups(days = 14, minSupport = 3) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startStr = startDate.toISOString()

    const allItems = await db.order_items
      .where('created_at')
      .aboveOrEqual(startStr)
      .toArray()

    const orderGroups = new Map()
    for (const item of allItems) {
      if (!orderGroups.has(item.order_id)) {
        orderGroups.set(item.order_id, [])
      }
      orderGroups.get(item.order_id).push({
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
      })
    }

    return Array.from(orderGroups.values())
  }

  async getLowStockProducts(threshold = 10) {
    const products = await db.products
      .where('status')
      .equals(1)
      .toArray()
    return products
      .filter((p) => (p.stock || 0) <= threshold)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
  }

  async getRecommendCache(type, period = '7d') {
    const record = await db.recommend_cache
      .where('[type+period]')
      .equals([type, period])
      .first()
    if (!record) return null
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return null
    }
    try {
      return typeof record.data === 'string' ? JSON.parse(record.data) : record.data
    } catch (e) {
      return null
    }
  }

  async setRecommendCache(type, period = '7d', data, ttlHours = 1) {
    const existing = await db.recommend_cache
      .where('[type+period]')
      .equals([type, period])
      .first()

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + ttlHours)

    if (existing) {
      await db.recommend_cache.update(existing.id, {
        data: JSON.stringify(data),
        generated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
    } else {
      await db.recommend_cache.add({
        type,
        period,
        data: JSON.stringify(data),
        generated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
    }
  }

  async saveStockForecast(forecastList) {
    if (!forecastList || forecastList.length === 0) return
    const now = new Date().toISOString()
    for (const item of forecastList) {
      const existing = await db.stock_forecast
        .where('product_id')
        .equals(item.product_id)
        .first()
      if (existing) {
        await db.stock_forecast.update(existing.id, {
          ...item,
          generated_at: now,
        })
      } else {
        await db.stock_forecast.add({
          ...item,
          generated_at: now,
        })
      }
    }
  }

  async getStockForecast() {
    const forecasts = await db.stock_forecast
      .orderBy('suggested_purchase')
      .reverse()
      .toArray()

    const products = await db.products.toArray()
    const productMap = new Map(products.map((p) => [p.id, p]))

    return forecasts.map((f) => ({
      ...f,
      product: productMap.get(f.product_id) || null,
      stock: f.current_stock,
      shortage: Math.max(0, (f.forecast_qty || 0) - (f.current_stock || 0)),
    }))
  }

  async clearRecommendCache() {
    await db.recommend_cache.clear()
    await db.stock_forecast.clear()
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
    await db.members.clear()
    await db.member_levels.clear()
    await db.point_rules.clear()
    await db.point_records.clear()
    await db.member_cards.clear()
    await db.member_card_records.clear()
    await db.recommend_cache.clear()
    await db.stock_forecast.clear()
    this.initialized = false
  }
}

export default new DexieCache()

import dexieDB from '../db/dexie'

class DatabaseService {
  constructor() {
    this.initialized = false
    this.initPromise = null
  }

  async init() {
    if (this.initialized) {
      return
    }
    
    if (this.initPromise) {
      return this.initPromise
    }
    
    this.initPromise = this._doInit()
    return this.initPromise
  }

  async _doInit() {
    try {
      if (window.electronAPI?.sqliteExec) {
        await dexieDB.initDexieCache()
      }
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize database service:', error)
      this.initPromise = null
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
    return dexieDB.getProducts(params)
  }

  async getProductById(id) {
    return dexieDB.getProductById(id)
  }

  async getProductByBarcode(barcode) {
    return dexieDB.getProductByBarcode(barcode)
  }

  async addProduct(product) {
    return dexieDB.addProduct(product)
  }

  async updateProduct(id, product) {
    return dexieDB.updateProduct(id, product)
  }

  async deleteProduct(id) {
    return dexieDB.deleteProduct(id)
  }

  async getCategories() {
    return dexieDB.getCategories()
  }

  async addCategory(name, sort = 0) {
    return dexieDB.addCategory(name, sort)
  }

  async updateCategory(id, name, sort) {
    return dexieDB.updateCategory(id, name, sort)
  }

  async deleteCategory(id) {
    return dexieDB.deleteCategory(id)
  }

  async getOrders(params = {}) {
    return dexieDB.getOrders(params)
  }

  async getOrderById(id) {
    return dexieDB.getOrderById(id)
  }

  async createOrder(orderData) {
    return dexieDB.createOrder(orderData)
  }

  async getOrdersWithItemsAndPayments(syncStatus = 0) {
    return dexieDB.getOrdersWithItemsAndPayments(syncStatus)
  }

  async getUnsyncedOrders() {
    return dexieDB.getUnsyncedOrders()
  }

  async getFailedOrders() {
    return dexieDB.getFailedOrders()
  }

  async updateOrderSyncStatus(orderId, syncStatus, syncError = null) {
    return dexieDB.updateOrderSyncStatus(orderId, syncStatus, syncError)
  }

  async getUnsyncedOrderCount() {
    return dexieDB.getUnsyncedOrderCount()
  }

  async addSalesSummary(summary) {
    return dexieDB.addSalesSummary(summary)
  }

  async addSalesSummaries(summaries) {
    return dexieDB.addSalesSummaries(summaries)
  }

  async getUnsyncedSalesSummaries(limit = 100) {
    return dexieDB.getUnsyncedSalesSummaries(limit)
  }

  async updateSalesSummarySyncStatus(id, status, error = null) {
    return dexieDB.updateSalesSummarySyncStatus(id, status, error)
  }

  async getSalesSummaryByDate(startDate, endDate) {
    return dexieDB.getSalesSummaryByDate(startDate, endDate)
  }

  async getOfflineQueue(status = 0) {
    return dexieDB.getOfflineQueue(status)
  }

  async addOfflineQueue(action, data) {
    return dexieDB.addOfflineQueue(action, data)
  }

  async updateOfflineQueueStatus(id, status, error = null) {
    return dexieDB.updateOfflineQueueStatus(id, status, error)
  }

  async getSetting(key) {
    return dexieDB.getSetting(key)
  }

  async setSetting(key, value) {
    return dexieDB.setSetting(key, value)
  }

  async getAllSettings() {
    return dexieDB.getAllSettings()
  }

  async bulkUpsertProducts(products) {
    return dexieDB.bulkUpsertProducts(products)
  }

  async bulkUpsertCategories(categories) {
    return dexieDB.bulkUpsertCategories(categories)
  }

  async addSyncRecord(type, status, details = null) {
    return dexieDB.addSyncRecord(type, status, details)
  }

  async getSyncRecords(limit = 20) {
    return dexieDB.getSyncRecords(limit)
  }

  async syncFromSQLite() {
    return dexieDB.syncFromSQLite()
  }

  async getDbPath() {
    if (!window.electronAPI?.getDbPath) {
      throw new Error('electronAPI not available')
    }
    const result = await window.electronAPI.getDbPath()
    if (!result.success) {
      throw new Error(result.error || 'Failed to get db path')
    }
    return result.data
  }

  async backupDatabase(backupPath) {
    if (!window.electronAPI?.backupDatabase) {
      throw new Error('electronAPI not available')
    }
    const result = await window.electronAPI.backupDatabase(backupPath)
    if (!result.success) {
      throw new Error(result.error || 'Failed to backup database')
    }
    return result.data
  }

  async restoreDatabase(backupPath) {
    if (!window.electronAPI?.restoreDatabase) {
      throw new Error('electronAPI not available')
    }
    const result = await window.electronAPI.restoreDatabase(backupPath)
    if (!result.success) {
      throw new Error(result.error || 'Failed to restore database')
    }
    await this.syncFromSQLite()
    return result.data
  }

  async clearCache() {
    await dexieDB.clearAll()
    this.initialized = false
    this.initPromise = null
  }

  async generateDailyReport(reportDate) {
    return dexieDB.generateDailyReport(reportDate)
  }

  async getDailyReportByDate(reportDate) {
    return dexieDB.getDailyReportByDate(reportDate)
  }

  async getDailyReportList(params = {}) {
    return dexieDB.getDailyReportList(params)
  }

  async saveDailyReport(report) {
    return dexieDB.saveDailyReport(report)
  }

  async getUnsyncedDailyReports(limit = 50) {
    return dexieDB.getUnsyncedDailyReports(limit)
  }

  async updateDailyReportSyncStatus(id, status, error = null) {
    return dexieDB.updateDailyReportSyncStatus(id, status, error)
  }

  async batchSaveDailyReports(reports) {
    return dexieDB.batchSaveDailyReports(reports)
  }

  async updateDailyReportErpPushStatus(id, status, error = null) {
    return dexieDB.updateDailyReportErpPushStatus(id, status, error)
  }
}

const dbService = new DatabaseService()
export default dbService

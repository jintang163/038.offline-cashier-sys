import axios from 'axios'
import db from '../utils/db'
import { message } from 'antd'
import { getToken, clearAuth, getStoreId, getStoreCode } from '../utils/auth'
import syncOptimizer from '../services/syncOptimizerService'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const request = axios.create({
  baseURL,
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const storeId = getStoreId()
    const storeCode = getStoreCode()
    if (storeId) {
      config.headers['X-Store-Id'] = storeId
    }
    if (storeCode) {
      config.headers['X-Store-Code'] = storeCode
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        message.error('登录已过期，请重新登录')
        clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } else if (status === 403) {
        message.error('没有权限访问该资源')
      } else if (status === 404) {
        message.error('请求的资源不存在')
      } else if (status >= 500) {
        message.error('服务器错误，请稍后重试')
      } else {
        message.error(error.response.data?.message || error.message || '请求失败')
      }
    } else if (error.message === 'OFFLINE' || error.code === 'ERR_NETWORK') {
      // 网络错误由外层 ApiService 处理
    } else {
      message.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

class ApiService {
  async request(config, options = {}) {
    const { offlineQueue = true, offlineData = null, enableCompression = true } = options

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE')
      }

      let finalConfig = config

      if (
        enableCompression &&
        config.method?.toUpperCase() !== 'GET' &&
        config.data &&
        (Array.isArray(config.data) || typeof config.data === 'object')
      ) {
        const compressResult = await syncOptimizer.compressIfNeeded(config.data)
        if (compressResult.compressed) {
          finalConfig = {
            ...config,
            data: {
              _gzip: true,
              _payload: compressResult.payload,
              _originalSize: compressResult.originalSize,
              _compressedSize: compressResult.compressedSize,
            },
            headers: {
              ...config.headers,
              'X-Data-Compression': 'gzip',
              'X-Original-Size': compressResult.originalSize,
              'X-Compressed-Size': compressResult.compressedSize,
            },
          }
        }
      }

      const response = await request(finalConfig)
      return response
    } catch (error) {
      if (error.message === 'OFFLINE' || error.code === 'ERR_NETWORK') {
        if (offlineQueue && config.method?.toUpperCase() !== 'GET') {
          await this.addToOfflineQueue(config)
          message.warning('当前处于离线状态，操作已加入队列，联网后自动同步')
        }
        if (offlineData !== null) {
          return { code: 0, data: offlineData, fromCache: true }
        }
        throw new Error('网络连接失败，请检查网络设置')
      }
      throw error
    }
  }

  async addToOfflineQueue(config) {
    const action = `${config.method?.toUpperCase()}_${config.url}`
    const data = {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
    }
    await db.addOfflineQueue(action, data)
  }

  async processOfflineQueue() {
    const queue = await db.getOfflineQueue(0)
    const results = []

    for (const item of queue) {
      try {
        const data = JSON.parse(item.data)
        await request({
          url: data.url,
          method: data.method,
          data: data.data,
          params: data.params,
        })
        await db.updateOfflineQueueStatus(item.id, 1)
        results.push({ id: item.id, success: true })
      } catch (error) {
        await db.updateOfflineQueueStatus(item.id, item.retry_count >= 2 ? 2 : 0)
        results.push({ id: item.id, success: false, error: error.message })
      }
    }

    return results
  }

  async login(username, password) {
    return this.request(
      {
        url: '/auth/login',
        method: 'post',
        data: { username, password },
      },
      { offlineQueue: false }
    )
  }

  async getProducts(params) {
    return this.request(
      {
        url: '/product/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getProductSyncList(params) {
    return this.request(
      {
        url: '/product/sync-list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getCategories() {
    return this.request(
      {
        url: '/product/category/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async createOrder(orderData) {
    return this.request({
      url: '/order',
      method: 'post',
      data: orderData,
    })
  }

  async getOrders(params) {
    return this.request(
      {
        url: '/order/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getSettings() {
    return this.request(
      {
        url: '/settings',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async saveSettings(settings) {
    return this.request({
      url: '/settings',
      method: 'put',
      data: settings,
    })
  }

  async post(url, data, options = {}) {
    return this.request(
      {
        url,
        method: 'post',
        data,
      },
      options
    )
  }

  async batchSyncOrders(orders) {
    return this.request({
      url: '/order/batch-sync',
      method: 'post',
      data: orders,
    })
  }

  async syncSalesSummary(summaries) {
    return this.request({
      url: '/order/sales-summary',
      method: 'post',
      data: summaries,
    })
  }

  async getMemberByPhone(phone) {
    return this.request(
      {
        url: '/member/phone/' + phone,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getMemberByCardNo(cardNo) {
    return this.request(
      {
        url: '/member/card/' + cardNo,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getMemberDetail(id) {
    return this.request(
      {
        url: '/member/' + id,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getMemberList(params) {
    return this.request(
      {
        url: '/member/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getMemberSyncList(params) {
    return this.request(
      {
        url: '/member/sync-list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async saveMember(member) {
    return this.request({
      url: '/member',
      method: member.id ? 'put' : 'post',
      data: member,
    })
  }

  async getMemberCards(memberId) {
    return this.request(
      {
        url: '/member/' + memberId + '/cards',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getMemberLevels() {
    return this.request(
      {
        url: '/member/level/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getPointRules() {
    return this.request(
      {
        url: '/member/point-rule/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async batchSyncPointRecords(records) {
    return this.request({
      url: '/member/point-record/batch-sync',
      method: 'post',
      data: records,
    })
  }

  async calculatePoints(params) {
    return this.request(
      {
        url: '/member/point-rule/calculate',
        method: 'post',
        data: params,
      },
      { offlineQueue: false }
    )
  }

  async addPoints(params) {
    return this.request({
      url: '/member/point/add',
      method: 'post',
      data: params,
    })
  }

  async deductPoints(params) {
    return this.request({
      url: '/member/point/deduct',
      method: 'post',
      data: params,
    })
  }

  async getBirthdayMembers(days) {
    return this.request(
      {
        url: '/member/birthday',
        method: 'get',
        params: { days },
      },
      { offlineQueue: false }
    )
  }

  async memberCardPay(params) {
    return this.request({
      url: '/member/card/pay',
      method: 'post',
      data: params,
    })
  }

  async memberCardReserve(params) {
    return this.request({
      url: '/member/card/reserve',
      method: 'post',
      data: params,
    })
  }

  async batchSyncMemberCardRecords(records) {
    return this.request({
      url: '/member/card-record/batch-sync',
      method: 'post',
      data: records,
    })
  }

  async getPrinters() {
    return this.request(
      {
        url: '/printer/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getPrinterSyncList(params) {
    return this.request(
      {
        url: '/printer/sync-list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getPrintRules() {
    return this.request(
      {
        url: '/printer/rule/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getPrintRuleSyncList(params) {
    return this.request(
      {
        url: '/printer/rule/sync-list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getPrintTemplates() {
    return this.request(
      {
        url: '/printer/template/list',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getPrintTemplateSyncList(params) {
    return this.request(
      {
        url: '/printer/template/sync-list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async savePrinter(printer) {
    return this.request({
      url: '/printer',
      method: printer.id ? 'put' : 'post',
      data: printer,
    })
  }

  async savePrintRule(rule) {
    return this.request({
      url: '/printer/rule',
      method: rule.id ? 'put' : 'post',
      data: rule,
    })
  }

  async savePrintTemplate(template) {
    return this.request({
      url: '/printer/template',
      method: template.id ? 'put' : 'post',
      data: template,
    })
  }

  async testPrinter(printerId) {
    return this.request(
      {
        url: `/printer/${printerId}/test`,
        method: 'post',
      },
      { offlineQueue: false }
    )
  }

  async batchSyncPrintHistory(records) {
    return this.request({
      url: '/printer/history/batch-sync',
      method: 'post',
      data: records,
    })
  }

  async createRefundOrder(refundData) {
    return this.request({
      url: '/refund',
      method: 'post',
      data: refundData,
    })
  }

  async getRefundList(params) {
    return this.request(
      {
        url: '/refund/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getRefundDetail(id) {
    return this.request(
      {
        url: '/refund/' + id,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async auditRefund(id, auditData) {
    return this.request({
      url: `/refund/${id}/audit`,
      method: 'post',
      data: auditData,
    })
  }

  async batchSyncRefundOrders(refundList) {
    return this.request({
      url: '/refund/batch-sync',
      method: 'post',
      data: refundList,
    })
  }

  async pushRefundToErp(id) {
    return this.request({
      url: `/refund/${id}/push-erp`,
      method: 'post',
    })
  }

  async getUnsyncedRefunds(params) {
    return this.request(
      {
        url: '/refund/unsynced',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async updateRefundSyncStatus(id, syncStatus, errorMessage) {
    return this.request({
      url: `/refund/${id}/sync-status`,
      method: 'put',
      params: { syncStatus, errorMessage },
    })
  }

  async verifyManagerPassword(username, password) {
    return this.request(
      {
        url: '/auth/verify-manager',
        method: 'post',
        data: { username, password },
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async createDisasterToken(params) {
    return this.request({
      url: '/disaster/token',
      method: 'post',
      data: params,
    })
  }

  async verifyDisasterToken(token, deviceNo) {
    return this.request(
      {
        url: '/disaster/token/verify',
        method: 'get',
        params: { token, deviceNo },
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async useDisasterToken(params) {
    return this.request(
      {
        url: '/disaster/token/use',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getDisasterRecoveryData(token, dataHours) {
    return this.request(
      {
        url: '/disaster/data',
        method: 'get',
        params: { token, dataHours },
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async disasterHeartbeat(params) {
    return this.request(
      {
        url: '/disaster/heartbeat',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: { success: true, timestamp: Date.now() } }
    )
  }

  async registerDevice(params) {
    return this.request(
      {
        url: '/disaster/device/register',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getMainDevice() {
    return this.request({
      url: '/disaster/device/main',
      method: 'get',
    })
  }

  async getOnlineDevices() {
    return this.request({
      url: '/disaster/device/online',
      method: 'get',
    })
  }

  async getFraudDetectionRules() {
    return this.request(
      {
        url: '/fraud/rules/enabled',
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async verifyOperationLock(params) {
    return this.request(
      {
        url: '/fraud/locks/verify-by-lockno',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async syncOperationLockLogs(lockLogs) {
    return this.request(
      {
        url: '/fraud/locks/sync',
        method: 'post',
        data: lockLogs,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getSuspiciousStores(params = {}) {
    return this.request(
      {
        url: '/fraud/suspicious-stores/list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getFraudAlerts(params = {}) {
    return this.request(
      {
        url: '/fraud/alerts/list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async analyzeStoreFraud(storeId) {
    return this.request(
      {
        url: `/fraud/suspicious-stores/${storeId}/analyze`,
        method: 'post',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getFraudOverview() {
    return this.request(
      {
        url: '/fraud/analysis/overview',
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async deviceHeartbeat(params) {
    return this.request(
      {
        url: '/device/heartbeat',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: { success: true, timestamp: Date.now() } }
    )
  }

  async saveSelfCheckLog(checkData) {
    return this.request(
      {
        url: '/device/self-check',
        method: 'post',
        data: checkData,
      },
      { offlineQueue: true, offlineData: null }
    )
  }

  async getSelfCheckLogList(params) {
    return this.request(
      {
        url: '/device/self-check/list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async createLogUploadRecord(deviceNo, logDate, logType) {
    return this.request(
      {
        url: '/device/log/create-upload',
        method: 'post',
        data: { deviceNo, logDate, logType },
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async uploadLogFile(formData) {
    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE')
      }
      const token = getToken()
      const headers = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const response = await axios.post(baseURL + '/device/log/upload', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      })
      const res = response.data
      if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
        return Promise.reject(new Error(res.message || '上传失败'))
      }
      return res
    } catch (error) {
      if (error.message === 'OFFLINE' || error.code === 'ERR_NETWORK') {
        throw new Error('网络连接失败，请检查网络设置')
      }
      throw error
    }
  }

  async getLogUploadList(params) {
    return this.request(
      {
        url: '/device/log/list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getLogDownloadUrl(id) {
    return this.request(
      {
        url: `/device/log/${id}/download-url`,
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async requestRemoteLogPull(params) {
    return this.request(
      {
        url: '/device/log/request-pull',
        method: 'post',
        data: params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async updateLogPullStatus(uploadNo, pullStatus, errorMessage) {
    return this.request(
      {
        url: '/device/log/pull-status',
        method: 'put',
        data: { uploadNo, pullStatus, errorMessage },
      },
      { offlineQueue: true, offlineData: null }
    )
  }

  async getPendingPullLogs(deviceNo) {
    return this.request(
      {
        url: '/device/log/pending-pull',
        method: 'get',
        params: { deviceNo },
      },
      { offlineQueue: false, offlineData: { records: [] } }
    )
  }

  async getDeviceList(params) {
    return this.request(
      {
        url: '/device/list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getOnlineDeviceList() {
    return this.request(
      {
        url: '/device/online-list',
        method: 'get',
      },
      { offlineQueue: false, offlineData: [] }
    )
  }

  async getDeviceMonitorOverview() {
    return this.request(
      {
        url: '/device/monitor/overview',
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getLogAnalysisSummary(params) {
    return this.request(
      {
        url: '/device/log/analysis-summary',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getDeviceListByLocation() {
    return this.request(
      {
        url: '/device/device-list-by-location',
        method: 'get',
      },
      { offlineQueue: false, offlineData: [] }
    )
  }

  async getLocationMonitorOverview() {
    return this.request(
      {
        url: '/device/monitor/location-overview',
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getAbnormalSelfCheckLogs(params) {
    return this.request(
      {
        url: '/device/self-check/abnormal-list',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async generatePurchaseSuggestion(params) {
    return this.request(
      {
        url: '/purchase/suggestion/generate',
        method: 'post',
        data: params,
      },
      { offlineQueue: false }
    )
  }

  async getPurchaseSuggestionPage(params) {
    return this.request(
      {
        url: '/purchase/suggestion/page',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getPurchaseSuggestionDetail(id) {
    return this.request(
      {
        url: `/purchase/suggestion/${id}`,
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async getPurchaseSuggestionItems(id) {
    return this.request(
      {
        url: `/purchase/suggestion/${id}/items`,
        method: 'get',
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  async confirmPurchaseSuggestion(confirmData) {
    return this.request(
      {
        url: '/purchase/suggestion/confirm',
        method: 'post',
        data: confirmData,
      },
      { offlineQueue: false }
    )
  }

  async rejectPurchaseSuggestion(id, rejectReason) {
    return this.request(
      {
        url: `/purchase/suggestion/${id}/reject`,
        method: 'post',
        data: { rejectReason },
      },
      { offlineQueue: false }
    )
  }

  async pushPurchaseSuggestionToErp(id) {
    return this.request(
      {
        url: `/purchase/suggestion/${id}/push-erp`,
        method: 'post',
      },
      { offlineQueue: false }
    )
  }

  async generatePurchaseOrder(id) {
    return this.request(
      {
        url: `/purchase/suggestion/${id}/generate-order`,
        method: 'post',
      },
      { offlineQueue: false }
    )
  }

  async triggerAutoPurchaseForecast(shopId, shopName) {
    return this.request(
      {
        url: '/purchase/suggestion/auto-forecast',
        method: 'post',
        data: { shopId, shopName },
      },
      { offlineQueue: false }
    )
  }

  async getStoreList(params) {
    return this.request(
      {
        url: '/store/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async getStoreDetail(id) {
    return this.request(
      {
        url: `/store/${id}`,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getStoreByCode(storeCode) {
    return this.request(
      {
        url: `/store/code/${storeCode}`,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getAllActiveStores() {
    return this.request(
      {
        url: '/store/all',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getStoreErpConfig(storeId) {
    return this.request(
      {
        url: `/store/${storeId}/erp-config`,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async saveStoreErpConfig(configData) {
    return this.request({
      url: '/store/erp-config',
      method: 'post',
      data: configData,
    })
  }

  async deleteStoreErpConfig(storeId) {
    return this.request({
      url: `/store/${storeId}/erp-config`,
      method: 'delete',
    })
  }

  async getStoreSyncOverview() {
    return this.request(
      {
        url: '/store/monitor/sync-overview',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getMyStoreSyncOverview() {
    return this.request(
      {
        url: '/store/monitor/my-sync-overview',
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async getStoreSyncOverviewById(storeId) {
    return this.request(
      {
        url: `/store/monitor/${storeId}/sync-overview`,
        method: 'get',
      },
      { offlineQueue: false }
    )
  }

  async refreshStoreSyncStatus() {
    return this.request({
      url: '/store/monitor/refresh-status',
      method: 'post',
    })
  }

  async triggerStoreAggregation(storeId, dataType) {
    return this.request({
      url: '/store/monitor/aggregate',
      method: 'post',
      params: { storeId, dataType },
    })
  }

  async triggerAllStoreAggregation(dataType) {
    return this.request({
      url: '/store/monitor/aggregate-all',
      method: 'post',
      params: { dataType },
    })
  }

  async getAggregationList(params) {
    return this.request(
      {
        url: '/store/monitor/aggregation/list',
        method: 'get',
        params,
      },
      { offlineQueue: false }
    )
  }

  async pushAggregationToErp(id) {
    return this.request({
      url: `/store/monitor/aggregation/${id}/push-erp`,
      method: 'post',
    })
  }

  async batchPushAggregationToErp() {
    return this.request({
      url: '/store/monitor/aggregation/batch-push-erp',
      method: 'post',
    })
  }

  async getHistoricalSalesForecast(params) {
    return this.request(
      {
        url: '/purchase/suggestion/forecast/historical-sales',
        method: 'get',
        params,
      },
      { offlineQueue: false, offlineData: null }
    )
  }

  get baseURL() {
    return baseURL
  }
}

export default new ApiService()

import axios from 'axios'
import db from '../utils/db'
import { message } from 'antd'
import { getToken, clearAuth } from '../utils/auth'

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
    const { offlineQueue = true, offlineData = null } = options

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE')
      }
      const response = await request(config)
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

  get baseURL() {
    return baseURL
  }
}

export default new ApiService()

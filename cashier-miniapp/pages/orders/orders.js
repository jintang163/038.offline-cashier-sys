const app = getApp()
const storage = require('../../utils/storage.js')
const { formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/format.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    orderList: [],
    activeTab: 'all',
    tabs: [],
    isLoading: false,
    i18n: {}
  },

  onLoad() {
    this.loadI18n()
    this.loadOrders()
    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
    })
  },

  onShow() {
    this.loadOrders()
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  loadI18n() {
    this.setData({
      i18n: i18n.getPageTranslations([
        'order.noOrders',
        'cart.goOrder',
        'order.orderNo',
        'common.total',
        'order.cancelOrder',
        'order.payNow',
        'order.reorder'
      ]),
      tabs: [
        { key: 'all', name: i18n.t('order.allOrders') },
        { key: 'pending', name: i18n.t('order.pendingPayment') },
        { key: 'preparing', name: i18n.t('order.preparing') },
        { key: 'completed', name: i18n.t('order.completed') }
      ]
    })
  },

  loadOrders() {
    this.setData({ isLoading: true })

    setTimeout(() => {
      let orders = storage.getOrders()

      if (this.data.activeTab !== 'all') {
        orders = orders.filter(item => item.status === this.data.activeTab)
      }

      const orderList = orders.map(order => ({
        ...order,
        statusText: getOrderStatusText(order.status),
        statusColor: getOrderStatusColor(order.status),
        createTimeText: formatDate(order.createTime),
        goodsCount: order.goods.reduce((sum, item) => sum + item.quantity, 0),
        firstGoods: order.goods[0] || {},
        moreGoodsText: i18n.t('order.moreGoods', order.goods.length),
        goodsCountText: i18n.t('order.goodsCount', order.goods.reduce((sum, item) => sum + item.quantity, 0))
      }))

      this.setData({
        orderList,
        isLoading: false
      })
    }, 300)
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab
    })
    this.loadOrders()
  },

  onOrderTap(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    })
  },

  onPayOrder(e) {
    const orderId = e.currentTarget.dataset.id
    const orders = storage.getOrders()
    const order = orders.find(item => item.id === orderId)

    if (order) {
      wx.showModal({
        title: i18n.t('common.tip'),
        content: i18n.t('order.confirmPay'),
        success: (res) => {
          if (res.confirm) {
            order.status = 'paid'
            order.updateTime = Date.now()
            storage.setOrders(orders)
            this.loadOrders()
            wx.showToast({
              title: i18n.t('payment.paySuccess'),
              icon: 'success'
            })
          }
        }
      })
    }
  },

  onCancelOrder(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: i18n.t('common.tip'),
      content: i18n.t('order.confirmCancel'),
      success: (res) => {
        if (res.confirm) {
          const orders = storage.getOrders()
          const order = orders.find(item => item.id === orderId)
          if (order) {
            order.status = 'cancelled'
            order.updateTime = Date.now()
            storage.setOrders(orders)
            this.loadOrders()
            wx.showToast({
              title: i18n.t('order.cancelled'),
              icon: 'success'
            })
          }
        }
      }
    })
  },

  onGoMenu() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  onRefresh() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 500)
  }
})

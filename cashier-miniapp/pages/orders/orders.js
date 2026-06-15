const app = getApp()
const storage = require('../../utils/storage.js')
const { formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/format.js')

Page({
  data: {
    orderList: [],
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待支付' },
      { key: 'preparing', name: '制作中' },
      { key: 'completed', name: '已完成' }
    ],
    isLoading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
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
        firstGoods: order.goods[0] || {}
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
        title: '提示',
        content: '确认支付该订单？',
        success: (res) => {
          if (res.confirm) {
            order.status = 'paid'
            order.updateTime = Date.now()
            storage.setOrders(orders)
            this.loadOrders()
            wx.showToast({
              title: '支付成功',
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
      title: '提示',
      content: '确定要取消该订单吗？',
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
              title: '已取消',
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

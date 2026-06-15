const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const { formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/format.js')

Page({
  data: {
    orderId: '',
    order: null,
    statusText: '',
    statusColor: '',
    createTimeText: '',
    goodsCount: 0
  },

  onLoad(options) {
    const orderId = options.id
    this.setData({ orderId })
    this.loadOrderDetail()
  },

  onShow() {
    if (this.data.orderId) {
      this.loadOrderDetail()
    }
  },

  loadOrderDetail() {
    const order = storage.getOrderById(this.data.orderId)

    if (order) {
      const goodsCount = order.goods.reduce((sum, item) => sum + item.quantity, 0)

      this.setData({
        order,
        statusText: getOrderStatusText(order.status),
        statusColor: getOrderStatusColor(order.status),
        createTimeText: formatDate(order.createTime),
        goodsCount
      })
    } else {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
    }
  },

  onPayOrder() {
    if (!this.data.order || this.data.order.status !== 'pending') return

    wx.showModal({
      title: '提示',
      content: '确认支付该订单？',
      success: (res) => {
        if (res.confirm) {
          const orders = storage.getOrders()
          const order = orders.find(item => item.id === this.data.orderId)
          if (order) {
            order.status = 'paid'
            order.updateTime = Date.now()
            storage.setOrders(orders)
            this.loadOrderDetail()
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            })
          }
        }
      }
    })
  },

  onCancelOrder() {
    if (!this.data.order || this.data.order.status !== 'pending') return

    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          const orders = storage.getOrders()
          const order = orders.find(item => item.id === this.data.orderId)
          if (order) {
            order.status = 'cancelled'
            order.updateTime = Date.now()
            storage.setOrders(orders)
            this.loadOrderDetail()
            wx.showToast({
              title: '已取消',
              icon: 'success'
            })
          }
        }
      }
    })
  },

  onReorder() {
    if (!this.data.order) return

    wx.showModal({
      title: '提示',
      content: '将商品加入购物车？',
      success: (res) => {
        if (res.confirm) {
          this.data.order.goods.forEach(item => {
            cart.addToCart(item, item.quantity)
          })

          wx.showToast({
            title: '已加入购物车',
            icon: 'success'
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/cart/cart'
            })
          }, 1500)
        }
      }
    })
  },

  onGoMenu() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  onCallPhone() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      fail: () => {
        wx.showToast({
          title: '拨号失败',
          icon: 'none'
        })
      }
    })
  }
})

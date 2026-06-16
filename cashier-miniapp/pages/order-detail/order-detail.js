const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const { formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/format.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    orderId: '',
    order: null,
    statusText: '',
    statusColor: '',
    createTimeText: '',
    goodsCount: 0,
    goodsCountText: '',
    i18n: {}
  },

  onLoad(options) {
    const orderId = options.id
    this.setData({ orderId })
    this.loadI18n()
    this.loadOrderDetail()
    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
      this.loadOrderDetail()
    })
  },

  onShow() {
    if (this.data.orderId) {
      this.loadOrderDetail()
    }
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  loadI18n() {
    this.setData({
      i18n: i18n.getPageTranslations([
        'order.payPrompt',
        'order.preparingPrompt',
        'order.completedPrompt',
        'order.cancelledPrompt',
        'order.tableNumber',
        'order.peopleCount',
        'common.person',
        'order.remark',
        'order.goodsDetail',
        'order.goodsSubtotal',
        'order.deliveryFee',
        'order.actualPay',
        'order.orderNo',
        'order.orderTime',
        'order.contactService',
        'order.cancelOrder',
        'order.payNow',
        'order.reorder',
        'order.backMenu',
        'order.orderNotExist'
      ])
    })
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
        goodsCount,
        goodsCountText: i18n.t('order.goodsCount', goodsCount)
      })
    } else {
      wx.showToast({
        title: i18n.t('order.orderNotExist'),
        icon: 'none'
      })
    }
  },

  onPayOrder() {
    if (!this.data.order || this.data.order.status !== 'pending') return

    wx.showModal({
      title: i18n.t('common.tip'),
      content: i18n.t('order.confirmPay'),
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
              title: i18n.t('payment.paySuccess'),
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
      title: i18n.t('common.tip'),
      content: i18n.t('order.confirmCancel'),
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
              title: i18n.t('order.cancelled'),
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
      title: i18n.t('common.tip'),
      content: i18n.t('order.addCartConfirm'),
      success: (res) => {
        if (res.confirm) {
          this.data.order.goods.forEach(item => {
            cart.addToCart(item, item.quantity)
          })

          wx.showToast({
            title: i18n.t('cart.addedCart'),
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
          title: i18n.t('common.fail'),
          icon: 'none'
        })
      }
    })
  }
})

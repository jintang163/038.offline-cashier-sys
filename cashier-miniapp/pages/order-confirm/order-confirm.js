const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const { generateOrderId, formatDate } = require('../../utils/format.js')
const { isOnline, showOfflineToast } = require('../../utils/network.js')

Page({
  data: {
    cartList: [],
    cartTotal: 0,
    tableNumber: '',
    remark: '',
    tableOptions: ['1号桌', '2号桌', '3号桌', '4号桌', '5号桌', '6号桌', '7号桌', '8号桌'],
    tablePickerIndex: -1,
    peopleCount: 1,
    isSubmitting: false
  },

  onLoad() {
    this.loadCartData()
    const savedTable = storage.getTableNumber()
    if (savedTable) {
      const index = this.data.tableOptions.indexOf(savedTable)
      this.setData({
        tableNumber: savedTable,
        tablePickerIndex: index >= 0 ? index : -1
      })
    }
  },

  loadCartData() {
    const cartList = storage.getCart()
    const cartTotal = cart.getCartTotal()

    this.setData({
      cartList,
      cartTotal
    })
  },

  onTableChange(e) {
    const index = e.detail.value
    this.setData({
      tablePickerIndex: index,
      tableNumber: this.data.tableOptions[index]
    })
  },

  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  onPeopleChange(e) {
    this.setData({
      peopleCount: e.detail.value
    })
  },

  onSubmitOrder() {
    if (!this.data.tableNumber) {
      wx.showToast({
        title: '请选择桌号',
        icon: 'none'
      })
      return
    }

    if (this.data.cartList.length === 0) {
      wx.showToast({
        title: '购物车是空的',
        icon: 'none'
      })
      return
    }

    if (this.data.isSubmitting) return

    this.setData({ isSubmitting: true })

    wx.showLoading({ title: '提交中...' })

    const order = this.createOrder()

    if (isOnline()) {
      this.submitOrderToServer(order)
    } else {
      this.saveOrderLocal(order)
    }
  },

  createOrder() {
    const orderId = generateOrderId()
    const now = Date.now()

    return {
      id: orderId,
      orderNo: orderId,
      tableNumber: this.data.tableNumber,
      peopleCount: this.data.peopleCount,
      remark: this.data.remark,
      goods: this.data.cartList.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity
      })),
      totalAmount: this.data.cartTotal,
      status: 'pending',
      createTime: now,
      updateTime: now
    }
  },

  submitOrderToServer(order) {
    setTimeout(() => {
      this.saveOrderLocal(order)
    }, 1500)
  },

  saveOrderLocal(order) {
    storage.addOrder(order)
    storage.setTableNumber(this.data.tableNumber)
    cart.clearCart()

    wx.hideLoading()
    this.setData({ isSubmitting: false })

    wx.showToast({
      title: '下单成功',
      icon: 'success',
      duration: 2000
    })

    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order-detail/order-detail?id=${order.id}`
      })
    }, 2000)
  },

  onGoBack() {
    wx.navigateBack()
  }
})

const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const { generateOrderId, formatDate } = require('../../utils/format.js')
const { isOnline, showOfflineToast } = require('../../utils/network.js')
const i18n = require('../../utils/i18n.js')
const exchangeRate = require('../../utils/exchangeRate.js')

Page({
  data: {
    cartList: [],
    cartTotal: 0,
    tableNumber: '',
    remark: '',
    tableOptions: ['1号桌', '2号桌', '3号桌', '4号桌', '5号桌', '6号桌', '7号桌', '8号桌'],
    tablePickerIndex: -1,
    peopleCount: 1,
    isSubmitting: false,
    selectedCurrency: 'CNY',
    foreignAmount: 0,
    currencySymbol: '¥',
    currentRate: 1,
    i18n: {},
    showPayOptions: false
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
    this.setData({
      selectedCurrency: exchangeRate.getSelectedCurrency()
    })
    this.loadI18n()
    this.calculateForeignAmount()

    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
    })
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  loadI18n() {
    this.setData({
      i18n: i18n.getPageTranslations([
        'common.confirm',
        'common.cancel',
        'common.back',
        'common.total',
        'order.createOrder',
        'order.tableNumber',
        'order.peopleCount',
        'order.remark',
        'order.totalAmount',
        'order.orderSuccess',
        'message.cartEmpty',
        'message.selectTable',
        'payment.payMethod',
        'payment.cashPayment',
        'payment.foreignCurrency',
        'payment.selectCurrency'
      ])
    })
  },

  loadCartData() {
    const cartList = storage.getCart()
    const cartTotal = cart.getCartTotal()

    this.setData({
      cartList,
      cartTotal
    })
  },

  calculateForeignAmount() {
    const { cartTotal, selectedCurrency } = this.data
    const rate = exchangeRate.getRate(selectedCurrency)
    if (selectedCurrency !== 'CNY' && rate) {
      const foreignAmount = exchangeRate.convertToSelectedCurrency(cartTotal)
      this.setData({
        foreignAmount,
        currencySymbol: rate.symbol,
        currentRate: rate.rateToCny
      })
    } else {
      this.setData({
        foreignAmount: cartTotal,
        currencySymbol: '¥',
        currentRate: 1
      })
    }
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

  onCurrencyChange(e) {
    const currency = e.detail.value
    this.setData({ selectedCurrency: currency })
    this.calculateForeignAmount()
  },

  onSubmitOrder() {
    if (!this.data.tableNumber) {
      wx.showToast({
        title: i18n.t('message.selectTable'),
        icon: 'none'
      })
      return
    }

    if (this.data.cartList.length === 0) {
      wx.showToast({
        title: i18n.t('message.cartEmpty'),
        icon: 'none'
      })
      return
    }

    if (this.data.isSubmitting) return

    this.setData({ showPayOptions: true })
  },

  onSelectPayMethod(e) {
    const payMethod = e.currentTarget.dataset.method
    this.setData({ showPayOptions: false })

    if (payMethod === 'foreign') {
      wx.navigateTo({
        url: `/pages/foreign-payment/foreign-payment?orderId=${Date.now()}&orderNo=${generateOrderId()}&amount=${this.data.cartTotal}`
      })
    } else {
      this.doSubmitOrder(payMethod)
    }
  },

  onClosePayOptions() {
    this.setData({ showPayOptions: false })
  },

  doSubmitOrder(payMethod) {
    this.setData({ isSubmitting: true })

    wx.showLoading({ title: i18n.t('common.loading') })

    const order = this.createOrder()

    if (isOnline()) {
      this.submitOrderToServer(order, payMethod)
    } else {
      this.saveOrderLocal(order, payMethod)
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

  submitOrderToServer(order, payMethod) {
    setTimeout(() => {
      this.saveOrderLocal(order, payMethod)
    }, 1500)
  },

  saveOrderLocal(order, payMethod) {
    storage.addOrder(order)
    storage.setTableNumber(this.data.tableNumber)
    cart.clearCart()

    wx.hideLoading()
    this.setData({ isSubmitting: false })

    wx.showToast({
      title: i18n.t('order.orderSuccess'),
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
  },

  onGoToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})

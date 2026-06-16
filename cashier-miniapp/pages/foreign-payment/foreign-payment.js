const i18n = require('../../utils/i18n.js')
const exchangeRate = require('../../utils/exchangeRate.js')
const storage = require('../../utils/storage.js')
const { isOnline } = require('../../utils/network.js')

Page({
  data: {
    orderId: '',
    orderNo: '',
    cnyAmount: 0,
    currencies: [],
    selectedCurrency: 'CNY',
    exchangeRate: 1,
    foreignRequired: 0,
    foreignReceived: '',
    foreignReceivedNum: 0,
    cnyReceived: 0,
    cnyChange: 0,
    foreignChange: 0,
    showCurrencyPicker: false,
    networkStatus: true,
    i18n: {},
    currencySymbol: '¥'
  },

  onLoad(options) {
    const orderId = options.orderId || ''
    const cnyAmount = parseFloat(options.amount) || 0
    const orderNo = options.orderNo || ''

    const savedCurrency = exchangeRate.getSelectedCurrency()

    this.setData({
      orderId,
      orderNo,
      cnyAmount,
      selectedCurrency: savedCurrency !== 'CNY' ? savedCurrency : 'USD'
    })

    this.loadCurrencies()
    this.calculatePayment()
    this.loadI18n()

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
        'payment.payMethod',
        'payment.cashPayment',
        'payment.foreignCurrency',
        'payment.exchangeRate',
        'payment.receivedAmount',
        'payment.changeAmount',
        'payment.convertedAmount',
        'payment.paySuccess',
        'payment.payFail',
        'payment.selectCurrency',
        'order.totalAmount',
        'order.orderNo'
      ])
    })
  },

  loadCurrencies() {
    const currencies = exchangeRate.getEnabledCurrencies()
    this.setData({ currencies })
  },

  calculatePayment() {
    const { cnyAmount, selectedCurrency, foreignReceivedNum } = this.data
    const rate = exchangeRate.getRate(selectedCurrency)

    if (!rate) {
      return
    }

    const foreignRequired = exchangeRate.convertFromCny(selectedCurrency, cnyAmount)

    let cnyReceived = 0
    let cnyChange = 0
    let foreignChange = 0

    if (foreignReceivedNum > 0) {
      const result = exchangeRate.calculateForeignCashPayment(
        cnyAmount,
        selectedCurrency,
        foreignReceivedNum
      )
      cnyReceived = result.cnyReceived
      cnyChange = result.cnyChange
      foreignChange = result.foreignChange
    }

    this.setData({
      exchangeRate: rate.rateToCny,
      currencySymbol: rate.symbol,
      foreignRequired,
      cnyReceived,
      cnyChange,
      foreignChange
    })
  },

  onSelectCurrencyTap() {
    this.setData({ showCurrencyPicker: true })
  },

  onCurrencySelect(e) {
    const currencyCode = e.currentTarget.dataset.code
    this.setData({
      selectedCurrency: currencyCode,
      foreignReceived: '',
      foreignReceivedNum: 0,
      showCurrencyPicker: false
    })
    this.calculatePayment()
  },

  onCloseCurrencyPicker() {
    this.setData({ showCurrencyPicker: false })
  },

  onAmountInput(e) {
    const value = e.detail.value
    const numValue = parseFloat(value) || 0

    this.setData({
      foreignReceived: value,
      foreignReceivedNum: numValue
    })

    this.calculatePayment()
  },

  onQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({
      foreignReceived: String(amount),
      foreignReceivedNum: parseFloat(amount)
    })
    this.calculatePayment()
  },

  onConfirmPayment() {
    const { foreignReceivedNum, foreignRequired, selectedCurrency, cnyAmount, orderId, orderNo } = this.data

    if (foreignReceivedNum <= 0) {
      wx.showToast({
        title: i18n.t('payment.receivedAmount') + i18n.t('common.fail'),
        icon: 'none'
      })
      return
    }

    if (selectedCurrency !== 'CNY' && foreignReceivedNum < foreignRequired) {
      wx.showModal({
        title: i18n.t('payment.foreignCurrency'),
        content: `${i18n.t('payment.receivedAmount')}${this.data.currencySymbol}${foreignReceivedNum} < ${i18n.t('payment.convertedAmount')}${this.data.currencySymbol}${foreignRequired.toFixed(2)}，${i18n.t('common.confirm')}？`,
        confirmText: i18n.t('common.confirm'),
        cancelText: i18n.t('common.cancel'),
        success: (res) => {
          if (res.confirm) {
            this.doPayment()
          }
        }
      })
      return
    }

    this.doPayment()
  },

  doPayment() {
    const {
      orderId,
      orderNo,
      cnyAmount,
      selectedCurrency,
      exchangeRate: currentRate,
      foreignRequired,
      foreignReceivedNum,
      cnyReceived,
      cnyChange,
      foreignChange
    } = this.data

    wx.showLoading({
      title: i18n.t('common.loading'),
      mask: true
    })

    setTimeout(() => {
      const rate = exchangeRate.getRate(selectedCurrency)
      const payType = selectedCurrency === 'CNY' ? 'CASH' : 'FOREIGN_CASH'

      const paymentRecord = {
        id: Date.now().toString(),
        orderId,
        orderNo,
        payType,
        payAmount: cnyAmount,
        foreignCurrency: selectedCurrency,
        foreignRate: rate ? rate.rateToCny : null,
        foreignAmount: foreignRequired,
        foreignReceived: foreignReceivedNum,
        foreignChange: foreignChange,
        cnyChange,
        payTime: Date.now(),
        status: 'success'
      }

      storage.addPaymentRecord(paymentRecord)

      const orders = storage.getOrders()
      const order = orders.find(item => item.id === orderId)
      if (order) {
        order.status = 'paid'
        order.payType = payType
        order.foreignCurrency = selectedCurrency
        order.foreignRate = rate ? rate.rateToCny : null
        order.foreignAmount = foreignRequired
        order.foreignReceived = foreignReceivedNum
        order.foreignChange = foreignChange
        order.updateTime = Date.now()
        storage.setOrders(orders)
      }

      if (isOnline()) {
        this.submitPaymentToServer(paymentRecord)
      }

      wx.hideLoading()

      wx.showModal({
        title: i18n.t('payment.paySuccess'),
        content: this.buildSuccessMessage(),
        showCancel: false,
        confirmText: i18n.t('common.confirm'),
        success: () => {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?id=${orderId}`
          })
        }
      })
    }, 500)
  },

  submitPaymentToServer(paymentRecord) {
    const app = getApp()
    if (!app || !app.globalData || !app.globalData.baseUrl) return

    wx.request({
      url: `${app.globalData.baseUrl}/api/order/${paymentRecord.orderId}/pay`,
      method: 'POST',
      data: {
        payType: paymentRecord.payType,
        payAmount: paymentRecord.payAmount,
        foreignCurrency: paymentRecord.foreignCurrency,
        foreignRate: paymentRecord.foreignRate,
        foreignAmount: paymentRecord.foreignAmount,
        foreignReceived: paymentRecord.foreignReceived,
        foreignChange: paymentRecord.foreignChange
      },
      timeout: 10000,
      success: (res) => {
        if (res && res.data && res.data.code === 0) {
          console.log('Foreign payment submitted to server')
        }
      },
      fail: () => {
        console.warn('Failed to submit foreign payment to server, will sync later')
      }
    })
  },

  buildSuccessMessage() {
    const {
      cnyAmount,
      selectedCurrency,
      currencySymbol,
      exchangeRate,
      foreignRequired,
      foreignReceivedNum,
      foreignChange,
      cnyChange
    } = this.data

    if (selectedCurrency === 'CNY') {
      return `${i18n.t('order.totalAmount')}: ¥${cnyAmount.toFixed(2)}\n${i18n.t('payment.receivedAmount')}: ¥${foreignReceivedNum.toFixed(2)}\n${i18n.t('payment.changeAmount')}: ¥${cnyChange.toFixed(2)}`
    }

    return `${i18n.t('order.totalAmount')}: ¥${cnyAmount.toFixed(2)}\n${i18n.t('payment.exchangeRate')}: 1 ${selectedCurrency} = ¥${exchangeRate}\n${i18n.t('payment.convertedAmount')}: ${currencySymbol}${foreignRequired.toFixed(2)}\n${i18n.t('payment.receivedAmount')}: ${currencySymbol}${foreignReceivedNum.toFixed(2)}\n${i18n.t('payment.changeAmount')}: ${currencySymbol}${foreignChange.toFixed(2)} (¥${cnyChange.toFixed(2)})`
  },

  onBack() {
    wx.navigateBack()
  }
})

const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const i18n = require('../../utils/i18n.js')
const exchangeRate = require('../../utils/exchangeRate.js')

Page({
  data: {
    categories: [],
    goodsList: [],
    currentCategoryId: 0,
    cartCount: 0,
    cartTotal: 0,
    cartTotalForeign: 0,
    isOnline: true,
    scrollToView: '',
    currentLanguage: 'zh-CN',
    currentCurrency: 'CNY',
    currencySymbol: '¥',
    i18n: {}
  },

  onLoad() {
    this.initData()
    this.loadI18n()
    this.loadCurrencyInfo()

    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
      this.loadCurrencyInfo()
    })
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  onShow() {
    this.updateCartInfo()
    this.updateGoodsQuantities()
    this.setData({
      isOnline: app.globalData.isOnline,
      currentLanguage: i18n.getLanguage(),
      currentCurrency: exchangeRate.getSelectedCurrency()
    })
  },

  loadI18n() {
    this.setData({
      i18n: i18n.getPageTranslations([
        'common.settings',
        'common.language',
        'common.currency',
        'common.total',
        'message.cartEmpty'
      ])
    })

    wx.setNavigationBarTitle({
      title: i18n.t('common.home') === 'Home' ? '扫码点餐' : '扫码点餐'
    })
  },

  loadCurrencyInfo() {
    const currency = exchangeRate.getSelectedCurrency()
    const rate = exchangeRate.getRate(currency)
    this.setData({
      currentCurrency: currency,
      currencySymbol: rate ? rate.symbol : '¥'
    })
  },

  initData() {
    const categories = app.getCategories()
    const goodsList = storage.getGoods()

    this.setData({
      categories,
      goodsList,
      currentCategoryId: categories[0] ? categories[0].id : 0
    })

    this.filterGoodsByCategory(this.data.currentCategoryId)
  },

  filterGoodsByCategory(categoryId) {
    const allGoods = storage.getGoods()
    const filteredGoods = allGoods.filter(item => item.categoryId === categoryId)
    const goodsWithQuantity = this.addQuantityToGoods(filteredGoods)
    this.setData({
      goodsList: goodsWithQuantity,
      currentCategoryId: categoryId
    })
  },

  addQuantityToGoods(goodsList) {
    return goodsList.map(goods => ({
      ...goods,
      quantity: cart.getCartItemQuantity(goods.id)
    }))
  },

  updateGoodsQuantities() {
    const goodsWithQuantity = this.addQuantityToGoods(this.data.goodsList)
    this.setData({
      goodsList: goodsWithQuantity
    })
  },

  updateCartInfo() {
    const cnyTotal = cart.getCartTotal()
    const foreignTotal = exchangeRate.convertToSelectedCurrency(cnyTotal)
    this.setData({
      cartCount: cart.getCartCount(),
      cartTotal: cnyTotal,
      cartTotalForeign: foreignTotal
    })
  },

  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id
    this.filterGoodsByCategory(categoryId)
  },

  onAddToCart(e) {
    const goods = e.detail.goods
    cart.addToCart(goods, 1)
    this.updateCartInfo()
    this.updateGoodsQuantities()

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000
    })
  },

  onMinusFromCart(e) {
    const goods = e.detail.goods
    const currentQuantity = cart.getCartItemQuantity(goods.id)
    if (currentQuantity > 0) {
      cart.updateQuantity(goods.id, currentQuantity - 1)
      this.updateCartInfo()
      this.updateGoodsQuantities()
    }
  },

  onGoToCart() {
    if (this.data.cartCount === 0) {
      wx.showToast({
        title: i18n.t('message.cartEmpty'),
        icon: 'none'
      })
      return
    }
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  },

  onGoToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  onRefresh() {
    if (!app.globalData.isOnline) {
      wx.showToast({
        title: '当前处于离线状态',
        icon: 'none'
      })
      wx.stopPullDownRefresh()
      return
    }

    wx.showLoading({ title: '加载中...' })

    setTimeout(() => {
      const mockGoods = app.getMockGoods()
      storage.setGoods(mockGoods)
      this.filterGoodsByCategory(this.data.currentCategoryId)
      wx.hideLoading()
      wx.stopPullDownRefresh()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    }, 1000)
  },

  onPullDownRefresh() {
    this.onRefresh()
  }
})

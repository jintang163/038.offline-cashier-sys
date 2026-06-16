const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    cartList: [],
    cartCount: 0,
    cartTotal: 0,
    isEdit: false,
    i18n: {}
  },

  onLoad() {
    this.loadI18n()
    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
    })
  },

  onShow() {
    this.loadCartData()
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  loadI18n() {
    const cartCount = cart.getCartCount()
    const translations = i18n.getPageTranslations([
      'common.tip',
      'common.confirm',
      'common.edit',
      'common.delete',
      'common.total',
      'cart.cartEmpty',
      'cart.clearCart',
      'cart.goOrder',
      'cart.goSettle',
      'cart.confirmDelete',
      'cart.confirmClear',
      'cart.removed',
      'cart.cleared',
      'message.cartEmpty'
    ])
    translations.cartCountText = i18n.tWithParams('cart.cartCount', { '0': cartCount })

    this.setData({ i18n: translations })
  },

  loadCartData() {
    const cartList = storage.getCart()
    const cartCount = cart.getCartCount()
    this.setData({
      cartList,
      cartCount,
      cartTotal: cart.getCartTotal()
    })
    const cartCountText = i18n.tWithParams('cart.cartCount', { '0': cartCount })
    this.setData({ 'i18n.cartCountText': cartCountText })
  },

  onQuantityChange(e) {
    const { id } = e.currentTarget.dataset
    const { quantity } = e.detail
    cart.updateQuantity(id, quantity)
    this.loadCartData()
  },

  onMinus(e) {
    const { id } = e.currentTarget.dataset
    const currentQuantity = cart.getCartItemQuantity(id)
    if (currentQuantity <= 1) {
      wx.showModal({
        title: i18n.t('common.tip'),
        content: i18n.t('cart.confirmDelete'),
        success: (res) => {
          if (res.confirm) {
            cart.removeFromCart(id)
            this.loadCartData()
          }
        }
      })
    } else {
      cart.updateQuantity(id, currentQuantity - 1)
      this.loadCartData()
    }
  },

  onAdd(e) {
    const { id, item } = e.currentTarget.dataset
    cart.addToCart(item, 1)
    this.loadCartData()
  },

  onDeleteItem(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: i18n.t('common.tip'),
      content: i18n.t('cart.confirmDelete'),
      success: (res) => {
        if (res.confirm) {
          cart.removeFromCart(id)
          this.loadCartData()
          wx.showToast({ title: i18n.t('cart.removed'), icon: 'success' })
        }
      }
    })
  },

  onClearCart() {
    if (this.data.cartList.length === 0) return
    wx.showModal({
      title: i18n.t('common.tip'),
      content: i18n.t('cart.confirmClear'),
      success: (res) => {
        if (res.confirm) {
          cart.clearCart()
          this.loadCartData()
          wx.showToast({ title: i18n.t('cart.cleared'), icon: 'success' })
        }
      }
    })
  },

  toggleEdit() {
    this.setData({ isEdit: !this.data.isEdit })
  },

  onSettle() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: i18n.t('message.cartEmpty'), icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' })
  },

  onGoMenu() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})

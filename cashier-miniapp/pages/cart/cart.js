const app = getApp()
const storage = require('../../utils/storage.js')
const cart = require('../../utils/cart.js')

Page({
  data: {
    cartList: [],
    cartCount: 0,
    cartTotal: 0,
    isEdit: false
  },

  onShow() {
    this.loadCartData()
  },

  loadCartData() {
    const cartList = storage.getCart()
    this.setData({
      cartList,
      cartCount: cart.getCartCount(),
      cartTotal: cart.getCartTotal()
    })
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
        title: '提示',
        content: '确定要删除该商品吗？',
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
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cart.removeFromCart(id)
          this.loadCartData()
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  onClearCart() {
    if (this.data.cartList.length === 0) return

    wx.showModal({
      title: '提示',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          cart.clearCart()
          this.loadCartData()
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  toggleEdit() {
    this.setData({
      isEdit: !this.data.isEdit
    })
  },

  onSettle() {
    if (this.data.cartCount === 0) {
      wx.showToast({
        title: '购物车是空的',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/order-confirm/order-confirm'
    })
  },

  onGoMenu() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})

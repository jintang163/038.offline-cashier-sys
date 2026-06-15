const storage = require('./storage.js')
const app = getApp()

function addToCart(goods, quantity = 1) {
  const cart = storage.getCart()
  const existingItem = cart.find(item => item.id === goods.id)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({
      id: goods.id,
      name: goods.name,
      price: goods.price,
      image: goods.image,
      quantity: quantity
    })
  }

  storage.setCart(cart)
  updateCartCount()
  return cart
}

function removeFromCart(goodsId) {
  const cart = storage.getCart()
  const newCart = cart.filter(item => item.id !== goodsId)
  storage.setCart(newCart)
  updateCartCount()
  return newCart
}

function updateQuantity(goodsId, quantity) {
  const cart = storage.getCart()
  const item = cart.find(item => item.id === goodsId)

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(goodsId)
    }
    item.quantity = quantity
  }

  storage.setCart(cart)
  updateCartCount()
  return cart
}

function getCartCount() {
  const cart = storage.getCart()
  let count = 0
  cart.forEach(item => {
    count += item.quantity
  })
  return count
}

function getCartTotal() {
  const cart = storage.getCart()
  let total = 0
  cart.forEach(item => {
    total += item.price * item.quantity
  })
  return total
}

function updateCartCount() {
  const count = getCartCount()
  app.globalData.cartCount = count

  if (count > 0) {
    wx.setTabBarBadge({
      index: 1,
      text: String(count)
    })
  } else {
    wx.removeTabBarBadge({
      index: 1
    })
  }
}

function clearCart() {
  storage.clearCart()
  updateCartCount()
}

function getCartItemQuantity(goodsId) {
  const cart = storage.getCart()
  const item = cart.find(item => item.id === goodsId)
  return item ? item.quantity : 0
}

module.exports = {
  addToCart,
  removeFromCart,
  updateQuantity,
  getCartCount,
  getCartTotal,
  updateCartCount,
  clearCart,
  getCartItemQuantity
}

const CART_KEY = 'cart'
const GOODS_KEY = 'goods'
const ORDERS_KEY = 'orders'
const TABLE_KEY = 'tableNumber'

function get(key, defaultValue = null) {
  try {
    const value = wx.getStorageSync(key)
    return value || defaultValue
  } catch (e) {
    console.error('getStorage error:', e)
    return defaultValue
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.error('setStorage error:', e)
    return false
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (e) {
    console.error('removeStorage error:', e)
    return false
  }
}

function getCart() {
  return get(CART_KEY, [])
}

function setCart(cart) {
  return set(CART_KEY, cart)
}

function clearCart() {
  return remove(CART_KEY)
}

function getGoods() {
  return get(GOODS_KEY, [])
}

function setGoods(goods) {
  return set(GOODS_KEY, goods)
}

function getOrders() {
  return get(ORDERS_KEY, [])
}

function setOrders(orders) {
  return set(ORDERS_KEY, orders)
}

function addOrder(order) {
  const orders = getOrders()
  orders.unshift(order)
  return setOrders(orders)
}

function getOrderById(orderId) {
  const orders = getOrders()
  return orders.find(item => item.id === orderId)
}

function getTableNumber() {
  return get(TABLE_KEY, '')
}

function setTableNumber(tableNumber) {
  return set(TABLE_KEY, tableNumber)
}

module.exports = {
  get,
  set,
  remove,
  getCart,
  setCart,
  clearCart,
  getGoods,
  setGoods,
  getOrders,
  setOrders,
  addOrder,
  getOrderById,
  getTableNumber,
  setTableNumber
}

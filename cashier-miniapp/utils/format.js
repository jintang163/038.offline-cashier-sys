function formatPrice(price) {
  if (price === undefined || price === null) return '0.00'
  return Number(price).toFixed(2)
}

function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

function generateOrderId() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`
}

function getOrderStatusText(status) {
  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    preparing: '制作中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

function getOrderStatusColor(status) {
  const colorMap = {
    pending: '#ff6b35',
    paid: '#1890ff',
    preparing: '#faad14',
    completed: '#52c41a',
    cancelled: '#999'
  }
  return colorMap[status] || '#333'
}

function debounce(func, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

module.exports = {
  formatPrice,
  formatDate,
  generateOrderId,
  getOrderStatusText,
  getOrderStatusColor,
  debounce,
  throttle
}

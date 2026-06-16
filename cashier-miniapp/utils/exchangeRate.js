const { isOnline } = require('./network.js')

const RATE_CACHE_KEY = 'exchange_rates'
const RATE_CACHE_TIME = 'exchange_rates_time'
const SELECTED_CURRENCY_KEY = 'selected_currency'
const DEFAULT_CURRENCY = 'CNY'
const CACHE_EXPIRE_MS = 4 * 60 * 60 * 1000

let cachedRates = null
let cachedRateMap = null
let cacheLoadTime = 0

const DEFAULT_CURRENCIES = [
  { code: 'CNY', name: '人民币', symbol: '¥', rateToCny: 1, rateFromCny: 1 },
  { code: 'USD', name: '美元', symbol: '$', rateToCny: 7.25, rateFromCny: 0.137931 },
  { code: 'JPY', name: '日元', symbol: '¥', rateToCny: 0.048, rateFromCny: 20.833333 },
  { code: 'EUR', name: '欧元', symbol: '€', rateToCny: 7.85, rateFromCny: 0.127389 },
  { code: 'GBP', name: '英镑', symbol: '£', rateToCny: 9.15, rateFromCny: 0.10929 },
  { code: 'HKD', name: '港币', symbol: 'HK$', rateToCny: 0.928, rateFromCny: 1.077586 },
  { code: 'TWD', name: '新台币', symbol: 'NT$', rateToCny: 0.228, rateFromCny: 4.385965 },
  { code: 'THB', name: '泰铢', symbol: '฿', rateToCny: 0.205, rateFromCny: 4.878049 },
  { code: 'KRW', name: '韩元', symbol: '₩', rateToCny: 0.0054, rateFromCny: 185.185185 }
]

function init() {
  try {
    const saved = wx.getStorageSync(RATE_CACHE_KEY)
    const savedTime = wx.getStorageSync(RATE_CACHE_TIME)
    if (saved && savedTime) {
      const now = Date.now()
      if (now - savedTime < CACHE_EXPIRE_MS) {
        cachedRates = saved
        cacheLoadTime = savedTime
        buildRateMap()
        return
      }
    }
  } catch (e) {
    console.warn('Failed to load cached rates', e)
  }

  cachedRates = DEFAULT_CURRENCIES
  cacheLoadTime = Date.now()
  buildRateMap()
  saveToStorage()
}

function buildRateMap() {
  cachedRateMap = {}
  cachedRates.forEach(rate => {
    cachedRateMap[rate.code] = rate
  })
}

function saveToStorage() {
  try {
    wx.setStorageSync(RATE_CACHE_KEY, cachedRates)
    wx.setStorageSync(RATE_CACHE_TIME, cacheLoadTime)
  } catch (e) {
    console.warn('Failed to save rates to storage', e)
  }
}

function getRates() {
  if (!cachedRates) {
    init()
  }
  return cachedRates
}

function getEnabledCurrencies() {
  return getRates().filter(r => r.rateToCny > 0)
}

function getRate(currencyCode) {
  if (!cachedRateMap) {
    init()
  }
  if (currencyCode === 'CNY') {
    return { code: 'CNY', name: '人民币', symbol: '¥', rateToCny: 1, rateFromCny: 1 }
  }
  return cachedRateMap[currencyCode] || null
}

function convertToCny(currencyCode, amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0
  }
  if (currencyCode === 'CNY') {
    return Number(amount)
  }
  const rate = getRate(currencyCode)
  if (rate) {
    return Number((amount * rate.rateToCny).toFixed(2))
  }
  return Number(amount)
}

function convertFromCny(currencyCode, amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0
  }
  if (currencyCode === 'CNY') {
    return Number(amount)
  }
  const rate = getRate(currencyCode)
  if (rate) {
    return Number((amount * rate.rateFromCny).toFixed(2))
  }
  return Number(amount)
}

function formatCurrency(amount, currencyCode) {
  const rate = getRate(currencyCode || getSelectedCurrency())
  const symbol = rate ? rate.symbol : ''
  const formatted = Number(amount).toFixed(2)
  return `${symbol}${formatted}`
}

function getSelectedCurrency() {
  try {
    return wx.getStorageSync(SELECTED_CURRENCY_KEY) || DEFAULT_CURRENCY
  } catch (e) {
    return DEFAULT_CURRENCY
  }
}

function setSelectedCurrency(currencyCode) {
  try {
    wx.setStorageSync(SELECTED_CURRENCY_KEY, currencyCode)
  } catch (e) {
    console.warn('Failed to save selected currency', e)
  }
}

function convertToSelectedCurrency(amount) {
  const currency = getSelectedCurrency()
  return convertFromCny(currency, amount)
}

function convertFromSelectedCurrency(amount) {
  const currency = getSelectedCurrency()
  return convertToCny(currency, amount)
}

function formatWithSelectedCurrency(amount) {
  const currency = getSelectedCurrency()
  const converted = convertToSelectedCurrency(amount)
  return formatCurrency(converted, currency)
}

async function syncRatesFromServer() {
  if (isOnline()) {
    try {
      const app = getApp()
      if (app && app.globalData && app.globalData.baseUrl) {
        return new Promise((resolve) => {
          wx.request({
            url: `${app.globalData.baseUrl}/api/exchange-rate/snapshot`,
            method: 'GET',
            timeout: 10000,
            success: (res) => {
              if (res && res.data && res.data.code === 0 && res.data.data) {
                const data = res.data.data
                if (data.rates && data.rates.length > 0) {
                  cachedRates = data.rates.map(r => ({
                    code: r.currencyCode,
                    name: r.currencyName,
                    symbol: r.currencySymbol,
                    rateToCny: Number(r.rateToCny),
                    rateFromCny: Number(r.rateFromCny)
                  }))
                  const cnyRate = cachedRates.find(r => r.code === 'CNY')
                  if (!cnyRate) {
                    cachedRates.unshift({ code: 'CNY', name: '人民币', symbol: '¥', rateToCny: 1, rateFromCny: 1 })
                  }
                  cacheLoadTime = Date.now()
                  buildRateMap()
                  saveToStorage()
                  console.log('Exchange rates synced from server')
                  resolve(true)
                  return
                }
              }
              resolve(false)
            },
            fail: () => {
              console.warn('Failed to sync rates from server')
              resolve(false)
            }
          })
        })
      }
    } catch (e) {
      console.warn('Failed to sync rates from server', e)
    }
  }
  return false
}

function isCacheExpired() {
  return Date.now() - cacheLoadTime >= CACHE_EXPIRE_MS
}

function getCacheInfo() {
  return {
    loaded: cachedRates !== null,
    count: cachedRates ? cachedRates.length : 0,
    loadTime: cacheLoadTime,
    expired: isCacheExpired()
  }
}

function calculateForeignCashPayment(cnyAmount, foreignCurrency, foreignAmountReceived) {
  const rate = getRate(foreignCurrency)
  if (!rate) {
    throw new Error('Unsupported currency: ' + foreignCurrency)
  }

  const foreignRequired = convertFromCny(foreignCurrency, cnyAmount)
  const foreignReceived = Number(foreignAmountReceived)
  const cnyReceived = convertToCny(foreignCurrency, foreignReceived)
  const cnyChange = cnyReceived - cnyAmount
  const foreignChange = convertFromCny(foreignCurrency, Math.max(0, cnyChange))

  return {
    cnyAmount,
    foreignCurrency,
    rate: rate.rateToCny,
    foreignRequired,
    foreignReceived,
    cnyReceived,
    cnyChange,
    foreignChange
  }
}

init()

module.exports = {
  init,
  getRates,
  getEnabledCurrencies,
  getRate,
  convertToCny,
  convertFromCny,
  formatCurrency,
  getSelectedCurrency,
  setSelectedCurrency,
  convertToSelectedCurrency,
  convertFromSelectedCurrency,
  formatWithSelectedCurrency,
  syncRatesFromServer,
  isCacheExpired,
  getCacheInfo,
  calculateForeignCashPayment
}

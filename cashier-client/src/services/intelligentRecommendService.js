import db from '../db/dexie'

const CACHE_TTL_HOURS = 2
const SAFETY_FACTOR = 1.2

class IntelligentRecommendService {
  constructor() {
    this._cache = new Map()
    this._cacheTimestamps = new Map()
  }

  _getCache(key) {
    const data = this._cache.get(key)
    const ts = this._cacheTimestamps.get(key)
    if (!data || !ts) return null
    if (Date.now() - ts > CACHE_TTL_HOURS * 3600 * 1000) return null
    return data
  }

  _setCache(key, data) {
    this._cache.set(key, data)
    this._cacheTimestamps.set(key, Date.now())
  }

  async getHotProducts(days = 7, limit = 20) {
    const cacheKey = `hot:${days}:${limit}`
    const cached = this._getCache(cacheKey)
    if (cached) return cached

    const dbCache = await db.getRecommendCache('hot_products', `${days}d`)
    if (dbCache && dbCache.length > 0) {
      const result = dbCache.slice(0, limit)
      this._setCache(cacheKey, result)
      return result
    }

    const ranking = await db.getProductSalesRanking(days, 100)
    const products = await db.getProducts({ pageSize: 1000 })
    const productMap = new Map(
      (products.items || products).map((p) => [p.id, p])
    )

    const result = ranking.map((r) => {
      const product = productMap.get(r.product_id) || {}
      return {
        ...r,
        stock: product.stock || 0,
        image: product.image || r.image,
        category_id: product.category_id || r.category_id,
        price: product.price || r.price,
        barcode: product.barcode,
        status: product.status ?? 1,
        is_low_stock: (product.stock || 0) <= 10,
        confidence: this._calculateConfidence(r.order_count, days),
      }
    })

    await db.setRecommendCache('hot_products', `${days}d`, result, CACHE_TTL_HOURS)
    const limited = result.slice(0, limit)
    this._setCache(cacheKey, limited)
    return limited
  }

  async getFrequentlyBoughtTogether(productId, days = 14, limit = 6) {
    const cacheKey = `fbt:${productId}:${days}:${limit}`
    const cached = this._getCache(cacheKey)
    if (cached) return cached

    const orderGroups = await db.getOrderItemGroups(days)
    const coOccurrence = new Map()
    const productInfo = new Map()

    let targetCount = 0
    for (const items of orderGroups) {
      const hasTarget = items.some((i) => i.product_id === productId)
      if (!hasTarget) continue
      targetCount++
      for (const item of items) {
        if (item.product_id === productId) continue
        const key = item.product_id
        if (!coOccurrence.has(key)) {
          coOccurrence.set(key, 0)
          productInfo.set(key, {
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
          })
        }
        coOccurrence.set(key, coOccurrence.get(key) + 1)
      }
    }

    if (targetCount === 0) {
      this._setCache(cacheKey, [])
      return []
    }

    const ranked = Array.from(coOccurrence.entries())
      .map(([pid, count]) => {
        const info = productInfo.get(pid) || {}
        const support = count / targetCount
        return {
          ...info,
          co_occurrence_count: count,
          support_ratio: Number(support.toFixed(4)),
          confidence: this._calculateConfidence(count, days),
        }
      })
      .sort((a, b) => b.co_occurrence_count - a.co_occurrence_count)
      .slice(0, limit)

    this._setCache(cacheKey, ranked)
    return ranked
  }

  async getRecommendedForCart(cartItems, days = 14, limit = 6) {
    if (!cartItems || cartItems.length === 0) {
      return await this.getHotProducts(days, limit)
    }

    const cartIds = new Set(cartItems.map((i) => i.id || i.product_id))
    const allRecommendations = new Map()

    for (const item of cartItems) {
      const pid = item.id || item.product_id
      const fbt = await this.getFrequentlyBoughtTogether(pid, days, limit * 2)
      for (const rec of fbt) {
        if (cartIds.has(rec.product_id)) continue
        if (!allRecommendations.has(rec.product_id)) {
          allRecommendations.set(rec.product_id, {
            ...rec,
            score: 0,
            source_count: 0,
          })
        }
        const r = allRecommendations.get(rec.product_id)
        r.score += rec.co_occurrence_count * (rec.support_ratio || 0.1)
        r.source_count++
      }
    }

    const result = Array.from(allRecommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return result
  }

  async getStockForecast(days = 14, forecastDays = 7) {
    const cacheKey = `forecast:${days}:${forecastDays}`
    const cached = this._getCache(cacheKey)
    if (cached) return cached

    const dbCache = await db.getStockForecast()
    if (dbCache && dbCache.length > 0) {
      this._setCache(cacheKey, dbCache)
      return dbCache
    }

    const salesRanking = await db.getProductSalesRanking(days, 500)
    const products = await db.getProducts({ pageSize: 1000 })
    const productMap = new Map(
      (products.items || products).map((p) => [p.id, p])
    )

    const dailyAvg = salesRanking.map((s) => ({
      ...s,
      daily_avg: s.total_quantity / days,
    }))

    const forecastList = dailyAvg
      .filter((s) => s.daily_avg > 0.1)
      .map((s) => {
        const product = productMap.get(s.product_id) || {}
        const currentStock = product.stock || 0
        const forecastQty = Math.ceil(s.daily_avg * forecastDays * SAFETY_FACTOR)
        const shortage = Math.max(0, forecastQty - currentStock)
        const suggestedPurchase = shortage > 0 ? Math.ceil(shortage * 1.1) : 0
        const daysUntilStockout = currentStock > 0 && s.daily_avg > 0
          ? Math.floor(currentStock / s.daily_avg)
          : 0

        return {
          product_id: s.product_id,
          product_name: s.product_name,
          erp_goods_id: s.erp_goods_id,
          total_sold: s.total_quantity,
          order_count: s.order_count,
          daily_avg: Number(s.daily_avg.toFixed(2)),
          forecast_days: forecastDays,
          forecast_qty: forecastQty,
          current_stock: currentStock,
          shortage: shortage,
          suggested_purchase: suggestedPurchase,
          days_until_stockout: daysUntilStockout,
          confidence: this._calculateConfidence(s.order_count, days),
          stock_status: shortage > 0
            ? (daysUntilStockout <= 1 ? 'critical' : 'warning')
            : 'normal',
          price: product.price || s.price,
          image: product.image || s.image,
          category_id: product.category_id,
        }
      })
      .sort((a, b) => b.shortage - a.shortage || b.daily_avg - a.daily_avg)

    await db.saveStockForecast(forecastList)
    this._setCache(cacheKey, forecastList)
    return forecastList
  }

  async getLowStockAlert(threshold = 10) {
    const products = await db.getLowStockProducts(threshold)
    const forecast = await this.getStockForecast(7, 3)
    const forecastMap = new Map(forecast.map((f) => [f.product_id, f]))

    return products
      .map((p) => {
        const f = forecastMap.get(p.id) || {}
        return {
          ...p,
          daily_avg: f.daily_avg || 0,
          days_until_stockout: f.days_until_stockout || 0,
          forecast_qty: f.forecast_qty || 0,
          suggested_purchase: f.suggested_purchase || 0,
          urgency: this._getStockUrgency(p.stock, f.daily_avg),
        }
      })
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const ua = urgencyOrder[a.urgency] || 3
        const ub = urgencyOrder[b.urgency] || 3
        if (ua !== ub) return ua - ub
        return (a.stock || 0) - (b.stock || 0)
      })
  }

  async getQuickAddRecommendations(limit = 8) {
    const hot = await this.getHotProducts(7, limit * 2)
    const products = await db.getProducts({ pageSize: 1000 })
    const productMap = new Map(
      (products.items || products).map((p) => [p.id, p])
    )

    return hot
      .filter((h) => {
        const p = productMap.get(h.product_id)
        return p && p.status === 1 && (p.stock || 0) > 0
      })
      .slice(0, limit)
      .map((h) => ({
        id: h.product_id,
        product_id: h.product_id,
        product_name: h.product_name,
        price: h.price,
        image: h.image,
        stock: h.stock,
        total_sold: h.total_quantity,
        is_hot: true,
      }))
  }

  async getCategoryHotProducts(categoryId, limit = 10) {
    const hot = await this.getHotProducts(7, 100)
    return hot
      .filter((h) => h.category_id === categoryId || !categoryId)
      .slice(0, limit)
  }

  async getTimeBasedRecommendation() {
    const hour = new Date().getHours()
    const day = new Date().getDay()

    let period = 'general'
    if (hour >= 6 && hour < 10) period = 'breakfast'
    else if (hour >= 10 && hour < 14) period = 'lunch'
    else if (hour >= 14 && hour < 17) period = 'afternoon'
    else if (hour >= 17 && hour < 21) period = 'dinner'
    else if (hour >= 21 || hour < 6) period = 'night'

    const isWeekend = day === 0 || day === 6

    const hot = await this.getHotProducts(isWeekend ? 14 : 7, 20)
    return {
      period,
      is_weekend: isWeekend,
      label: this._getPeriodLabel(period, isWeekend),
      products: hot,
    }
  }

  _getPeriodLabel(period, isWeekend) {
    const labels = {
      breakfast: '早餐热销',
      lunch: '午餐热门',
      afternoon: '下午茶推荐',
      dinner: '晚餐热销',
      night: '深夜推荐',
      general: '今日热销',
    }
    const weekendPrefix = isWeekend ? '周末' : ''
    return weekendPrefix + (labels[period] || labels.general)
  }

  _calculateConfidence(orderCount, days) {
    const base = Math.min(orderCount / (days * 5), 1)
    return Number((0.3 + base * 0.7).toFixed(2))
  }

  _getStockUrgency(stock, dailyAvg) {
    if (stock <= 0) return 'critical'
    if (!dailyAvg || dailyAvg <= 0) return stock <= 5 ? 'high' : 'medium'
    const daysLeft = stock / dailyAvg
    if (daysLeft <= 1) return 'critical'
    if (daysLeft <= 3) return 'high'
    if (daysLeft <= 7) return 'medium'
    return 'low'
  }

  invalidateCache() {
    this._cache.clear()
    this._cacheTimestamps.clear()
    db.clearRecommendCache().catch((e) => console.warn('Clear recommend cache failed:', e))
  }

  async refreshAll(days = 14, forecastDays = 7) {
    this.invalidateCache()
    await Promise.all([
      this.getHotProducts(days, 100),
      this.getStockForecast(days, forecastDays),
      this.getTimeBasedRecommendation(),
    ])
    return true
  }
}

const intelligentRecommendService = new IntelligentRecommendService()
export default intelligentRecommendService

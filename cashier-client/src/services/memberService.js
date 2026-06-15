import db from '../db/dexie'
import api from '../api/request'

class MemberLRUCache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize
    this.cache = new Map()
    this.listeners = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
    this._emit('change', { key, value })
  }

  has(key) {
    return this.cache.has(key)
  }

  delete(key) {
    const existed = this.cache.delete(key)
    if (existed) this._emit('change', { key, deleted: true })
    return existed
  }

  clear() {
    this.cache.clear()
    this._emit('clear')
  }

  size() {
    return this.cache.size
  }

  keys() {
    return Array.from(this.cache.keys())
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error('MemberLRUCache listener error:', e)
        }
      })
    }
  }
}

class MemberService {
  constructor() {
    this.memberCache = new MemberLRUCache(1000)
    this.cardCache = new MemberLRUCache(200)
    this.currentMember = null
    this._birthdayReminderShown = new Set()
  }

  _cacheKey(type, value) {
    return `${type}:${value}`
  }

  async searchMember(keyword) {
    if (!keyword) return null

    const isPhone = /^\d{11}$/.test(keyword)
    const cacheKey = this._cacheKey(isPhone ? 'phone' : 'card', keyword)

    if (this.memberCache.has(cacheKey)) {
      const cached = this.memberCache.get(cacheKey)
      if (cached) {
        this._setCurrentMember(cached)
        return cached
      }
    }

    let member = null
    try {
      if (navigator.onLine) {
        try {
          const res = isPhone
            ? await api.getMemberByPhone(keyword)
            : await api.getMemberByCardNo(keyword)
          member = res?.data || null
          if (member) {
            await db.bulkUpsertMembers([member])
            const cards = await api.getMemberCards(member.id)
            if (cards?.data) {
              await db.bulkUpsertMemberCards(cards.data)
            }
          }
        } catch (e) {
          console.warn('Remote member search failed, falling back to local:', e)
        }
      }
    } catch (e) {
      console.warn('Online member search failed:', e)
    }

    if (!member) {
      member = await db.searchMember(keyword)
    }

    if (member) {
      this.memberCache.set(cacheKey, member)
      if (member.phone) {
        this.memberCache.set(this._cacheKey('phone', member.phone), member)
      }
      if (member.card_no) {
        this.memberCache.set(this._cacheKey('card', member.card_no), member)
      }
      this._setCurrentMember(member)
    }

    return member
  }

  async getMemberById(id) {
    const cacheKey = this._cacheKey('id', id)
    if (this.memberCache.has(cacheKey)) {
      return this.memberCache.get(cacheKey)
    }
    let member = await db.getMemberById(id)
    if (!member && navigator.onLine) {
      try {
        const res = await api.getMemberDetail(id)
        member = res?.data || null
        if (member) {
          await db.bulkUpsertMembers([member])
        }
      } catch (e) {
        console.warn('Remote getMemberById failed:', e)
      }
    }
    if (member) {
      this.memberCache.set(cacheKey, member)
    }
    return member
  }

  async getMemberByPhone(phone) {
    return this.searchMember(phone)
  }

  async getMemberByCardNo(cardNo) {
    return this.searchMember(cardNo)
  }

  setCurrentMember(member) {
    this._setCurrentMember(member)
  }

  _setCurrentMember(member) {
    this.currentMember = member
    this._emit('memberChange', member)
  }

  clearCurrentMember() {
    this.currentMember = null
    this._emit('memberChange', null)
  }

  getCurrentMember() {
    return this.currentMember
  }

  async calculatePoints(memberId, amount) {
    const rules = await db.getPointRules()
    const member = await this.getMemberById(memberId)
    let totalPoints = 0
    const ruleDetails = []

    for (const rule of rules) {
      if (rule.min_amount !== undefined && rule.min_amount !== null && amount < rule.min_amount) {
        continue
      }
      if (rule.max_amount !== undefined && rule.max_amount !== null && amount > rule.max_amount) {
        continue
      }

      let points = 0
      switch (rule.rule_type) {
        case 1:
          points = Math.floor(amount / rule.rule_value) * 1
          break
        case 2:
          points = Math.floor(amount * rule.rule_value)
          break
        case 3:
          points = rule.rule_value
          break
        case 4:
          const levelMultiplier = member?.level?.discount_rate
            ? 1 / (member.level.discount_rate / 100)
            : 1
          points = Math.floor(amount * rule.rule_value * levelMultiplier)
          break
        default:
          points = Math.floor(amount)
      }

      if (points > 0) {
        totalPoints += points
        ruleDetails.push({ rule, points })
      }
    }

    return {
      totalPoints,
      ruleDetails,
      basePoints: Math.floor(amount),
    }
  }

  async addPoints(memberId, amount, orderNo, remark = '') {
    const member = await this.getMemberById(memberId)
    if (!member) throw new Error('会员不存在')

    const { totalPoints } = await this.calculatePoints(memberId, amount)
    if (totalPoints <= 0) return { points: 0, recordId: null }

    const beforePoints = member.points || 0
    const afterPoints = beforePoints + totalPoints

    await db.updateMemberPoints(memberId, totalPoints)

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const recordId = await db.addPointRecord({
      member_id: memberId,
      phone: member.phone,
      change_type: 1,
      change_points: totalPoints,
      before_points: beforePoints,
      after_points: afterPoints,
      order_no: orderNo,
      source_type: 1,
      remark: remark || `消费¥${amount.toFixed(2)}赠送积分`,
      cashier_id: userInfo.id || null,
    })

    member.points = afterPoints
    this._updateMemberCache(member)
    this._setCurrentMember(member)

    return { points: totalPoints, recordId, beforePoints, afterPoints }
  }

  async deductPoints(memberId, points, orderNo, remark = '') {
    const member = await this.getMemberById(memberId)
    if (!member) throw new Error('会员不存在')

    const beforePoints = member.points || 0
    if (beforePoints < points) {
      throw new Error('会员积分不足')
    }

    const afterPoints = beforePoints - points
    await db.updateMemberPoints(memberId, -points)

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const recordId = await db.addPointRecord({
      member_id: memberId,
      phone: member.phone,
      change_type: 2,
      change_points: points,
      before_points: beforePoints,
      after_points: afterPoints,
      order_no: orderNo,
      source_type: 1,
      remark: remark || `积分抵扣：${points}积分`,
      cashier_id: userInfo.id || null,
    })

    member.points = afterPoints
    this._updateMemberCache(member)
    this._setCurrentMember(member)

    return { points, recordId, beforePoints, afterPoints }
  }

  async getMemberCards(memberId) {
    let cards = await db.getMemberCards(memberId)
    if (cards.length === 0 && navigator.onLine && memberId) {
      try {
        const res = await api.getMemberCards(memberId)
        cards = res?.data || []
        if (cards.length > 0) {
          await db.bulkUpsertMemberCards(cards)
        }
      } catch (e) {
        console.warn('Remote getMemberCards failed:', e)
      }
    }
    for (const card of cards) {
      this.cardCache.set(this._cacheKey('card', card.card_no), card)
    }
    return cards
  }

  async payByCard(cardId, amount, orderNo) {
    if (navigator.onLine) {
      try {
        const res = await api.memberCardPay({ cardId, amount, orderNo })
        const result = res?.data || {}
        const card = await db.getMemberCardByCardNo(
          result.cardNo || (await db.member_cards.get(cardId))?.card_no
        )
        if (card && result.balance !== undefined) {
          await db.member_cards.update(card.id, {
            balance: result.balance,
            reserved_balance: result.reserved || 0,
            sync_status: 1,
          })
          if (card.member_id) {
            const member = await this.getMemberById(card.member_id)
            if (member) {
              member.balance = result.balance
              this._updateMemberCache(member)
              this._setCurrentMember(member)
            }
          }
        }
        return { success: true, balance: result.balance, fromServer: true }
      } catch (e) {
        console.warn('Server card pay failed, falling back to local:', e)
        if (e.message?.includes('OFFLINE') || e.code === 'ERR_NETWORK') {
          return this._payByCardLocal(cardId, amount, orderNo)
        }
        throw e
      }
    } else {
      return this._payByCardLocal(cardId, amount, orderNo)
    }
  }

  async _payByCardLocal(cardId, amount, orderNo) {
    await this.reserveCardBalance(cardId, amount, orderNo)
    const result = await this.consumeCardBalance(cardId, amount, orderNo)
    return { success: true, balance: result.balance, fromServer: false }
  }

  async reserveCardBalance(cardId, amount, orderNo) {
    await db.reserveCardBalance(cardId, amount, orderNo)
    return true
  }

  async consumeCardBalance(cardId, amount, orderNo) {
    const card = await db.getMemberCardByCardNo(cardId) || await (async () => {
      const cards = await db.getMemberCards()
      return cards.find((c) => c.id === cardId)
    })()

    if (!card) throw new Error('储值卡不存在')

    const finalBalance = await db.consumeReservedBalance(cardId, amount, orderNo)

    if (card.member_id) {
      const member = await this.getMemberById(card.member_id)
      if (member) {
        member.balance = finalBalance
        this._updateMemberCache(member)
      }
    }

    return { balance: finalBalance, card }
  }

  async releaseCardBalance(cardId, amount) {
    return await db.releaseReservedBalance(cardId, amount)
  }

  async getMemberLevels() {
    let levels = await db.getMemberLevels()
    if (levels.length === 0 && navigator.onLine) {
      try {
        const res = await api.getMemberLevels()
        levels = res?.data || []
        if (levels.length > 0) {
          await db.bulkUpsertMemberLevels(levels)
        }
      } catch (e) {
        console.warn('Remote getMemberLevels failed:', e)
      }
    }
    return levels
  }

  async getBirthdayMembers(days = 7) {
    let members = []
    try {
      if (navigator.onLine) {
        const res = await api.getBirthdayMembers(days)
        members = res?.data || []
      }
    } catch (e) {
      console.warn('Remote getBirthdayMembers failed, using local:', e)
    }

    if (members.length === 0) {
      members = await db.getBirthdayMembers(days)
    }
    return members
  }

  checkBirthdayReminder(member) {
    if (!member || !member.birthday) return false
    const today = new Date()
    const bd = new Date(member.birthday)
    const todayStr = `${today.getMonth() + 1}/${today.getDate()}`
    const bdStr = `${bd.getMonth() + 1}/${bd.getDate()}`

    const reminderKey = `${member.id}:${today.getFullYear()}-${todayStr}`
    if (this._birthdayReminderShown.has(reminderKey)) return false

    const diffDays = this._getDaysToBirthday(bd, today)
    if (diffDays >= 0 && diffDays <= 7) {
      this._birthdayReminderShown.add(reminderKey)
      return true
    }
    return false
  }

  _getDaysToBirthday(birthday, today) {
    const thisYearBd = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    const nextYearBd = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate())
    const diffThisYear = Math.ceil((thisYearBd - today) / (1000 * 60 * 60 * 24))
    const diffNextYear = Math.ceil((nextYearBd - today) / (1000 * 60 * 60 * 24))
    return diffThisYear >= 0 ? diffThisYear : diffNextYear
  }

  _updateMemberCache(member) {
    if (member.id) {
      this.memberCache.set(this._cacheKey('id', member.id), member)
    }
    if (member.phone) {
      this.memberCache.set(this._cacheKey('phone', member.phone), member)
    }
    if (member.card_no) {
      this.memberCache.set(this._cacheKey('card', member.card_no), member)
    }
  }

  on(event, callback) {
    if (!this._listeners) this._listeners = new Map()
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this._listeners?.has(event)) {
      this._listeners.get(event).delete(callback)
    }
  }

  _emit(event, data) {
    if (this._listeners?.has(event)) {
      this._listeners.get(event).forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error('MemberService listener error:', e)
        }
      })
    }
  }

  clearCache() {
    this.memberCache.clear()
    this.cardCache.clear()
  }
}

const memberService = new MemberService()
export default memberService

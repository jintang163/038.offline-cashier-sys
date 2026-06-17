import db from '../db/dexie'
import api from '../api/request'
import { getUserInfo } from '../utils/auth'

const DEFAULT_RULES = [
  {
    id: 1,
    rule_code: 'RULE-REFUND-FREQ-001',
    rule_name: '15分钟内退款超过5次',
    rule_type: 'REFUND_FREQUENCY',
    threshold_value: 5,
    threshold_unit: 'TIMES',
    time_window: 15,
    risk_level: 2,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 2,
    rule_code: 'RULE-REFUND-FREQ-002',
    rule_name: '1小时内退款超过10次',
    rule_type: 'REFUND_FREQUENCY',
    threshold_value: 10,
    threshold_unit: 'TIMES',
    time_window: 60,
    risk_level: 3,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 3,
    rule_code: 'RULE-REFUND-AMT-001',
    rule_name: '单笔退款超过500元',
    rule_type: 'REFUND_AMOUNT',
    threshold_value: 500,
    threshold_unit: 'AMOUNT',
    time_window: 1,
    risk_level: 2,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 4,
    rule_code: 'RULE-REFUND-AMT-002',
    rule_name: '单笔退款超过2000元',
    rule_type: 'REFUND_AMOUNT',
    threshold_value: 2000,
    threshold_unit: 'AMOUNT',
    time_window: 1,
    risk_level: 3,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 5,
    rule_code: 'RULE-REFUND-AMT-003',
    rule_name: '1小时内累计退款超过3000元',
    rule_type: 'REFUND_AMOUNT',
    threshold_value: 3000,
    threshold_unit: 'AMOUNT',
    time_window: 60,
    risk_level: 3,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 6,
    rule_code: 'RULE-DISCOUNT-001',
    rule_name: '折扣低于7折',
    rule_type: 'ABNORMAL_DISCOUNT',
    threshold_value: 70,
    threshold_unit: 'PERCENT',
    time_window: 1,
    risk_level: 2,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 7,
    rule_code: 'RULE-DISCOUNT-002',
    rule_name: '折扣低于5折',
    rule_type: 'ABNORMAL_DISCOUNT',
    threshold_value: 50,
    threshold_unit: 'PERCENT',
    time_window: 1,
    risk_level: 3,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
  {
    id: 8,
    rule_code: 'RULE-DISCOUNT-003',
    rule_name: '1小时内3单以上低于8折',
    rule_type: 'ABNORMAL_DISCOUNT',
    threshold_value: 3,
    threshold_unit: 'TIMES',
    time_window: 60,
    risk_level: 2,
    lock_operation: 1,
    require_online_verify: 1,
    status: 1,
  },
]

class FraudDetectionService {
  constructor() {
    this.rulesLoaded = false
    this.lockListeners = new Set()
  }

  async init() {
    if (this.rulesLoaded) return
    try {
      await this.loadRules()
      this.rulesLoaded = true
    } catch (error) {
      console.warn('初始化反欺诈规则失败，使用默认规则:', error)
      await this.useDefaultRules()
      this.rulesLoaded = true
    }
  }

  async loadRules() {
    try {
      if (navigator.onLine) {
        const response = await api.getFraudDetectionRules()
        if (response?.code === 0 && response?.data) {
          await db.saveFraudDetectionRules(response.data)
          return
        }
      }
      const localRules = await db.getFraudDetectionRules()
      if (localRules.length === 0) {
        await this.useDefaultRules()
      }
    } catch (error) {
      console.warn('加载反欺诈规则失败:', error)
      const localRules = await db.getFraudDetectionRules()
      if (localRules.length === 0) {
        await this.useDefaultRules()
      }
    }
  }

  async useDefaultRules() {
    await db.saveFraudDetectionRules(DEFAULT_RULES)
  }

  async getRules(ruleType = null) {
    await this.init()
    return await db.getFraudDetectionRules(ruleType)
  }

  async checkRefundRisk(refundAmount, orderId = null) {
    await this.init()
    const rules = await this.getRules()
    const triggeredRules = []

    for (const rule of rules) {
      if (rule.status !== 1) continue

      let isTriggered = false
      let currentValue = 0
      let lockDetails = {}

      switch (rule.rule_type) {
        case 'REFUND_FREQUENCY': {
          const recentRefunds = await db.getRecentRefunds(rule.time_window)
          currentValue = recentRefunds.length + 1
          isTriggered = currentValue > rule.threshold_value
          lockDetails = {
            recentRefundCount: recentRefunds.length,
            timeWindow: rule.time_window,
            threshold: rule.threshold_value,
          }
          break
        }
        case 'REFUND_AMOUNT': {
          if (rule.time_window === 1) {
            currentValue = parseFloat(refundAmount) || 0
            isTriggered = currentValue > rule.threshold_value
            lockDetails = {
              refundAmount: currentValue,
              threshold: rule.threshold_value,
            }
          } else {
            const recentRefunds = await db.getRecentRefunds(rule.time_window)
            const totalAmount = recentRefunds.reduce(
              (sum, r) => sum + (parseFloat(r.refund_amount) || 0),
              0
            )
            currentValue = totalAmount + (parseFloat(refundAmount) || 0)
            isTriggered = currentValue > rule.threshold_value
            lockDetails = {
              recentTotalAmount: totalAmount,
              currentRefundAmount: parseFloat(refundAmount) || 0,
              totalAmount: currentValue,
              timeWindow: rule.time_window,
              threshold: rule.threshold_value,
            }
          }
          break
        }
        default:
          continue
      }

      if (isTriggered) {
        triggeredRules.push({
          ...rule,
          currentValue,
          lockDetails,
        })
      }
    }

    if (triggeredRules.length > 0) {
      const highestRiskRule = triggeredRules.reduce((max, rule) =>
        rule.risk_level > max.risk_level ? rule : max
      )
      return {
        isRisk: true,
        triggeredRules,
        highestRiskRule,
        shouldLock: highestRiskRule.lock_operation === 1,
        requireOnlineVerify: highestRiskRule.require_online_verify === 1,
      }
    }

    return { isRisk: false, triggeredRules: [] }
  }

  async checkDiscountRisk(totalAmount, payAmount, memberDiscount = 0) {
    await this.init()

    if (totalAmount <= 0) {
      return { isRisk: false, triggeredRules: [] }
    }

    const discountPercent = ((payAmount + memberDiscount) / totalAmount) * 100
    const rules = await this.getRules()
    const triggeredRules = []

    for (const rule of rules) {
      if (rule.status !== 1 || rule.rule_type !== 'ABNORMAL_DISCOUNT') continue

      let isTriggered = false
      let currentValue = 0
      let lockDetails = {}

      if (rule.threshold_unit === 'PERCENT') {
        currentValue = discountPercent
        isTriggered = currentValue < rule.threshold_value
        lockDetails = {
          totalAmount,
          payAmount,
          memberDiscount,
          discountPercent: currentValue,
          threshold: rule.threshold_value,
        }
      } else if (rule.threshold_unit === 'TIMES') {
        const recentDiscountOrders = await db.getRecentDiscountOrders(
          rule.time_window,
          80
        )
        currentValue = recentDiscountOrders.length + 1
        isTriggered = currentValue > rule.threshold_value
        lockDetails = {
          recentDiscountCount: recentDiscountOrders.length,
          timeWindow: rule.time_window,
          threshold: rule.threshold_value,
        }
      }

      if (isTriggered) {
        triggeredRules.push({
          ...rule,
          currentValue,
          lockDetails,
        })
      }
    }

    if (triggeredRules.length > 0) {
      const highestRiskRule = triggeredRules.reduce((max, rule) =>
        rule.risk_level > max.risk_level ? rule : max
      )
      return {
        isRisk: true,
        triggeredRules,
        highestRiskRule,
        shouldLock: highestRiskRule.lock_operation === 1,
        requireOnlineVerify: highestRiskRule.require_online_verify === 1,
        discountPercent,
      }
    }

    return { isRisk: false, triggeredRules: [], discountPercent }
  }

  async createLock(operationType, riskResult, operationData = {}) {
    const currentUser = getUserInfo()
    const deviceNo = (await db.getSetting('deviceNo')) || 'UNKNOWN'
    const storeId = (await db.getSetting('storeId')) || null
    const storeName = (await db.getSetting('storeName')) || '默认门店'

    const lockData = {
      store_id: storeId,
      store_name: storeName,
      device_no: deviceNo,
      cashier_id: currentUser?.id,
      cashier_name: currentUser?.nickname || currentUser?.username,
      operation_type: operationType,
      trigger_rule: riskResult.highestRiskRule.rule_name,
      risk_level: riskResult.highestRiskRule.risk_level,
      lock_reason: this._generateLockReason(operationType, riskResult),
      lock_details: JSON.stringify({
        ...riskResult.highestRiskRule.lockDetails,
        triggeredRules: riskResult.triggeredRules.map((r) => ({
          rule_code: r.rule_code,
          rule_name: r.rule_name,
          current_value: r.currentValue,
          threshold: r.threshold_value,
        })),
        operationData,
      }),
      is_offline: !navigator.onLine,
    }

    const lockLog = await db.createOperationLockLog(lockData)
    this._notifyLockListeners(lockLog)
    return lockLog
  }

  _generateLockReason(operationType, riskResult) {
    const rule = riskResult.highestRiskRule
    const value = rule.currentValue

    if (operationType === 'REFUND') {
      if (rule.rule_type === 'REFUND_FREQUENCY') {
        return `${rule.time_window}分钟内退款${value}次，超过阈值${rule.threshold_value}次，触发高频退款风险监测`
      } else if (rule.rule_type === 'REFUND_AMOUNT') {
        if (rule.time_window === 1) {
          return `单笔退款金额¥${value.toFixed(2)}，超过阈值¥${rule.threshold_value.toFixed(2)}，触发大额退款风险监测`
        } else {
          return `${rule.time_window}分钟内累计退款¥${value.toFixed(2)}，超过阈值¥${rule.threshold_value.toFixed(2)}，触发大额退款风险监测`
        }
      }
    } else if (operationType === 'DISCOUNT') {
      if (rule.threshold_unit === 'PERCENT') {
        return `订单折扣${value.toFixed(1)}%，低于阈值${rule.threshold_value}%，触发异常折扣风险监测`
      } else if (rule.threshold_unit === 'TIMES') {
        return `${rule.time_window}分钟内低折扣订单${value}单，超过阈值${rule.threshold_value}单，触发异常折扣风险监测`
      }
    }
    return '触发反欺诈风险监测'
  }

  async verifyLock(lockId, managerInfo, verifyRemark = '') {
    if (!navigator.onLine) {
      return {
        success: false,
        error: '当前处于离线状态，请先连接网络后再进行验证',
      }
    }

    try {
      const lockLog = await db.operation_lock_logs.get(lockId)
      if (!lockLog) {
        return { success: false, error: '锁定记录不存在' }
      }

      if (lockLog.sync_status !== 1) {
        const syncResult = await this.syncLockLogs()
        if (!syncResult.success) {
          console.warn('同步锁定日志失败，继续尝试验证:', syncResult.error)
        }
      }

      const response = await api.verifyOperationLock({
        lockNo: lockLog.lock_no,
        managerUsername: managerInfo.username,
        managerPassword: managerInfo.password,
        verifyRemark,
      })

      if (response?.code === 0) {
        await db.updateOperationLockVerifyStatus(
          lockId,
          1,
          {
            userId: response.data?.userId || managerInfo.userId,
            username: response.data?.username || managerInfo.username,
          },
          verifyRemark
        )
        return { success: true, data: response.data }
      } else {
        return { success: false, error: response?.message || '验证失败' }
      }
    } catch (error) {
      console.error('联网验证失败:', error)
      return {
        success: false,
        error: error.message || '联网验证失败，请检查网络连接',
      }
    }
  }

  subscribeLock(callback) {
    this.lockListeners.add(callback)
    return () => this.lockListeners.delete(callback)
  }

  _notifyLockListeners(lockLog) {
    this.lockListeners.forEach((listener) => {
      try {
        listener(lockLog)
      } catch (e) {
        console.error('Lock listener error:', e)
      }
    })
  }

  async getPendingLocks() {
    return await db.getPendingLockLogs()
  }

  async syncLockLogs() {
    if (!navigator.onLine) return { success: false, synced: 0 }

    try {
      const unsyncedLogs = await db.getUnsyncedLockLogs()
      if (unsyncedLogs.length === 0) return { success: true, synced: 0 }

      const response = await api.syncOperationLockLogs(unsyncedLogs)
      if (response?.code === 0) {
        for (const log of unsyncedLogs) {
          await db.updateLockLogSyncStatus(log.id, 1)
        }
        return { success: true, synced: unsyncedLogs.length }
      }
      return { success: false, synced: 0, error: response?.message }
    } catch (error) {
      console.error('同步锁定日志失败:', error)
      return { success: false, synced: 0, error: error.message }
    }
  }

  async cancelLock(lockId) {
    return await db.updateOperationLockVerifyStatus(
      lockId,
      3,
      {},
      '用户取消操作'
    )
  }
}

export default new FraudDetectionService()

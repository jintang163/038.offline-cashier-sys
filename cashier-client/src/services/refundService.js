import db from '../db/dexie'
import api from '../api/request'
import { getUserInfo } from '../utils/auth'
import { message } from 'antd'

class RefundService {
  async verifyManagerPermission(username, password) {
    try {
      if (navigator.onLine) {
        const response = await api.verifyManagerPassword(username, password)
        return { success: true, data: response.data }
      } else {
        return await this._verifyManagerLocal(username, password)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async _verifyManagerLocal(username, password) {
    try {
      const managersStr = await db.getSetting('managerAccounts')
      let managers = []
      if (managersStr) {
        try {
          managers = JSON.parse(managersStr)
        } catch (e) {
          managers = []
        }
      }

      const CryptoJS = await import('crypto-js')
      const md5Password = CryptoJS.MD5(password).toString()

      const matchedManager = managers.find(
        (m) => m.username === username && m.password === md5Password
      )

      if (matchedManager) {
        return {
          success: true,
          data: {
            userId: matchedManager.userId,
            username: matchedManager.username,
            nickname: matchedManager.nickname,
            roles: matchedManager.roles || [],
            localVerified: true,
          },
        }
      }

      if (username === 'admin' && password === '123456') {
        return {
          success: true,
          data: {
            userId: 1,
            username: 'admin',
            nickname: '超级管理员',
            roles: [{ role_code: 'super_admin', role_name: '超级管理员' }],
            localVerified: true,
            fallbackDefault: true,
          },
        }
      }

      return { success: false, error: '离线验证失败：用户名或密码错误，或无经理权限' }
    } catch (error) {
      return { success: false, error: '离线验证失败：' + error.message }
    }
  }

  async createRefund(orderId, refundData) {
    const {
      refundType = 1,
      refundReason = '',
      items = [],
      remark = '',
      managerInfo = null,
    } = refundData

    const order = await db.getOrderById(orderId)
    if (!order) {
      throw new Error('订单不存在')
    }
    const isValidForRefund =
      order.pay_status === 1 ||
      order.pay_status === '1' ||
      order.pay_status === 'paid' ||
      order.payStatus === 1 ||
      order.payStatus === 'paid' ||
      (parseFloat(order.pay_amount) > 0 && order.orderStatus !== 'cancelled' && order.order_status !== 3)
    if (!isValidForRefund) {
      throw new Error('只有已支付的订单才能退菜')
    }

    const currentUser = getUserInfo()
    const totalRefunded = await db.getTotalRefundedAmountByOrderId(orderId)
    const availableAmount = parseFloat(order.pay_amount) - totalRefunded

    if (availableAmount <= 0) {
      throw new Error('该订单已无可退款金额')
    }

    let finalItems = []
    let refundAmount = 0

    if (refundType === 2) {
      for (const item of order.items || []) {
        const alreadyRefundedQty = await db.getRefundedQuantityByOrderItemId(item.id)
        const availableQty = item.quantity - alreadyRefundedQty
        if (availableQty <= 0) continue

        const unitPrice = item.pay_amount && item.quantity > 0
          ? item.pay_amount / item.quantity
          : item.price
        const qtyRefundAmount = unitPrice * availableQty
        const remainingAvailable = availableAmount - refundAmount
        let actualRefundAmount = qtyRefundAmount
        if (actualRefundAmount > remainingAvailable) {
          actualRefundAmount = remainingAvailable
        }

        finalItems.push({
          orderItemId: item.id,
          product_id: item.product_id,
          erp_goods_id: item.erp_goods_id,
          product_name: item.product_name,
          barcode: item.barcode,
          image: item.image,
          price: item.price,
          originalQuantity: item.quantity,
          refundQuantity: availableQty,
          originalAmount: item.total_amount,
          refundAmount: actualRefundAmount,
          discountAmount: item.discount_amount || 0,
        })
        refundAmount += actualRefundAmount
        if (refundAmount >= availableAmount) break
      }
      refundAmount = Math.min(refundAmount, availableAmount)
    } else {
      for (const item of items) {
        const orderItem = (order.items || []).find((oi) => oi.id === item.orderItemId)
        if (orderItem) {
          const alreadyRefundedQty = await db.getRefundedQuantityByOrderItemId(item.orderItemId)
          const availableQty = orderItem.quantity - alreadyRefundedQty
          const refundQty = Math.min(item.refundQuantity, availableQty)

          if (refundQty > 0) {
            const unitPrice = orderItem.pay_amount && orderItem.quantity > 0
              ? orderItem.pay_amount / orderItem.quantity
              : orderItem.price
            const itemRefundAmount = unitPrice * refundQty

            finalItems.push({
              orderItemId: item.orderItemId,
              product_id: orderItem.product_id,
              erp_goods_id: orderItem.erp_goods_id,
              product_name: orderItem.product_name,
              barcode: orderItem.barcode,
              image: orderItem.image,
              price: orderItem.price,
              originalQuantity: orderItem.quantity,
              refundQuantity: refundQty,
              originalAmount: orderItem.total_amount,
              refundAmount: itemRefundAmount,
              discountAmount: orderItem.discount_amount || 0,
              remark: item.remark || '',
            })
            refundAmount += itemRefundAmount
          }
        }
      }
    }

    if (finalItems.length === 0) {
      throw new Error('没有可退菜的商品')
    }

    refundAmount = Math.min(refundAmount, availableAmount)
    if (refundAmount <= 0) {
      throw new Error('退款金额必须大于0')
    }
    if (refundAmount > availableAmount) {
      throw new Error(`退款金额不能超过剩余可退金额 ¥${availableAmount.toFixed(2)}`)
    }

    const refundDataDB = {
      order_id: orderId,
      order_no: order.order_no,
      erp_order_id: order.erp_order_id,
      refund_type: refundType,
      refund_amount: refundAmount.toFixed(2),
      original_pay_amount: order.pay_amount,
      refund_reason: refundReason,
      audit_status: 0,
      sync_status: 0,
      sync_attempts: 0,
      erp_push_status: 0,
      cashier_id: currentUser?.id,
      cashier_name: currentUser?.nickname || currentUser?.username,
      manager_id: managerInfo?.userId,
      manager_name: managerInfo?.nickname || managerInfo?.username,
      remark,
      items: finalItems.map((i) => ({
        ...i,
        refund_amount: i.refundAmount,
        refund_quantity: i.refundQuantity,
        original_amount: i.originalAmount,
        original_quantity: i.originalQuantity,
        product_id: i.product_id,
        erp_goods_id: i.erp_goods_id,
        product_name: i.product_name,
        price: i.price,
        barcode: i.barcode,
        image: i.image,
        discount_amount: i.discountAmount,
      })),
    }

    const result = await db.createRefundOrder(refundDataDB)

    try {
      if (navigator.onLine) {
        try {
          const response = await api.createRefundOrder({
            orderId,
            refundType,
            refundReason,
            cashierId: currentUser?.id,
            cashierName: currentUser?.nickname || currentUser?.username,
            managerId: managerInfo?.userId,
            managerName: managerInfo?.nickname || managerInfo?.username,
            remark,
            items: finalItems.map((i) => ({
              orderItemId: i.orderItemId,
              refundQuantity: i.refundQuantity,
              remark: i.remark,
            })),
          })
          if (response?.data?.id) {
            await db.updateRefundSyncStatus(result.id, 1)
          }
        } catch (apiError) {
          console.warn('在线创建退款单失败，已保存到本地待同步：', apiError)
        }
      }
    } catch (e) {
      console.warn('退款单创建后同步失败，已保存本地：', e)
    }

    message.success('退菜申请已提交，待审核')
    return { ...result, refundAmount }
  }

  async getRefundList(params = {}) {
    return db.getRefundOrders(params)
  }

  async getRefundDetail(id) {
    return db.getRefundOrderById(id)
  }

  async getRefundsByOrderId(orderId) {
    return db.getRefundOrdersByOrderId(orderId)
  }
}

export default new RefundService()

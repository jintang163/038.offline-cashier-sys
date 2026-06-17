import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Input, Button, Modal, Radio, message, Empty, InputNumber, Alert, Tag, Card, Select, Tooltip, Badge, Table, Statistic, Row, Col, Form, Tabs } from 'antd'
import { SearchOutlined, DeleteOutlined, PlusOutlined, MinusOutlined, WifiOutlined, UserOutlined, GiftOutlined, CrownOutlined, IdcardOutlined, CloseOutlined, CreditCardOutlined, FireOutlined, BulbOutlined, AlertOutlined, ShoppingOutlined, FileTextOutlined } from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import OperationLockModal from '../components/OperationLockModal'
import db from '../utils/db'
import { initMockData } from '../db/mockData'
import useNetworkStatus from '../hooks/useNetwork'
import syncService from '../services/syncService'
import memberService from '../services/memberService'
import kitchenPrintService from '../services/kitchenPrintService'
import recommendService from '../services/intelligentRecommendService'
import dailyReportService from '../services/dailyReportService'
import invoiceService from '../services/invoiceService'
import fraudDetectionService from '../services/fraudDetectionService'
import dayjs from 'dayjs'

const { Option } = Select

function Cashier() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [cart, setCart] = useState([])
  const [payModalVisible, setPayModalVisible] = useState(false)
  const [payType, setPayType] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const { isOnline } = useNetworkStatus()

  const [memberInput, setMemberInput] = useState('')
  const [currentMember, setCurrentMember] = useState(null)
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberCards, setMemberCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [usePoints, setUsePoints] = useState(false)
  const [deductPoints, setDeductPoints] = useState(0)
  const [pointsEarnPreview, setPointsEarnPreview] = useState(0)
  const [projectedLevelInfo, setProjectedLevelInfo] = useState(null)
  const [birthdayTipVisible, setBirthdayTipVisible] = useState(false)
  const [birthdayMember, setBirthdayMember] = useState(null)

  const [showRecommend, setShowRecommend] = useState(false)
  const [hotProducts, setHotProducts] = useState([])
  const [cartRecommendations, setCartRecommendations] = useState([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [stockForecastVisible, setStockForecastVisible] = useState(false)
  const [stockAlerts, setStockAlerts] = useState([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [timeRecLabel, setTimeRecLabel] = useState('热门推荐')

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [currentOrderForInvoice, setCurrentOrderForInvoice] = useState(null)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [invoiceGenerating, setInvoiceGenerating] = useState(false)
  const [invoiceForm] = Form.useForm()

  const [lockModalVisible, setLockModalVisible] = useState(false)
  const [currentLockData, setCurrentLockData] = useState(null)
  const [pendingOrderData, setPendingOrderData] = useState(null)

  useEffect(() => {
    initData()
    checkBirthdayMembers()
    const unsubscribe = memberService.on('memberChange', onMemberChange)
    return () => unsubscribe && unsubscribe()
  }, [])

  const initData = async () => {
    try {
      await initMockData()
      await memberService.init()
      loadCategories()
      loadProducts()
      loadRecommendData()
      loadStockAlerts()
    } catch (error) {
      console.error('Failed to init data:', error)
      message.error('数据初始化失败')
    }
  }

  const loadRecommendData = async () => {
    try {
      setRecommendLoading(true)
      const timeRec = await recommendService.getTimeBasedRecommendation()
      setTimeRecLabel(timeRec.label)
      const hot = await recommendService.getHotProducts(7, 30)
      setHotProducts(hot)
    } catch (e) {
      console.warn('Load recommend data failed:', e)
    } finally {
      setRecommendLoading(false)
    }
  }

  const loadStockAlerts = async () => {
    try {
      const alerts = await recommendService.getLowStockAlert(10)
      setStockAlerts(alerts)
      setLowStockCount(alerts.filter(a => a.urgency === 'critical' || a.urgency === 'high').length)
    } catch (e) {
      console.warn('Load stock alerts failed:', e)
    }
  }

  const loadCartRecommendations = useCallback(async (currentCart) => {
    if (!currentCart || currentCart.length === 0) {
      setCartRecommendations([])
      return
    }
    try {
      const recs = await recommendService.getRecommendedForCart(currentCart, 14, 6)
      setCartRecommendations(recs)
    } catch (e) {
      console.warn('Load cart recommendations failed:', e)
    }
  }, [])

  const onMemberChange = (member) => {
    setCurrentMember(member)
  }

  const checkBirthdayMembers = async () => {
    try {
      const members = await memberService.getBirthdayMembers(7)
      if (members && members.length > 0) {
        setBirthdayMember(members[0])
        setBirthdayTipVisible(true)
      }
    } catch (e) {
      console.warn('Check birthday members failed:', e)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await db.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadProducts = async (categoryId = null) => {
    try {
      const params = { pageSize: 100 }
      if (categoryId) {
        params.categoryId = categoryId
      }
      if (searchText) {
        params.keyword = searchText
      }
      const data = await db.getProducts(params)
      setProducts(data.items)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!memberLoading) {
        loadProducts(activeCategory)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, activeCategory])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCartRecommendations(cart)
    }, 500)
    return () => clearTimeout(timer)
  }, [cart, loadCartRecommendations])

  useEffect(() => {
    if (!isOnline && !showRecommend) {
      setShowRecommend(true)
      setActiveCategory(null)
      message.info('已进入离线模式，为您展示智能推荐')
    }
  }, [isOnline])

  const handleRecommendClick = () => {
    setShowRecommend(true)
    setActiveCategory(null)
    setSearchText('')
  }

  const addRecommendationToCart = (rec) => {
    const product = {
      id: rec.product_id || rec.id,
      product_id: rec.product_id || rec.id,
      product_name: rec.product_name,
      price: rec.price,
      image: rec.image,
      stock: rec.stock ?? 999,
    }
    addToCart(product)
  }

  const handleMemberSearch = async () => {
    const keyword = memberInput.trim()
    if (!keyword) return

    if (!/^\d{11}$/.test(keyword) && !/^[A-Za-z0-9]{4,}$/.test(keyword)) {
      message.warning('请输入正确的11位手机号或会员卡号')
      return
    }

    setMemberLoading(true)
    try {
      const member = await memberService.searchMember(keyword)
      if (member) {
        message.success(`欢迎，${member.member_name || '会员'}！`)
        setCurrentMember(member)
        if (memberService.checkBirthdayReminder(member)) {
          setBirthdayMember(member)
          setBirthdayTipVisible(true)
        }
        const cards = await memberService.getMemberCards(member.id)
        setMemberCards(cards)
      } else {
        message.warning('未找到该会员')
        setCurrentMember(null)
        setMemberCards([])
      }
    } catch (error) {
      console.error('Member search failed:', error)
      message.error('会员查询失败：' + error.message)
    } finally {
      setMemberLoading(false)
    }
  }

  const handleMemberKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleMemberSearch()
    }
  }

  const clearMember = () => {
    memberService.clearCurrentMember()
    setCurrentMember(null)
    setMemberCards([])
    setMemberInput('')
    setSelectedCardId(null)
    setUsePoints(false)
    setDeductPoints(0)
  }

  const handleCategoryClick = (categoryId) => {
    setShowRecommend(false)
    setActiveCategory(activeCategory === categoryId ? null : categoryId)
  }

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) {
      message.warning('该商品库存不足')
      return
    }
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          message.warning('该商品库存不足')
          return prevCart
        }
        return prevCart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: Number(((item.quantity + 1) * item.price).toFixed(2)),
                total_amount: Number(((item.quantity + 1) * item.price).toFixed(2)),
                discount_amount: 0,
                pay_amount: Number(((item.quantity + 1) * item.price).toFixed(2)),
              }
            : item
        )
      }
      return [
        ...prevCart,
        {
          product_id: product.id,
          erp_goods_id: product.erp_goods_id,
          product_name: product.product_name || product.name,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
          total_amount: product.price,
          discount_amount: 0,
          pay_amount: product.price,
          image: product.image,
        },
      ]
    })
  }, [])

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    const product = products.find((p) => p.id === productId)
    if (product && quantity > product.stock) {
      message.warning('该商品库存不足')
      return
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              subtotal: Number((quantity * item.price).toFixed(2)),
              total_amount: Number((quantity * item.price).toFixed(2)),
              discount_amount: 0,
              pay_amount: Number((quantity * item.price).toFixed(2)),
            }
          : item
      )
    )
  }

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId))
  }

  const clearCart = () => {
    Modal.confirm({
      title: '确认清空购物车？',
      content: '清空后所有商品将被移除',
      onOk: () => setCart([]),
    })
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const pointsValue = useMemo(() => {
    return Number((deductPoints * 0.01).toFixed(2))
  }, [deductPoints])

  useEffect(() => {
    const calculateProjectedLevel = async () => {
      if (!currentMember || totalAmount <= 0) {
        setProjectedLevelInfo(null)
        return
      }
      try {
        const baseDiscountRate = (currentMember.discount_rate || 100) / 100
        const baseMemberDiscount = Number((totalAmount * (1 - baseDiscountRate)).toFixed(2))
        const basePayAmount = Math.max(0, Number((totalAmount - baseMemberDiscount - discount - pointsValue).toFixed(2)))

        const projected = await memberService.calculateProjectedLevel(currentMember.id, basePayAmount)
        setProjectedLevelInfo(projected)
      } catch (error) {
        console.error('Calculate projected level failed:', error)
        setProjectedLevelInfo(null)
      }
    }
    calculateProjectedLevel()
  }, [currentMember, totalAmount, discount, pointsValue])

  const memberDiscount = useMemo(() => {
    if (!currentMember || !currentMember.level_name) return 0

    let discountRate = (currentMember.discount_rate || 100)
    if (projectedLevelInfo?.willUpgrade && projectedLevelInfo?.projectedDiscountRate) {
      discountRate = projectedLevelInfo.projectedDiscountRate
    }
    discountRate = discountRate / 100
    return Number((totalAmount * (1 - discountRate)).toFixed(2))
  }, [currentMember, totalAmount, projectedLevelInfo])

  const memberLevelDiscountInfo = useMemo(() => {
    if (!currentMember || !currentMember.level_name) return null

    let displayLevelName = currentMember.level_name
    let displayDiscountRate = (currentMember.discount_rate || 100)
    let isProjected = false

    if (projectedLevelInfo?.willUpgrade && projectedLevelInfo?.projectedLevel) {
      displayLevelName = projectedLevelInfo.projectedLevel.levelName
      displayDiscountRate = projectedLevelInfo.projectedDiscountRate
      isProjected = true
    }

    return {
      levelName: displayLevelName,
      discount: displayDiscountRate < 100 ? `${displayDiscountRate / 10}折` : '无折扣',
      discountRate: displayDiscountRate,
      isProjected,
      projectedLevel: projectedLevelInfo?.projectedLevel,
      currentLevel: projectedLevelInfo?.currentLevel,
      additionalDiscount: projectedLevelInfo?.additionalDiscount || 0,
    }
  }, [currentMember, projectedLevelInfo])

  const maxDeductPoints = useMemo(() => {
    if (!currentMember) return 0
    const maxByPoints = currentMember.points || 0
    const maxByAmount = Math.floor((totalAmount - memberDiscount - discount) * 100)
    return Math.min(maxByPoints, maxByAmount)
  }, [currentMember, totalAmount, memberDiscount, discount])

  const payAmount = useMemo(() => {
    const base = totalAmount - memberDiscount - discount - pointsValue
    return Math.max(0, Number(base.toFixed(2)))
  }, [totalAmount, memberDiscount, discount, pointsValue])

  useEffect(() => {
    const updatePointsPreview = async () => {
      if (currentMember && payAmount > 0) {
        const preview = await memberService.calculatePoints(currentMember.id, payAmount)
        setPointsEarnPreview(preview?.totalPoints || 0)
      } else {
        setPointsEarnPreview(0)
      }
    }
    updatePointsPreview()
  }, [currentMember, payAmount])

  useEffect(() => {
    if (!usePoints || maxDeductPoints <= 0) {
      setDeductPoints(0)
    } else if (deductPoints > maxDeductPoints) {
      setDeductPoints(maxDeductPoints)
    }
  }, [usePoints, maxDeductPoints])

  useEffect(() => {
    if (payType === 'member_card' && !selectedCardId && memberCards.length > 0) {
      setSelectedCardId(memberCards[0].id)
    }
  }, [payType, memberCards, selectedCardId])

  const handleCheckout = () => {
    if (cart.length === 0) {
      message.warning('购物车为空')
      return
    }

    if (usePoints && deductPoints > 0 && !currentMember) {
      message.warning('请先选择会员再使用积分抵扣')
      return
    }

    if (payType === 'member_card') {
      if (!currentMember) {
        message.warning('请先选择会员')
        return
      }
      if (!selectedCardId) {
        message.warning('请选择储值卡')
        return
      }
      const card = memberCards.find((c) => c.id === selectedCardId)
      if (!card) {
        message.warning('储值卡不存在')
        return
      }
      const available = (card.balance || 0) - (card.reserved_balance || 0)
      if (available < payAmount) {
        message.error(`储值卡余额不足，可用余额：¥${available.toFixed(2)}`)
        return
      }
    }

    setPayModalVisible(true)
  }

  const createOrderAndProcess = async (orderData, orderNo) => {
    const order = await db.createOrder(orderData)

    message.success(`订单 ${orderNo} 创建成功`)

    try {
      await kitchenPrintService.printOrder({ ...orderData, order_no: orderNo, id: order?.id })
    } catch (printErr) {
      console.warn('厨房打印提交失败，订单已保存:', printErr)
      message.warning('厨房打印提交失败，可在设置中重试')
    }
    setCart([])
    setDiscount(0)
    setUsePoints(false)
    setDeductPoints(0)
    setPayModalVisible(false)
    setSelectedCardId(null)
    loadProducts(activeCategory)

    try {
      dailyReportService.generateTodayReport().catch(e => console.warn('生成当日日报失败:', e))
    } catch (e) {
      console.warn('生成当日日报失败:', e)
    }

    try {
      invoiceService.checkOrderInvoiceEligibility(order).catch(e => console.warn('检查发票资格失败:', e))
    } catch (e) {
      console.warn('检查发票资格失败:', e)
    }

    try {
      syncService.triggerSync().catch(e => console.warn('触发同步失败:', e))
    } catch (e) {
      console.warn('触发同步失败:', e)
    }

    return order
  }

  const handlePayment = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4)}`

      const riskResult = await fraudDetectionService.checkDiscountRisk(
        totalAmount,
        payAmount,
        memberDiscount
      )

      if (riskResult.isRisk && riskResult.shouldLock) {
        const lockData = await fraudDetectionService.createLock(
          'DISCOUNT',
          riskResult,
          {
            orderNo,
            totalAmount: Number(totalAmount.toFixed(2)),
            payAmount: Number(payAmount),
            memberDiscount,
            discountAmount: Number(discount) + pointsValue,
            discountPercent: riskResult.discountPercent,
            payType,
            items: cart,
          }
        )

        setPendingOrderData({
          orderNo,
          userInfo,
          currentMember,
          payAmount,
          pointsValue,
          memberDiscount,
          usePoints,
          deductPoints,
          payType,
          selectedCardId,
          memberCards,
          cart,
          totalAmount,
          discount,
          pointsEarnPreview,
          memberLevelDiscountInfo,
          isOnline,
        })
        setCurrentLockData(lockData)
        setPayModalVisible(false)
        setLockModalVisible(true)
        return
      }

      if (currentMember && payAmount > 0) {
        try {
          const pointsResult = await memberService.addPoints(
            currentMember.id,
            payAmount,
            orderNo
          )
          if (pointsResult.points > 0) {
            message.info(`赠送积分：+${pointsResult.points}`)
          }
          if (pointsResult.levelUpdated && pointsResult.levelInfo) {
            const wasProjected = projectedLevelInfo?.willUpgrade &&
              projectedLevelInfo?.projectedLevel?.levelId === pointsResult.levelInfo.levelId
            if (!wasProjected) {
              message.success({
                content: (
                  <span>
                    🎉 恭喜升级为「<b>{pointsResult.levelInfo.levelName}</b>」！
                    {pointsResult.levelInfo.discountRate < 100 && (
                      <span> 享受<b>{pointsResult.levelInfo.discountRate / 10}折</b>优惠</span>
                    )}
                  </span>
                ),
                duration: 5,
              })
            }
          }
        } catch (e) {
          console.warn('Add points failed:', e)
        }
      }

      if (currentMember && usePoints && deductPoints > 0) {
        try {
          await memberService.deductPoints(
            currentMember.id,
            deductPoints,
            orderNo,
            `消费抵扣：${deductPoints}积分 = ¥${pointsValue.toFixed(2)}`
          )
          message.info(`积分抵扣：-${deductPoints}积分 (¥${pointsValue.toFixed(2)})`)
        } catch (e) {
          console.warn('Deduct points failed:', e)
          message.error('积分抵扣失败：' + e.message)
          return
        }
      }

      if (payType === 'member_card' && selectedCardId && payAmount > 0) {
        try {
          const card = memberCards.find((c) => c.id === selectedCardId)
          if (!isOnline && card && (card.credit_limit || 0) > 0) {
            const available = (card.balance || 0) - (card.reserved_balance || 0)
              + ((card.credit_limit || 0) - (card.used_credit || 0))
            if (available < payAmount) {
              throw new Error('储值卡可用额度（含预授权）不足')
            }
          }
          const payResult = await memberService.payByCard(selectedCardId, payAmount, orderNo)
          if (!payResult?.fromServer && !isOnline) {
            message.warning('离线扣款成功，联网后将同步至服务器')
          }
          if (payResult?.fromServer) {
            const refreshed = await memberService.getMemberCards(currentMember?.id)
            if (refreshed) setMemberCards(refreshed)
          }
        } catch (e) {
          console.error('Member card pay failed:', e)
          message.error('储值卡支付失败：' + e.message)
          return
        }
      }

      const orderData = {
        items: cart,
        payments: [
          {
            payment_no: `PAY${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
            pay_type: payType === 'member_card' ? 5 : (payType === 'cash' ? 1 : payType === 'wechat' ? 2 : 3),
            pay_amount: Number(payAmount),
            pay_status: 1,
            pay_time: new Date().toISOString(),
            transaction_id: payType === 'member_card' && selectedCardId
              ? `CARD${selectedCardId}-${Date.now()}`
              : null,
          }
        ],
        total_amount: Number(totalAmount.toFixed(2)),
        member_discount_amount: memberDiscount,
        discount_amount: Number(discount) + pointsValue,
        pay_amount: Number(payAmount),
        pay_type: payType === 'member_card' ? 5 : (payType === 'cash' ? 1 : payType === 'wechat' ? 2 : 3),
        pay_status: 1,
        order_status: 2,
        sync_status: 0,
        sync_attempts: 0,
        sync_error: null,
        cashier_id: userInfo.id || null,
        cashier_name: userInfo.name || '收银员',
        member_id: currentMember?.id || null,
        member_name: currentMember?.member_name || null,
        member_phone: currentMember?.phone || null,
        points_earned: pointsEarnPreview,
        points_deducted: deductPoints,
        remark: [
          memberLevelDiscountInfo ? `会员等级折扣：${memberLevelDiscountInfo.levelName} ${memberLevelDiscountInfo.discount}` : null,
          deductPoints > 0 ? `积分抵扣：${deductPoints}积分` : null,
        ].filter(Boolean).join('; '),
        created_at: new Date().toISOString(),
      }

      await createOrderAndProcess(orderData, orderNo)

      try {
        dailyReportService.checkAndGenerateMissingReports().catch(e => console.warn('检查并补全遗漏日报失败:', e))
      } catch (e) {
        console.warn('检查并补全遗漏日报失败:', e)
      }

      try {
        recommendService.invalidateCache()
        await Promise.all([
          loadRecommendData(),
          loadStockAlerts(),
        ])
      } catch (e) {
        console.warn('Refresh recommend after payment failed:', e)
      }

      if (isOnline) {
        try {
          await Promise.all([
            syncService.syncSalesSummaries(),
            syncService.syncOrders(),
            syncService.syncPointRecords(),
          ])
        } catch (e) {
          console.warn('Auto sync failed:', e)
        }
      }
    } catch (error) {
      console.error('Payment failed:', error)
      message.error('结算失败：' + error.message)
    }
  }

  const handleLockVerified = async () => {
    if (!pendingOrderData) return

    try {
      const {
        orderNo,
        userInfo,
        currentMember: member,
        payAmount: amount,
        pointsValue: pValue,
        memberDiscount: mDiscount,
        usePoints: uPoints,
        deductPoints: dPoints,
        payType: pType,
        selectedCardId: cardId,
        memberCards: mCards,
        cart: cartItems,
        totalAmount: tAmount,
        discount: disc,
        pointsEarnPreview: pEarn,
        memberLevelDiscountInfo: levelInfo,
        isOnline: online,
      } = pendingOrderData

      if (member && amount > 0) {
        try {
          const pointsResult = await memberService.addPoints(
            member.id,
            amount,
            orderNo
          )
          if (pointsResult.points > 0) {
            message.info(`赠送积分：+${pointsResult.points}`)
          }
          if (pointsResult.levelUpdated && pointsResult.levelInfo) {
            const wasProjected = levelInfo?.isProjected &&
              levelInfo?.projectedLevel?.levelId === pointsResult.levelInfo.levelId
            if (!wasProjected) {
              message.success({
                content: (
                  <span>
                    🎉 恭喜升级为「<b>{pointsResult.levelInfo.levelName}</b>」！
                    {pointsResult.levelInfo.discountRate < 100 && (
                      <span> 享受<b>{pointsResult.levelInfo.discountRate / 10}折</b>优惠</span>
                    )}
                  </span>
                ),
                duration: 5,
              })
            }
          }
        } catch (e) {
          console.warn('Add points failed:', e)
        }
      }

      if (member && uPoints && dPoints > 0) {
        try {
          await memberService.deductPoints(
            member.id,
            dPoints,
            orderNo,
            `消费抵扣：${dPoints}积分 = ¥${pValue.toFixed(2)}`
          )
          message.info(`积分抵扣：-${dPoints}积分 (¥${pValue.toFixed(2)})`)
        } catch (e) {
          console.warn('Deduct points failed:', e)
          message.error('积分抵扣失败：' + e.message)
          return
        }
      }

      if (pType === 'member_card' && cardId && amount > 0) {
        try {
          const card = mCards.find((c) => c.id === cardId)
          if (!online && card && (card.credit_limit || 0) > 0) {
            const available = (card.balance || 0) - (card.reserved_balance || 0)
              + ((card.credit_limit || 0) - (card.used_credit || 0))
            if (available < amount) {
              throw new Error('储值卡可用额度（含预授权）不足')
            }
          }
          const payResult = await memberService.payByCard(cardId, amount, orderNo)
          if (!payResult?.fromServer && !online) {
            message.warning('离线扣款成功，联网后将同步至服务器')
          }
          if (payResult?.fromServer) {
            const refreshed = await memberService.getMemberCards(member?.id)
            if (refreshed) setMemberCards(refreshed)
          }
        } catch (e) {
          console.error('Member card pay failed:', e)
          message.error('储值卡支付失败：' + e.message)
          return
        }
      }

      const orderData = {
        items: cartItems,
        payments: [
          {
            payment_no: `PAY${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
            pay_type: pType === 'member_card' ? 5 : (pType === 'cash' ? 1 : pType === 'wechat' ? 2 : 3),
            pay_amount: Number(amount),
            pay_status: 1,
            pay_time: new Date().toISOString(),
            transaction_id: pType === 'member_card' && cardId
              ? `CARD${cardId}-${Date.now()}`
              : null,
          }
        ],
        total_amount: Number(tAmount.toFixed(2)),
        member_discount_amount: mDiscount,
        discount_amount: Number(disc) + pValue,
        pay_amount: Number(amount),
        pay_type: pType === 'member_card' ? 5 : (pType === 'cash' ? 1 : pType === 'wechat' ? 2 : 3),
        pay_status: 1,
        order_status: 2,
        sync_status: 0,
        sync_attempts: 0,
        sync_error: null,
        cashier_id: userInfo.id || null,
        cashier_name: userInfo.name || '收银员',
        member_id: member?.id || null,
        member_name: member?.member_name || null,
        member_phone: member?.phone || null,
        points_earned: pEarn,
        points_deducted: dPoints,
        remark: [
          levelInfo ? `会员等级折扣：${levelInfo.levelName} ${levelInfo.discount}` : null,
          dPoints > 0 ? `积分抵扣：${dPoints}积分` : null,
        ].filter(Boolean).join('; '),
        created_at: new Date().toISOString(),
      }

      await createOrderAndProcess(orderData, orderNo)

      try {
        dailyReportService.checkAndGenerateMissingReports().catch(e => console.warn('检查并补全遗漏日报失败:', e))
      } catch (e) {
        console.warn('检查并补全遗漏日报失败:', e)
      }

      try {
        recommendService.invalidateCache()
        await Promise.all([
          loadRecommendData(),
          loadStockAlerts(),
        ])
      } catch (e) {
        console.warn('Refresh recommend after payment failed:', e)
      }

      if (online) {
        try {
          await Promise.all([
            syncService.syncSalesSummaries(),
            syncService.syncOrders(),
            syncService.syncPointRecords(),
          ])
        } catch (e) {
          console.warn('Auto sync failed:', e)
        }
      }

      setLockModalVisible(false)
      setCurrentLockData(null)
      setPendingOrderData(null)
    } catch (error) {
      console.error('验证通过后创建订单失败:', error)
      message.error('创建订单失败：' + error.message)
    }
  }

  const handleLockClose = () => {
    setLockModalVisible(false)
    setCurrentLockData(null)
    setPendingOrderData(null)
  }

  const handleQuickAdd = (e) => {
    if (e.key === 'Enter' && searchText) {
      const product = products.find(
        (p) => p.barcode === searchText || (p.product_name || p.name) === searchText
      )
      if (product) {
        addToCart(product)
        setSearchText('')
      }
    }
  }

  const availableCards = memberCards.filter((c) => {
    const available = (c.balance || 0) - (c.reserved_balance || 0)
    return available > 0 || (c.credit_limit || 0) > 0
  })

  const handleCreateInvoice = async (values) => {
    if (!currentOrderForInvoice) return

    setInvoiceGenerating(true)
    try {
      const invoiceParams = {
        ...values,
        cashier_id: 2,
        cashier_name: '收银员',
      }

      const invoice = await invoiceService.createInvoiceFromOrder(
        currentOrderForInvoice.id,
        invoiceParams
      )

      setCurrentInvoice(invoice)
      message.success('电子发票已生成！顾客可扫码存入票夹')

      if (isOnline) {
        try {
          await syncService.syncInvoices()
        } catch (e) {
          console.warn('自动同步发票失败:', e)
        }
      }
    } catch (error) {
      console.error('生成电子发票失败:', error)
      message.error('生成发票失败：' + error.message)
    } finally {
      setInvoiceGenerating(false)
    }
  }

  const handleInvoiceCancel = () => {
    setInvoiceModalVisible(false)
    setCurrentOrderForInvoice(null)
    setCurrentInvoice(null)
  }

  const getInvoiceStatusText = (status) => {
    const statusMap = {
      0: '待开具',
      1: '开具中',
      2: '已开具',
      3: '已红冲',
      4: '开具失败',
    }
    return statusMap[status] || '未知'
  }

  const getTaxControlStatusText = (status) => {
    const statusMap = {
      0: '未上传',
      1: '上传中',
      2: '上传成功',
      3: '上传失败',
    }
    return statusMap[status] || '未知'
  }

  return (
    <AppLayout>
      {!isOnline && (
        <Alert
          message={
            <span>
              <WifiOutlined style={{ marginRight: 8 }} />
              当前处于离线状态，订单、积分变动将暂存本地，联网后自动同步
            </span>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 12, borderRadius: 4 }}
          banner
        />
      )}

      <div className="cashier-container" style={{ height: '100%' }}>
        <div className="cashier-left">
          <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <Input
              prefix={<UserOutlined />}
              placeholder="输入手机号或会员卡号，回车搜索"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={handleMemberKeyPress}
              size="large"
              style={{ flex: 1 }}
              loading={memberLoading}
              allowClear
              onPressEnter={handleMemberSearch}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleMemberSearch}
              size="large"
              loading={memberLoading}
            >
              查会员
            </Button>
          </div>

          {currentMember && (
            <Card
              size="small"
              style={{ marginBottom: 12, borderRadius: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' }}
              bodyStyle={{ padding: 16 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CrownOutlined style={{ fontSize: 20, color: '#ffd700' }} />
                    <span style={{ fontWeight: 600 }}>
                      {currentMember.member_name || '尊贵会员'}
                    </span>
                    {currentMember.level_name && (
                      <Tag color="gold" style={{ border: 'none', marginLeft: 4 }}>
                        {currentMember.level_name}
                      </Tag>
                    )}
                  </div>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={clearMember}
                    style={{ color: '#fff' }}
                  />
                </div>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>
                  <IdcardOutlined style={{ marginRight: 4 }} />
                  {currentMember.phone}
                </div>
                <div>
                  <GiftOutlined style={{ marginRight: 4 }} />
                  积分：<b style={{ fontSize: 16 }}>{currentMember.points || 0}</b>
                </div>
                {currentMember.balance !== undefined && (
                  <div>
                    <CreditCardOutlined style={{ marginRight: 4 }} />
                    余额：¥{(currentMember.balance || 0).toFixed(2)}
                  </div>
                )}
                {memberLevelDiscountInfo && memberLevelDiscountInfo.discountRate < 100 && (
                  <div>
                    会员折扣：<b>{memberLevelDiscountInfo.discount}</b>
                  </div>
                )}
              </div>
              {pointsEarnPreview > 0 && payAmount > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 6 }}>
                  <GiftOutlined style={{ marginRight: 4 }} />
                  本次消费预计赠送积分：<b>+{pointsEarnPreview}</b>
                </div>
              )}
              {memberLevelDiscountInfo?.isProjected && memberLevelDiscountInfo?.additionalDiscount > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)', borderRadius: 6, color: '#d46b08' }}>
                  <CrownOutlined style={{ marginRight: 4 }} />
                  <span>
                    🎉 本单消费后升级为「<b>{memberLevelDiscountInfo.projectedLevel.levelName}</b>」！
                    已按{memberLevelDiscountInfo.discount}结算，额外优惠
                    <b>¥{(totalAmount * memberLevelDiscountInfo.additionalDiscount / 10000).toFixed(2)}</b>
                  </span>
                </div>
              )}
            </Card>
          )}

          <div className="search-bar">
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索商品名称或扫描条码"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleQuickAdd}
              size="large"
              autoFocus
            />
            <Tooltip title="库存预警">
              <Badge count={lowStockCount} size="small" offset={[-4, 4]}>
                <Button
                  type="text"
                  icon={<AlertOutlined />}
                  size="large"
                  onClick={() => setStockForecastVisible(true)}
                  style={{ marginLeft: 8 }}
                />
              </Badge>
            </Tooltip>
          </div>
          <div className="category-list">
            <div
              className={`category-item ${showRecommend ? 'active' : ''}`}
              onClick={handleRecommendClick}
              style={{
                background: showRecommend ? 'linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%)' : undefined,
                color: showRecommend ? '#fff' : undefined,
              }}
            >
              <FireOutlined style={{ marginRight: 4 }} />
              智能推荐
            </div>
            <div
              className={`category-item ${!activeCategory && !showRecommend ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              全部
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`category-item ${activeCategory === cat.id && !showRecommend ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </div>
            ))}
          </div>
          <div className="product-list">
            {showRecommend ? (
              <div className="recommend-container">
                <div className="recommend-section">
                  <div className="recommend-title">
                    <BulbOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                    {timeRecLabel}
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      近7天
                    </Tag>
                  </div>
                  {hotProducts.length === 0 ? (
                    <Empty
                      description="暂无销售数据，多卖几单就有推荐啦"
                      style={{ marginTop: 40 }}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <div className="product-grid">
                      {hotProducts.map((product) => (
                        <div
                          key={product.product_id}
                          className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                          onClick={() => addRecommendationToCart(product)}
                          style={{ position: 'relative' }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              background: 'linear-gradient(135deg, #ff7a45, #ff4d4f)',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 'bold',
                              zIndex: 1,
                            }}
                          >
                            🔥 {product.total_quantity}
                          </div>
                          <div className="product-image">{product.image || '📦'}</div>
                          <div className="product-name">{product.product_name || product.name}</div>
                          <div className="product-price">¥{product.price.toFixed(2)}</div>
                          <div className={`product-stock ${product.stock <= 10 ? 'low' : ''}`}>
                            库存: {product.stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && cartRecommendations.length > 0 && (
                  <div className="recommend-section" style={{ marginTop: 16 }}>
                    <div className="recommend-title">
                      <ShoppingOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                      买了的人还买了
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        智能搭配
                      </Tag>
                    </div>
                    <div className="product-grid">
                      {cartRecommendations.map((rec) => (
                        <div
                          key={rec.product_id}
                          className={`product-card ${rec.stock <= 0 ? 'out-of-stock' : ''}`}
                          onClick={() => addRecommendationToCart(rec)}
                          style={{ position: 'relative' }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              zIndex: 1,
                            }}
                          >
                            搭配
                          </div>
                          <div className="product-image">{rec.image || '📦'}</div>
                          <div className="product-name">{rec.product_name}</div>
                          <div className="product-price">¥{rec.price.toFixed(2)}</div>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            共购 {rec.co_occurrence_count || 0} 次
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : products.length === 0 ? (
              <Empty description="暂无商品" style={{ marginTop: 60 }} />
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                    onClick={() => addToCart(product)}
                  >
                    <div className="product-image">{product.image || '📦'}</div>
                    <div className="product-name">{product.product_name || product.name}</div>
                    <div className="product-price">¥{product.price.toFixed(2)}</div>
                    <div className={`product-stock ${product.stock <= 10 ? 'low' : ''}`}>
                      库存: {product.stock}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cashier-right">
          <div className="cart-header">
            <h3>
              购物车 <span style={{ color: '#999', fontSize: '14px' }}>({totalItems}件)</span>
            </h3>
            <Button type="link" danger onClick={clearCart} disabled={cart.length === 0}>
              清空
            </Button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div style={{ fontSize: 48 }}>🛒</div>
                <div>购物车是空的</div>
                <div style={{ fontSize: 12 }}>点击左侧商品添加</div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="cart-item">
                  <div style={{ fontSize: 28 }}>{item.image || '📦'}</div>
                  <div className="item-info">
                    <div className="item-name">{item.product_name}</div>
                    <div className="item-price">¥{item.price.toFixed(2)}</div>
                  </div>
                  <div className="item-qty">
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                    />
                    <span style={{ width: 32, textAlign: 'center' }}>{item.quantity}</span>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => removeFromCart(item.product_id)}
                  />
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && cartRecommendations.length > 0 && (
            <div className="cart-recommend" style={{
              padding: '10px 12px',
              background: '#f6ffed',
              borderTop: '1px solid #b7eb8f',
              borderBottom: '1px solid #b7eb8f',
            }}>
              <div style={{
                fontSize: 12,
                color: '#52c41a',
                fontWeight: 'bold',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <BulbOutlined /> 买了的人还买了
              </div>
              <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4,
              }}>
                {cartRecommendations.slice(0, 5).map((rec) => (
                  <div
                    key={rec.product_id}
                    onClick={() => addRecommendationToCart(rec)}
                    style={{
                      flexShrink: 0,
                      width: 70,
                      padding: 6,
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid #d9f7be',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{rec.image || '📦'}</div>
                    <div style={{
                      fontSize: 11,
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {rec.product_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 'bold' }}>
                      ¥{rec.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cart-footer">
            <div className="cart-total">
              <span className="label">商品金额：</span>
              <span className="amount">¥{totalAmount.toFixed(2)}</span>
            </div>
            {memberDiscount > 0 && (
              <div className="cart-total" style={{ color: '#52c41a' }}>
                <span className="label">会员折扣：</span>
                <span className="amount">-¥{memberDiscount.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="cart-total" style={{ color: '#fa8c16' }}>
                <span className="label">手动优惠：</span>
                <span className="amount">-¥{discount.toFixed(2)}</span>
              </div>
            )}
            {pointsValue > 0 && (
              <div className="cart-total" style={{ color: '#722ed1' }}>
                <span className="label">积分抵扣：</span>
                <span className="amount">-¥{pointsValue.toFixed(2)} ({deductPoints}分)</span>
              </div>
            )}
            <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
            <div className="cart-total" style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
              <span className="label">应收：</span>
              <span className="amount">¥{payAmount}</span>
            </div>
            <Button
              type="primary"
              size="large"
              block
              onClick={handleCheckout}
              disabled={cart.length === 0}
              style={{ height: 48, fontSize: 18, marginTop: 12 }}
            >
              去结算
            </Button>
          </div>
        </div>
      </div>

      <Modal
        title="收银结算"
        open={payModalVisible}
        onOk={handlePayment}
        onCancel={() => setPayModalVisible(false)}
        width={460}
        okText="确认收款"
        cancelText="取消"
        maskClosable={false}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: '#666' }}>商品数量：{totalItems} 件</div>
            <div style={{ marginBottom: 8, color: '#666' }}>
              商品金额：<span style={{ color: '#333' }}>¥{totalAmount.toFixed(2)}</span>
            </div>
            {memberDiscount > 0 && (
              <div style={{ marginBottom: 8, color: '#52c41a' }}>
                会员折扣：-¥{memberDiscount.toFixed(2)}
                {memberLevelDiscountInfo && (
                  <Tag color="geekblue" style={{ marginLeft: 8 }}>
                    {memberLevelDiscountInfo.levelName}
                  </Tag>
                )}
              </div>
            )}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#666' }}>优惠金额：</span>
              <InputNumber
                size="small"
                min={0}
                max={totalAmount - memberDiscount}
                step={0.5}
                precision={2}
                value={discount}
                onChange={(val) => setDiscount(val || 0)}
                style={{ width: 120 }}
                prefix="¥"
              />
            </div>
            {currentMember && (currentMember.points || 0) > 0 && (
              <div style={{
                marginBottom: 12,
                padding: 12,
                background: '#f9f0ff',
                borderRadius: 6,
                border: '1px solid #d3adf7',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#531dab', fontWeight: 500 }}>
                    <GiftOutlined style={{ marginRight: 4 }} />
                    使用积分抵扣
                  </span>
                  <Badge
                    count={`${currentMember.points || 0}积分`}
                    style={{ backgroundColor: '#722ed1' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Radio
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    disabled={!currentMember || payAmount <= 0}
                  >
                    使用积分（100积分=¥1）
                  </Radio>
                  {usePoints && (
                    <Tooltip title={`最多可使用${maxDeductPoints}积分`}>
                      <InputNumber
                        size="small"
                        min={0}
                        max={maxDeductPoints}
                        step={100}
                        value={deductPoints}
                        onChange={(val) => setDeductPoints(Math.max(0, Math.min(val || 0, maxDeductPoints)))}
                        style={{ width: 140 }}
                        addonAfter="分"
                      />
                    </Tooltip>
                  )}
                </div>
                {usePoints && deductPoints > 0 && (
                  <div style={{ marginTop: 8, color: '#722ed1', fontSize: 13 }}>
                    可抵扣金额：<b>¥{pointsValue.toFixed(2)}</b>
                  </div>
                )}
              </div>
            )}
            <div style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ff4d4f',
              padding: '12px 0',
              borderTop: '1px dashed #eee',
              borderBottom: '1px dashed #eee',
              marginBottom: 16,
            }}>
              应收金额：¥{payAmount}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>支付方式：</div>
            <Radio.Group
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
              style={{ width: '100%' }}
            >
              <Radio.Button value="cash">现金</Radio.Button>
              <Radio.Button value="wechat">微信支付</Radio.Button>
              <Radio.Button value="alipay">支付宝</Radio.Button>
              <Radio.Button
                value="member_card"
                disabled={!currentMember || availableCards.length === 0}
                style={!currentMember || availableCards.length === 0 ? { opacity: 0.5 } : {}}
              >
                储值卡支付
              </Radio.Button>
            </Radio.Group>
            {!currentMember && payType === 'member_card' && (
              <div style={{ marginTop: 8, color: '#faad14', fontSize: 12 }}>
                请先输入会员信息后再使用储值卡支付
              </div>
            )}
            {payType === 'member_card' && currentMember && availableCards.length > 0 && (
              <Select
                style={{ width: '100%', marginTop: 12 }}
                value={selectedCardId}
                onChange={setSelectedCardId}
                placeholder="请选择储值卡"
                size="large"
              >
                {availableCards.map((card) => {
                  const available = (card.balance || 0) - (card.reserved_balance || 0)
                  return (
                    <Option key={card.id} value={card.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <CreditCardOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                          {card.card_no}
                          {card.card_type && (
                            <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>
                              {card.card_type === 1 ? '储值卡' : card.card_type === 2 ? '信用卡' : '会员卡'}
                            </Tag>
                          )}
                        </span>
                        <span style={{ color: '#52c41a', fontWeight: 500 }}>
                          可用: ¥{available.toFixed(2)}
                          {!isOnline && (card.credit_limit || 0) > 0 && (
                            <Tooltip title={`离线预授权额度: ¥${(card.credit_limit - card.used_credit || 0).toFixed(2)}`}>
                              <Tag color="orange" style={{ marginLeft: 4, fontSize: 11 }}>
                                +预授权
                              </Tag>
                            </Tooltip>
                          )}
                        </span>
                      </div>
                    </Option>
                  )
                })}
              </Select>
            )}
            {payType === 'member_card' && currentMember && availableCards.length === 0 && (
              <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
                该会员暂无可用的储值卡
              </div>
            )}
            {pointsEarnPreview > 0 && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: '#f6ffed',
                borderRadius: 6,
                border: '1px solid #b7eb8f',
                color: '#389e0d',
              }}>
                <GiftOutlined style={{ marginRight: 4 }} />
                本次消费完成后将赠送积分：<b style={{ fontSize: 16 }}>+{pointsEarnPreview}</b>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        title={<GiftOutlined style={{ color: '#eb2f96', marginRight: 8 }} />}
        open={birthdayTipVisible}
        onOk={() => setBirthdayTipVisible(false)}
        onCancel={() => setBirthdayTipVisible(false)}
        okText="知道了"
        cancelText="关闭"
        width={400}
      >
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎂</div>
          {birthdayMember ? (
            <>
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                今日是会员 <b style={{ color: '#eb2f96' }}>{birthdayMember.member_name}</b> 的生日！
              </div>
              <div style={{ color: '#666', fontSize: 14 }}>
                {birthdayMember.phone && (
                  <div>手机号：{birthdayMember.phone}</div>
                )}
                <div style={{ marginTop: 8, padding: 12, background: '#fff0f6', borderRadius: 6 }}>
                  💡 温馨提示：可赠送生日积分或提供专属优惠
                </div>
              </div>
            </>
          ) : (
            <div>近7天内有即将过生日的会员，请留意！</div>
          )}
        </div>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: '#fa8c16' }} />
            智能备货预估
            <Tag color="blue" style={{ marginLeft: 8 }}>离线预测</Tag>
          </div>
        }
        open={stockForecastVisible}
        onCancel={() => setStockForecastVisible(false)}
        footer={[
          <Button key="refresh" onClick={async () => {
            recommendService.invalidateCache()
            await loadStockAlerts()
            message.success('预测已刷新')
          }}>
            刷新预测
          </Button>,
          <Button key="close" type="primary" onClick={() => setStockForecastVisible(false)}>
            知道了
          </Button>,
        ]}
        width={720}
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="紧缺商品"
                value={stockAlerts.filter(a => a.urgency === 'critical').length}
                valueStyle={{ color: '#ff4d4f' }}
                prefix="🔴"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="预警商品"
                value={stockAlerts.filter(a => a.urgency === 'high').length}
                valueStyle={{ color: '#fa8c16' }}
                prefix="🟠"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="建议备货"
                value={stockAlerts.reduce((sum, a) => sum + (a.suggested_purchase || 0), 0)}
                valueStyle={{ color: '#52c41a' }}
                suffix="件"
                prefix="📦"
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
          基于近14天销售数据预测未来7天需求 · 安全系数 1.2
        </div>

        {stockAlerts.length === 0 ? (
          <Empty description="库存充足，暂无预警" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            size="small"
            dataSource={stockAlerts.slice(0, 30)}
            rowKey="id"
            pagination={{ pageSize: 10, size: 'small' }}
            columns={[
              {
                title: '商品',
                dataIndex: 'product_name',
                key: 'product_name',
                render: (text, record) => (
                  <div>
                    <div>{text}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      日均销 {record.daily_avg || 0} 件
                    </div>
                  </div>
                ),
              },
              {
                title: '当前库存',
                dataIndex: 'stock',
                key: 'stock',
                width: 90,
                render: (v, record) => (
                  <div style={{
                    color: record.urgency === 'critical' ? '#ff4d4f' : record.urgency === 'high' ? '#fa8c16' : '#333',
                    fontWeight: 'bold',
                  }}>
                    {v || 0}
                  </div>
                ),
              },
              {
                title: '可售天数',
                dataIndex: 'days_until_stockout',
                key: 'days_until_stockout',
                width: 80,
                render: (v) => `${v || 0}天`,
              },
              {
                title: '7天预测',
                dataIndex: 'forecast_qty',
                key: 'forecast_qty',
                width: 80,
              },
              {
                title: '缺口',
                dataIndex: 'shortage',
                key: 'shortage',
                width: 70,
                render: (v) => v > 0 ? (
                  <span style={{ color: '#ff4d4f' }}>-{v}</span>
                ) : <span style={{ color: '#52c41a' }}>充足</span>,
              },
              {
                title: '建议采购',
                dataIndex: 'suggested_purchase',
                key: 'suggested_purchase',
                width: 80,
                render: (v) => v > 0 ? (
                  <Tag color="orange">{v}件</Tag>
                ) : '-',
              },
              {
                title: '紧急度',
                dataIndex: 'urgency',
                key: 'urgency',
                width: 70,
                render: (v) => {
                  const colorMap = {
                    critical: 'red',
                    high: 'orange',
                    medium: 'gold',
                    low: 'green',
                  }
                  const labelMap = {
                    critical: '紧急',
                    high: '高',
                    medium: '中',
                    low: '低',
                  }
                  return <Tag color={colorMap[v]}>{labelMap[v] || v}</Tag>
                },
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            开具电子发票
            {!isOnline && (
              <Tag color="warning" style={{ marginLeft: 8 }}>
                <WifiOutlined /> 离线预生成
              </Tag>
            )}
          </div>
        }
        open={invoiceModalVisible}
        onCancel={handleInvoiceCancel}
        footer={null}
        width={560}
        maskClosable={false}
      >
        {currentInvoice ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              电子发票已生成
            </div>
            <div style={{ color: '#666', marginBottom: 20 }}>
              发票编号：{currentInvoice.invoice_no}
            </div>

            {currentInvoice.qrcode_image ? (
              <div style={{ margin: '20px 0' }}>
                <img
                  src={currentInvoice.qrcode_image}
                  alt="发票二维码"
                  style={{ width: 200, height: 200, border: '1px solid #eee', padding: 10 }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  顾客扫码后可将发票存入票夹
                </div>
              </div>
            ) : (
              <div style={{ margin: '20px 0', padding: 40, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                <div style={{ color: '#999' }}>二维码生成中...</div>
              </div>
            )}

            <Row gutter={16} style={{ marginTop: 20, textAlign: 'left' }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="发票金额"
                    value={currentInvoice.total_amount}
                    prefix="¥"
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="发票状态"
                    value={getInvoiceStatusText(currentInvoice.invoice_status)}
                    valueStyle={{ fontSize: 16, color: currentInvoice.invoice_status === 2 ? '#52c41a' : '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 12, textAlign: 'left' }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="税控状态"
                    value={getTaxControlStatusText(currentInvoice.tax_control_status)}
                    valueStyle={{ fontSize: 14, color: currentInvoice.tax_control_status === 2 ? '#52c41a' : '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="同步状态"
                    value={currentInvoice.sync_status === 1 ? '已同步' : '未同步'}
                    valueStyle={{ fontSize: 14, color: currentInvoice.sync_status === 1 ? '#52c41a' : '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 24, padding: 12, background: '#e6f7ff', borderRadius: 6, textAlign: 'left' }}>
              <div style={{ color: '#1890ff', marginBottom: 4 }}>
                <FileTextOutlined style={{ marginRight: 4 }} />
                开票说明
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                {isOnline ? (
                  <>
                    发票信息已上传至税控系统，正式发票将在1-3分钟内开具完成。
                    <br />
                    开具成功后将自动推送至顾客手机。
                  </>
                ) : (
                  <>
                    当前处于离线状态，发票已在本地预生成。
                    <br />
                    网络恢复后将自动上传至税控系统开具正式发票。
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Button type="primary" size="large" onClick={handleInvoiceCancel} style={{ width: 200 }}>
                完成
              </Button>
            </div>
          </div>
        ) : (
          <Form
            form={invoiceForm}
            layout="vertical"
            onFinish={handleCreateInvoice}
            initialValues={{
              invoice_title_type: 1,
              invoice_type: 1,
              tax_rate: 0.01,
            }}
          >
            {currentOrderForInvoice && (
              <div style={{ marginBottom: 20, padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  <ShoppingOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                  订单信息
                </div>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#666' }}>订单编号</div>
                    <div style={{ fontWeight: 500 }}>{currentOrderForInvoice.order_no}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#666' }}>订单金额</div>
                    <div style={{ fontWeight: 500, color: '#ff4d4f', fontSize: 16 }}>
                      ¥{currentOrderForInvoice.pay_amount || currentOrderForInvoice.total_amount}
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            <Tabs
              items={[
                {
                  key: '1',
                  label: '个人/非企业',
                },
                {
                  key: '2',
                  label: '企业单位',
                },
              ]}
              onChange={(key) => {
                invoiceForm.setFieldsValue({
                  invoice_title_type: parseInt(key),
                  buyer_tax_no: key === '1' ? '' : undefined,
                  buyer_address: key === '1' ? '' : undefined,
                  buyer_bank: key === '1' ? '' : undefined,
                })
              }}
            />

            <Form.Item
              name="invoice_title_type"
              hidden
            >
              <Input type="hidden" />
            </Form.Item>

            <Form.Item
              name="buyer_name"
              label="发票抬头"
              rules={[{ required: true, message: '请输入发票抬头' }]}
              style={{ marginTop: 16 }}
            >
              <Input placeholder="请输入发票抬头名称" size="large" />
            </Form.Item>

            <Form.Item
              name="buyer_phone"
              label="接收手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
              ]}
              extra="用于接收电子发票推送通知"
            >
              <Input placeholder="请输入接收发票的手机号" size="large" maxLength={11} />
            </Form.Item>

            <Form.Item
              name="buyer_email"
              label="接收邮箱（选填）"
              rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
              extra="可选，用于接收电子发票PDF文件"
            >
              <Input placeholder="请输入接收发票的邮箱" size="large" />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.invoice_title_type !== currentValues.invoice_title_type}
            >
              {({ getFieldValue }) => {
                const type = getFieldValue('invoice_title_type')
                if (type !== 2) return null

                return (
                  <>
                    <Form.Item
                      name="buyer_tax_no"
                      label="纳税人识别号"
                      rules={[{ required: true, message: '请输入纳税人识别号' }]}
                    >
                      <Input placeholder="请输入企业纳税人识别号" size="large" />
                    </Form.Item>

                    <Form.Item
                      name="buyer_address"
                      label="企业地址、电话（选填）"
                    >
                      <Input placeholder="请输入企业地址和电话" size="large" />
                    </Form.Item>

                    <Form.Item
                      name="buyer_bank"
                      label="开户行及账号（选填）"
                    >
                      <Input placeholder="请输入开户行及账号" size="large" />
                    </Form.Item>
                  </>
                )
              }}
            </Form.Item>

            <Form.Item
              name="invoice_type"
              label="发票类型"
              rules={[{ required: true, message: '请选择发票类型' }]}
            >
              <Radio.Group size="large">
                <Radio.Button value={1}>增值税普通发票</Radio.Button>
                <Radio.Button value={2}>增值税专用发票</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="remark"
              label="备注（选填）"
            >
              <Input.TextArea placeholder="请输入备注信息" rows={2} maxLength={100} showCount />
            </Form.Item>

            {!isOnline && (
              <Alert
                message="当前处于离线状态，发票将在本地预生成，网络恢复后自动上传至税控系统"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button size="large" onClick={handleInvoiceCancel}>
                  暂不开具
                </Button>
                <Button type="primary" size="large" htmlType="submit" loading={invoiceGenerating}>
                  {invoiceGenerating ? '生成中...' : '生成发票'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <OperationLockModal
        visible={lockModalVisible}
        lockData={currentLockData}
        onClose={handleLockClose}
        onVerified={handleLockVerified}
      />
    </AppLayout>
  )
}

export default Cashier

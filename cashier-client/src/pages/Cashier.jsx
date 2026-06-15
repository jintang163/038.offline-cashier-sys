import React, { useState, useEffect, useCallback } from 'react'
import { Input, Button, Modal, Radio, message, Empty, InputNumber, Alert } from 'antd'
import { SearchOutlined, DeleteOutlined, PlusOutlined, MinusOutlined, WifiOutlined } from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import db from '../db/dexie'
import { initMockData } from '../db/mockData'
import useNetworkStatus from '../hooks/useNetwork'
import dayjs from 'dayjs'

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

  useEffect(() => {
    initData()
  }, [])

  const initData = async () => {
    await initMockData()
    loadCategories()
    loadProducts()
  }

  const loadCategories = async () => {
    const data = await db.getCategories()
    setCategories(data)
  }

  const loadProducts = async (categoryId = null) => {
    const params = { pageSize: 100 }
    if (categoryId) {
      params.categoryId = categoryId
    }
    if (searchText) {
      params.keyword = searchText
    }
    const data = await db.getProducts(params)
    setProducts(data.items)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(activeCategory)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, activeCategory])

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(activeCategory === categoryId ? null : categoryId)
  }

  const addToCart = useCallback((product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id)
      if (existing) {
        return prevCart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: Number(((item.quantity + 1) * item.price).toFixed(2)),
              }
            : item
        )
      }
      return [
        ...prevCart,
        {
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
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
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              subtotal: Number((quantity * item.price).toFixed(2)),
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
  const payAmount = Math.max(0, totalAmount - discount).toFixed(2)

  const handleCheckout = () => {
    if (cart.length === 0) {
      message.warning('购物车为空')
      return
    }
    setPayModalVisible(true)
  }

  const handlePayment = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const orderData = {
        items: cart,
        total_amount: Number(totalAmount.toFixed(2)),
        discount_amount: Number(discount),
        pay_amount: Number(payAmount),
        pay_type: payType,
        cashier_id: userInfo.id || null,
        cashier_name: userInfo.name || '收银员',
      }

      const order = await db.createOrder(orderData)

      message.success(`订单 ${order.order_no} 创建成功`)
      setCart([])
      setDiscount(0)
      setPayModalVisible(false)
      loadProducts(activeCategory)
    } catch (error) {
      message.error('结算失败：' + error.message)
    }
  }

  const handleQuickAdd = (e) => {
    if (e.key === 'Enter' && searchText) {
      const product = products.find(
        (p) => p.barcode === searchText || p.name === searchText
      )
      if (product) {
        addToCart(product)
        setSearchText('')
      }
    }
  }

  return (
    <AppLayout>
      {!isOnline && (
        <Alert
          message={
            <span>
              <WifiOutlined style={{ marginRight: 8 }} />
              当前处于离线状态，订单将暂存本地，联网后自动同步
            </span>
          }
          type="warning"
          showIcon={false}
          style={{
            marginBottom: 12,
            borderRadius: 4,
          }}
          banner
        />
      )}
      <div className="cashier-container" style={{ height: '100%' }}>
        <div className="cashier-left">
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
          </div>
          <div className="category-list">
            <div
              className={`category-item ${!activeCategory ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              全部
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </div>
            ))}
          </div>
          <div className="product-list">
            {products.length === 0 ? (
              <Empty description="暂无商品" style={{ marginTop: 60 }} />
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="product-card"
                    onClick={() => addToCart(product)}
                  >
                    <div className="product-image">{product.image || '📦'}</div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-price">¥{product.price.toFixed(2)}</div>
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

          <div className="cart-footer">
            <div className="cart-total">
              <span className="label">合计：</span>
              <span className="amount">¥{totalAmount.toFixed(2)}</span>
            </div>
            <Button
              type="primary"
              size="large"
              block
              onClick={handleCheckout}
              disabled={cart.length === 0}
              style={{ height: 48, fontSize: 18 }}
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
        width={400}
        okText="确认收款"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: '#666' }}>商品数量：{totalItems} 件</div>
            <div style={{ marginBottom: 8, color: '#666' }}>
              商品金额：<span style={{ color: '#333' }}>¥{totalAmount.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#666' }}>优惠金额：</span>
              <InputNumber
                size="small"
                min={0}
                max={totalAmount}
                step={0.5}
                precision={2}
                value={discount}
                onChange={(val) => setDiscount(val || 0)}
                style={{ width: 120 }}
                prefix="¥"
              />
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4d4f' }}>
              应收金额：¥{payAmount}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>支付方式：</div>
            <Radio.Group value={payType} onChange={(e) => setPayType(e.target.value)}>
              <Radio.Button value="cash">现金</Radio.Button>
              <Radio.Button value="wechat">微信支付</Radio.Button>
              <Radio.Button value="alipay">支付宝</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

export default Cashier

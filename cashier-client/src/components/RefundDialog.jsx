import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Radio,
  Input,
  InputNumber,
  Button,
  Table,
  Space,
  Row,
  Col,
  Descriptions,
  message,
  Alert,
  Tooltip,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import db from '../db/dexie'
import refundService from '../services/refundService'
import fraudDetectionService from '../services/fraudDetectionService'
import OperationLockModal from './OperationLockModal'

const { TextArea } = Input

const REFUND_REASON_OPTIONS = [
  { label: '菜品质量问题', value: 'quality' },
  { label: '上错菜', value: 'wrong_dish' },
  { label: '客人要求退菜', value: 'customer_request' },
  { label: '上菜太慢', value: 'slow_service' },
  { label: '其他原因', value: 'other' },
]

export default function RefundDialog({ visible, order, onClose, onSuccess }) {
  const [refundType, setRefundType] = useState(1)
  const [refundReason, setRefundReason] = useState('')
  const [refundItems, setRefundItems] = useState([])
  const [availableRefundAmount, setAvailableRefundAmount] = useState(0)
  const [totalRefundAmount, setTotalRefundAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refundedAmount, setRefundedAmount] = useState(0)
  const [managerModalVisible, setManagerModalVisible] = useState(false)
  const [lockModalVisible, setLockModalVisible] = useState(false)
  const [currentLockData, setCurrentLockData] = useState(null)
  const [pendingRefundData, setPendingRefundData] = useState(null)
  const [managerForm] = Form.useForm()
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible && order) {
      initRefundData()
    }
  }, [visible, order])

  const initRefundData = async () => {
    setLoading(true)
    try {
      const totalRefunded = await db.getTotalRefundedAmountByOrderId(order.id)
      setRefundedAmount(totalRefunded)
      setAvailableRefundAmount(parseFloat(order.pay_amount) - totalRefunded)
      setTotalRefundAmount(0)

      const itemsWithRefundedQty = []
      for (const item of order.items || []) {
        const alreadyRefundedQty = await db.getRefundedQuantityByOrderItemId(item.id)
        const availableQty = item.quantity - alreadyRefundedQty
        const payAmount = item.pay_amount || item.subtotal || item.total_amount
        const unitPrice = item.quantity > 0 ? payAmount / item.quantity : item.price
        itemsWithRefundedQty.push({
          ...item,
          alreadyRefundedQty,
          availableQty,
          refundQuantity: 0,
          unitPrice,
        })
      }
      setRefundItems(itemsWithRefundedQty)
      setRefundType(1)
      setRefundReason('')
      form.resetFields()
    } catch (error) {
      console.error('初始化退款数据失败：', error)
      message.error('初始化退款数据失败')
    } finally {
      setLoading(false)
    }
  }

  const calculateRefundAmount = (items) => {
    return items.reduce((total, item) => {
      return total + (item.refundQuantity || 0) * (item.unitPrice || item.price || 0)
    }, 0)
  }

  const handleRefundQuantityChange = (index, value) => {
    const newItems = [...refundItems]
    const availableQty = newItems[index].availableQty
    const qty = Math.max(0, Math.min(value || 0, availableQty))
    newItems[index] = { ...newItems[index], refundQuantity: qty }
    setRefundItems(newItems)
    setTotalRefundAmount(calculateRefundAmount(newItems))
  }

  const handleSelectAllItem = (index) => {
    const newItems = [...refundItems]
    newItems[index] = { ...newItems[index], refundQuantity: newItems[index].availableQty }
    setRefundItems(newItems)
    setTotalRefundAmount(calculateRefundAmount(newItems))
  }

  const handleRefundTypeChange = (e) => {
    const type = e.target.value
    setRefundType(type)
    if (type === 2) {
      const newItems = refundItems.map((item) => ({
        ...item,
        refundQuantity: item.availableQty,
      }))
      setRefundItems(newItems)
      setTotalRefundAmount(Math.min(calculateRefundAmount(newItems), availableRefundAmount))
    } else {
      const newItems = refundItems.map((item) => ({
        ...item,
        refundQuantity: 0,
      }))
      setRefundItems(newItems)
      setTotalRefundAmount(0)
    }
  }

  const handleSubmit = async (values) => {
    let finalRefundAmount = totalRefundAmount
    if (refundType === 2) {
      finalRefundAmount = Math.min(totalRefundAmount, availableRefundAmount)
    }

    if (finalRefundAmount <= 0) {
      message.warning('请选择要退菜的商品')
      return
    }
    if (finalRefundAmount > availableRefundAmount) {
      message.warning(`退款金额不能超过剩余可退金额 ¥${availableRefundAmount.toFixed(2)}`)
      return
    }

    if (!refundReason) {
      message.warning('请选择退菜原因')
      return
    }

    const hasSelectedItems = refundItems.some((item) => item.refundQuantity > 0)
    if (!hasSelectedItems) {
      message.warning('请选择要退菜的商品')
      return
    }

    setManagerModalVisible(true)
    managerForm.resetFields()
  }

  const handleManagerVerify = async (values) => {
    setSubmitting(true)
    try {
      const verifyResult = await refundService.verifyManagerPermission(
        values.managerUsername,
        values.managerPassword
      )

      if (!verifyResult.success) {
        message.error(verifyResult.error || '经理权限验证失败')
        return
      }

      const selectedItems = refundItems
        .filter((item) => item.refundQuantity > 0)
        .map((item) => ({
          orderItemId: item.id,
          refundQuantity: item.refundQuantity,
        }))

      let finalRefundAmount = Math.min(totalRefundAmount, availableRefundAmount)
      if (refundType === 2) {
        finalRefundAmount = availableRefundAmount
      }

      const riskResult = await fraudDetectionService.checkRefundRisk(
        finalRefundAmount,
        order.id
      )

      if (riskResult.isRisk && riskResult.shouldLock) {
        const lockData = await fraudDetectionService.createLock(
          'REFUND',
          riskResult,
          {
            orderId: order.id,
            orderNo: order.order_no,
            refundAmount: finalRefundAmount,
            refundType,
            refundReason,
            items: selectedItems,
            remark: values.remark || '',
          }
        )

        setPendingRefundData({
          orderId: order.id,
          refundType,
          refundReason,
          items: selectedItems,
          remark: values.remark || '',
          managerInfo: verifyResult.data,
        })
        setCurrentLockData(lockData)
        setManagerModalVisible(false)
        setLockModalVisible(true)
        setSubmitting(false)
        return
      }

      await refundService.createRefund(order.id, {
        refundType,
        refundReason,
        items: selectedItems,
        remark: values.remark || '',
        managerInfo: verifyResult.data,
      })

      setManagerModalVisible(false)
      message.success('退菜申请已提交，待审核通过后自动还原库存')
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (error) {
      console.error('提交退菜失败：', error)
      message.error(error.message || '提交退菜失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLockVerified = async () => {
    if (!pendingRefundData) return

    setSubmitting(true)
    try {
      await refundService.createRefund(
        pendingRefundData.orderId,
        {
          refundType: pendingRefundData.refundType,
          refundReason: pendingRefundData.refundReason,
          items: pendingRefundData.items,
          remark: pendingRefundData.remark || '',
          managerInfo: pendingRefundData.managerInfo,
        }
      )

      setLockModalVisible(false)
      setCurrentLockData(null)
      setPendingRefundData(null)
      message.success('退菜申请已提交，待审核通过后自动还原库存')
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (error) {
      console.error('验证通过后提交退款失败：', error)
      message.error(error.message || '提交退菜失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLockClose = () => {
    setLockModalVisible(false)
    setCurrentLockData(null)
    setPendingRefundData(null)
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec',
      width: 100,
      ellipsis: true,
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      render: (v) => `¥${parseFloat(v || 0).toFixed(2)}`,
    },
    {
      title: '实付单价',
      key: 'unitPrice',
      width: 100,
      render: (_, record) => `¥${parseFloat(record.unitPrice || 0).toFixed(2)}`,
    },
    {
      title: '原数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 70,
    },
    {
      title: '已退数量',
      key: 'alreadyRefundedQty',
      width: 90,
      render: (_, record) => (
        <span style={{ color: record.alreadyRefundedQty > 0 ? '#faad14' : undefined }}>
          {record.alreadyRefundedQty}
        </span>
      ),
    },
    {
      title: '可退数量',
      key: 'availableQty',
      width: 90,
      render: (_, record) => (
        <span style={{ color: record.availableQty > 0 ? '#52c41a' : '#bfbfbf', fontWeight: 500 }}>
          {record.availableQty}
        </span>
      ),
    },
    {
      title: '退菜数量',
      key: 'refundQuantity',
      width: 180,
      render: (_, record) =>
        refundType === 2 ? (
          <span style={{ color: '#1890ff', fontWeight: 500 }}>{record.refundQuantity}</span>
        ) : record.availableQty === 0 ? (
          <span style={{ color: '#bfbfbf' }}>—</span>
        ) : (
          <Space.Compact>
            <InputNumber
              min={0}
              max={record.availableQty}
              precision={0}
              value={record.refundQuantity}
              onChange={(value) =>
                handleRefundQuantityChange(refundItems.indexOf(record), value)
              }
              style={{ width: 100 }}
              size="small"
            />
            <Button
              size="small"
              type="link"
              onClick={() => handleSelectAllItem(refundItems.indexOf(record))}
            >
              全部
            </Button>
          </Space.Compact>
        ),
    },
    {
      title: '小计金额',
      key: 'itemTotal',
      width: 110,
      render: (_, record) => {
        const amount = (record.refundQuantity || 0) * (record.unitPrice || record.price || 0)
        return (
          <span style={{ color: amount > 0 ? '#1890ff' : undefined, fontWeight: 500 }}>
            ¥{amount.toFixed(2)}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <Modal
        title={`申请退菜 - 订单号：${order?.order_no || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnClose
        maskClosable={false}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message="退菜操作说明"
              description={
                <>
                  1. 退菜需经理权限验证
                  <br />
                  2. 退菜申请提交后标记为"待审核"，<b style={{color: '#1890ff'}}>审核通过后自动还原库存</b>
                  <br />
                  3. 网络恢复后自动上传退款单，审核通过后ERP自动生成红字销售单
                </>
              }
              style={{ marginBottom: 16 }}
            />

            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单应收">
                ¥{parseFloat(order?.order_amount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="订单实收">
                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                  ¥{parseFloat(order?.pay_amount || 0).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="已退金额">
                <span style={{ color: '#faad14', fontWeight: 500 }}>
                  ¥{refundedAmount.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="剩余可退金额">
                <Tooltip
                  title={
                    availableRefundAmount <= 0 ? '无可退款金额' : '退款金额不能超过此数值'
                  }
                >
                  <span
                    style={{
                      color: availableRefundAmount > 0 ? '#52c41a' : '#ff4d4f',
                      fontWeight: 600,
                    }}
                  >
                    ¥{availableRefundAmount.toFixed(2)}
                  </span>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式" span={2}>
                {order?.pay_type === 1
                  ? '现金'
                  : order?.pay_type === 2
                  ? '微信支付'
                  : order?.pay_type === 3
                  ? '支付宝'
                  : order?.pay_type === 4
                  ? '会员储值'
                  : order?.pay_type === 5
                  ? '组合支付'
                  : order?.pay_type === 'cash'
                  ? '现金'
                  : order?.pay_type === 'wechat'
                  ? '微信支付'
                  : order?.pay_type === 'alipay'
                  ? '支付宝'
                  : '其他'}
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="退款类型"
                    name="refundType"
                    initialValue={refundType}
                    rules={[{ required: true, message: '请选择退款类型' }]}
                  >
                    <Radio.Group value={refundType} onChange={handleRefundTypeChange}>
                      <Radio value={1}>部分退款</Radio>
                      <Radio value={2} disabled={availableRefundAmount <= 0}>
                        整单退款
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="退菜原因"
                    name="refundReason"
                    initialValue={refundReason}
                    rules={[{ required: true, message: '请选择退菜原因' }]}
                  >
                    <Radio.Group
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    >
                      {REFUND_REASON_OPTIONS.map((option) => (
                        <Radio key={option.value} value={option.value}>
                          {option.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: 12, fontWeight: 500 }}>
                商品明细（勾选或填写退菜数量）
              </div>

              <div style={{ marginBottom: 12 }}>
                <Table
                  rowKey="id"
                  dataSource={refundItems}
                  columns={columns}
                  size="small"
                  pagination={false}
                  scroll={{ y: 300 }}
                  rowClassName={(record) =>
                    record.availableQty === 0 ? 'table-row-disabled' : ''
                  }
                />
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="备注说明" name="remark">
                    <TextArea rows={3} placeholder="请输入退菜备注说明（选填）" maxLength={200} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      padding: 16,
                      backgroundColor: '#fafafa',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Row style={{ marginBottom: 8 }}>
                      <Col span={12} style={{ color: '#666' }}>
                        本次退菜总额：
                      </Col>
                      <Col
                        span={12}
                        style={{
                          textAlign: 'right',
                          color:
                            totalRefundAmount > availableRefundAmount ? '#ff4d4f' : '#1890ff',
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        ¥{totalRefundAmount.toFixed(2)}
                      </Col>
                    </Row>
                    {totalRefundAmount > availableRefundAmount && (
                      <div
                        style={{
                          color: '#ff4d4f',
                          fontSize: 12,
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                        超出可退金额 ¥
                        {(totalRefundAmount - availableRefundAmount).toFixed(2)}，按可退金额执行
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                  <Button onClick={onClose}>取消</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={
                      availableRefundAmount <= 0 ||
                      (refundType === 1 && !refundItems.some((item) => item.refundQuantity > 0))
                    }
                  >
                    提交退菜申请
                  </Button>
                </Space>
              </div>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title="经理权限验证"
        open={managerModalVisible}
        onCancel={() => !submitting && setManagerModalVisible(false)}
        onOk={() => managerForm.submit()}
        confirmLoading={submitting}
        okText="验证并提交"
        cancelText="取消"
        maskClosable={false}
      >
        <Alert
          type="warning"
          showIcon
          message="请输入经理/管理员账号进行权限验证"
          description={
            !navigator.onLine
              ? '当前处于离线状态，将使用本地缓存的经理账号验证（若无缓存可使用默认账号 admin/123456）'
              : '验证通过后将提交退菜申请'
          }
          style={{ marginBottom: 16 }}
        />
        <Form form={managerForm} layout="vertical" onFinish={handleManagerVerify}>
          <Form.Item
            label="经理账号"
            name="managerUsername"
            rules={[{ required: true, message: '请输入经理账号' }]}
          >
            <Input placeholder="请输入经理用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="经理密码"
            name="managerPassword"
            rules={[{ required: true, message: '请输入经理密码' }]}
          >
            <Input.Password placeholder="请输入经理密码" autoComplete="current-password" />
          </Form.Item>
        </Form>
      </Modal>

      <OperationLockModal
        visible={lockModalVisible}
        lockData={currentLockData}
        onClose={handleLockClose}
        onVerified={handleLockVerified}
      />
    </>
  )
}

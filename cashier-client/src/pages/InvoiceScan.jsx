import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, Form, message, Result, Descriptions, Tag, Spin, Divider, Alert, Space } from 'antd'
import { FileTextOutlined, CheckCircleOutlined, SaveOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import invoiceService from '../services/invoiceService'
import db from '../db/dexie'
import dayjs from 'dayjs'

function InvoiceScan() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [step, setStep] = useState('loading')
  const [form] = Form.useForm()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStep('error')
      return
    }
    loadInvoice()
  }, [token])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      let inv = await invoiceService.getInvoiceByQrcodeToken(token)

      if (!inv && navigator.onLine) {
        try {
          const result = await db.getInvoiceByQrcodeToken(token)
          if (!result) {
            const apiResult = await fetch(`/api/invoice/qrcode/${token}`)
            const json = await apiResult.json()
            if (json && json.data) {
              inv = json.data
              await db.batchSaveInvoices([inv])
            }
          } else {
            inv = result
          }
        } catch (e) {
          console.warn('从服务端获取发票信息失败:', e)
        }
      }

      if (!inv) {
        const allInvoices = await db.electronic_invoices.toArray()
        inv = allInvoices.find(i => i.qrcode_token === token)
      }

      if (inv) {
        setInvoice(inv)
        setStep('form')
      } else {
        setStep('not_found')
      }
    } catch (e) {
      console.error('加载发票信息失败:', e)
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToWallet = async (values) => {
    if (!invoice) return

    setLoading(true)
    try {
      const walletResult = await invoiceService.scanInvoiceQrcode(token, {
        customer_identifier: values.phone,
        customer_type: 1,
        customer_name: values.name || null,
        customer_phone: values.phone,
        scan_source: 1,
        scan_device_info: navigator.userAgent,
      })

      setWallet(walletResult)
      setStep('success')
      message.success('发票已存入票夹！')
    } catch (e) {
      console.error('存入票夹失败:', e)
      message.error(e.message || '存入票夹失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getInvoiceStatusColor = (status) => {
    const map = { 0: 'orange', 1: 'blue', 2: 'green', 3: 'red', 4: 'red' }
    return map[status] || 'default'
  }

  const getInvoiceStatusText = (status) => {
    const map = { 0: '待开具', 1: '开具中', 2: '已开具', 3: '已红冲', 4: '开具失败' }
    return map[status] || '未知'
  }

  if (loading && step === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Card style={{ width: 400, textAlign: 'center', borderRadius: 12 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666' }}>正在加载发票信息...</div>
        </Card>
      </div>
    )
  }

  if (step === 'error' || step === 'not_found') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Card style={{ width: 400, borderRadius: 12 }}>
          <Result
            status="warning"
            title={step === 'not_found' ? '发票信息未找到' : '二维码无效'}
            subTitle={step === 'not_found'
              ? '该发票信息尚未同步到本地，请稍后再试或联系收银员'
              : '请使用有效的发票二维码扫码'
            }
            extra={[
              <Button type="primary" key="retry" onClick={() => { setStep('loading'); loadInvoice(); }}>
                重新加载
              </Button>,
            ]}
          />
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Card style={{ width: 420, borderRadius: 12 }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="发票已存入票夹"
            subTitle="您可以随时通过手机号查看已存入的发票"
          >
            {invoice && (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="发票编号">{invoice.invoice_no}</Descriptions.Item>
                <Descriptions.Item label="发票金额">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{invoice.total_amount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="购方名称">{invoice.buyer_name}</Descriptions.Item>
                <Descriptions.Item label="门店">{invoice.shop_name}</Descriptions.Item>
                <Descriptions.Item label="发票状态">
                  <Tag color={getInvoiceStatusColor(invoice.invoice_status)}>
                    {getInvoiceStatusText(invoice.invoice_status)}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Result>
          {invoice && invoice.invoice_status === 2 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Alert
                message="电子发票已正式开具"
                description="发票已推送至您的手机和邮箱，请注意查收"
                type="success"
                showIcon
              />
            </div>
          )}
          {invoice && invoice.invoice_status !== 2 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Alert
                message="发票正在开具中"
                description="正式发票将在1-3分钟内开具完成，届时将自动推送至您的手机"
                type="info"
                showIcon
              />
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: 60,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{ width: 420, borderRadius: 12 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <span>电子发票 - 存入票夹</span>
          </div>
        }
      >
        {invoice && (
          <>
            <div style={{
              padding: 16,
              background: '#f6ffed',
              borderRadius: 8,
              border: '1px solid #b7eb8f',
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#389e0d' }}>
                <FileTextOutlined style={{ marginRight: 4 }} />
                发票信息
              </div>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="发票编号" span={2}>
                  {invoice.invoice_no}
                </Descriptions.Item>
                <Descriptions.Item label="发票金额">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16 }}>
                    ¥{invoice.total_amount}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="税率">
                  {invoice.tax_rate ? (parseFloat(invoice.tax_rate) * 100).toFixed(2) + '%' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="购方名称" span={2}>
                  {invoice.buyer_name}
                </Descriptions.Item>
                <Descriptions.Item label="门店" span={2}>
                  {invoice.shop_name}
                </Descriptions.Item>
                <Descriptions.Item label="开票时间" span={2}>
                  {invoice.created_at ? dayjs(invoice.created_at).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="发票状态">
                  <Tag color={getInvoiceStatusColor(invoice.invoice_status)}>
                    {getInvoiceStatusText(invoice.invoice_status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="税额">
                  ¥{invoice.tax_amount || '0.00'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                <SaveOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                存入我的票夹
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
                输入手机号即可将发票存入个人票夹，方便随时查看和管理
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveToWallet}
              initialValues={{ phone: invoice.buyer_phone || '' }}
            >
              <Form.Item
                name="phone"
                label={<><PhoneOutlined style={{ marginRight: 4 }} />手机号</>}
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
                ]}
              >
                <Input
                  placeholder="请输入您的手机号"
                  size="large"
                  maxLength={11}
                  prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                />
              </Form.Item>

              <Form.Item
                name="name"
                label={<><MailOutlined style={{ marginRight: 4 }} />姓名（选填）</>}
              >
                <Input
                  placeholder="请输入您的姓名"
                  size="large"
                />
              </Form.Item>

              {invoice.invoice_status !== 2 && (
                <Alert
                  message="发票正在开具中"
                  description="正式发票将在联网后自动上传税控系统开具，开具成功后将推送至您的手机"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<SaveOutlined />}
                >
                  {loading ? '保存中...' : '存入票夹'}
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}

export default InvoiceScan

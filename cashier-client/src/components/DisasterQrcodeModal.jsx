import React, { useState, useEffect } from 'react'
import { Modal, Button, Radio, Space, Alert, Descriptions, Tag, InputNumber, Row, Col, Spin } from 'antd'
import { QrcodeOutlined, WarningOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import disasterService from '../services/disasterService'
import { getUserInfo } from '../utils/auth'

export default function DisasterQrcodeModal({ visible, onClose }) {
  const [dataHours, setDataHours] = useState(1)
  const [syncScope, setSyncScope] = useState('orders,products,stocks,members,refunds,payments')
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [expireTime, setExpireTime] = useState(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!visible) {
      setTokenInfo(null)
      setLoading(false)
      setCountdown(0)
    }
  }, [visible])

  useEffect(() => {
    let timer = null
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => timer && clearInterval(timer)
  }, [countdown])

  const handleGenerateQrcode = async () => {
    setLoading(true)
    try {
      const result = await disasterService.createDisasterToken(dataHours, syncScope)
      setTokenInfo(result)
      setExpireTime(result.expireTime)
      const expire = new Date(result.expireTime).getTime()
      const now = Date.now()
      const seconds = Math.max(0, Math.floor((expire - now) / 1000))
      setCountdown(seconds)
    } catch (error) {
      console.error('生成灾备二维码失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCountdown = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}分${sec.toString().padStart(2, '0')}秒`
  }

  const currentUser = getUserInfo()

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          灾备登录二维码
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="generate"
          type="primary"
          icon={<QrcodeOutlined />}
          loading={loading}
          onClick={handleGenerateQrcode}
        >
          {tokenInfo ? '重新生成' : '生成二维码'}
        </Button>,
      ]}
    >
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="硬件故障灾备功能"
        description={
          <>
            1. 生成二维码后，使用备用iPad（已安装App）扫描此二维码
            <br />
            2. 备用端将自动同步最近 <b>{dataHours}小时</b> 的核心数据，继续收银
            <br />
            3. 二维码有效期30分钟，请勿泄露给无关人员
          </>
        }
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <div style={{ marginBottom: 12, fontWeight: 500 }}>同步最近数据时长</div>
          <Radio.Group value={dataHours} onChange={(e) => setDataHours(e.target.value)}>
            <Radio value={1}>1小时</Radio>
            <Radio value={2}>2小时</Radio>
            <Radio value={4}>4小时</Radio>
            <Radio value={12}>12小时</Radio>
            <Radio value={24}>24小时</Radio>
          </Radio.Group>
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 12, fontWeight: 500 }}>同步数据范围</div>
          <Radio.Group value={syncScope} onChange={(e) => setSyncScope(e.target.value)}>
            <Radio value="orders,products,stocks,refunds,payments">全部</Radio>
            <Radio value="orders,products,stocks">核心</Radio>
            <Radio value="orders">仅订单</Radio>
          </Radio.Group>
        </Col>
      </Row>

      {tokenInfo && (
        <div style={{ marginTop: 20 }}>
          <Spin spinning={loading}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: 16,
                  border: '2px dashed #d9d9d9',
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  marginBottom: 16,
                }}
              >
                {tokenInfo.qrcodeImage ? (
                  <img
                    src={tokenInfo.qrcodeImage}
                    alt="灾备登录二维码"
                    style={{ width: 240, height: 240 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 240,
                      height: 240,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <ReloadOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                {countdown > 0 ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    二维码有效，剩余 {formatCountdown(countdown)}
                  </Tag>
                ) : (
                  <Tag color="red" icon={<WarningOutlined />}>
                    二维码已过期，请重新生成
                  </Tag>
                )}
              </div>

              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Token">{tokenInfo.token}</Descriptions.Item>
                <Descriptions.Item label="主设备">
                  {tokenInfo.mainDevice?.device_name || '主收银机'}
                </Descriptions.Item>
                <Descriptions.Item label="主设备IP">
                  {tokenInfo.mainDevice?.ip_address || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">
                  {currentUser?.nickname || currentUser?.username}
                </Descriptions.Item>
                <Descriptions.Item label="同步时长">
                  {tokenInfo.dataHours} 小时
                </Descriptions.Item>
                <Descriptions.Item label="过期时间">
                  {new Date(tokenInfo.expireTime).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>

              <Alert
                type="info"
                showIcon
                message="使用步骤"
                description={
                  <>
                    1. 打开备用iPad上的收银App → 点击「灾备登录」
                    <br />
                    2. 扫描此二维码 → 等待数据同步完成
                    <br />
                    3. 自动进入收银界面，可正常开单收银
                  </>
                }
                style={{ marginTop: 16 }}
              />
            </div>
          </Spin>
        </div>
      )}

      {!tokenInfo && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#999',
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <QrcodeOutlined style={{ fontSize: 48, marginBottom: 12, color: '#d9d9d9' }} />
          <div>点击下方「生成二维码」按钮</div>
        </div>
      )}
    </Modal>
  )
}

import React, { useState, useEffect } from 'react'
import { Button, Input, Card, Alert, Space, Spin, Descriptions, Tag, message, Progress, Modal } from 'antd'
import { QrcodeOutlined, ReloadOutlined, ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import disasterService from '../services/disasterService'
import { setToken, setUserInfo, removeToken, removeUserInfo } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

const TOKEN_REGEX = /[?&]token=([A-Za-z0-9_-]+)/
const SCAN_PREFIX = 'cashier://disaster?token='

export default function DisasterLogin({ onBack }) {
  const navigate = useNavigate()
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [verifiedInfo, setVerifiedInfo] = useState(null)
  const [loginResult, setLoginResult] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [urlToken, setUrlToken] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    const fullUrl = hash || search || ''

    let tokenMatch = fullUrl.match(TOKEN_REGEX)
    if (!tokenMatch && navigator.userAgent.includes('cashier')) {
      try {
        const clipboardText = window.clipboardData?.getData('text') || ''
        if (clipboardText.startsWith(SCAN_PREFIX)) {
          tokenMatch = [null, clipboardText.substring(SCAN_PREFIX.length)]
        }
      } catch (e) {}
    }

    if (tokenMatch && tokenMatch[1]) {
      const token = tokenMatch[1].trim()
      setUrlToken(token)
      setTokenInput(token)
      handleVerifyToken(token)
    }

    disasterService.registerCurrentDevice().catch((e) => {})
  }, [])

  const handleVerifyToken = async (token) => {
    if (!token || token.length < 10) {
      message.warning('请输入有效的Token')
      return
    }
    setLoading(true)
    try {
      const result = await disasterService.verifyDisasterToken(token)
      if (result.success) {
        setVerifiedInfo(result.data)
        message.success('Token验证成功，请点击登录')
      } else {
        message.error(result.error || 'Token验证失败')
        setVerifiedInfo(null)
      }
    } catch (error) {
      message.error(error.message || 'Token验证失败')
      setVerifiedInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    const token = verifiedInfo?.token || tokenInput
    if (!token) {
      message.warning('请先验证Token')
      return
    }
    setLoading(true)
    try {
      const result = await disasterService.useDisasterToken(token)
      if (result.success) {
        setLoginResult(result.data)
        message.success('登录成功，开始同步数据...')
        await handleSyncData(token)
      } else {
        message.error(result.error || '登录失败')
      }
    } catch (error) {
      message.error(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncData = async (token) => {
    setSyncLoading(true)
    setSyncProgress(10)

    try {
      const dataHours = verifiedInfo?.dataHours || 1
      await new Promise((resolve) => setTimeout(resolve, 500))
      setSyncProgress(30)

      const result = await disasterService.syncDisasterData(token, dataHours)
      setSyncProgress(90)

      await new Promise((resolve) => setTimeout(resolve, 300))
      setSyncProgress(100)

      if (result.success) {
        setSyncResult(result)
        message.success('数据同步完成！即将进入收银台...')
        setTimeout(() => {
          navigate('/cashier', { replace: true })
        }, 1500)
      } else {
        message.error(result.error || '数据同步失败')
      }
    } catch (error) {
      console.error('同步数据失败:', error)
      message.error('数据同步失败: ' + error.message)
    } finally {
      setSyncLoading(false)
    }
  }

  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const cleanToken = text
          .replace(SCAN_PREFIX, '')
          .replace(/[\r\n\s]/g, '')
          .trim()
        setTokenInput(cleanToken)
        handleVerifyToken(cleanToken)
      }
    } catch (e) {
      message.warning('无法读取剪贴板，请手动粘贴Token')
    }
  }

  const handleBackToLogin = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <QrcodeOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <h2 style={{ margin: 0, fontWeight: 600 }}>硬件故障灾备登录</h2>
          <p style={{ color: '#999', margin: '4px 0 0' }}>扫码登录，快速恢复收银</p>
        </div>

        <Alert
          type="info"
          showIcon
          message="使用说明"
          description={
            <>
              1. 主收银机故障时，使用备用iPad扫描主收银机生成的灾备二维码
              <br />
              2. 扫描后将自动同步最近数据，继续收银
              <br />
              3. 主收银机恢复后，可切回主设备
            </>
          }
          style={{ marginBottom: 20 }}
        />

        {urlToken && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="已识别二维码Token"
            description={`Token: ${urlToken.slice(0, 16)}...${urlToken.slice(-8)}`}
            style={{ marginBottom: 16 }}
          />
        )}

        {syncLoading || syncProgress > 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spin spinning={syncLoading} size="large">
              <CloudDownloadOutlined style={{ fontSize: 48, color: '#1890ff', display: 'block', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
                正在同步灾备数据...
              </div>
              <Progress percent={syncProgress} status={syncProgress >= 100 ? 'success' : 'active'} />
              <div style={{ color: '#999', marginTop: 8, fontSize: 12 }}>
                {syncProgress < 30 && '正在连接服务器...'}
                {syncProgress >= 30 && syncProgress < 90 && '正在拉取订单、商品、库存数据...'}
                {syncProgress >= 90 && syncProgress < 100 && '正在写入本地数据库...'}
                {syncProgress >= 100 && '同步完成！'}
              </div>
            </Spin>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>输入或粘贴灾备Token</div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="请输入Token或扫描二维码自动填充"
                  size="large"
                  allowClear
                  onPressEnter={() => handleVerifyToken(tokenInput)}
                />
                <Button size="large" onClick={handlePasteToken}>
                  粘贴
                </Button>
              </Space.Compact>
            </div>

            {verifiedInfo && (
              <Card
                size="small"
                style={{ marginBottom: 16, borderColor: '#52c41a' }}
                title={<Tag color="green" icon={<CheckCircleOutlined />}>Token验证通过</Tag>}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="门店">{verifiedInfo.shopName}</Descriptions.Item>
                  <Descriptions.Item label="主设备">{verifiedInfo.mainDevice?.device_name}</Descriptions.Item>
                  <Descriptions.Item label="主设备状态">
                    {verifiedInfo.mainDeviceStatus === 1 ? (
                      <Tag color="green">在线</Tag>
                    ) : (
                      <Tag color="red">离线/故障</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="同步时长">{verifiedInfo.dataHours} 小时</Descriptions.Item>
                  <Descriptions.Item label="创建人">{verifiedInfo.operatorName}</Descriptions.Item>
                  <Descriptions.Item label="过期时间">
                    {new Date(verifiedInfo.expireTime).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {verifiedInfo?.mainDeviceStatus !== 1 && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="主收银机当前离线"
                description="将从云端拉取最新数据，网络恢复后主备数据自动同步"
                style={{ marginBottom: 16 }}
              />
            )}

            <Space style={{ width: '100%' }} direction="vertical">
              <Button
                type="primary"
                block
                size="large"
                icon={<QrcodeOutlined />}
                loading={loading}
                disabled={!verifiedInfo}
                onClick={handleLogin}
              >
                登录并同步数据
              </Button>
              <Button block size="large" icon={<ArrowLeftOutlined />} onClick={handleBackToLogin}>
                返回普通登录
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  )
}

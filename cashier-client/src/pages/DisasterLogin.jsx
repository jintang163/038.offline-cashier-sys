import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card, Alert, Space, Spin, Descriptions, Tag, message, Progress, Modal, Tabs } from 'antd'
import { QrcodeOutlined, ReloadOutlined, ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined, CloudDownloadOutlined, ScanOutlined, CloudServerOutlined, WifiOutlined } from '@ant-design/icons'
import { Html5Qrcode } from 'html5-qrcode'
import disasterService from '../services/disasterService'
import { setToken, setUserInfo, removeToken, removeUserInfo } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

const TOKEN_REGEX = /[?&]token=([A-Za-z0-9_-]+)/
const SCAN_PREFIX = 'cashier://disaster?token='
const SCANER_ID = 'qr-reader-region'

export default function DisasterLogin({ onBack }) {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const scannerMountedRef = useRef(false)

  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncSource, setSyncSource] = useState('')
  const [verifiedInfo, setVerifiedInfo] = useState(null)
  const [loginResult, setLoginResult] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [urlToken, setUrlToken] = useState('')
  const [qrModalVisible, setQrModalVisible] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

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

    return () => {
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    setQrModalVisible(true)
    setScanError('')
    setScanning(true)
  }

  const initScanner = async () => {
    if (!scannerMountedRef.current) return
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.clear() } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode(SCANER_ID)
      scannerRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
        }
      )
      setScanError('')
    } catch (err) {
      console.error('扫码初始化失败:', err)
      setScanError(err.message || '无法启动摄像头，请检查权限设置')
      message.error('摄像头启动失败，请检查权限')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (e) {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleScanSuccess = async (decodedText) => {
    try {
      await stopScanner()
      setQrModalVisible(false)

      let token = decodedText
      if (decodedText.includes(SCAN_PREFIX)) {
        token = decodedText.substring(SCAN_PREFIX.length)
      } else if (decodedText.includes('token=')) {
        const match = decodedText.match(TOKEN_REGEX)
        if (match) token = match[1]
      } else {
        try {
          const parsed = JSON.parse(decodedText)
          if (parsed.token) token = parsed.token
        } catch (e) {}
      }

      const cleanToken = token.replace(/[\r\n\s]/g, '').trim()
      if (!cleanToken || cleanToken.length < 10) {
        message.warning('二维码内容无效')
        return
      }

      setTokenInput(cleanToken)
      setUrlToken(cleanToken)
      message.success('扫码成功，正在验证Token...')
      handleVerifyToken(cleanToken)
    } catch (error) {
      console.error('扫码处理失败:', error)
      message.error('扫码处理失败: ' + error.message)
    }
  }

  const handleCloseQrModal = () => {
    stopScanner()
    setQrModalVisible(false)
  }

  useEffect(() => {
    if (qrModalVisible && scannerMountedRef.current) {
      const timer = setTimeout(() => {
        initScanner()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [qrModalVisible])

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

        if (result.data?.token) {
          setToken(result.data.token)
        }
        if (result.data?.userInfo) {
          setUserInfo(result.data.userInfo)
        }

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
    setSyncProgress(0)

    try {
      const dataHours = verifiedInfo?.dataHours || 1

      const result = await disasterService.syncDisasterData(token, dataHours, (progress) => {
        setSyncProgress(progress)
      })

      if (result.success) {
        setSyncResult(result)
        setSyncSource(result.source || 'cloud')
        setSyncProgress(100)
        message.success(`数据同步完成（${result.source === 'lan' ? '局域网' : '云端'}）！即将进入收银台...`)
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

  const renderSyncStatusText = () => {
    if (syncProgress < 20) return '正在连接服务器...'
    if (syncProgress < 50) return '正在验证并获取主设备信息...'
    if (syncProgress < 70) return '正在拉取订单、商品、库存数据...'
    if (syncProgress < 90) return '正在写入本地数据库...'
    if (syncProgress >= 100) return '同步完成！'
    return `正在同步... ${syncProgress}%`
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
              2. 扫描后自动从云端或局域网同步最近数据，继续收银
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
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
                {syncSource === 'lan' ? (
                  <Tag color="blue" icon={<WifiOutlined />}>局域网同步</Tag>
                ) : syncSource === 'cloud' ? (
                  <Tag color="green" icon={<CloudServerOutlined />}>云端同步</Tag>
                ) : (
                  <Tag icon={<CloudDownloadOutlined />}>连接中...</Tag>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
                正在同步灾备数据...
              </div>
              <Progress
                percent={syncProgress}
                status={syncProgress >= 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ color: '#999', marginTop: 12, fontSize: 12 }}>
                {renderSyncStatusText()}
              </div>
              {syncSource === 'lan' && (
                <div style={{ color: '#1890ff', marginTop: 8, fontSize: 12 }}>
                  已切换到局域网同步模式，数据传输更快
                </div>
              )}
            </Spin>
          </div>
        ) : (
          <>
            <Tabs
              defaultActiveKey="scan"
              centered
              items={[
                {
                  key: 'scan',
                  label: <span><ScanOutlined /> 扫码登录</span>,
                  children: (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ScanOutlined />}
                        onClick={startScanner}
                        style={{ width: '100%', height: 120, fontSize: 18, borderRadius: 12 }}
                      >
                        <div>点击扫描二维码</div>
                        <div style={{ fontSize: 12, fontWeight: 'normal', opacity: 0.8, marginTop: 4 }}>
                          打开摄像头扫描主收银机生成的灾备二维码
                        </div>
                      </Button>
                      <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
                        备用iPad请确保已授予摄像头权限
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'manual',
                  label: <span><ReloadOutlined /> 手动输入</span>,
                  children: (
                    <div style={{ padding: '16px 0 0' }}>
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
                      <Button
                        block
                        icon={<QrcodeOutlined />}
                        onClick={() => handleVerifyToken(tokenInput)}
                        loading={loading}
                        disabled={!tokenInput || tokenInput.length < 10}
                      >
                        验证Token
                      </Button>
                    </div>
                  ),
                },
              ]}
            />

            {verifiedInfo && (
              <Card
                size="small"
                style={{ margin: '16px 0', borderColor: '#52c41a' }}
                title={<Tag color="green" icon={<CheckCircleOutlined />}>Token验证通过</Tag>}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="门店">{verifiedInfo.shopName || verifiedInfo.shop_name}</Descriptions.Item>
                  <Descriptions.Item label="主设备">{verifiedInfo.mainDevice?.device_name || verifiedInfo.mainDevice?.deviceName}</Descriptions.Item>
                  <Descriptions.Item label="主设备IP">{verifiedInfo.mainDevice?.ipAddress || verifiedInfo.mainDevice?.ip_address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="主设备状态">
                    {verifiedInfo.mainDeviceStatus === 1 || verifiedInfo.mainDevice?.deviceStatus === 1 ? (
                      <Tag color="green">在线</Tag>
                    ) : (
                      <Tag color="red">离线/故障</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="同步时长">{verifiedInfo.dataHours || 1} 小时</Descriptions.Item>
                  <Descriptions.Item label="创建人">{verifiedInfo.operatorName || verifiedInfo.operator_name}</Descriptions.Item>
                  <Descriptions.Item label="过期时间">
                    {new Date(verifiedInfo.expireTime || verifiedInfo.expire_time).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {(verifiedInfo?.mainDeviceStatus !== 1 && verifiedInfo?.mainDeviceStatus !== undefined) && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="主收银机当前离线"
                description={verifiedInfo?.mainDevice?.ipAddress ?
                  `已记录主设备IP ${verifiedInfo.mainDevice.ipAddress}，将优先尝试局域网同步，云端失败时自动切换` :
                  '将从云端拉取最新数据，网络恢复后主备数据自动同步'
                }
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

      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <ScanOutlined style={{ color: '#1890ff' }} /> 扫描灾备二维码
          </div>
        }
        open={qrModalVisible}
        onCancel={handleCloseQrModal}
        footer={null}
        width={420}
        destroyOnClose
      >
        <div
          ref={(el) => {
            if (el && !scannerMountedRef.current) {
              scannerMountedRef.current = true
              setTimeout(() => initScanner(), 50)
            }
            if (!el) {
              scannerMountedRef.current = false
            }
          }}
          id={SCANER_ID}
          style={{
            width: '100%',
            minHeight: 300,
            background: '#000',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        />
        {scanError && (
          <Alert
            type="error"
            showIcon
            message="摄像头启动失败"
            description={scanError}
            style={{ marginTop: 12 }}
          />
        )}
        {!scanError && (
          <div style={{ textAlign: 'center', marginTop: 12, color: '#999', fontSize: 12 }}>
            将二维码对准扫描框，自动识别
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={handleCloseQrModal}>取消</Button>
        </div>
      </Modal>
    </div>
  )
}

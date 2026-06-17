import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Descriptions, Tag, Space, message } from 'antd'
import {
  WifiOutlined,
  PrinterOutlined,
  HardDriveOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import selfCheckService from '../services/selfCheckService'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

function getStatusTag(status) {
  if (status === 1 || status === 0) {
    return <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>
  }
  if (status === 2) {
    return <Tag icon={<ExclamationCircleOutlined />} color="warning">警告</Tag>
  }
  return <Tag icon={<ExclamationCircleOutlined />} color="error">异常</Tag>
}

function DeviceSelfCheckAlert() {
  const [visible, setVisible] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [lastAlertTime, setLastAlertTime] = useState(null)

  const handleCheckResult = useCallback((result) => {
    setCheckResult(result)
    if (result && result.checkStatus === 3) {
      const now = Date.now()
      if (!lastAlertTime || now - lastAlertTime > 10 * 60 * 1000) {
        setVisible(true)
        setLastAlertTime(now)
      }
    }
  }, [lastAlertTime])

  useEffect(() => {
    const unsubscribe = selfCheckService.subscribe(handleCheckResult)
    return unsubscribe
  }, [handleCheckResult])

  const handleClose = () => {
    setVisible(false)
  }

  const runCheck = async () => {
    setChecking(true)
    try {
      const result = await selfCheckService.runFullCheck()
      setCheckResult(result)
      message.success('自检完成')
    } catch (error) {
      message.error('自检失败: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  const formatStorageStatus = (status) => {
    const statusMap = {
      0: { text: '充足', color: 'success' },
      1: { text: '警告', color: 'warning' },
      2: { text: '不足', color: 'error' },
      3: { text: '未知', color: 'default' },
    }
    const info = statusMap[status] || statusMap[3]
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const formatNetworkStatus = (status) => {
    return status === 1
      ? <Tag color="success" icon={<WifiOutlined />}>在线</Tag>
      : <Tag color="error" icon={<WifiOutlined />}>离线</Tag>
  }

  const formatPrinterStatus = (status) => {
    const statusMap = {
      0: { text: '离线', color: 'error' },
      1: { text: '在线', color: 'success' },
      2: { text: '缺纸', color: 'warning' },
      3: { text: '故障', color: 'error' },
    }
    const info = statusMap[status] || { text: '未知', color: 'default' }
    return <Tag icon={<PrinterOutlined />} color={info.color}>{info.text}</Tag>
  }

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>设备自检异常告警</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={600}
      footer={
        <Space>
          <Button onClick={handleClose}>关闭</Button>
          <Button type="primary" icon={<ReloadOutlined />} loading={checking} onClick={runCheck}>
            重新检测
          </Button>
        </Space>
      }
    >
      {checkResult && (
        <>
          {checkResult.errors && checkResult.errors.length > 0 && (
            <div style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <div style={{ color: '#ff4d4f', fontWeight: 'bold', marginBottom: 8 }}>
                检测到以下异常：
              </div>
              {checkResult.errors.map((err, idx) => (
                <div key={idx} style={{ color: '#ff4d4f', padding: '2px 0' }}>
                  • {err}
                </div>
              ))}
            </div>
          )}

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="检测时间">{checkResult.checkTime}</Descriptions.Item>
            <Descriptions.Item label="设备编号">{checkResult.deviceNo}</Descriptions.Item>
            <Descriptions.Item label="整体状态">{getStatusTag(checkResult.checkStatus)}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <Descriptions title="网络状态" column={1} bordered size="small">
              <Descriptions.Item label="连接状态">
                {checkResult.network && formatNetworkStatus(checkResult.network.status)}
              </Descriptions.Item>
              <Descriptions.Item label="网络延迟">
                {checkResult.network?.latency != null ? `${checkResult.network.latency} ms` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="网络类型">
                {checkResult.network?.speed || '-'}
              </Descriptions.Item>
              {checkResult.network?.error && (
                <Descriptions.Item label="错误信息">
                  <span style={{ color: '#ff4d4f' }}>{checkResult.network.error}</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          <div style={{ marginTop: 16 }}>
            <Descriptions title="打印机状态" column={1} bordered size="small">
              <Descriptions.Item label="状态">
                {checkResult.printer && formatPrinterStatus(checkResult.printer.status)}
              </Descriptions.Item>
              <Descriptions.Item label="打印机名称">
                {checkResult.printer?.printerName || '-'}
              </Descriptions.Item>
              {checkResult.printer?.error && (
                <Descriptions.Item label="错误信息">
                  <span style={{ color: '#ff4d4f' }}>{checkResult.printer.error}</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          <div style={{ marginTop: 16 }}>
            <Descriptions title="存储空间" column={1} bordered size="small">
              <Descriptions.Item label="状态">
                <HardDriveOutlined style={{ marginRight: 4 }} />
                {checkResult.storage && formatStorageStatus(checkResult.storage.status)}
              </Descriptions.Item>
              <Descriptions.Item label="总容量">
                {formatBytes(checkResult.storage?.total)}
              </Descriptions.Item>
              <Descriptions.Item label="已使用">
                {formatBytes(checkResult.storage?.used)}
              </Descriptions.Item>
              <Descriptions.Item label="可用空间">
                {formatBytes(checkResult.storage?.free)}
              </Descriptions.Item>
              <Descriptions.Item label="使用率">
                <span style={{
                  color: (checkResult.storage?.usageRate || 0) >= 90 ? '#ff4d4f'
                    : (checkResult.storage?.usageRate || 0) >= 75 ? '#faad14'
                    : '#52c41a',
                  fontWeight: 'bold',
                }}>
                  {checkResult.storage?.usageRate || 0}%
                </span>
              </Descriptions.Item>
              {checkResult.storage?.error && (
                <Descriptions.Item label="错误信息">
                  <span style={{ color: '#ff4d4f' }}>{checkResult.storage.error}</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </>
      )}
    </Modal>
  )
}

export default DeviceSelfCheckAlert

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Form, Input, Button, Switch, message, Divider, Space, Tabs, List, Tag, Descriptions, Statistic, Row, Col, Alert, Table, Badge, Tooltip } from 'antd'
import { SaveOutlined, SyncOutlined, CloudDownloadOutlined, CloudUploadOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, WifiOutlined } from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import db from '../utils/db'
import api from '../api/request'
import syncService from '../services/syncService'
import useNetworkStatus from '../hooks/useNetwork'
import wsClient from '../utils/websocket'
import dayjs from 'dayjs'

function Settings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [productSyncLoading, setProductSyncLoading] = useState(false)
  const [orderSyncLoading, setOrderSyncLoading] = useState(false)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState({
    unsyncedOrderCount: 0,
    failedOrderCount: 0,
    lastProductSyncTime: null,
    lastOrderSyncTime: null,
  })
  const [syncRecords, setSyncRecords] = useState([])
  const [wsStatus, setWsStatus] = useState('disconnected')
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    loadSettings()
    loadOfflineQueueCount()
    loadSyncStatus()
    loadSyncRecords()
    updateWsStatus()

    const unsubscribeSync = syncService.on('syncComplete', () => {
      loadSyncStatus()
      loadSyncRecords()
    })

    const unsubscribeWs = wsClient.on('statusChange', (status) => {
      setWsStatus(status)
    })

    return () => {
      unsubscribeSync()
      unsubscribeWs()
    }
  }, [])

  const updateWsStatus = () => {
    setWsStatus(wsClient.getStatus())
  }

  const loadSettings = async () => {
    try {
      const settings = await db.getAllSettings()
      form.setFieldsValue({
        shopName: settings.shopName || '',
        address: settings.address || '',
        phone: settings.phone || '',
        cashierName: settings.cashierName || '',
        receiptFooter: settings.receiptFooter || '',
        printEnabled: settings.printEnabled === 'true',
      })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  const loadOfflineQueueCount = async () => {
    try {
      const queue = await db.getOfflineQueue(0)
      setOfflineQueueCount(queue.length)
    } catch (error) {
      console.error('加载离线队列失败:', error)
    }
  }

  const loadSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('加载同步状态失败:', error)
    }
  }

  const loadSyncRecords = async () => {
    try {
      const records = await db.getSyncRecords(20)
      setSyncRecords(records)
    } catch (error) {
      console.error('加载同步记录失败:', error)
    }
  }

  const handleSave = async (values) => {
    setLoading(true)
    try {
      for (const [key, value] of Object.entries(values)) {
        await db.setSetting(key, String(value))
      }
      message.success('设置保存成功')
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncProducts = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    setProductSyncLoading(true)
    try {
      const result = await syncService.syncProducts()
      message.success(`商品同步成功，共更新 ${result.count} 条商品`)
      loadSyncStatus()
      loadSyncRecords()
    } catch (error) {
      message.error('商品同步失败：' + error.message)
    } finally {
      setProductSyncLoading(false)
    }
  }, [isOnline])

  const handleSyncOrders = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    setOrderSyncLoading(true)
    try {
      const result = await syncService.syncOrders()
      if (result.failed === 0) {
        message.success(`订单同步成功，共同步 ${result.success} 条订单`)
      } else {
        message.warning(`订单同步完成，成功 ${result.success} 条，失败 ${result.failed} 条`)
      }
      loadSyncStatus()
      loadSyncRecords()
    } catch (error) {
      message.error('订单同步失败：' + error.message)
    } finally {
      setOrderSyncLoading(false)
    }
  }, [isOnline])

  const handleSyncAll = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    setSyncLoading(true)
    try {
      const result = await syncService.syncAll()
      if (result.success) {
        message.success('全部同步完成')
      } else {
        message.warning('同步完成，部分项目失败')
      }
      loadSyncStatus()
      loadSyncRecords()
    } catch (error) {
      message.error('同步失败：' + error.message)
    } finally {
      setSyncLoading(false)
    }
  }, [isOnline])

  const handleConnectWs = useCallback(() => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法连接')
      return
    }
    wsClient.connect()
    message.info('正在连接 WebSocket...')
  }, [isOnline])

  const handleDisconnectWs = useCallback(() => {
    wsClient.close()
    message.info('WebSocket 已断开')
  }, [])

  const getWsStatusInfo = () => {
    const statusMap = {
      connected: { color: 'green', text: '已连接', icon: <CheckCircleOutlined /> },
      connecting: { color: 'blue', text: '连接中', icon: <ClockCircleOutlined /> },
      reconnecting: { color: 'orange', text: '重连中', icon: <SyncOutlined spin /> },
      disconnected: { color: 'default', text: '未连接', icon: <CloseCircleOutlined /> },
      failed: { color: 'red', text: '连接失败', icon: <CloseCircleOutlined /> },
    }
    return statusMap[wsStatus] || statusMap.disconnected
  }

  const getSyncTypeText = (type) => {
    const map = {
      products: '商品数据',
      orders: '订单数据',
      all: '全部数据',
    }
    return map[type] || type
  }

  const getSyncStatusTag = (status) => {
    const map = {
      success: { color: 'green', text: '成功' },
      failed: { color: 'red', text: '失败' },
      partial: { color: 'orange', text: '部分成功' },
    }
    const info = map[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const wsInfo = getWsStatusInfo()

  const syncRecordColumns = [
    {
      title: '同步类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => getSyncTypeText(type),
    },
    {
      title: '同步状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getSyncStatusTag(status),
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (details) => {
        if (!details) return '-'
        if (details.count !== undefined) return `更新 ${details.count} 条`
        if (details.success !== undefined) {
          return (
            <span>
              成功 {details.success} 条，失败 {details.failed} 条
            </span>
          )
        }
        if (details.error) {
          return <Tooltip title={details.error}><span style={{ color: '#ff4d4f' }}>{details.error}</span></Tooltip>
        }
        return '-'
      },
    },
    {
      title: '同步时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const tabItems = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="店铺名称" name="shopName" rules={[{ required: true, message: '请输入店铺名称' }]}>
            <Input placeholder="请输入店铺名称" />
          </Form.Item>
          <Form.Item label="店铺地址" name="address">
            <Input placeholder="请输入店铺地址" />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item label="收银员姓名" name="cashierName">
            <Input placeholder="请输入收银员姓名" />
          </Form.Item>
          <Divider />
          <Form.Item label="打印小票" name="printEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="小票页脚" name="receiptFooter">
            <Input.TextArea rows={2} placeholder="小票底部显示的文字" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                保存设置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'sync',
      label: '数据同步',
      children: (
        <div>
          {!isOnline && (
            <Alert
              message="当前处于离线状态，请检查网络连接"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="网络状态"
                  value={isOnline ? '在线' : '离线'}
                  valueStyle={{ color: isOnline ? '#52c41a' : '#ff4d4f' }}
                  prefix={<WifiOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="待同步订单"
                  value={syncStatus.unsyncedOrderCount}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<CloudUploadOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="同步失败"
                  value={syncStatus.failedOrderCount}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" style={{ marginBottom: 16 }} title="同步信息">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="上次商品同步">
                {syncStatus.lastProductSyncTime
                  ? dayjs(syncStatus.lastProductSyncTime).format('YYYY-MM-DD HH:mm:ss')
                  : '从未同步'}
              </Descriptions.Item>
              <Descriptions.Item label="上次订单同步">
                {syncStatus.lastOrderSyncTime
                  ? dayjs(syncStatus.lastOrderSyncTime).format('YYYY-MM-DD HH:mm:ss')
                  : '从未同步'}
              </Descriptions.Item>
              <Descriptions.Item label="离线队列">
                {offlineQueueCount} 条
              </Descriptions.Item>
              <Descriptions.Item label="WebSocket">
                <Badge color={wsInfo.color} text={wsInfo.text} />
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }} title="同步操作">
            <Space wrap>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleSyncAll}
                loading={syncLoading}
                disabled={!isOnline}
              >
                全部同步
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={handleSyncProducts}
                loading={productSyncLoading}
                disabled={!isOnline}
              >
                同步商品
              </Button>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={handleSyncOrders}
                loading={orderSyncLoading}
                disabled={!isOnline || syncStatus.unsyncedOrderCount === 0}
              >
                同步订单
              </Button>
              {wsStatus === 'connected' ? (
                <Button danger onClick={handleDisconnectWs}>
                  断开 WebSocket
                </Button>
              ) : (
                <Button onClick={handleConnectWs} disabled={!isOnline}>
                  连接 WebSocket
                </Button>
              )}
            </Space>
          </Card>

          <Card size="small" title="同步记录">
            <Table
              size="small"
              rowKey="id"
              columns={syncRecordColumns}
              dataSource={syncRecords}
              pagination={false}
              locale={{ emptyText: '暂无同步记录' }}
            />
          </Card>

          <div style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
            <p>说明：</p>
            <ul>
              <li>离线状态下创建的订单会自动加入同步队列</li>
              <li>恢复网络后会自动同步待同步的数据</li>
              <li>同步失败的订单会标记为失败状态，可手动重试</li>
              <li>WebSocket 连接后可实时接收商品和订单更新通知</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      key: 'about',
      label: '关于',
      children: (
        <div>
          <List>
            <List.Item>
              <List.Item.Meta title="应用名称" description="离线收银系统" />
            </List.Item>
            <List.Item>
              <List.Item.Meta title="版本号" description="1.0.0" />
            </List.Item>
            <List.Item>
              <List.Item.Meta
                title="技术栈"
                description="Electron 28 + React 18 + Ant Design 5 + Dexie.js"
              />
            </List.Item>
            <List.Item>
              <List.Item.Meta title="特性" description="支持离线收银、本地数据存储、自动同步" />
            </List.Item>
          </List>
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </AppLayout>
  )
}

export default Settings

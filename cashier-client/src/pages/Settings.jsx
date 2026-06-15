import React, { useState, useEffect, useCallback } from 'react'
import { Card, Form, Input, Button, Switch, message, Divider, Space, Tabs, List, Tag, Descriptions, Statistic, Row, Col, Alert, Table, Badge, Tooltip, Modal, Select, InputNumber, Popconfirm } from 'antd'
import { SaveOutlined, SyncOutlined, CloudDownloadOutlined, CloudUploadOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, WifiOutlined, PrinterOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import db from '../utils/db'
import api from '../api/request'
import syncService from '../services/syncService'
import kitchenPrintService from '../services/kitchenPrintService'
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
  const [printers, setPrinters] = useState([])
  const [printRules, setPrintRules] = useState([])
  const [printQueueStats, setPrintQueueStats] = useState({ pending: 0, printing: 0, success: 0, failed: 0, total: 0 })
  const [printerModalVisible, setPrinterModalVisible] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState(null)
  const [ruleModalVisible, setRuleModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [printConfigLoading, setPrintConfigLoading] = useState(false)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    loadSettings()
    loadOfflineQueueCount()
    loadSyncStatus()
    loadSyncRecords()
    updateWsStatus()
    loadPrinters()
    loadPrintRules()
    loadPrintQueueStats()

    const unsubscribeSync = syncService.on('syncComplete', () => {
      loadSyncStatus()
      loadSyncRecords()
    })

    const unsubscribeWs = wsClient.on('statusChange', (status) => {
      setWsStatus(status)
    })

    const unsubscribePrint = kitchenPrintService.on('jobStatusChange', () => {
      loadPrintQueueStats()
    })

    return () => {
      unsubscribeSync()
      unsubscribeWs()
      unsubscribePrint()
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

  const loadPrinters = async () => {
    try {
      const list = await db.getPrinters()
      setPrinters(list)
    } catch (error) {
      console.error('加载打印机列表失败:', error)
    }
  }

  const loadPrintRules = async () => {
    try {
      const list = await db.getPrintRules()
      setPrintRules(list)
    } catch (error) {
      console.error('加载打印规则失败:', error)
    }
  }

  const loadPrintQueueStats = async () => {
    try {
      const stats = await kitchenPrintService.getQueueStats()
      setPrintQueueStats(stats)
    } catch (error) {
      console.error('加载打印队列状态失败:', error)
    }
  }

  const handleSyncPrinterConfig = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    setPrintConfigLoading(true)
    try {
      await syncService.syncPrinterConfig()
      await loadPrinters()
      await loadPrintRules()
      message.success('打印配置同步成功')
    } catch (error) {
      message.error('打印配置同步失败：' + error.message)
    } finally {
      setPrintConfigLoading(false)
    }
  }, [isOnline])

  const handleSavePrinter = async (values) => {
    try {
      if (editingPrinter) {
        await db.savePrinter({ ...values, id: editingPrinter.id })
        if (isOnline) {
          await api.savePrinter({ ...values, id: editingPrinter.id })
        }
      } else {
        const printerCode = values.printer_code || `P${Date.now()}`
        await db.savePrinter({ ...values, printer_code: printerCode, status: 1 })
        if (isOnline) {
          await api.savePrinter({ ...values, printer_code: printerCode, status: 1 })
        }
      }
      setPrinterModalVisible(false)
      setEditingPrinter(null)
      await loadPrinters()
      message.success('打印机保存成功')
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const handleDeletePrinter = async (id) => {
    try {
      if (isOnline) {
        await api.request({ url: `/printer/${id}`, method: 'delete' })
      }
      await db.savePrinter({ id, status: 0 })
      await loadPrinters()
      message.success('打印机已删除')
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleTestPrinter = async (id) => {
    try {
      const result = await kitchenPrintService.testPrinterConnection(id)
      if (result.success) {
        message.success('打印机测试成功')
      } else {
        message.error('打印机测试失败：' + (result.error || '未知错误'))
      }
    } catch (error) {
      message.error('测试失败：' + error.message)
    }
  }

  const handleSaveRule = async (values) => {
    try {
      if (editingRule) {
        await db.savePrintRule({ ...values, id: editingRule.id })
        if (isOnline) {
          await api.savePrintRule({ ...values, id: editingRule.id })
        }
      } else {
        const ruleCode = values.rule_code || `R${Date.now()}`
        await db.savePrintRule({ ...values, rule_code: ruleCode, status: 1 })
        if (isOnline) {
          await api.savePrintRule({ ...values, rule_code: ruleCode, status: 1 })
        }
      }
      setRuleModalVisible(false)
      setEditingRule(null)
      await loadPrintRules()
      message.success('分单规则保存成功')
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const handleDeleteRule = async (id) => {
    try {
      if (isOnline) {
        await api.request({ url: `/printer/rule/${id}`, method: 'delete' })
      }
      await db.savePrintRule({ id, status: 0 })
      await loadPrintRules()
      message.success('分单规则已删除')
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleRetryAllFailed = async () => {
    try {
      await kitchenPrintService.retryAllFailed()
      await loadPrintQueueStats()
      message.success('已重试所有失败任务')
    } catch (error) {
      message.error('重试失败：' + error.message)
    }
  }

  const printerColumns = [
    { title: '编码', dataIndex: 'printer_code', key: 'printer_code', width: 120 },
    { title: '名称', dataIndex: 'printer_name', key: 'printer_name', width: 150 },
    {
      title: '类型', dataIndex: 'printer_type', key: 'printer_type', width: 80,
      render: (v) => v === 'kitchen' ? '厨房' : '收银',
    },
    {
      title: '连接方式', dataIndex: 'connection_type', key: 'connection_type', width: 80,
      render: (v) => ({ network: '网络', usb: 'USB', bluetooth: '蓝牙' }[v] || v),
    },
    { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address', width: 130, render: (v) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '默认', dataIndex: 'is_default', key: 'is_default', width: 60,
      render: (v) => v === 1 ? <Tag color="blue">默认</Tag> : '-',
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingPrinter(record); setPrinterModalVisible(true) }}>编辑</Button>
          <Button size="small" onClick={() => handleTestPrinter(record.id)}>测试</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeletePrinter(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const ruleColumns = [
    { title: '规则编码', dataIndex: 'rule_code', key: 'rule_code', width: 120 },
    { title: '规则名称', dataIndex: 'rule_name', key: 'rule_name', width: 130 },
    { title: '分类', dataIndex: 'category_name', key: 'category_name', width: 80 },
    { title: '打印机', dataIndex: 'printer_code', key: 'printer_code', width: 120 },
    { title: '份数', dataIndex: 'copies', key: 'copies', width: 60 },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 70 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作', key: 'action', width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingRule(record); setRuleModalVisible(true) }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteRule(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

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
      key: 'printer',
      label: '厨房打印',
      children: (
        <div>
          {!isOnline && (
            <Alert
              message="当前处于离线状态，打印任务将暂存本地队列，联网后自动补打"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="待打印" value={printQueueStats.pending} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="打印中" value={printQueueStats.printing} valueStyle={{ color: '#1890ff' }} prefix={<PrinterOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="已打印" value={printQueueStats.success} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="打印失败" value={printQueueStats.failed} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
              </Card>
            </Col>
          </Row>

          <Card size="small" style={{ marginBottom: 16 }} title="打印机管理" extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleSyncPrinterConfig} loading={printConfigLoading} disabled={!isOnline} size="small">同步配置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPrinter(null); setPrinterModalVisible(true) }} size="small">添加打印机</Button>
            </Space>
          }>
            <Table size="small" rowKey="id" columns={printerColumns} dataSource={printers} pagination={false} locale={{ emptyText: '暂无打印机，请先同步配置或添加' }} />
          </Card>

          <Card size="small" style={{ marginBottom: 16 }} title="分单规则" extra={
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRule(null); setRuleModalVisible(true) }} size="small">添加规则</Button>
            </Space>
          }>
            <Table size="small" rowKey="id" columns={ruleColumns} dataSource={printRules} pagination={false} locale={{ emptyText: '暂无分单规则' }} />
          </Card>

          <Card size="small" title="打印队列操作">
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRetryAllFailed} disabled={printQueueStats.failed === 0}>重试所有失败任务</Button>
              <Button onClick={() => { loadPrintQueueStats(); loadPrinters(); loadPrintRules() }}>刷新状态</Button>
            </Space>
          </Card>

          <div style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
            <p>说明：</p>
            <ul>
              <li>打印机支持网络（IP+端口）、USB、蓝牙三种连接方式</li>
              <li>分单规则将订单按菜品分类自动路由到指定厨房打印机</li>
              <li>离线时打印任务暂存本地队列，网络恢复后自动补打</li>
              <li>打印失败的任务最多重试3次，超过后需手动重试</li>
              <li>修改打印机配置后会通过WebSocket实时推送到所有收银端</li>
            </ul>
          </div>

          <Modal
            title={editingPrinter ? '编辑打印机' : '添加打印机'}
            open={printerModalVisible}
            onCancel={() => { setPrinterModalVisible(false); setEditingPrinter(null) }}
            onOk={() => {
              const formEl = document.querySelector('.printer-form')
              if (formEl) formEl.requestSubmit()
            }}
          >
            <Form
              className="printer-form"
              layout="vertical"
              onFinish={handleSavePrinter}
              initialValues={editingPrinter || { printer_type: 'kitchen', connection_type: 'network', port: 9100, status: 1, is_default: 0, sort: 0 }}
            >
              <Form.Item label="打印机编码" name="printer_code" rules={[{ required: true }]}>
                <Input placeholder="如 KITCHEN_HOT" disabled={!!editingPrinter} />
              </Form.Item>
              <Form.Item label="打印机名称" name="printer_name" rules={[{ required: true }]}>
                <Input placeholder="如 热菜厨房打印机" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="打印机类型" name="printer_type">
                    <Select options={[{ value: 'kitchen', label: '厨房' }, { value: 'receipt', label: '收银' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="连接方式" name="connection_type">
                    <Select options={[{ value: 'network', label: '网络' }, { value: 'usb', label: 'USB' }, { value: 'bluetooth', label: '蓝牙' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item label="IP地址" name="ip_address">
                    <Input placeholder="192.168.1.101" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="端口" name="port">
                    <InputNumber style={{ width: '100%' }} min={1} max={65535} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="蓝牙地址" name="bluetooth_address">
                <Input placeholder="蓝牙设备地址" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="排序" name="sort">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="状态" name="status">
                    <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="默认打印机" name="is_default">
                    <Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>

          <Modal
            title={editingRule ? '编辑分单规则' : '添加分单规则'}
            open={ruleModalVisible}
            onCancel={() => { setRuleModalVisible(false); setEditingRule(null) }}
            onOk={() => {
              const formEl = document.querySelector('.rule-form')
              if (formEl) formEl.requestSubmit()
            }}
          >
            <Form
              className="rule-form"
              layout="vertical"
              onFinish={handleSaveRule}
              initialValues={editingRule || { copies: 1, priority: 0, sort: 0, status: 1 }}
            >
              <Form.Item label="规则编码" name="rule_code" rules={[{ required: true }]}>
                <Input placeholder="如 RULE_HOT" disabled={!!editingRule} />
              </Form.Item>
              <Form.Item label="规则名称" name="rule_name" rules={[{ required: true }]}>
                <Input placeholder="如 热菜分单规则" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="菜品分类ID" name="category_id">
                    <InputNumber style={{ width: '100%' }} placeholder="分类ID" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="菜品分类名称" name="category_name">
                    <Input placeholder="如 热菜" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="指定打印机" name="printer_id">
                <Select placeholder="选择打印机" allowClear>
                  {printers.map((p) => (
                    <Select.Option key={p.id} value={p.id}>{p.printer_name} ({p.printer_code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="打印份数" name="copies">
                    <InputNumber style={{ width: '100%' }} min={1} max={10} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="优先级" name="priority">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="排序" name="sort">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="状态" name="status">
                <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
              </Form.Item>
            </Form>
          </Modal>
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

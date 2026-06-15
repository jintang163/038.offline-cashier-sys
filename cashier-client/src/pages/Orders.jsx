import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  DatePicker,
  Input,
  Button,
  Space,
  Card,
  Tag,
  Modal,
  Descriptions,
  Empty,
  message,
  Statistic,
  Row,
  Col,
  Tooltip,
  Alert,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import db from '../utils/db'
import syncService from '../services/syncService'
import useNetworkStatus from '../hooks/useNetwork'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

function Orders() {
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [syncLoading, setSyncLoading] = useState(false)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    loadOrders()
    loadSyncStats()
  }, [page, pageSize])

  useEffect(() => {
    const unsubscribe = syncService.on('syncComplete', (data) => {
      if (data.type === 'orders') {
        loadOrders()
        loadSyncStats()
      }
    })
    return unsubscribe
  }, [])

  const loadSyncStats = async () => {
    try {
      const unsynced = await db.getUnsyncedOrderCount()
      const failed = await db.getFailedOrders()
      setUnsyncedCount(unsynced)
      setFailedCount(failed.length)
    } catch (error) {
      console.error('加载同步统计失败:', error)
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
      }
      if (searchText) {
        params.keyword = searchText
      }
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].startOf('day').toISOString()
        params.endDate = dateRange[1].endOf('day').toISOString()
      }
      const data = await db.getOrders(params)
      setOrders(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('加载订单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadOrders()
  }

  const handleReset = () => {
    setSearchText('')
    setDateRange(null)
    setSelectedRowKeys([])
    setPage(1)
    setTimeout(loadOrders, 0)
  }

  const viewOrderDetail = async (orderId) => {
    try {
      const order = await db.getOrderById(orderId)
      setCurrentOrder(order)
      setDetailVisible(true)
    } catch (error) {
      console.error('加载订单详情失败:', error)
    }
  }

  const handleRetryOrder = useCallback(async (orderId) => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    setSyncLoading(true)
    try {
      const result = await syncService.retryFailedOrder(orderId)
      if (result.failed === 0) {
        message.success('订单同步成功')
      } else {
        message.error('订单同步失败')
      }
      loadOrders()
      loadSyncStats()
    } catch (error) {
      message.error('同步失败：' + error.message)
    } finally {
      setSyncLoading(false)
    }
  }, [isOnline])

  const handleBatchRetry = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要重传的订单')
      return
    }

    Modal.confirm({
      title: '确认批量重传',
      content: `确定要重传选中的 ${selectedRowKeys.length} 个订单吗？`,
      onOk: async () => {
        setSyncLoading(true)
        try {
          const result = await syncService.syncOrders(selectedRowKeys)
          message.success(`批量重传完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
          setSelectedRowKeys([])
          loadOrders()
          loadSyncStats()
        } catch (error) {
          message.error('批量重传失败：' + error.message)
        } finally {
          setSyncLoading(false)
        }
      },
    })
  }, [isOnline, selectedRowKeys])

  const handleRetryAllFailed = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    if (failedCount === 0) {
      message.info('没有同步失败的订单')
      return
    }

    Modal.confirm({
      title: '确认重传所有失败订单',
      content: `确定要重传所有 ${failedCount} 个同步失败的订单吗？`,
      onOk: async () => {
        setSyncLoading(true)
        try {
          const result = await syncService.retryAllFailedOrders()
          message.success(`重传完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
          loadOrders()
          loadSyncStats()
        } catch (error) {
          message.error('重传失败：' + error.message)
        } finally {
          setSyncLoading(false)
        }
      },
    })
  }, [isOnline, failedCount])

  const renderSyncStatus = (status, record) => {
    if (status === 1) {
      return <Tag color="green">已同步</Tag>
    } else if (status === 2) {
      return (
        <Tooltip title={record.sync_error || '同步失败'}>
          <Tag color="red" icon={<ExclamationCircleOutlined />}>
            同步失败
          </Tag>
        </Tooltip>
      )
    }
    return <Tag color="orange">未同步</Tag>
  }

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
    },
    {
      title: '商品金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 100,
      render: (val) => `¥${val.toFixed(2)}`,
    },
    {
      title: '优惠金额',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 100,
      render: (val) => `¥${(val || 0).toFixed(2)}`,
    },
    {
      title: '实付金额',
      dataIndex: 'pay_amount',
      key: 'pay_amount',
      width: 100,
      render: (val) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{val.toFixed(2)}</span>,
    },
    {
      title: '支付方式',
      dataIndex: 'pay_type',
      key: 'pay_type',
      width: 100,
      render: (type) => {
        const map = {
          cash: '现金',
          wechat: '微信支付',
          alipay: '支付宝',
        }
        return map[type] || type
      },
    },
    {
      title: '收银员',
      dataIndex: 'cashier_name',
      key: 'cashier_name',
      width: 100,
    },
    {
      title: '同步状态',
      dataIndex: 'sync_status',
      key: 'sync_status',
      width: 120,
      render: (status, record) => renderSyncStatus(status, record),
    },
    {
      title: '同步时间',
      dataIndex: 'synced_at',
      key: 'synced_at',
      width: 180,
      render: (val) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => viewOrderDetail(record.id)}>
            详情
          </Button>
          {record.sync_status !== 1 && (
            <Button
              type="link"
              icon={<SyncOutlined />}
              onClick={() => handleRetryOrder(record.id)}
              disabled={!isOnline || syncLoading}
            >
              重传
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record.sync_status === 1,
    }),
  }

  return (
    <AppLayout>
      {!isOnline && (
        <Alert
          message="当前处于离线状态，订单将暂存本地，联网后自动同步"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="待同步订单"
              value={unsyncedCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<CloudUploadOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="同步失败"
              value={failedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="总订单数"
              value={total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="订单号"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            showTime
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={handleBatchRetry}
            disabled={!isOnline || selectedRowKeys.length === 0 || syncLoading}
            loading={syncLoading}
          >
            批量重传
          </Button>
          <Button
            danger
            icon={<ExclamationCircleOutlined />}
            onClick={handleRetryAllFailed}
            disabled={!isOnline || failedCount === 0 || syncLoading}
            loading={syncLoading}
          >
            重传失败订单
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading || syncLoading}
          columns={columns}
          dataSource={orders}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条订单`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
              setSelectedRowKeys([])
            },
          }}
          locale={{
            emptyText: <Empty description="暂无订单" />,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {currentOrder && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单号">{currentOrder.order_no}</Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {currentOrder.pay_type === 'cash'
                  ? '现金'
                  : currentOrder.pay_type === 'wechat'
                  ? '微信支付'
                  : '支付宝'}
              </Descriptions.Item>
              <Descriptions.Item label="商品金额">
                ¥{currentOrder.total_amount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="优惠金额">
                ¥{(currentOrder.discount_amount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="实付金额">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  ¥{currentOrder.pay_amount.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="收银员">
                {currentOrder.cashier_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="同步状态">
                {renderSyncStatus(currentOrder.sync_status, currentOrder)}
              </Descriptions.Item>
              <Descriptions.Item label="同步时间">
                {currentOrder.synced_at
                  ? dayjs(currentOrder.synced_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(currentOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {currentOrder.sync_error && (
              <Alert
                message="同步错误信息"
                description={currentOrder.sync_error}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>商品明细</div>
            <Table
              size="small"
              rowKey="id"
              dataSource={currentOrder.items || []}
              pagination={false}
              columns={[
                { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
                { title: '单价', dataIndex: 'price', key: 'price', render: (v) => `¥${v.toFixed(2)}` },
                { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                { title: '小计', dataIndex: 'subtotal', key: 'subtotal', render: (v) => `¥${v.toFixed(2)}` },
              ]}
            />
          </>
        )}
      </Modal>
    </AppLayout>
  )
}

export default Orders

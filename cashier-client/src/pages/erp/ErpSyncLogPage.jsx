import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Select, Tag, Space, message, Card, Input, DatePicker, Tooltip, Row, Col } from 'antd'
import { EyeOutlined, RetweetOutlined, DownloadOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import dayjs from 'dayjs'

const { Option } = Select
const { RangePicker } = DatePicker

const SYNC_STATUS_MAP = {
  0: { color: 'default', text: '待处理' },
  1: { color: 'blue', text: '处理中' },
  2: { color: 'green', text: '成功' },
  3: { color: 'red', text: '失败' },
}

function ErpSyncLogPage() {
  const [data, setData] = useState([])
  const [configList, setConfigList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [filterConfigId, setFilterConfigId] = useState()
  const [filterBusinessType, setFilterBusinessType] = useState()
  const [filterSyncDirection, setFilterSyncDirection] = useState()
  const [filterSyncStatus, setFilterSyncStatus] = useState()
  const [filterBusinessId, setFilterBusinessId] = useState()
  const [filterBatchNo, setFilterBatchNo] = useState()
  const [filterDateRange, setFilterDateRange] = useState()
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  useEffect(() => {
    loadConfigList()
  }, [])

  useEffect(() => {
    loadData()
  }, [
    filterConfigId,
    filterBusinessType,
    filterSyncDirection,
    filterSyncStatus,
    filterBusinessId,
    filterBatchNo,
    filterDateRange,
    pagination.current,
    pagination.pageSize,
  ])

  const loadConfigList = async () => {
    try {
      const res = await api.request({ url: '/erp/config/list', method: 'get' }, { offlineQueue: false })
      setConfigList(res.data || [])
    } catch (error) {
      console.error('加载ERP配置列表失败:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
      }
      if (filterConfigId) params.configId = filterConfigId
      if (filterBusinessType) params.businessType = filterBusinessType
      if (filterSyncDirection) params.syncDirection = filterSyncDirection
      if (filterSyncStatus !== undefined && filterSyncStatus !== null && filterSyncStatus !== '') params.syncStatus = filterSyncStatus
      if (filterBusinessId) params.businessId = filterBusinessId
      if (filterBatchNo) params.batchNo = filterBatchNo
      if (filterDateRange && filterDateRange.length === 2) {
        params.startTime = filterDateRange[0].format('YYYY-MM-DD HH:mm:ss')
        params.endTime = filterDateRange[1].format('YYYY-MM-DD HH:mm:ss')
      }
      const res = await api.request(
        { url: '/erp/sync-log/list', method: 'get', params },
        { offlineQueue: false }
      )
      setData(res.data?.list || res.data || [])
      setPagination((prev) => ({
        ...prev,
        total: res.data?.total || (res.data || []).length,
      }))
    } catch (error) {
      console.error('加载同步日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (record) => {
    setDetailLoading(true)
    try {
      const res = await api.request(
        { url: `/erp/sync-log/${record.id}`, method: 'get' },
        { offlineQueue: false }
      )
      setDetailRecord(res.data || record)
      setDetailVisible(true)
    } catch (error) {
      message.error('加载详情失败：' + error.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRetry = async (record) => {
    try {
      await api.request({ url: `/erp/sync-log/${record.id}/retry`, method: 'post' }, { offlineQueue: false })
      message.success('重试成功')
      loadData()
    } catch (error) {
      message.error('重试失败：' + error.message)
    }
  }

  const handleBatchRetry = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择需要重试的日志')
      return
    }
    try {
      await api.request({
        url: '/erp/sync-log/batch-retry',
        method: 'post',
        data: { ids: selectedRowKeys },
      })
      message.success(`批量重试成功，共 ${selectedRowKeys.length} 条`)
      setSelectedRowKeys([])
      loadData()
    } catch (error) {
      message.error('批量重试失败：' + error.message)
    }
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (filterConfigId) params.configId = filterConfigId
      if (filterBusinessType) params.businessType = filterBusinessType
      if (filterSyncDirection) params.syncDirection = filterSyncDirection
      if (filterSyncStatus !== undefined && filterSyncStatus !== null && filterSyncStatus !== '') params.syncStatus = filterSyncStatus
      if (filterBusinessId) params.businessId = filterBusinessId
      if (filterBatchNo) params.batchNo = filterBatchNo
      if (filterDateRange && filterDateRange.length === 2) {
        params.startTime = filterDateRange[0].format('YYYY-MM-DD HH:mm:ss')
        params.endTime = filterDateRange[1].format('YYYY-MM-DD HH:mm:ss')
      }
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
      const queryStr = new URLSearchParams(params).toString()
      window.open(`${baseURL}/erp/sync-log/export?${queryStr}`, '_blank')
    } catch (error) {
      message.error('导出失败：' + error.message)
    }
  }

  const handleResetFilter = () => {
    setFilterConfigId(undefined)
    setFilterBusinessType(undefined)
    setFilterSyncDirection(undefined)
    setFilterSyncStatus(undefined)
    setFilterBusinessId(undefined)
    setFilterBatchNo(undefined)
    setFilterDateRange(undefined)
    setPagination({ current: 1, pageSize: 10, total: 0 })
  }

  const columns = [
    { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 160 },
    { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 100 },
    { title: '业务ID', dataIndex: 'businessId', key: 'businessId', width: 120 },
    {
      title: '同步方向',
      dataIndex: 'syncDirection',
      key: 'syncDirection',
      width: 80,
      render: (v) => v === 'REQUEST' ? <Tag color="cyan">请求</Tag> : <Tag color="purple">响应</Tag>,
    },
    {
      title: '同步状态',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      width: 90,
      render: (v) => {
        const info = SYNC_STATUS_MAP[v] || { color: 'default', text: v }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    { title: '请求URL', dataIndex: 'requestUrl', key: 'requestUrl', width: 180, ellipsis: true },
    {
      title: '请求方法',
      dataIndex: 'requestMethod',
      key: 'requestMethod',
      width: 90,
      render: (v) => {
        const colorMap = { GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red' }
        return <Tag color={colorMap[v]}>{v}</Tag>
      },
    },
    {
      title: '同步时间',
      dataIndex: 'syncTime',
      key: 'syncTime',
      width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '耗时(ms)',
      dataIndex: 'costTime',
      key: 'costTime',
      width: 90,
      align: 'right',
      render: (v) => v ?? '-',
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      width: 100,
      align: 'center',
      render: (v, record) => `${v || 0} / ${record.maxRetryCount || 3}`,
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 200,
      ellipsis: true,
      render: (v) => v ? (
        <Tooltip title={v}>
          <span style={{ color: '#ff4d4f' }}>{v}</span>
        </Tooltip>
      ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.syncStatus === 3 && (
            <Button size="small" icon={<RetweetOutlined />} onClick={() => handleRetry(record)}>重试</Button>
          )}
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.syncStatus !== 3,
    }),
  }

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title="同步日志列表"
          extra={
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
              <Button
                type="primary"
                icon={<RetweetOutlined />}
                onClick={handleBatchRetry}
                disabled={selectedRowKeys.length === 0}
              >
                批量重试 ({selectedRowKeys.length})
              </Button>
            </Space>
          }
        >
          <Card size="small" style={{ marginBottom: 16 }} title="筛选条件">
            <Row gutter={[16, 12]}>
              <Col span={6}>
                <Select
                  placeholder="ERP配置"
                  style={{ width: '100%' }}
                  allowClear
                  value={filterConfigId}
                  onChange={(v) => { setFilterConfigId(v); setPagination((p) => ({ ...p, current: 1 })) }}
                >
                  {configList.map((c) => (
                    <Option key={c.id} value={c.id}>{c.configName}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <Input
                  placeholder="业务类型: 如 PRODUCT"
                  allowClear
                  value={filterBusinessType}
                  onChange={(e) => { setFilterBusinessType(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
                />
              </Col>
              <Col span={6}>
                <Select
                  placeholder="同步方向"
                  style={{ width: '100%' }}
                  allowClear
                  value={filterSyncDirection}
                  onChange={(v) => { setFilterSyncDirection(v); setPagination((p) => ({ ...p, current: 1 })) }}
                >
                  <Option value="REQUEST">请求</Option>
                  <Option value="RESPONSE">响应</Option>
                </Select>
              </Col>
              <Col span={6}>
                <Select
                  placeholder="同步状态"
                  style={{ width: '100%' }}
                  allowClear
                  value={filterSyncStatus}
                  onChange={(v) => { setFilterSyncStatus(v); setPagination((p) => ({ ...p, current: 1 })) }}
                >
                  <Option value={0}>待处理</Option>
                  <Option value={1}>处理中</Option>
                  <Option value={2}>成功</Option>
                  <Option value={3}>失败</Option>
                </Select>
              </Col>
              <Col span={6}>
                <Input
                  placeholder="业务ID"
                  allowClear
                  value={filterBusinessId}
                  onChange={(e) => { setFilterBusinessId(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
                />
              </Col>
              <Col span={6}>
                <Input
                  placeholder="批次号"
                  allowClear
                  value={filterBatchNo}
                  onChange={(e) => { setFilterBatchNo(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
                />
              </Col>
              <Col span={10}>
                <RangePicker
                  showTime
                  style={{ width: '100%' }}
                  value={filterDateRange}
                  onChange={(v) => { setFilterDateRange(v); setPagination((p) => ({ ...p, current: 1 })) }}
                />
              </Col>
              <Col span={2}>
                <Button onClick={handleResetFilter}>重置</Button>
              </Col>
            </Row>
          </Card>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (current, pageSize) => setPagination((prev) => ({ ...prev, current, pageSize })),
            }}
            scroll={{ x: 1500 }}
          />
        </Card>

        <Modal
          title="同步日志详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={[
            detailRecord?.syncStatus === 3 && (
              <Button key="retry" type="primary" icon={<RetweetOutlined />} onClick={() => handleRetry(detailRecord)}>
                重试
              </Button>
            ),
            <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          ].filter(Boolean)}
          width={800}
        >
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
          ) : detailRecord ? (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>批次号</div>
                  <div>{detailRecord.batchNo || '-'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>业务类型 / 业务ID</div>
                  <div>{detailRecord.businessType} / {detailRecord.businessId || '-'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>同步方向</div>
                  <div>{detailRecord.syncDirection === 'REQUEST' ? '请求' : '响应'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>同步状态</div>
                  <div>
                    {(() => {
                      const info = SYNC_STATUS_MAP[detailRecord.syncStatus] || { color: 'default', text: detailRecord.syncStatus }
                      return <Tag color={info.color}>{info.text}</Tag>
                    })()}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>请求方法</div>
                  <div>{detailRecord.requestMethod || '-'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>同步时间</div>
                  <div>{detailRecord.syncTime ? dayjs(detailRecord.syncTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>耗时</div>
                  <div>{detailRecord.costTime ?? '-'} ms</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>重试次数</div>
                  <div>{detailRecord.retryCount || 0} / {detailRecord.maxRetryCount || 3}</div>
                </Col>
              </Row>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>请求URL</div>
                <div style={{ wordBreak: 'break-all' }}>{detailRecord.requestUrl || '-'}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>请求体</div>
                <pre style={{
                  maxHeight: 180,
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  margin: 0,
                  fontSize: 12,
                }}>
                  {detailRecord.requestBody ? JSON.stringify(JSON.parse(detailRecord.requestBody), null, 2) : '-'}
                </pre>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>响应体</div>
                <pre style={{
                  maxHeight: 180,
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  margin: 0,
                  fontSize: 12,
                }}>
                  {detailRecord.responseBody ? (() => {
                    try {
                      return JSON.stringify(JSON.parse(detailRecord.responseBody), null, 2)
                    } catch (e) {
                      return detailRecord.responseBody
                    }
                  })() : '-'}
                </pre>
              </div>

              {detailRecord.errorCode || detailRecord.errorMessage ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                    错误信息
                    {detailRecord.errorCode && <Tag color="red" style={{ marginLeft: 8 }}>Code: {detailRecord.errorCode}</Tag>}
                  </div>
                  <div style={{
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    padding: 12,
                    borderRadius: 4,
                    color: '#ff4d4f',
                    wordBreak: 'break-all',
                  }}>
                    {detailRecord.errorMessage || '-'}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </AppLayout>
  )
}

export default ErpSyncLogPage

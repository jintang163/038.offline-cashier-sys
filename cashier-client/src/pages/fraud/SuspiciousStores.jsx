import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
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
  Select,
  Alert,
  Spin,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import useNetworkStatus from '../../hooks/useNetwork'
import dayjs from 'dayjs'

const { Option } = Select

const RISK_LEVEL_MAP = {
  LOW: { color: 'orange', text: '低风险' },
  MEDIUM: { color: 'warning', text: '中风险' },
  HIGH: { color: 'error', text: '高风险' },
  CRITICAL: { color: 'magenta', text: '极高风险' },
}

const STATUS_MAP = {
  PENDING: { color: 'processing', text: '待处理' },
  PROCESSING: { color: 'warning', text: '处理中' },
  RESOLVED: { color: 'success', text: '已解决' },
  CLOSED: { color: 'default', text: '已关闭' },
}

function SuspiciousStores() {
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [riskLevel, setRiskLevel] = useState(null)
  const [status, setStatus] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentStore, setCurrentStore] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [handleVisible, setHandleVisible] = useState(false)
  const [handleForm, setHandleForm] = useState({ status: 'RESOLVED', handleRemark: '' })
  const { isOnline } = useNetworkStatus()

  const loadStores = useCallback(async () => {
    if (!isOnline) {
      message.warning('请连接网络后查看可疑门店数据')
      return
    }
    setLoading(true)
    try {
      const params = {
        page,
        size: pageSize,
      }
      if (riskLevel) {
        params.riskLevel = riskLevel
      }
      if (status) {
        params.status = status
      }
      const response = await api.getSuspiciousStores(params)
      if (response?.code === 0) {
        setStores(response.data?.records || [])
        setTotal(response.data?.total || 0)
      }
    } catch (error) {
      console.error('加载可疑门店失败:', error)
      message.error('加载可疑门店失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, riskLevel, status, isOnline])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const handleViewDetail = async (store) => {
    setCurrentStore(store)
    setDetailVisible(true)
    setAnalysisResult(null)

    if (isOnline && store.storeId) {
      setAnalysisLoading(true)
      try {
        const response = await api.analyzeStoreFraud(store.storeId)
        if (response?.code === 0) {
          setAnalysisResult(response.data)
        }
      } catch (error) {
        console.error('分析门店风险失败:', error)
      } finally {
        setAnalysisLoading(false)
      }
    }
  }

  const handleOpenHandleModal = (store) => {
    setCurrentStore(store)
    setHandleForm({ status: 'RESOLVED', handleRemark: '' })
    setHandleVisible(true)
  }

  const handleSubmit = async () => {
    if (!isOnline) {
      message.warning('请连接网络后操作')
      return
    }
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const response = await api.request(
        {
          url: `/fraud/suspicious-stores/${currentStore.id}/handle`,
          method: 'post',
          data: {
            status: handleForm.status,
            handlerId: userInfo.id,
            handlerName: userInfo.nickname || userInfo.username,
            handleRemark: handleForm.handleRemark,
          },
        },
        { offlineQueue: false, offlineData: null }
      )
      if (response?.code === 0) {
        message.success('处理成功')
        setHandleVisible(false)
        loadStores()
      }
    } catch (error) {
      console.error('处理失败:', error)
      message.error('处理失败')
    }
  }

  const columns = [
    {
      title: '门店名称',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          <Tag color={RISK_LEVEL_MAP[record.riskLevel]?.color}>
            {RISK_LEVEL_MAP[record.riskLevel]?.text || record.riskLevel}
          </Tag>
        </Space>
      ),
    },
    {
      title: '风险评分',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      sorter: (a, b) => a.riskScore - b.riskScore,
      render: (score) => (
        <span style={{ fontWeight: 'bold', color: score >= 100 ? '#ff0000' : score >= 70 ? '#ff4d4f' : score >= 40 ? '#faad14' : '#52c41a' }}>
          {score}
        </span>
      ),
    },
    {
      title: '检测次数',
      dataIndex: 'detectionCount',
      key: 'detectionCount',
      width: 100,
    },
    {
      title: '最后检测时间',
      dataIndex: 'lastDetectionTime',
      key: 'lastDetectionTime',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text) => {
        const statusInfo = STATUS_MAP[text] || { color: 'default', text: text }
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      },
    },
    {
      title: '处理人',
      dataIndex: 'handlerName',
      key: 'handlerName',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'PENDING' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpenHandleModal(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Alert
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="AI反欺诈监测"
          description="系统自动分析所有门店的异常操作，识别高风险门店并在此展示。建议每日巡检处理。"
          style={{ marginBottom: 16 }}
        />

        <Card
          title="可疑门店列表"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadStores}
                disabled={!isOnline}
              >
                刷新
              </Button>
            </Space>
          }
        >
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="风险等级"
              style={{ width: 140 }}
              allowClear
              value={riskLevel}
              onChange={setRiskLevel}
            >
              <Option value="LOW">低风险</Option>
              <Option value="MEDIUM">中风险</Option>
              <Option value="HIGH">高风险</Option>
              <Option value="CRITICAL">极高风险</Option>
            </Select>
            <Select
              placeholder="处理状态"
              style={{ width: 140 }}
              allowClear
              value={status}
              onChange={setStatus}
            >
              <Option value="PENDING">待处理</Option>
              <Option value="PROCESSING">处理中</Option>
              <Option value="RESOLVED">已解决</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
            <Input
              placeholder="搜索门店名称"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>

          <Table
            loading={loading}
            columns={columns}
            dataSource={stores}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            }}
          />
        </Card>

        <Modal
          title="门店风险详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          }
          width={800}
        >
          {currentStore && (
            <>
              <Descriptions
                title="门店信息"
                column={2}
                bordered
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Descriptions.Item label="门店名称">{currentStore.storeName}</Descriptions.Item>
                <Descriptions.Item label="风险评分">
                  <span style={{ fontWeight: 'bold', color: currentStore.riskScore >= 70 ? '#ff4d4f' : '#faad14' }}>
                    {currentStore.riskScore}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="风险等级">
                  <Tag color={RISK_LEVEL_MAP[currentStore.riskLevel]?.color}>
                    {RISK_LEVEL_MAP[currentStore.riskLevel]?.text || currentStore.riskLevel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="检测次数">{currentStore.detectionCount}</Descriptions.Item>
                <Descriptions.Item label="最后检测时间" span={2}>
                  {currentStore.lastDetectionTime
                    ? dayjs(currentStore.lastDetectionTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Descriptions.Item>
              </Descriptions>

              {analysisLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin tip="正在AI分析门店风险..." />
                </div>
              ) : analysisResult ? (
                <>
                  {analysisResult.breakdown && (
                    <Card title="风险分析明细" size="small" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={6}>
                          <Statistic title="总锁定次数" value={analysisResult.breakdown.totalLockCount} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="退款锁定" value={analysisResult.breakdown.refundLockCount} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="折扣锁定" value={analysisResult.breakdown.discountLockCount} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="近7天锁定" value={analysisResult.breakdown.last7DaysCount} />
                        </Col>
                      </Row>
                      {analysisResult.breakdown.scoreDetails && analysisResult.breakdown.scoreDetails.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ fontWeight: 'bold' }}>风险评分明细：</p>
                          {analysisResult.breakdown.scoreDetails.map((item, idx) => (
                            <Alert
                              key={idx}
                              type="warning"
                              showIcon
                              message={`${item.item}：+${item.score}分`}
                              description={item.description}
                              style={{ marginBottom: 8 }}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {analysisResult.recentLogs && analysisResult.recentLogs.length > 0 && (
                    <Card title="最近异常操作记录" size="small">
                      <Table
                        size="small"
                        dataSource={analysisResult.recentLogs}
                        rowKey="lockNo"
                        pagination={false}
                        columns={[
                          { title: '锁定编号', dataIndex: 'lockNo', key: 'lockNo' },
                          {
                            title: '操作类型',
                            dataIndex: 'operationType',
                            key: 'operationType',
                            render: (t) => (t === 'REFUND' ? '退款' : '折扣'),
                          },
                          {
                            title: '风险等级',
                            dataIndex: 'riskLevel',
                            key: 'riskLevel',
                            render: (l) => {
                              const map = { 1: '低', 2: '中', 3: '高', 4: '极高' }
                              return map[l] || l
                            },
                          },
                          { title: '触发规则', dataIndex: 'triggerRule', key: 'triggerRule' },
                          {
                            title: '时间',
                            dataIndex: 'createTime',
                            key: 'createTime',
                            render: (t) => t ? dayjs(t).format('MM-DD HH:mm') : '-',
                          },
                        ]}
                      />
                    </Card>
                  )}
                </>
              ) : (
                <Empty description="暂无风险分析数据" />
              )}
            </>
          )}
        </Modal>

        <Modal
          title="处理可疑门店"
          open={handleVisible}
          onOk={handleSubmit}
          onCancel={() => setHandleVisible(false)}
          okText="确认处理"
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>处理状态</label>
            <Select
              value={handleForm.status}
              onChange={(v) => setHandleForm({ ...handleForm, status: v })}
              style={{ width: '100%' }}
            >
              <Option value="PROCESSING">处理中</Option>
              <Option value="RESOLVED">已解决</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>处理备注</label>
            <Input.TextArea
              rows={4}
              value={handleForm.handleRemark}
              onChange={(e) => setHandleForm({ ...handleForm, handleRemark: e.target.value })}
              placeholder="请输入处理备注说明"
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default SuspiciousStores

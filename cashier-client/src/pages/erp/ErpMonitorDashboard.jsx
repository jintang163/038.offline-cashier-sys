import React, { useState, useEffect, useRef } from 'react'
import { Table, Button, Select, Switch, Tag, Space, message, Card, Row, Col, Statistic, Progress, Badge } from 'antd'
import { RetweetOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import dayjs from 'dayjs'

const { Option } = Select

const SYNC_STATUS_MAP = {
  0: { color: 'default', text: '待处理' },
  1: { color: 'blue', text: '处理中' },
  2: { color: 'green', text: '成功' },
  3: { color: 'red', text: '失败' },
}

function ErpMonitorDashboard() {
  const [configList, setConfigList] = useState([])
  const [selectedConfigId, setSelectedConfigId] = useState()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)

  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    processing: 0,
    successRate: 0,
  })
  const [todayStats, setTodayStats] = useState({
    todayTotal: 0,
    todaySuccess: 0,
    todayFailed: 0,
  })
  const [recentFailedLogs, setRecentFailedLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    loadConfigList()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  useEffect(() => {
    if (selectedConfigId) {
      loadDashboardData()
      connectWebSocket()
    }
  }, [selectedConfigId])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoRefresh && selectedConfigId) {
      timerRef.current = setInterval(() => {
        loadDashboardData()
      }, refreshInterval * 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, refreshInterval, selectedConfigId])

  const loadConfigList = async () => {
    try {
      const res = await api.request({ url: '/erp/config/list', method: 'get' }, { offlineQueue: false })
      setConfigList(res.data || [])
      if (res.data && res.data.length > 0) {
        const defaultConfig = res.data.find((c) => c.isDefault === 1) || res.data[0]
        setSelectedConfigId(defaultConfig.id)
      }
    } catch (error) {
      console.error('加载ERP配置列表失败:', error)
    }
  }

  const loadDashboardData = async () => {
    if (!selectedConfigId) return
    setLoading(true)
    try {
      const [statsRes, todayRes, failedRes] = await Promise.all([
        api.request(
          { url: '/erp/monitor/stats', method: 'get', params: { configId: selectedConfigId } },
          { offlineQueue: false }
        ),
        api.request(
          { url: '/erp/monitor/today-stats', method: 'get', params: { configId: selectedConfigId } },
          { offlineQueue: false }
        ),
        api.request(
          { url: '/erp/monitor/recent-failed', method: 'get', params: { configId: selectedConfigId, limit: 20 } },
          { offlineQueue: false }
        ),
      ])
      setStats(statsRes.data || { total: 0, success: 0, failed: 0, pending: 0, processing: 0, successRate: 0 })
      setTodayStats(todayRes.data || { todayTotal: 0, todaySuccess: 0, todayFailed: 0 })
      setRecentFailedLogs(failedRes.data || [])
    } catch (error) {
      console.error('加载监控数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    try {
      if (wsRef.current) {
        wsRef.current.close()
      }
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
      const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api$/, '')
      const ws = new WebSocket(`${wsUrl}/ws/erp-sync?configId=${selectedConfigId}`)

      ws.onopen = () => {
        console.log('ERP监控WebSocket已连接')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { type, payload } = data
          if (type === 'sync_update') {
            loadDashboardData()
          } else if (type === 'sync_failed') {
            setRecentFailedLogs((prev) => {
              const newLogs = [payload, ...prev].slice(0, 20)
              return newLogs
            })
            loadDashboardData()
          }
        } catch (e) {
          console.error('WebSocket消息解析失败:', e)
        }
      }

      ws.onerror = (error) => {
        console.error('ERP监控WebSocket错误:', error)
      }

      ws.onclose = () => {
        console.log('ERP监控WebSocket已断开')
      }

      wsRef.current = ws
    } catch (error) {
      console.error('连接WebSocket失败:', error)
    }
  }

  const handleRetry = async (record) => {
    try {
      await api.request({ url: `/erp/sync-log/${record.id}/retry`, method: 'post' }, { offlineQueue: false })
      message.success('重试成功')
      loadDashboardData()
    } catch (error) {
      message.error('重试失败：' + error.message)
    }
  }

  const failedColumns = [
    {
      title: '时间',
      dataIndex: 'syncTime',
      key: 'syncTime',
      width: 160,
      render: (v) => v ? dayjs(v).format('MM-DD HH:mm:ss') : '-',
    },
    { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 90 },
    { title: '业务ID', dataIndex: 'businessId', key: 'businessId', width: 100 },
    {
      title: '同步方向',
      dataIndex: 'syncDirection',
      key: 'syncDirection',
      width: 70,
      render: (v) => v === 'REQUEST' ? <Tag color="cyan">请求</Tag> : <Tag color="purple">响应</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      width: 70,
      render: (v) => {
        const info = SYNC_STATUS_MAP[v] || { color: 'default', text: v }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (v) => v ? <span style={{ color: '#ff4d4f' }}>{v}</span> : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button size="small" icon={<RetweetOutlined />} onClick={() => handleRetry(record)}>重试</Button>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title={
            <Space>
              <span>ERP推送监控大屏</span>
              {selectedConfigId && (
                <Badge status="processing" text="实时监控中" />
              )}
            </Space>
          }
          extra={
            <Space>
              <Select
                placeholder="选择ERP配置"
                style={{ width: 220 }}
                value={selectedConfigId}
                onChange={(v) => setSelectedConfigId(v)}
              >
                {configList.map((c) => (
                  <Option key={c.id} value={c.id}>{c.configName}</Option>
                ))}
              </Select>
              <span style={{ color: '#666' }}>自动刷新</span>
              <Switch checked={autoRefresh} onChange={setAutoRefresh} />
              {autoRefresh && (
                <Select
                  style={{ width: 120 }}
                  value={refreshInterval}
                  onChange={setRefreshInterval}
                >
                  <Option value={10}>10秒</Option>
                  <Option value={30}>30秒</Option>
                  <Option value={60}>1分钟</Option>
                  <Option value={300}>5分钟</Option>
                </Select>
              )}
            </Space>
          }
          loading={loading}
        >
          {!selectedConfigId ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>请先选择ERP配置</div>
          ) : (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={4}>
                  <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
                    <Statistic
                      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总次数</span>}
                      value={stats.total}
                      valueStyle={{ color: '#fff' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff' }}>
                    <Statistic
                      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>成功数</span>}
                      value={stats.success}
                      valueStyle={{ color: '#fff' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card style={{ background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', color: '#fff' }}>
                    <Statistic
                      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>失败数</span>}
                      value={stats.failed}
                      valueStyle={{ color: '#fff' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff' }}>
                    <Statistic
                      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>待处理</span>}
                      value={stats.pending}
                      valueStyle={{ color: '#fff' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#fff' }}>
                    <Statistic
                      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>处理中</span>}
                      value={stats.processing}
                      valueStyle={{ color: '#fff' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card>
                    <div style={{ color: '#666', marginBottom: 8 }}>成功率</div>
                    <Progress
                      type="dashboard"
                      percent={Number((stats.successRate * 100).toFixed(1))}
                      size={80}
                      strokeColor={
                        stats.successRate >= 0.95 ? '#52c41a' :
                        stats.successRate >= 0.8 ? '#faad14' : '#ff4d4f'
                      }
                    />
                    <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: -8 }}>
                      {(stats.successRate * 100).toFixed(1)}%
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="今日总数"
                      value={todayStats.todayTotal}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="今日成功"
                      value={todayStats.todaySuccess}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="今日失败"
                      value={todayStats.todayFailed}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" title="成功/失败分布">
                    <div style={{ padding: '16px 0' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>成功</span>
                          <span style={{ color: '#52c41a' }}>{stats.success}</span>
                        </div>
                        <Progress
                          percent={stats.total ? Math.round((stats.success / stats.total) * 100) : 0}
                          strokeColor="#52c41a"
                          showInfo={false}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>失败</span>
                          <span style={{ color: '#ff4d4f' }}>{stats.failed}</span>
                        </div>
                        <Progress
                          percent={stats.total ? Math.round((stats.failed / stats.total) * 100) : 0}
                          strokeColor="#ff4d4f"
                          showInfo={false}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>待处理</span>
                          <span style={{ color: '#faad14' }}>{stats.pending}</span>
                        </div>
                        <Progress
                          percent={stats.total ? Math.round((stats.pending / stats.total) * 100) : 0}
                          strokeColor="#faad14"
                          showInfo={false}
                        />
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="今日趋势">
                    <div style={{ padding: '16px 0' }}>
                      <Table
                        size="small"
                        rowKey="key"
                        pagination={false}
                        dataSource={[
                          { key: 'total', label: '今日总数', value: todayStats.todayTotal, color: '#1890ff' },
                          { key: 'success', label: '今日成功', value: todayStats.todaySuccess, color: '#52c41a' },
                          { key: 'failed', label: '今日失败', value: todayStats.todayFailed, color: '#ff4d4f' },
                        ]}
                        columns={[
                          { title: '指标', dataIndex: 'label', key: 'label' },
                          {
                            title: '数值',
                            dataIndex: 'value',
                            key: 'value',
                            width: 80,
                            align: 'right',
                            render: (v, record) => (
                              <span style={{ color: record.color, fontWeight: 'bold' }}>{v}</span>
                            ),
                          },
                          {
                            title: '占比',
                            dataIndex: 'value',
                            key: 'percent',
                            render: (v) => {
                              const total = todayStats.todayTotal || 1
                              const pct = Math.round((v / total) * 100)
                              return (
                                <Progress percent={pct} size="small" showInfo={false} />
                              )
                            },
                          },
                        ]}
                      />
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card
                size="small"
                title={
                  <Space>
                    <span>最近失败日志</span>
                    <Tag color="red">{recentFailedLogs.length}</Tag>
                  </Space>
                }
                style={{ marginTop: 16 }}
                extra={
                  <Button size="small" onClick={loadDashboardData}>刷新</Button>
                }
              >
                <Table
                  size="small"
                  rowKey="id"
                  columns={failedColumns}
                  dataSource={recentFailedLogs}
                  pagination={false}
                  locale={{ emptyText: '暂无失败日志' }}
                  scroll={{ y: 300 }}
                />
              </Card>
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}

export default ErpMonitorDashboard

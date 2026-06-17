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
  Row,
  Col,
  Select,
  Alert,
  Input as AntdInput,
  Typography,
  Badge,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
} from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import useNetworkStatus from '../../hooks/useNetwork'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text } = Typography
const { TextArea } = AntdInput

const RISK_LEVEL_MAP = {
  1: { color: 'orange', text: '低风险' },
  2: { color: 'warning', text: '中风险' },
  3: { color: 'error', text: '高风险' },
  4: { color: 'magenta', text: '极高风险' },
}

const STATUS_MAP = {
  NEW: { color: 'processing', text: '新告警', badge: 'red' },
  ACKNOWLEDGED: { color: 'warning', text: '已确认', badge: 'orange' },
  RESOLVED: { color: 'success', text: '已解决', badge: 'green' },
  CLOSED: { color: 'default', text: '已关闭', badge: 'default' },
}

const ALERT_TYPE_MAP = {
  REFUND_FREQUENCY: '高频退款',
  REFUND_AMOUNT: '大额退款',
  ABNORMAL_DISCOUNT: '异常折扣',
  OPERATION_VERIFIED: '操作验证通过',
  STORE_RISK_INCREASE: '门店风险升高',
  STORE_RISK_WARNING: '门店风险预警',
}

function FraudAlerts() {
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [alertType, setAlertType] = useState(null)
  const [riskLevel, setRiskLevel] = useState(null)
  const [status, setStatus] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentAlert, setCurrentAlert] = useState(null)
  const [newCount, setNewCount] = useState(0)
  const [resolveVisible, setResolveVisible] = useState(false)
  const [resolveRemark, setResolveRemark] = useState('')
  const [resolveAction, setResolveAction] = useState('resolve')
  const { isOnline } = useNetworkStatus()

  const loadAlerts = useCallback(async () => {
    if (!isOnline) {
      message.warning('请连接网络后查看告警数据')
      return
    }
    setLoading(true)
    try {
      const params = {
        page,
        size: pageSize,
      }
      if (alertType) {
        params.alertType = alertType
      }
      if (riskLevel) {
        params.riskLevel = riskLevel
      }
      if (status) {
        params.status = status
      }
      const response = await api.getFraudAlerts(params)
      if (response?.code === 0) {
        setAlerts(response.data?.records || [])
        setTotal(response.data?.total || 0)
      }
    } catch (error) {
      console.error('加载告警失败:', error)
      message.error('加载告警失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, alertType, riskLevel, status, isOnline])

  const loadNewCount = useCallback(async () => {
    if (!isOnline) return
    try {
      const response = await api.request(
        { url: '/fraud/alerts/new/count', method: 'get' },
        { offlineQueue: false, offlineData: null }
      )
      if (response?.code === 0) {
        setNewCount(response.data || 0)
      }
    } catch (error) {
      console.error('加载新告警数量失败:', error)
    }
  }, [isOnline])

  useEffect(() => {
    loadAlerts()
    loadNewCount()
  }, [loadAlerts, loadNewCount])

  const handleViewDetail = (alert) => {
    setCurrentAlert(alert)
    setDetailVisible(true)
  }

  const handleAcknowledge = async (alert) => {
    if (!isOnline) {
      message.warning('请连接网络后操作')
      return
    }
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const response = await api.request(
        {
          url: `/fraud/alerts/${alert.id}/acknowledge`,
          method: 'post',
          data: {
            assigneeId: userInfo.id,
            assigneeName: userInfo.nickname || userInfo.username,
          },
        },
        { offlineQueue: false, offlineData: null }
      )
      if (response?.code === 0) {
        message.success('已确认告警')
        loadAlerts()
        loadNewCount()
      }
    } catch (error) {
      console.error('确认告警失败:', error)
      message.error('确认告警失败')
    }
  }

  const openResolveModal = (alert, action = 'resolve') => {
    setCurrentAlert(alert)
    setResolveAction(action)
    setResolveRemark('')
    setResolveVisible(true)
  }

  const handleResolve = async () => {
    if (!isOnline) {
      message.warning('请连接网络后操作')
      return
    }
    try {
      const url = resolveAction === 'resolve'
        ? `/fraud/alerts/${currentAlert.id}/resolve`
        : `/fraud/alerts/${currentAlert.id}/close`
      const response = await api.request(
        {
          url,
          method: 'post',
          data: { resolveRemark },
        },
        { offlineQueue: false, offlineData: null }
      )
      if (response?.code === 0) {
        message.success(resolveAction === 'resolve' ? '已解决告警' : '已关闭告警')
        setResolveVisible(false)
        loadAlerts()
        loadNewCount()
      }
    } catch (error) {
      console.error('处理告警失败:', error)
      message.error('处理告警失败')
    }
  }

  const renderAlertDetails = (alert) => {
    if (!alert?.alertDetails) return null
    try {
      const details = typeof alert.alertDetails === 'string'
        ? JSON.parse(alert.alertDetails)
        : alert.alertDetails
      return (
        <Descriptions
          title="告警详情"
          column={1}
          bordered
          size="small"
          style={{ marginTop: 16 }}
        >
          {Object.entries(details).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      )
    } catch (e) {
      return null
    }
  }

  const columns = [
    {
      title: '告警编号',
      dataIndex: 'alertNo',
      key: 'alertNo',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 120,
      render: (t) => ALERT_TYPE_MAP[t] || t,
    },
    {
      title: '标题',
      dataIndex: 'alertTitle',
      key: 'alertTitle',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          {record.status === 'NEW' && <Badge dot color="red" />}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 140,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (l) => {
        const info = RISK_LEVEL_MAP[l] || { color: 'default', text: l }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => {
        const info = STATUS_MAP[s] || { color: 'default', text: s }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      width: 100,
      render: (t) => t || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
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
          {record.status === 'NEW' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleAcknowledge(record)}
            >
              确认
            </Button>
          )}
          {(record.status === 'NEW' || record.status === 'ACKNOWLEDGED') && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => openResolveModal(record, 'resolve')}
              >
                解决
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openResolveModal(record, 'close')}
              >
                关闭
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Alert
          type="warning"
          showIcon
          icon={<BellOutlined />}
          message={
            <Space>
              <span>风险告警中心</span>
              {newCount > 0 && <Badge count={newCount} offset={[0, 0]} />}
            </Space>
          }
          description="系统自动检测到的风险告警，请及时处理。新告警会以红点标记。"
          style={{ marginBottom: 16 }}
        />

        <Card
          title={
            <Space>
              <span>告警列表</span>
              {newCount > 0 && (
                <Tag color="red">新告警 {newCount} 条</Tag>
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadAlerts()
                  loadNewCount()
                }}
                disabled={!isOnline}
              >
                刷新
              </Button>
            </Space>
          }
        >
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="告警类型"
              style={{ width: 140 }}
              allowClear
              value={alertType}
              onChange={setAlertType}
            >
              <Option value="REFUND_FREQUENCY">高频退款</Option>
              <Option value="REFUND_AMOUNT">大额退款</Option>
              <Option value="ABNORMAL_DISCOUNT">异常折扣</Option>
              <Option value="STORE_RISK_INCREASE">门店风险升高</Option>
              <Option value="STORE_RISK_WARNING">门店风险预警</Option>
              <Option value="OPERATION_VERIFIED">操作验证通过</Option>
            </Select>
            <Select
              placeholder="风险等级"
              style={{ width: 120 }}
              allowClear
              value={riskLevel}
              onChange={setRiskLevel}
            >
              <Option value={1}>低风险</Option>
              <Option value={2}>中风险</Option>
              <Option value={3}>高风险</Option>
              <Option value={4}>极高风险</Option>
            </Select>
            <Select
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              value={status}
              onChange={setStatus}
            >
              <Option value="NEW">新告警</Option>
              <Option value="ACKNOWLEDGED">已确认</Option>
              <Option value="RESOLVED">已解决</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
            <Input
              placeholder="搜索告警标题/门店"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>

          <Table
            loading={loading}
            columns={columns}
            dataSource={alerts}
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
          title="告警详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={
            <Space>
              {currentAlert?.status === 'NEW' && (
                <Button onClick={() => handleAcknowledge(currentAlert)}>
                  确认
                </Button>
              )}
              {(currentAlert?.status === 'NEW' || currentAlert?.status === 'ACKNOWLEDGED') && (
                <>
                  <Button type="primary" onClick={() => openResolveModal(currentAlert, 'resolve')}>
                    标记解决
                  </Button>
                  <Button danger onClick={() => openResolveModal(currentAlert, 'close')}>
                    关闭
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailVisible(false)}>关闭</Button>
            </Space>
          }
          width={700}
        >
          {currentAlert && (
            <>
              <Descriptions
                title="告警基本信息"
                column={2}
                bordered
                size="small"
              >
                <Descriptions.Item label="告警编号">{currentAlert.alertNo}</Descriptions.Item>
                <Descriptions.Item label="告警类型">
                  {ALERT_TYPE_MAP[currentAlert.alertType] || currentAlert.alertType}
                </Descriptions.Item>
                <Descriptions.Item label="风险等级" span={2}>
                  <Tag color={RISK_LEVEL_MAP[currentAlert.riskLevel]?.color}>
                    {RISK_LEVEL_MAP[currentAlert.riskLevel]?.text || currentAlert.riskLevel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="告警标题" span={2}>
                  <Title level={5} style={{ margin: 0 }}>{currentAlert.alertTitle}</Title>
                </Descriptions.Item>
                <Descriptions.Item label="告警内容" span={2}>
                  <Text type="secondary">{currentAlert.alertContent}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="门店">{currentAlert.storeName || '-'}</Descriptions.Item>
                <Descriptions.Item label="设备">{currentAlert.deviceNo || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={STATUS_MAP[currentAlert.status]?.color}>
                    {STATUS_MAP[currentAlert.status]?.text || currentAlert.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="负责人">{currentAlert.assigneeName || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {currentAlert.createTime
                    ? dayjs(currentAlert.createTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Descriptions.Item>
                {currentAlert.resolveTime && (
                  <Descriptions.Item label="处理时间" span={2}>
                    {dayjs(currentAlert.resolveTime).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {currentAlert.resolveRemark && (
                  <Descriptions.Item label="处理备注" span={2}>
                    {currentAlert.resolveRemark}
                  </Descriptions.Item>
                )}
              </Descriptions>
              {renderAlertDetails(currentAlert)}
            </>
          )}
        </Modal>

        <Modal
          title={resolveAction === 'resolve' ? '标记解决' : '关闭告警'}
          open={resolveVisible}
          onOk={handleResolve}
          onCancel={() => setResolveVisible(false)}
          okText={resolveAction === 'resolve' ? '确认解决' : '确认关闭'}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>处理备注</label>
            <TextArea
              rows={4}
              value={resolveRemark}
              onChange={(e) => setResolveRemark(e.target.value)}
              placeholder={resolveAction === 'resolve'
                ? '请输入解决说明（选填）'
                : '请输入关闭原因（选填）'}
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default FraudAlerts

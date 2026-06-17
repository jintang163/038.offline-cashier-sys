import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  DatePicker,
  Button,
  Tabs,
  Modal,
  message,
  Badge,
  Descriptions,
  Divider,
  Empty,
  Tooltip,
} from 'antd'
import {
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  WifiOutlined,
  HardDriveOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import apiService from '../api/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

function DeviceMonitor() {
  const [loading, setLoading] = useState(false)
  const [overviewData, setOverviewData] = useState(null)
  const [locationOverview, setLocationOverview] = useState(null)
  const [logAnalysis, setLogAnalysis] = useState(null)
  const [abnormalLogs, setAbnormalLogs] = useState({ list: [], total: 0 })
  const [logDateRange, setLogDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()])
  const [activeTab, setActiveTab] = useState('overview')
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const loadOverview = async () => {
    try {
      setLoading(true)
      const result = await apiService.getDeviceMonitorOverview()
      if (result?.code === 0 || result?.code === 200) {
        setOverviewData(result.data)
      }
    } catch (error) {
      message.error('加载监控概览失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLocationOverview = async () => {
    try {
      setLoading(true)
      const result = await apiService.getLocationMonitorOverview()
      if (result?.code === 0 || result?.code === 200) {
        setLocationOverview(result.data)
      }
    } catch (error) {
      message.error('加载门店监控失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLogAnalysis = async () => {
    try {
      setLoading(true)
      const params = {}
      if (logDateRange && logDateRange.length === 2) {
        params.startDate = logDateRange[0].format('YYYY-MM-DD')
        params.endDate = logDateRange[1].format('YYYY-MM-DD')
      }
      const result = await apiService.getLogAnalysisSummary(params)
      if (result?.code === 0 || result?.code === 200) {
        setLogAnalysis(result.data)
      }
    } catch (error) {
      message.error('加载日志分析失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAbnormalLogs = async (page = 1, size = 20) => {
    try {
      setLoading(true)
      const params = { page, size }
      if (logDateRange && logDateRange.length === 2) {
        params.startDate = logDateRange[0].format('YYYY-MM-DD')
        params.endDate = logDateRange[1].format('YYYY-MM-DD')
      }
      const result = await apiService.getAbnormalSelfCheckLogs(params)
      if (result?.code === 0 || result?.code === 200) {
        setAbnormalLogs({
          list: result.data?.records || [],
          total: result.data?.total || 0,
        })
      }
    } catch (error) {
      message.error('加载异常自检记录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
    loadLocationOverview()
    loadLogAnalysis()
    loadAbnormalLogs()
  }, [])

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview()
    } else if (activeTab === 'location') {
      loadLocationOverview()
    } else if (activeTab === 'analysis') {
      loadLogAnalysis()
    } else if (activeTab === 'abnormal') {
      loadAbnormalLogs()
    }
  }, [activeTab])

  const handleRefresh = () => {
    if (activeTab === 'overview') {
      loadOverview()
    } else if (activeTab === 'location') {
      loadLocationOverview()
    } else if (activeTab === 'analysis') {
      loadLogAnalysis()
    } else if (activeTab === 'abnormal') {
      loadAbnormalLogs()
    }
  }

  const handleDeviceDetail = (device) => {
    setSelectedDevice(device)
    setDetailModalVisible(true)
  }

  const handleRequestLogPull = async (device) => {
    try {
      Modal.confirm({
        title: '请求远程拉取日志',
        content: `确定要请求设备 [${device.deviceName || device.deviceNo}] 上传今日日志吗？`,
        onOk: async () => {
          const result = await apiService.requestRemoteLogPull({
            deviceNo: device.deviceNo,
            logDate: dayjs().format('YYYY-MM-DD'),
            logType: 'ALL',
            pullRemark: '运维人员手动请求拉取',
          })
          if (result?.code === 0 || result?.code === 200) {
            message.success('已发送日志拉取请求，设备下次心跳时将自动上传')
          } else {
            message.error(result?.message || '请求失败')
          }
        },
      })
    } catch (error) {
      message.error('请求日志拉取失败: ' + error.message)
    }
  }

  const statusTag = (status, isOnline) => {
    if (isOnline) {
      return <Tag icon={<CheckCircleOutlined />} color="success">在线</Tag>
    }
    if (status === 0) {
      return <Tag icon={<CloseCircleOutlined />} color="error">离线</Tag>
    }
    return <Tag icon={<ExclamationCircleOutlined />} color="warning">异常</Tag>
  }

  const selfCheckStatusTag = (status) => {
    switch (status) {
      case 1:
        return <Tag color="success">正常</Tag>
      case 2:
        return <Tag color="warning">告警</Tag>
      case 3:
        return <Tag color="error">异常</Tag>
      default:
        return <Tag color="default">未知</Tag>
    }
  }

  const renderOverviewTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={overviewData?.totalDevices || 0}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="在线设备"
              value={overviewData?.onlineDevices || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="离线设备"
              value={overviewData?.offlineDevices || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="未处理异常自检"
              value={overviewData?.abnormalChecks || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="待处理日志拉取请求" extra={<Badge count={overviewData?.pendingLogPulls || 0} />}>
            {overviewData?.pendingLogPulls > 0 ? (
              <p>当前有 {overviewData.pendingLogPulls} 个日志拉取请求待设备响应</p>
            ) : (
              <Empty description="暂无待处理请求" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="在线率统计">
            {overviewData?.totalDevices > 0 ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="在线率">
                  <Tag color="green">
                    {((overviewData.onlineDevices / overviewData.totalDevices) * 100).toFixed(2)}%
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="离线率">
                  <Tag color="red">
                    {((overviewData.offlineDevices / overviewData.totalDevices) * 100).toFixed(2)}%
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="暂无设备数据" />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  )

  const locationColumns = [
    {
      title: '门店/区域',
      dataIndex: 'location',
      key: 'location',
      render: (text) => (
        <Space>
          <ShopOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '设备总数',
      dataIndex: 'totalDevices',
      key: 'totalDevices',
      width: 100,
    },
    {
      title: '在线设备',
      dataIndex: 'onlineDevices',
      key: 'onlineDevices',
      width: 100,
      render: (v) => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>{v}</span>,
    },
    {
      title: '离线设备',
      dataIndex: 'offlineDevices',
      key: 'offlineDevices',
      width: 100,
      render: (v) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{v}</span>,
    },
    {
      title: '在线率',
      dataIndex: 'onlineRate',
      key: 'onlineRate',
      width: 100,
      render: (rate) => {
        const rateNum = parseFloat(rate)
        let color = '#3f8600'
        if (rateNum < 90) color = '#cf1322'
        else if (rateNum < 98) color = '#faad14'
        return <Tag color={color}>{rate}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => setSelectedLocation(record)}
          >
            查看设备
          </Button>
        </Space>
      ),
    },
  ]

  const renderLocationTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="门店总数"
              value={locationOverview?.totalLocations || 0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="全在线门店"
              value={locationOverview?.fullyOnlineLocations || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="存在离线设备门店"
              value={locationOverview?.hasOfflineLocations || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="整体在线率"
              value={locationOverview?.overallOnlineRate || '0%'}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="各门店设备状态">
        <Table
          columns={locationColumns}
          dataSource={locationOverview?.locationList || []}
          rowKey="location"
          pagination={false}
        />
      </Card>

      {selectedLocation && (
        <Card
          title={`门店设备详情 - ${selectedLocation.location}`}
          extra={<Button onClick={() => setSelectedLocation(null)}>关闭</Button>}
        >
          <Tabs defaultActiveKey="online">
            <Tabs.TabPane tab={`在线设备 (${selectedLocation.onlineDevices})`} key="online">
              <Table
                size="small"
                columns={deviceListColumns}
                dataSource={selectedLocation.onlineDeviceList || []}
                rowKey="id"
                pagination={false}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={`离线设备 (${selectedLocation.offlineDevices})`} key="offline">
              <Table
                size="small"
                columns={deviceListColumns}
                dataSource={selectedLocation.offlineDeviceList || []}
                rowKey="id"
                pagination={false}
              />
            </Tabs.TabPane>
          </Tabs>
        </Card>
      )}
    </Space>
  )

  const deviceListColumns = [
    {
      title: '设备编号',
      dataIndex: 'deviceNo',
      key: 'deviceNo',
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: '状态',
      dataIndex: 'isOnline',
      key: 'isOnline',
      width: 80,
      render: (isOnline) => statusTag(null, isOnline),
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
    {
      title: '操作系统',
      dataIndex: 'osType',
      key: 'osType',
      width: 100,
    },
    {
      title: '最后心跳',
      dataIndex: 'lastHeartbeat',
      key: 'lastHeartbeat',
      width: 180,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleDeviceDetail(record)}>
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleRequestLogPull(record)}
          >
            拉取日志
          </Button>
        </Space>
      ),
    },
  ]

  const renderAnalysisTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        title="日志分析概览"
        extra={
          <Space>
            <RangePicker
              value={logDateRange}
              onChange={(dates) => {
                setLogDateRange(dates)
                if (dates && dates.length === 2) {
                  setTimeout(() => loadLogAnalysis(), 100)
                }
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadLogAnalysis}>
              刷新
            </Button>
          </Space>
        }
      >
        {logAnalysis ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="自检总次数"
                  value={logAnalysis.totalChecks || 0}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="正常次数"
                  value={logAnalysis.normalChecks || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="告警次数"
                  value={logAnalysis.warningChecks || 0}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="异常次数"
                  value={logAnalysis.abnormalChecks || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
            </Row>

            <Divider orientation="left">自检通过率</Divider>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Statistic
                    title="自检正常率"
                    value={logAnalysis.normalRate || '0%'}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Statistic
                    title="网络异常次数"
                    value={logAnalysis.networkAbnormalCount || 0}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<WifiOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Statistic
                    title="打印机异常次数"
                    value={logAnalysis.printerAbnormalCount || 0}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<PrinterOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">存储状态告警</Divider>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Statistic
                    title="存储空间告警次数"
                    value={logAnalysis.storageWarningCount || 0}
                    prefix={<HardDriveOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">日志上传情况</Divider>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="日志上传总次数"
                  value={logAnalysis.totalLogUploads || 0}
                  prefix={<CloudServerOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="上传成功次数"
                  value={logAnalysis.successLogUploads || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="上传失败次数"
                  value={logAnalysis.failedLogUploads || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="上传成功率"
                  value={logAnalysis.uploadSuccessRate || '0%'}
                  prefix={<CloudServerOutlined />}
                />
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="日志拉取统计">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="待拉取日志数">
                      <Tag color="orange">{logAnalysis.pendingLogPulls || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="已完成拉取数">
                      <Tag color="green">{logAnalysis.completedLogPulls || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="日志文件总大小">
                      {logAnalysis.totalLogFileSizeMB || 0} MB
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </Space>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </Space>
  )

  const abnormalLogColumns = [
    {
      title: '检测时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '设备编号',
      dataIndex: 'deviceNo',
      key: 'deviceNo',
      width: 180,
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: '综合状态',
      dataIndex: 'checkStatus',
      key: 'checkStatus',
      width: 100,
      render: (s) => selfCheckStatusTag(s),
    },
    {
      title: '网络状态',
      dataIndex: 'networkStatus',
      key: 'networkStatus',
      width: 100,
      render: (s) => s === 0 ? <Tag color="error">异常</Tag> : <Tag color="success">正常</Tag>,
    },
    {
      title: '打印机状态',
      dataIndex: 'printerStatus',
      key: 'printerStatus',
      width: 100,
      render: (s) => {
        if (s === 0 || s === 3) return <Tag color="error">异常</Tag>
        if (s === 2) return <Tag color="warning">告警</Tag>
        return <Tag color="success">正常</Tag>
      },
    },
    {
      title: '存储状态',
      dataIndex: 'storageStatus',
      key: 'storageStatus',
      width: 100,
      render: (s) => {
        if (s === 2) return <Tag color="error">不足</Tag>
        if (s === 1) return <Tag color="warning">告警</Tag>
        return <Tag color="success">正常</Tag>
      },
    },
    {
      title: '错误信息',
      dataIndex: 'printerError',
      key: 'printerError',
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={record.errorDetails || text}>
          {text || '-'}
        </Tooltip>
      ),
    },
  ]

  const renderAbnormalTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        title="异常自检记录"
        extra={
          <Space>
            <RangePicker
              value={logDateRange}
              onChange={(dates) => {
                setLogDateRange(dates)
                if (dates && dates.length === 2) {
                  setTimeout(() => loadAbnormalLogs(), 100)
                }
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => loadAbnormalLogs()}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={abnormalLogColumns}
          dataSource={abnormalLogs.list}
          rowKey="id"
          loading={loading}
          pagination={{
            total: abnormalLogs.total,
            pageSize: 20,
            showSizeChanger: true,
            onChange: (page, pageSize) => loadAbnormalLogs(page, pageSize),
          }}
        />
      </Card>
    </Space>
  )

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title={
            <Space>
              <DesktopOutlined />
              设备监控中心
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
              刷新数据
            </Button>
          }
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: (
                  <Space>
                    <DesktopOutlined />
                    总览
                  </Space>
                ),
                children: renderOverviewTab(),
              },
              {
                key: 'location',
                label: (
                  <Space>
                    <ShopOutlined />
                    门店设备
                  </Space>
                ),
                children: renderLocationTab(),
              },
              {
                key: 'analysis',
                label: (
                  <Space>
                    <FileTextOutlined />
                    日志分析
                  </Space>
                ),
                children: renderAnalysisTab(),
              },
              {
                key: 'abnormal',
                label: (
                  <Space>
                    <WarningOutlined />
                    异常记录
                  </Space>
                ),
                children: renderAbnormalTab(),
              },
            ]}
          />
        </Card>

        <Modal
          title="设备详情"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="pull" icon={<DownloadOutlined />} onClick={() => selectedDevice && handleRequestLogPull(selectedDevice)}>
              请求拉取日志
            </Button>,
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
          ]}
          width={700}
        >
          {selectedDevice && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="设备编号">{selectedDevice.deviceNo}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{selectedDevice.deviceName || '-'}</Descriptions.Item>
              <Descriptions.Item label="设备类型">{selectedDevice.deviceType || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {statusTag(null, selectedDevice.isOnline)}
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">{selectedDevice.ipAddress || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作系统">{selectedDevice.osType || '-'}</Descriptions.Item>
              <Descriptions.Item label="系统版本">{selectedDevice.osVersion || '-'}</Descriptions.Item>
              <Descriptions.Item label="App版本">{selectedDevice.appVersion || '-'}</Descriptions.Item>
              <Descriptions.Item label="最后心跳" span={2}>
                {selectedDevice.lastHeartbeat ? dayjs(selectedDevice.lastHeartbeat).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AppLayout>
  )
}

export default DeviceMonitor

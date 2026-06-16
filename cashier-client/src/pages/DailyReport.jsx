import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  DatePicker,
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
  Divider,
} from 'antd'
import {
  ReloadOutlined,
  EyeOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CloudUploadOutlined,
  FileExcelOutlined,
  PlusOutlined,
  SendOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import dailyReportService from '../services/dailyReportService'
import syncService from '../services/syncService'
import useNetworkStatus from '../hooks/useNetwork'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

function DailyReport() {
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dateRange, setDateRange] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentReport, setCurrentReport] = useState(null)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [erpPushLoading, setErpPushLoading] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [todaySummary, setTodaySummary] = useState(null)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    loadReports()
    loadTodaySummary()
    loadUnsyncedCount()
  }, [page, pageSize])

  useEffect(() => {
    const unsubscribe = syncService.on('syncComplete', (data) => {
      if (data.type === 'dailyReports') {
        loadReports()
        loadUnsyncedCount()
      }
    })
    return unsubscribe
  }, [])

  const loadTodaySummary = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const report = await dailyReportService.getReportByDate(today)
      if (report) {
        setTodaySummary(report)
      } else {
        setTodaySummary(null)
      }
    } catch (error) {
      console.error('加载今日日报失败:', error)
    }
  }

  const loadUnsyncedCount = async () => {
    try {
      const unsynced = await dailyReportService.getUnsyncedReports(1000)
      setUnsyncedCount(unsynced.length)
    } catch (error) {
      console.error('加载未同步日报数量失败:', error)
    }
  }

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
      }
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }
      const data = await dailyReportService.getReportList(params)
      setReports(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('加载日报列表失败:', error)
      message.error('加载日报列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadReports()
  }

  const handleReset = () => {
    setDateRange(null)
    setPage(1)
    setTimeout(loadReports, 0)
  }

  const viewReportDetail = (report) => {
    setCurrentReport(report)
    setDetailVisible(true)
  }

  const handleGenerateReport = async () => {
    const today = dayjs().format('YYYY-MM-DD')
    Modal.confirm({
      title: '生成今日日报',
      content: `确定要生成 ${today} 的营业日报吗？`,
      onOk: async () => {
        setGenerateLoading(true)
        try {
          const report = await dailyReportService.generateTodayReport()
          message.success('日报生成成功')
          setTodaySummary(report)
          loadReports()
          loadUnsyncedCount()
        } catch (error) {
          console.error('生成日报失败:', error)
          message.error('生成日报失败：' + error.message)
        } finally {
          setGenerateLoading(false)
        }
      },
    })
  }

  const handleExportExcel = useCallback(async (report) => {
    setExportLoading(true)
    try {
      await dailyReportService.exportReportToExcel(report.report_date)
      message.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败：' + error.message)
    } finally {
      setExportLoading(false)
    }
  }, [])

  const handleExportRange = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('请先选择日期范围')
      return
    }
    setExportLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      await dailyReportService.exportReportRangeToExcel(startDate, endDate)
      message.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败：' + error.message)
    } finally {
      setExportLoading(false)
    }
  }, [dateRange])

  const handleSyncReports = useCallback(async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步')
      return
    }
    if (unsyncedCount === 0) {
      message.info('没有需要同步的日报')
      return
    }
    setSyncLoading(true)
    try {
      const result = await syncService.syncDailyReports()
      const success = result.success === true || result.failed === 0
      if (success) {
        message.success(`同步成功：${result.success || result.count || 0} 条`)
      } else {
        message.warning(`同步完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
      }
      loadReports()
      loadUnsyncedCount()
    } catch (error) {
      message.error('同步失败：' + error.message)
    } finally {
      setSyncLoading(false)
    }
  }, [isOnline, unsyncedCount])

  const handlePushToErp = useCallback(async (report) => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法推送ERP')
      return
    }
    Modal.confirm({
      title: '推送到ERP',
      content: `确定要将 ${report.report_date} 的日报推送到ERP吗？`,
      onOk: async () => {
        setErpPushLoading(true)
        try {
          await dailyReportService.pushReportToErp(report.id)
          message.success('推送成功')
          loadReports()
          loadTodaySummary()
        } catch (error) {
          console.error('推送ERP失败:', error)
          message.error('推送失败：' + error.message)
        } finally {
          setErpPushLoading(false)
        }
      },
    })
  }, [isOnline])

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

  const renderErpPushStatus = (status, record) => {
    if (status === 1) {
      return <Tag color="green">已推送</Tag>
    } else if (status === 2) {
      return (
        <Tooltip title={record.erp_push_error || '推送失败'}>
          <Tag color="red" icon={<ExclamationCircleOutlined />}>
            推送失败
          </Tag>
        </Tooltip>
      )
    }
    return <Tag color="default">未推送</Tag>
  }

  const columns = [
    {
      title: '报表日期',
      dataIndex: 'report_date',
      key: 'report_date',
      width: 120,
      render: (val) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: '报表编号',
      dataIndex: 'report_no',
      key: 'report_no',
      width: 180,
    },
    {
      title: '订单总数',
      dataIndex: 'total_orders',
      key: 'total_orders',
      width: 100,
    },
    {
      title: '营业总额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 110,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '优惠金额',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 110,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '退菜金额',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      width: 110,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '实收金额',
      dataIndex: 'actual_amount',
      key: 'actual_amount',
      width: 110,
      render: (val) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{Number(val || 0).toFixed(2)}</span>,
    },
    {
      title: '现金',
      dataIndex: 'cash_amount',
      key: 'cash_amount',
      width: 100,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '微信',
      dataIndex: 'wechat_amount',
      key: 'wechat_amount',
      width: 100,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '支付宝',
      dataIndex: 'alipay_amount',
      key: 'alipay_amount',
      width: 100,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '会员卡',
      dataIndex: 'member_card_amount',
      key: 'member_card_amount',
      width: 100,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '客单价',
      dataIndex: 'avg_order_amount',
      key: 'avg_order_amount',
      width: 100,
      render: (val) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '商品总数',
      dataIndex: 'total_items',
      key: 'total_items',
      width: 90,
    },
    {
      title: '新增会员',
      dataIndex: 'new_member_count',
      key: 'new_member_count',
      width: 90,
    },
    {
      title: '同步状态',
      dataIndex: 'sync_status',
      key: 'sync_status',
      width: 100,
      render: (status, record) => renderSyncStatus(status, record),
    },
    {
      title: 'ERP状态',
      dataIndex: 'erp_push_status',
      key: 'erp_push_status',
      width: 100,
      render: (status, record) => renderErpPushStatus(status, record),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => viewReportDetail(record)}>
            详情
          </Button>
          <Button
            type="link"
            icon={<FileExcelOutlined />}
            onClick={() => handleExportExcel(record)}
          >
            导出
          </Button>
          <Button
            type="link"
            icon={<SendOutlined />}
            onClick={() => handlePushToErp(record)}
            disabled={!isOnline}
          >
            推ERP
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日营业额"
                value={todaySummary?.actual_amount || 0}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日订单数"
                value={todaySummary?.total_orders || 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日客单价"
                value={todaySummary?.avg_order_amount || 0}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待同步日报"
                value={unsyncedCount}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleGenerateReport}
                loading={generateLoading}
              >
                生成今日日报
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportRange}
                loading={exportLoading}
              >
                批量导出
              </Button>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={handleSyncReports}
                loading={syncLoading}
                disabled={!isOnline}
              >
                同步到云端
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={reports}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            }}
            scroll={{ x: 1800 }}
            locale={{ emptyText: <Empty description="暂无日报数据" /> }}
          />
        </Card>

        <Modal
          title="日报详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          width={700}
          footer={[
            <Button key="close" onClick={() => setDetailVisible(false)}>
              关闭
            </Button>,
            <Button
              key="export"
              icon={<FileExcelOutlined />}
              onClick={() => {
                if (currentReport) {
                  handleExportExcel(currentReport)
                }
              }}
            >
              导出Excel
            </Button>,
            <Button
              key="push"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                if (currentReport) {
                  handlePushToErp(currentReport)
                }
              }}
              disabled={!isOnline}
            >
              推送到ERP
            </Button>,
          ]}
        >
          {currentReport && (
            <>
              <Descriptions title="基本信息" column={2} bordered size="small">
                <Descriptions.Item label="报表日期">
                  {dayjs(currentReport.report_date).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="报表编号">
                  {currentReport.report_no}
                </Descriptions.Item>
                <Descriptions.Item label="订单总数">
                  {currentReport.total_orders}
                </Descriptions.Item>
                <Descriptions.Item label="商品总数">
                  {currentReport.total_items}
                </Descriptions.Item>
                <Descriptions.Item label="客单价">
                  ¥{Number(currentReport.avg_order_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="新增会员">
                  {currentReport.new_member_count}
                </Descriptions.Item>
                <Descriptions.Item label="同步状态">
                  {renderSyncStatus(currentReport.sync_status, currentReport)}
                </Descriptions.Item>
                <Descriptions.Item label="ERP状态">
                  {renderErpPushStatus(currentReport.erp_push_status, currentReport)}
                </Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '16px 0' }} />

              <Descriptions title="金额统计" column={2} bordered size="small">
                <Descriptions.Item label="营业总额">
                  ¥{Number(currentReport.total_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="优惠金额">
                  ¥{Number(currentReport.discount_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="退菜金额">
                  ¥{Number(currentReport.refund_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="实收金额" labelStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                    ¥{Number(currentReport.actual_amount || 0).toFixed(2)}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '16px 0' }} />

              <Descriptions title="收款方式" column={2} bordered size="small">
                <Descriptions.Item label="现金">
                  ¥{Number(currentReport.cash_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="微信支付">
                  ¥{Number(currentReport.wechat_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="支付宝">
                  ¥{Number(currentReport.alipay_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="会员卡">
                  ¥{Number(currentReport.member_card_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="其他支付">
                  ¥{Number(currentReport.other_pay_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="会员折扣">
                  ¥{Number(currentReport.member_discount_amount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="积分抵扣">
                  ¥{Number(currentReport.points_deduction_amount || 0).toFixed(2)}
                </Descriptions.Item>
              </Descriptions>

              {currentReport.remark && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <Descriptions title="备注" column={1} bordered size="small">
                    <Descriptions.Item label="备注">
                      {currentReport.remark}
                    </Descriptions.Item>
                  </Descriptions>
                </>
              )}
            </>
          )}
        </Modal>
      </div>
    </AppLayout>
  )
}

export default DailyReport

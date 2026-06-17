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
  Modal,
  message,
  Descriptions,
  Divider,
  Empty,
  InputNumber,
  Input,
  Form,
  Select,
} from 'antd'
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  SendOutlined,
  ShopOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import AppLayout from '../components/AppLayout'
import apiService from '../api/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

const STATUS_MAP = {
  10: { color: 'orange', text: '待确认', icon: <ExclamationCircleOutlined /> },
  20: { color: 'blue', text: '已确认', icon: <CheckCircleOutlined /> },
  30: { color: 'cyan', text: '已推送ERP', icon: <CloudUploadOutlined /> },
  40: { color: 'green', text: '已生成采购单', icon: <CheckCircleOutlined /> },
  50: { color: 'red', text: '已驳回', icon: <CloseCircleOutlined /> },
}

const PUSH_STATUS_MAP = {
  0: { color: 'default', text: '未推送' },
  1: { color: 'orange', text: '推送中' },
  2: { color: 'green', text: '推送成功' },
  3: { color: 'red', text: '推送失败' },
}

const GENERATE_TYPE_MAP = {
  1: { color: 'purple', text: '自动生成' },
  2: { color: 'blue', text: '手动生成' },
}

function PurchaseSuggestion() {
  const [loading, setLoading] = useState(false)
  const [overviewData, setOverviewData] = useState(null)
  const [suggestionList, setSuggestionList] = useState({ list: [], total: 0 })
  const [pagination, setPagination] = useState({ pageNum: 1, pageSize: 10 })
  const [statusFilter, setStatusFilter] = useState(null)
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()])

  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)

  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [confirmForm] = Form.useForm()
  const [generateForm] = Form.useForm()

  const loadOverview = async () => {
    try {
      setLoading(true)
      const params = {}
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }
      const result = await apiService.getHistoricalSalesForecast(params)
      if (result?.code === 0 || result?.code === 200) {
        setOverviewData(result.data)
      }
    } catch (error) {
      message.error('加载销售数据失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestionList = async (pageNum = 1, pageSize = 10) => {
    try {
      setLoading(true)
      const params = { pageNum, pageSize }
      if (statusFilter) params.status = statusFilter
      const result = await apiService.getPurchaseSuggestionPage(params)
      if (result?.code === 0 || result?.code === 200) {
        setSuggestionList({
          list: result.data?.records || [],
          total: result.data?.total || 0,
        })
        setPagination({ pageNum, pageSize })
      }
    } catch (error) {
      message.error('加载采购建议列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (values) => {
    try {
      setLoading(true)
      const params = {
        forecastDays: values.forecastDays,
        safetyStockDays: values.safetyStockDays,
        shopId: values.shopId || 'SHOP001',
        shopName: values.shopName || '默认门店',
        generateType: 2,
        remark: values.remark,
      }
      const result = await apiService.generatePurchaseSuggestion(params)
      if (result?.code === 0 || result?.code === 200) {
        message.success('采购建议单生成成功')
        setGenerateModalVisible(false)
        generateForm.resetFields()
        loadSuggestionList(pagination.pageNum, pagination.pageSize)
        loadOverview()
      }
    } catch (error) {
      message.error('生成采购建议单失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (suggestion) => {
    try {
      setLoading(true)
      const result = await apiService.getPurchaseSuggestionDetail(suggestion.id)
      if (result?.code === 0 || result?.code === 200) {
        setSelectedSuggestion(result.data.suggestion)
        setSelectedItems(result.data.items || [])
        setDetailModalVisible(true)
      }
    } catch (error) {
      message.error('加载详情失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (values) => {
    try {
      setLoading(true)
      const confirmData = {
        suggestionId: selectedSuggestion.id,
        confirmRemark: values.confirmRemark,
        items: selectedItems.map(item => ({
          itemId: item.id,
          productId: item.productId,
          confirmedQuantity: item.confirmedQuantity,
          confirmedAmount: item.confirmedAmount,
          remark: item.remark,
        })),
      }
      const result = await apiService.confirmPurchaseSuggestion(confirmData)
      if (result?.code === 0 || result?.code === 200) {
        message.success('确认成功')
        setConfirmModalVisible(false)
        confirmForm.resetFields()
        loadSuggestionList(pagination.pageNum, pagination.pageSize)
      }
    } catch (error) {
      message.error('确认失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (values) => {
    try {
      setLoading(true)
      const result = await apiService.rejectPurchaseSuggestion(selectedSuggestion.id, values.rejectReason)
      if (result?.code === 0 || result?.code === 200) {
        message.success('已驳回')
        setRejectModalVisible(false)
        loadSuggestionList(pagination.pageNum, pagination.pageSize)
      }
    } catch (error) {
      message.error('驳回失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePushErp = async (suggestion) => {
    Modal.confirm({
      title: '确认推送ERP',
      content: `确认将采购建议单「${suggestion.suggestionNo}」推送到ERP？`,
      onOk: async () => {
        try {
          setLoading(true)
          const result = await apiService.pushPurchaseSuggestionToErp(suggestion.id)
          if (result?.code === 0 || result?.code === 200) {
            message.success('推送成功')
            loadSuggestionList(pagination.pageNum, pagination.pageSize)
          }
        } catch (error) {
          message.error('推送失败: ' + error.message)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleGenerateOrder = async (suggestion) => {
    Modal.confirm({
      title: '确认生成采购订单',
      content: `确认将采购建议单「${suggestion.suggestionNo}」生成采购订单？`,
      onOk: async () => {
        try {
          setLoading(true)
          const result = await apiService.generatePurchaseOrder(suggestion.id)
          if (result?.code === 0 || result?.code === 200) {
            message.success('采购订单生成成功')
            loadSuggestionList(pagination.pageNum, pagination.pageSize)
          }
        } catch (error) {
          message.error('生成采购订单失败: ' + error.message)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleItemQuantityChange = (itemId, value, record) => {
    const newItems = selectedItems.map(item => {
      if (item.id === itemId) {
        const newQty = value || 0
        const newAmount = Number((newQty * (record.purchasePrice || 0)).toFixed(2))
        return { ...item, confirmedQuantity: newQty, confirmedAmount: newAmount }
      }
      return item
    })
    setSelectedItems(newItems)
  }

  const openConfirmModal = (suggestion) => {
    setSelectedSuggestion(suggestion)
    apiService.getPurchaseSuggestionItems(suggestion.id).then(result => {
      if (result?.code === 0 || result?.code === 200) {
        setSelectedItems(result.data || [])
        confirmForm.resetFields()
        setConfirmModalVisible(true)
      }
    })
  }

  const openRejectModal = (suggestion) => {
    setSelectedSuggestion(suggestion)
    setRejectModalVisible(true)
  }

  const columns = [
    {
      title: '建议单号',
      dataIndex: 'suggestionNo',
      width: 180,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '门店',
      dataIndex: 'shopName',
      width: 120,
    },
    {
      title: '预测周期',
      dataIndex: 'forecastDays',
      width: 100,
      render: (days) => `${days}天`,
    },
    {
      title: '建议采购数量',
      dataIndex: 'totalSuggestedQuantity',
      width: 130,
      render: (val) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{val}</span>,
    },
    {
      title: '建议采购金额',
      dataIndex: 'totalSuggestedAmount',
      width: 130,
      render: (val) => <span style={{ fontWeight: 'bold' }}>¥{val}</span>,
    },
    {
      title: '确认采购金额',
      dataIndex: 'totalConfirmedAmount',
      width: 130,
      render: (val) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{val}</span>,
    },
    {
      title: '生成类型',
      dataIndex: 'generateType',
      width: 100,
      render: (type) => {
        const info = GENERATE_TYPE_MAP[type] || { color: 'default', text: '未知' }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const info = STATUS_MAP[status] || { color: 'default', text: '未知' }
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
          </Tag>
        )
      },
    },
    {
      title: 'ERP推送状态',
      dataIndex: 'pushErpStatus',
      width: 110,
      render: (status) => {
        const info = PUSH_STATUS_MAP[status] || { color: 'default', text: '未知' }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 10 && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => openConfirmModal(record)}>
                确认
              </Button>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => openRejectModal(record)}>
                驳回
              </Button>
            </>
          )}
          {record.status === 20 && (
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handlePushErp(record)}>
              推送ERP
            </Button>
          )}
          {record.status === 30 && (
            <Button type="link" size="small" icon={<ThunderboltOutlined />} onClick={() => handleGenerateOrder(record)}>
              生成订单
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 160,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 100,
    },
    {
      title: '历史销量',
      dataIndex: 'historicalSalesQuantity',
      width: 100,
    },
    {
      title: '日均销量',
      dataIndex: 'dailyAverageSales',
      width: 100,
      render: (val) => Number(val).toFixed(2),
    },
    {
      title: '预测销量',
      dataIndex: 'forecastSalesQuantity',
      width: 100,
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      width: 100,
    },
    {
      title: '可用库存',
      dataIndex: 'availableStock',
      width: 100,
    },
    {
      title: '安全库存',
      dataIndex: 'safetyStock',
      width: 100,
    },
    {
      title: '建议采购量',
      dataIndex: 'suggestedQuantity',
      width: 110,
      render: (val) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{val}</span>,
    },
    {
      title: '采购单价',
      dataIndex: 'purchasePrice',
      width: 100,
      render: (val) => `¥${val}`,
    },
    {
      title: '建议金额',
      dataIndex: 'suggestedAmount',
      width: 110,
      render: (val) => `¥${val}`,
    },
    {
      title: '确认采购量',
      dataIndex: 'confirmedQuantity',
      width: 130,
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          size="small"
          style={{ width: 100 }}
          onChange={(value) => handleItemQuantityChange(record.id, value, record)}
        />
      ),
    },
    {
      title: '确认金额',
      dataIndex: 'confirmedAmount',
      width: 110,
      render: (val) => <span style={{ fontWeight: 'bold', color: '#52c41a' }}>¥{val}</span>,
    },
  ]

  useEffect(() => {
    loadOverview()
    loadSuggestionList()
  }, [])

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title={
            <Space>
              <ShoppingOutlined />
              供应链预测补货
            </Space>
          }
          extra={
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                onOk={loadOverview}
              />
              <Button icon={<ReloadOutlined />} onClick={() => { loadOverview(); loadSuggestionList() }}>
                刷新
              </Button>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setGenerateModalVisible(true)}
              >
                生成采购建议
              </Button>
            </Space>
          }
        >
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="历史销售数量"
                  value={overviewData?.totalQuantity || 0}
                  prefix={<BarChartOutlined />}
                  suffix="件"
                  valueStyle={{ color: '#1890ff' }}
                />
                <div style={{ color: '#888', fontSize: 12 }}>
                  日均 {overviewData?.dailyAverageQuantity || 0} 件
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="历史销售金额"
                  value={overviewData?.totalAmount || 0}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div style={{ color: '#888', fontSize: 12 }}>
                  日均 ¥{overviewData?.dailyAverageAmount || 0}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="统计周期"
                  value={overviewData?.days || 0}
                  suffix="天"
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
                <div style={{ color: '#888', fontSize: 12 }}>
                  {overviewData?.itemCount || 0} 条销售记录
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待确认建议单"
                  value={suggestionList.list.filter(s => s.status === 10).length}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div style={{ color: '#888', fontSize: 12 }}>
                  共 {suggestionList.total} 条建议单
                </div>
              </Card>
            </Col>
          </Row>

          <Divider orientation="left">采购建议单列表</Divider>

          <Card style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 16 }}>
              <span>状态筛选：</span>
              <Select
                placeholder="全部"
                allowClear
                style={{ width: 150 }}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val)
                  loadSuggestionList(1, pagination.pageSize)
                }}
              >
                <Option value={10}>待确认</Option>
                <Option value={20}>已确认</Option>
                <Option value={30}>已推送ERP</Option>
                <Option value={40}>已生成采购单</Option>
                <Option value={50}>已驳回</Option>
              </Select>
            </Space>

            <Table
              loading={loading}
              columns={columns}
              dataSource={suggestionList.list}
              rowKey="id"
              scroll={{ x: 1400 }}
              pagination={{
                current: pagination.pageNum,
                pageSize: pagination.pageSize,
                total: suggestionList.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => loadSuggestionList(page, pageSize),
              }}
            />
          </Card>
        </Card>

        <Modal
          title="生成采购建议"
          open={generateModalVisible}
          onCancel={() => setGenerateModalVisible(false)}
          footer={null}
          width={500}
        >
          <Form
            form={generateForm}
            layout="vertical"
            onFinish={handleGenerate}
            initialValues={{ forecastDays: 7, safetyStockDays: 3 }}
          >
            <Form.Item
              label="预测天数"
              name="forecastDays"
              rules={[{ required: true, message: '请输入预测天数' }]}
            >
              <InputNumber min={1} max={30} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
            <Form.Item
              label="安全库存天数"
              name="safetyStockDays"
              rules={[{ required: true, message: '请输入安全库存天数' }]}
            >
              <InputNumber min={0} max={15} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
            <Form.Item label="门店ID" name="shopId">
              <Input placeholder="如: SHOP001" />
            </Form.Item>
            <Form.Item label="门店名称" name="shopName">
              <Input placeholder="如: 东门店" />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <TextArea rows={3} placeholder="选填" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  生成建议
                </Button>
                <Button onClick={() => setGenerateModalVisible(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="采购建议单详情"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          width={1000}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
            selectedSuggestion?.status === 10 && (
              <Button key="confirm" type="primary" onClick={() => {
                setDetailModalVisible(false)
                openConfirmModal(selectedSuggestion)
              }}>
                确认建议
              </Button>
            ),
          ]}
        >
          {selectedSuggestion && (
            <>
              <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="建议单号" span={2}>
                  {selectedSuggestion.suggestionNo}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag icon={STATUS_MAP[selectedSuggestion.status]?.icon} color={STATUS_MAP[selectedSuggestion.status]?.color}>
                    {STATUS_MAP[selectedSuggestion.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="门店">{selectedSuggestion.shopName}</Descriptions.Item>
                <Descriptions.Item label="预测周期">{selectedSuggestion.forecastDays}天</Descriptions.Item>
                <Descriptions.Item label="生成类型">
                  {GENERATE_TYPE_MAP[selectedSuggestion.generateType]?.text}
                </Descriptions.Item>
                <Descriptions.Item label="建议采购数量">
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{selectedSuggestion.totalSuggestedQuantity}</span>
                </Descriptions.Item>
                <Descriptions.Item label="建议采购金额">
                  <span style={{ fontWeight: 'bold' }}>¥{selectedSuggestion.totalSuggestedAmount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="确认采购金额">
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>¥{selectedSuggestion.totalConfirmedAmount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="ERP采购建议ID" span={2}>
                  {selectedSuggestion.erpPurchaseSuggestionId || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="ERP采购订单ID">
                  {selectedSuggestion.erpPurchaseOrderId || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="确认备注" span={3}>
                  {selectedSuggestion.confirmRemark || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="备注" span={3}>
                  {selectedSuggestion.remark || '-'}
                </Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">商品明细</Divider>
              <Table
                columns={itemColumns.slice(0, -2)}
                dataSource={selectedItems}
                rowKey="id"
                size="small"
                scroll={{ x: 1200 }}
                pagination={false}
              />
            </>
          )}
        </Modal>

        <Modal
          title="确认采购建议"
          open={confirmModalVisible}
          onCancel={() => setConfirmModalVisible(false)}
          width={1100}
          footer={null}
        >
          <p style={{ color: '#666', marginBottom: 16 }}>
            请确认各商品的采购数量，系统已根据历史销售自动计算，您可以根据实际情况调整。
          </p>
          <Table
            columns={itemColumns}
            dataSource={selectedItems}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={false}
            style={{ marginBottom: 16 }}
          />
          <div style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>
            确认总金额：
            <span style={{ color: '#52c41a', fontSize: 18 }}>
              ¥{selectedItems.reduce((sum, item) => sum + (item.confirmedAmount || 0), 0).toFixed(2)}
            </span>
          </div>
          <Form form={confirmForm} layout="vertical">
            <Form.Item label="确认备注" name="confirmRemark">
              <TextArea rows={2} placeholder="选填，请输入确认备注" />
            </Form.Item>
            <Form.Item>
              <Space style={{ float: 'right' }}>
                <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
                <Button type="primary" onClick={confirmForm.submit} loading={loading}>
                  确认提交
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="驳回采购建议"
          open={rejectModalVisible}
          onCancel={() => setRejectModalVisible(false)}
          footer={null}
          width={500}
        >
          <Form onFinish={handleReject}>
            <Form.Item
              label="驳回原因"
              name="rejectReason"
              rules={[{ required: true, message: '请输入驳回原因' }]}
            >
              <TextArea rows={4} placeholder="请输入驳回原因" />
            </Form.Item>
            <Form.Item>
              <Space style={{ float: 'right' }}>
                <Button onClick={() => setRejectModalVisible(false)}>取消</Button>
                <Button type="primary" danger htmlType="submit" loading={loading}>
                  确认驳回
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default PurchaseSuggestion

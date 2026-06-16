import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message, Popconfirm, InputNumber, Card, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, SyncOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

function ErpSyncTaskPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState([])
  const [configList, setConfigList] = useState([])
  const [loading, setLoading] = useState(false)
  const [executingId, setExecutingId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  useEffect(() => {
    loadConfigList()
    loadData()
  }, [])

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
      const res = await api.request({ url: '/erp/sync-task/list', method: 'get' }, { offlineQueue: false })
      setData(res.data || [])
    } catch (error) {
      console.error('加载同步任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      taskType: 'CRON',
      syncDirection: 'REQUEST',
      status: true,
      fixedInterval: 60,
    })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      status: record.status === 1,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.request({ url: `/erp/sync-task/${id}`, method: 'delete' })
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleExecute = async (record) => {
    setExecutingId(record.id)
    try {
      await api.request({ url: `/erp/sync-task/${record.id}/execute`, method: 'post' }, { offlineQueue: false })
      message.success('任务已触发执行')
    } catch (error) {
      message.error('执行失败：' + error.message)
    } finally {
      setExecutingId(null)
    }
  }

  const handleToggleStatus = async (record, checked) => {
    try {
      await api.request({
        url: `/erp/sync-task/${record.id}/status`,
        method: 'put',
        data: { status: checked ? 1 : 0 },
      })
      message.success(checked ? '任务已启用' : '任务已禁用')
      loadData()
    } catch (error) {
      message.error('状态更新失败：' + error.message)
    }
  }

  const handleRefreshScheduler = async () => {
    setRefreshing(true)
    try {
      await api.request({ url: '/erp/sync-task/refresh-scheduler', method: 'post' }, { offlineQueue: false })
      message.success('调度刷新成功')
      loadData()
    } catch (error) {
      message.error('调度刷新失败：' + error.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        status: values.status ? 1 : 0,
      }
      if (editingRecord) {
        await api.request({ url: `/erp/sync-task/${editingRecord.id}`, method: 'put', data: payload })
        message.success('更新成功')
      } else {
        await api.request({ url: '/erp/sync-task', method: 'post', data: payload })
        message.success('新增成功')
      }
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const taskType = Form.useWatch('taskType', form)

  const getExecuteStatusTag = (status) => {
    const map = {
      IDLE: { color: 'default', text: '空闲' },
      RUNNING: { color: 'blue', text: '运行中' },
      SUCCESS: { color: 'green', text: '成功' },
      FAILED: { color: 'red', text: '失败' },
    }
    const info = map[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName', width: 150 },
    { title: '任务编码', dataIndex: 'taskCode', key: 'taskCode', width: 140 },
    { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 110 },
    {
      title: '调度方式',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: (v, record) => (
        v === 'CRON' ? (
          <Tooltip title={record.cronExpression}><Tag color="purple">Cron</Tag></Tooltip>
        ) : (
          <Tag color="cyan">固定间隔 {record.fixedInterval}s</Tag>
        )
      ),
    },
    {
      title: '同步方向',
      dataIndex: 'syncDirection',
      key: 'syncDirection',
      width: 90,
      render: (v) => v === 'REQUEST' ? <Tag color="cyan">请求</Tag> : <Tag color="purple">响应</Tag>,
    },
    {
      title: '上次执行',
      dataIndex: 'lastExecuteTime',
      key: 'lastExecuteTime',
      width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '下次执行',
      dataIndex: 'nextExecuteTime',
      key: 'nextExecuteTime',
      width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '执行状态',
      dataIndex: 'executeStatus',
      key: 'executeStatus',
      width: 90,
      render: (v) => getExecuteStatusTag(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (v, record) => (
        <Switch checked={v === 1} onChange={(checked) => handleToggleStatus(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            loading={executingId === record.id}
            onClick={() => handleExecute(record)}
          >
            立即执行
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title="同步任务管理"
          extra={
            <Space>
              <Button icon={<SyncOutlined />} onClick={handleRefreshScheduler} loading={refreshing}>刷新调度</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增</Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Modal
          title={editingRecord ? '编辑同步任务' : '新增同步任务'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={650}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item label="ERP配置" name="configId" rules={[{ required: true, message: '请选择ERP配置' }]}>
              <Select placeholder="请选择ERP配置">
                {configList.map((c) => (
                  <Option key={c.id} value={c.id}>{c.configName}</Option>
                ))}
              </Select>
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="任务名称" name="taskName" rules={[{ required: true, message: '请输入任务名称' }]} style={{ flex: 1 }}>
                <Input placeholder="请输入任务名称" />
              </Form.Item>
              <Form.Item label="任务编码" name="taskCode" rules={[{ required: true, message: '请输入任务编码' }]} style={{ flex: 1 }}>
                <Input placeholder="请输入任务编码" disabled={!!editingRecord} />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="业务类型" name="businessType" rules={[{ required: true, message: '请输入业务类型' }]} style={{ flex: 1 }}>
                <Input placeholder="如: PRODUCT / ORDER" />
              </Form.Item>
              <Form.Item label="同步方向" name="syncDirection" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="REQUEST">请求(推送到ERP)</Option>
                  <Option value="RESPONSE">响应(从ERP拉取)</Option>
                </Select>
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="任务类型" name="taskType" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="CRON">Cron表达式</Option>
                  <Option value="FIXED_RATE">固定间隔</Option>
                </Select>
              </Form.Item>
              {taskType === 'CRON' ? (
                <Form.Item label="Cron表达式" name="cronExpression" rules={[{ required: true, message: '请输入Cron表达式' }]} style={{ flex: 1 }}>
                  <Input placeholder="如: 0 0/30 * * * ?" />
                </Form.Item>
              ) : (
                <Form.Item label="间隔时间(秒)" name="fixedInterval" rules={[{ required: true, message: '请输入间隔时间' }]} style={{ flex: 1 }}>
                  <InputNumber style={{ width: '100%' }} min={1} max={86400} />
                </Form.Item>
              )}
            </div>
            <Form.Item label="同步参数(JSON)" name="syncParams">
              <TextArea rows={3} placeholder='如: {"pageSize": 100, "status": "all"}' />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="状态" name="status" valuePropName="checked" style={{ flex: 1 }}>
                <Switch />
              </Form.Item>
            </div>
            <Form.Item label="备注" name="remark">
              <TextArea rows={2} placeholder="请输入备注" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default ErpSyncTaskPage

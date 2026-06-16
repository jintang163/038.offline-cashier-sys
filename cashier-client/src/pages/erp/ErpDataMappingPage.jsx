import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, InputNumber, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'

const { Option } = Select

function ErpDataMappingPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState([])
  const [configList, setConfigList] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [filterConfigId, setFilterConfigId] = useState()
  const [filterMappingType, setFilterMappingType] = useState()

  useEffect(() => {
    loadConfigList()
  }, [])

  useEffect(() => {
    loadData()
  }, [filterConfigId, filterMappingType])

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
      const params = {}
      if (filterConfigId) params.configId = filterConfigId
      if (filterMappingType) params.mappingType = filterMappingType
      const res = await api.request(
        { url: '/erp/data-mapping/list', method: 'get', params },
        { offlineQueue: false }
      )
      setData(res.data || [])
    } catch (error) {
      console.error('加载数据映射失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      status: true,
      sort: data.length + 1,
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
      await api.request({ url: `/erp/data-mapping/${id}`, method: 'delete' })
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        status: values.status ? 1 : 0,
      }
      if (editingRecord) {
        await api.request({ url: `/erp/data-mapping/${editingRecord.id}`, method: 'put', data: payload })
        message.success('更新成功')
      } else {
        await api.request({ url: '/erp/data-mapping', method: 'post', data: payload })
        message.success('新增成功')
      }
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const handleCellChange = (id, field, value) => {
    setData(
      data.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value }
        }
        return item
      })
    )
  }

  const handleBatchSave = async () => {
    setSaving(true)
    try {
      await api.request({
        url: '/erp/data-mapping/batch-save',
        method: 'post',
        data: data,
      })
      message.success('批量保存成功')
      loadData()
    } catch (error) {
      message.error('批量保存失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '映射类型',
      dataIndex: 'mappingType',
      key: 'mappingType',
      width: 150,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record.id, 'mappingType', e.target.value)}
          placeholder="如: ORDER_STATUS"
          size="small"
        />
      ),
    },
    {
      title: '本地值',
      dataIndex: 'localValue',
      key: 'localValue',
      width: 120,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record.id, 'localValue', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '本地值描述',
      dataIndex: 'localValueDesc',
      key: 'localValueDesc',
      width: 140,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record.id, 'localValueDesc', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: 'ERP值',
      dataIndex: 'erpValue',
      key: 'erpValue',
      width: 120,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record.id, 'erpValue', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: 'ERP值描述',
      dataIndex: 'erpValueDesc',
      key: 'erpValueDesc',
      width: 140,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record.id, 'erpValueDesc', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(v) => handleCellChange(record.id, 'sort', v)}
          size="small"
          style={{ width: '100%' }}
          min={0}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v, record) => (
        <Tag
          color={v === 1 ? 'green' : 'red'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleCellChange(record.id, 'status', v === 1 ? 0 : 1)}
        >
          {v === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
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
          title="数据值映射管理"
          extra={
            <Space>
              <Select
                placeholder="选择ERP配置"
                style={{ width: 200 }}
                allowClear
                value={filterConfigId}
                onChange={(v) => setFilterConfigId(v)}
              >
                {configList.map((c) => (
                  <Option key={c.id} value={c.id}>{c.configName}</Option>
                ))}
              </Select>
              <Input
                placeholder="映射类型: 如 ORDER_STATUS"
                style={{ width: 220 }}
                allowClear
                value={filterMappingType}
                onChange={(e) => setFilterMappingType(e.target.value)}
                onPressEnter={loadData}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增</Button>
              <Button icon={<SaveOutlined />} onClick={handleBatchSave} loading={saving}>批量保存</Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>

        <Modal
          title={editingRecord ? '编辑数据映射' : '新增数据映射'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={600}
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
            <Form.Item label="映射类型" name="mappingType" rules={[{ required: true, message: '请输入映射类型' }]}>
              <Input placeholder="如: ORDER_STATUS / PAY_METHOD" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="本地值" name="localValue" rules={[{ required: true, message: '请输入本地值' }]} style={{ flex: 1 }}>
                <Input placeholder="如: 1" />
              </Form.Item>
              <Form.Item label="本地值描述" name="localValueDesc" rules={[{ required: true, message: '请输入本地值描述' }]} style={{ flex: 1 }}>
                <Input placeholder="如: 待支付" />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="ERP值" name="erpValue" rules={[{ required: true, message: '请输入ERP值' }]} style={{ flex: 1 }}>
                <Input placeholder="如: WAIT_PAY" />
              </Form.Item>
              <Form.Item label="ERP值描述" name="erpValueDesc" rules={[{ required: true, message: '请输入ERP值描述' }]} style={{ flex: 1 }}>
                <Input placeholder="如: 待支付" />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="排序" name="sort" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="状态" name="status" valuePropName="checked" style={{ flex: 1 }}>
                <Select>
                  <Option value={1}>启用</Option>
                  <Option value={0}>禁用</Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default ErpDataMappingPage

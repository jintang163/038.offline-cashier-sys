import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message, Popconfirm, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'

const { Option } = Select
const { TextArea } = Input

function ErpInterfaceMappingPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [configList, setConfigList] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [filterConfigId, setFilterConfigId] = useState()
  const [filterSyncDirection, setFilterSyncDirection] = useState()

  useEffect(() => {
    loadConfigList()
    loadData()
  }, [filterConfigId, filterSyncDirection])

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
      if (filterSyncDirection) params.syncDirection = filterSyncDirection
      const res = await api.request({ url: '/erp/interface-mapping/list', method: 'get', params }, { offlineQueue: false })
      setData(res.data || [])
    } catch (error) {
      console.error('加载接口映射失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      httpMethod: 'POST',
      requestContentType: 'application/json',
      syncDirection: 'REQUEST',
      pageEnabled: false,
      status: true,
    })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      pageEnabled: record.pageEnabled === 1,
      status: record.status === 1,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.request({ url: `/erp/interface-mapping/${id}`, method: 'delete' })
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleFieldMapping = (record) => {
    navigate(`/erp/field-mapping?interfaceMappingId=${record.id}&direction=REQUEST`)
  }

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        pageEnabled: values.pageEnabled ? 1 : 0,
        status: values.status ? 1 : 0,
      }
      if (editingRecord) {
        await api.request({ url: `/erp/interface-mapping/${editingRecord.id}`, method: 'put', data: payload })
        message.success('更新成功')
      } else {
        await api.request({ url: '/erp/interface-mapping', method: 'post', data: payload })
        message.success('新增成功')
      }
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const pageEnabled = Form.useWatch('pageEnabled', form)

  const columns = [
    { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 120 },
    { title: '接口名称', dataIndex: 'interfaceName', key: 'interfaceName', width: 150 },
    { title: '接口路径', dataIndex: 'interfacePath', key: 'interfacePath', width: 180, ellipsis: true },
    {
      title: 'HTTP方法',
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      width: 90,
      render: (v) => {
        const colorMap = { GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red' }
        return <Tag color={colorMap[v]}>{v}</Tag>
      },
    },
    {
      title: '同步方向',
      dataIndex: 'syncDirection',
      key: 'syncDirection',
      width: 90,
      render: (v) => v === 'REQUEST' ? <Tag color="cyan">请求</Tag> : <Tag color="purple">响应</Tag>,
    },
    { title: '响应数据路径', dataIndex: 'responseDataPath', key: 'responseDataPath', width: 120, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" icon={<DatabaseOutlined />} onClick={() => handleFieldMapping(record)}>字段映射</Button>
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
          title="接口映射管理"
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
              <Select
                placeholder="同步方向"
                style={{ width: 140 }}
                allowClear
                value={filterSyncDirection}
                onChange={(v) => setFilterSyncDirection(v)}
              >
                <Option value="REQUEST">请求</Option>
                <Option value="RESPONSE">响应</Option>
              </Select>
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
          title={editingRecord ? '编辑接口映射' : '新增接口映射'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={720}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="ERP配置" name="configId" rules={[{ required: true, message: '请选择ERP配置' }]} style={{ flex: 1 }}>
                <Select placeholder="请选择ERP配置">
                  {configList.map((c) => (
                    <Option key={c.id} value={c.id}>{c.configName}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="业务类型" name="businessType" rules={[{ required: true, message: '请输入业务类型' }]} style={{ flex: 1 }}>
                <Input placeholder="如：PRODUCT / ORDER" />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="接口名称" name="interfaceName" rules={[{ required: true, message: '请输入接口名称' }]} style={{ flex: 1 }}>
                <Input placeholder="如：商品查询" />
              </Form.Item>
              <Form.Item label="同步方向" name="syncDirection" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="REQUEST">请求</Option>
                  <Option value="RESPONSE">响应</Option>
                </Select>
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="接口路径" name="interfacePath" rules={[{ required: true, message: '请输入接口路径' }]} style={{ flex: 2 }}>
                <Input placeholder="如：/product/list" />
              </Form.Item>
              <Form.Item label="HTTP方法" name="httpMethod" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>
            </div>
            <Form.Item label="请求Content-Type" name="requestContentType">
              <Select>
                <Option value="application/json">application/json</Option>
                <Option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</Option>
                <Option value="multipart/form-data">multipart/form-data</Option>
              </Select>
            </Form.Item>
            <Form.Item label="请求模板" name="requestTemplate">
              <TextArea rows={3} placeholder="请求体模板，支持占位符如 {fieldName}" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="响应数据路径" name="responseDataPath" style={{ flex: 1 }}>
                <Input placeholder="如：data.list" />
              </Form.Item>
              <Form.Item label="响应码字段" name="responseCodeField" style={{ flex: 1 }}>
                <Input placeholder="如：code" />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="成功响应码" name="responseSuccessCode" style={{ flex: 1 }}>
                <Input placeholder="如：0 / 200" />
              </Form.Item>
              <Form.Item label="响应消息字段" name="responseMessageField" style={{ flex: 1 }}>
                <Input placeholder="如：message" />
              </Form.Item>
            </div>
            <Form.Item label="启用分页" name="pageEnabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            {pageEnabled && (
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item label="分页大小参数名" name="pageSizeParam" style={{ flex: 1 }}>
                  <Input placeholder="如：pageSize / size" />
                </Form.Item>
                <Form.Item label="页码参数名" name="pageNumParam" style={{ flex: 1 }}>
                  <Input placeholder="如：pageNum / page" />
                </Form.Item>
              </div>
            )}
            <Form.Item label="状态" name="status" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default ErpInterfaceMappingPage

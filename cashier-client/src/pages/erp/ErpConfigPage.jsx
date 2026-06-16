import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message, Popconfirm, InputNumber, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'

const { Option } = Select

function ErpConfigPage() {
  const [form] = Form.useForm()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [testingId, setTestingId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.request({ url: '/erp/config/list', method: 'get' }, { offlineQueue: false })
      setData(res.data || [])
    } catch (error) {
      console.error('加载ERP配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshCache = async () => {
    setLoading(true)
    try {
      await api.request({ url: '/erp/config/refresh-cache', method: 'post' }, { offlineQueue: false })
      message.success('缓存刷新成功')
      loadData()
    } catch (error) {
      message.error('缓存刷新失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      erpType: 'YONYOU',
      authType: 'NONE',
      timeout: 30000,
      retryTimes: 3,
      retryInterval: 1000,
      status: true,
      isDefault: false,
    })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      status: record.status === 1,
      isDefault: record.isDefault === 1,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.request({ url: `/erp/config/${id}`, method: 'delete' })
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败：' + error.message)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await api.request({ url: `/erp/config/${id}/set-default`, method: 'post' })
      message.success('已设为默认')
      loadData()
    } catch (error) {
      message.error('设置失败：' + error.message)
    }
  }

  const handleToggleStatus = async (record, checked) => {
    try {
      await api.request({
        url: `/erp/config/${record.id}/status`,
        method: 'put',
        data: { status: checked ? 1 : 0 },
      })
      message.success('状态更新成功')
      loadData()
    } catch (error) {
      message.error('状态更新失败：' + error.message)
    }
  }

  const handleTestConnection = async (record) => {
    setTestingId(record.id)
    try {
      const res = await api.request({ url: `/erp/config/${record.id}/test`, method: 'post' }, { offlineQueue: false })
      if (res.code === 0 || res.code === 200) {
        message.success('连接测试成功')
      } else {
        message.error('连接测试失败：' + (res.message || '未知错误'))
      }
    } catch (error) {
      message.error('连接测试失败：' + error.message)
    } finally {
      setTestingId(null)
    }
  }

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        status: values.status ? 1 : 0,
        isDefault: values.isDefault ? 1 : 0,
      }
      if (editingRecord) {
        await api.request({ url: `/erp/config/${editingRecord.id}`, method: 'put', data: payload })
        message.success('更新成功')
      } else {
        await api.request({ url: '/erp/config', method: 'post', data: payload })
        message.success('新增成功')
      }
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const authType = Form.useWatch('authType', form)

  const columns = [
    { title: '配置编码', dataIndex: 'configCode', key: 'configCode', width: 120 },
    { title: '配置名称', dataIndex: 'configName', key: 'configName', width: 150 },
    {
      title: 'ERP类型',
      dataIndex: 'erpType',
      key: 'erpType',
      width: 100,
      render: (v) => ({ YONYOU: '用友', KINGDEE: '金蝶', GUANJIAIPO: '管家婆', CUSTOM: '自定义' }[v] || v),
    },
    { title: 'Base URL', dataIndex: 'baseUrl', key: 'baseUrl', ellipsis: true },
    {
      title: '认证方式',
      dataIndex: 'authType',
      key: 'authType',
      width: 120,
      render: (v) => ({ NONE: '无认证', BASIC: 'Basic认证', TOKEN: 'Token', APP_KEY_SIGN: 'AppKey签名', OAUTH2: 'OAuth2' }[v] || v),
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 70,
      render: (v) => v === 1 ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v, record) => (
        <Switch checked={v === 1} onChange={(checked) => handleToggleStatus(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            size="small"
            icon={<ExperimentOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTestConnection(record)}
          >
            测试连接
          </Button>
          {record.isDefault !== 1 && (
            <Button size="small" onClick={() => handleSetDefault(record.id)}>设为默认</Button>
          )}
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
          title="ERP系统配置管理"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefreshCache} loading={loading}>刷新缓存</Button>
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
          title={editingRecord ? '编辑ERP配置' : '新增ERP配置'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={700}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="配置编码" name="configCode" rules={[{ required: true, message: '请输入配置编码' }]} style={{ flex: 1 }}>
                <Input placeholder="请输入配置编码" disabled={!!editingRecord} />
              </Form.Item>
              <Form.Item label="配置名称" name="configName" rules={[{ required: true, message: '请输入配置名称' }]} style={{ flex: 1 }}>
                <Input placeholder="请输入配置名称" />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="ERP类型" name="erpType" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="YONYOU">用友</Option>
                  <Option value="KINGDEE">金蝶</Option>
                  <Option value="GUANJIAIPO">管家婆</Option>
                  <Option value="CUSTOM">自定义</Option>
                </Select>
              </Form.Item>
              <Form.Item label="认证方式" name="authType" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select>
                  <Option value="NONE">无认证</Option>
                  <Option value="BASIC">Basic认证</Option>
                  <Option value="TOKEN">Token</Option>
                  <Option value="APP_KEY_SIGN">AppKey签名</Option>
                  <Option value="OAUTH2">OAuth2</Option>
                </Select>
              </Form.Item>
            </div>
            <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true, message: '请输入Base URL' }]}>
              <Input placeholder="https://erp.example.com/api" />
            </Form.Item>

            {authType === 'BASIC' && (
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item label="用户名" name="username" style={{ flex: 1 }}>
                  <Input placeholder="请输入用户名" />
                </Form.Item>
                <Form.Item label="密码" name="password" style={{ flex: 1 }}>
                  <Input.Password placeholder="请输入密码" />
                </Form.Item>
              </div>
            )}

            {authType === 'TOKEN' && (
              <Form.Item label="Token" name="token">
                <Input.Password placeholder="请输入Token" />
              </Form.Item>
            )}

            {(authType === 'APP_KEY_SIGN' || authType === 'OAUTH2') && (
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item label="AppKey" name="appKey" style={{ flex: 1 }}>
                  <Input placeholder="请输入AppKey" />
                </Form.Item>
                <Form.Item label="AppSecret" name="appSecret" style={{ flex: 1 }}>
                  <Input.Password placeholder="请输入AppSecret" />
                </Form.Item>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="超时时间(ms)" name="timeout" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} min={1000} max={300000} />
              </Form.Item>
              <Form.Item label="重试次数" name="retryTimes" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} min={0} max={10} />
              </Form.Item>
              <Form.Item label="重试间隔(ms)" name="retryInterval" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} min={0} max={60000} />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="设为默认" name="isDefault" valuePropName="checked" style={{ flex: 1 }}>
                <Switch />
              </Form.Item>
              <Form.Item label="状态" name="status" valuePropName="checked" style={{ flex: 1 }}>
                <Switch />
              </Form.Item>
            </div>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="请输入备注" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default ErpConfigPage

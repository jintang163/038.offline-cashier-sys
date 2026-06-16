import React, { useState, useEffect } from 'react'
import { Form, Input, Select, Switch, Button, Tag, Space, message, Card, Row, Col, Descriptions, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'
import dayjs from 'dayjs'

const { Option } = Select

const SYNC_FIELDS_OPTIONS = [
  { label: '商品名称', value: 'name' },
  { label: '条码', value: 'barcode' },
  { label: '价格', value: 'price' },
  { label: '库存', value: 'stock' },
  { label: '分类', value: 'category' },
  { label: '单位', value: 'unit' },
  { label: '规格', value: 'spec' },
  { label: '状态', value: 'status' },
  { label: '描述', value: 'description' },
]

function ErpProductSyncStrategyPage() {
  const [fullForm] = Form.useForm()
  const [incrementalForm] = Form.useForm()
  const [configList, setConfigList] = useState([])
  const [selectedConfigId, setSelectedConfigId] = useState()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [strategy, setStrategy] = useState(null)

  useEffect(() => {
    loadConfigList()
  }, [])

  useEffect(() => {
    if (selectedConfigId) {
      loadStrategy()
    }
  }, [selectedConfigId])

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

  const loadStrategy = async () => {
    setLoading(true)
    try {
      const res = await api.request(
        { url: `/erp/product-sync-strategy/${selectedConfigId}`, method: 'get' },
        { offlineQueue: false }
      )
      const data = res.data || {}
      setStrategy(data)
      fullForm.setFieldsValue({
        fullEnabled: data.fullEnabled === 1,
        fullCronExpression: data.fullCronExpression,
        fullSyncFields: data.fullSyncFields ? data.fullSyncFields.split(',') : [],
      })
      incrementalForm.setFieldsValue({
        incrementalEnabled: data.incrementalEnabled === 1,
        incrementalFixedInterval: data.incrementalFixedInterval,
        incrementalField: data.incrementalField || 'updateTime',
        incrementalSyncFields: data.incrementalSyncFields ? data.incrementalSyncFields.split(',') : [],
      })
    } catch (error) {
      console.error('加载商品同步策略失败:', error)
      fullForm.resetFields()
      incrementalForm.resetFields()
      fullForm.setFieldsValue({ fullSyncFields: [], incrementalSyncFields: [] })
      incrementalForm.setFieldsValue({ incrementalSyncFields: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFull = async (values) => {
    setSaving(true)
    try {
      const payload = {
        configId: selectedConfigId,
        fullEnabled: values.fullEnabled ? 1 : 0,
        fullCronExpression: values.fullCronExpression,
        fullSyncFields: (values.fullSyncFields || []).join(','),
      }
      await api.request({
        url: '/erp/product-sync-strategy/full',
        method: 'put',
        data: payload,
      })
      message.success('全量同步配置保存成功')
      loadStrategy()
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIncremental = async (values) => {
    setSaving(true)
    try {
      const payload = {
        configId: selectedConfigId,
        incrementalEnabled: values.incrementalEnabled ? 1 : 0,
        incrementalFixedInterval: values.incrementalFixedInterval,
        incrementalField: values.incrementalField,
        incrementalSyncFields: (values.incrementalSyncFields || []).join(','),
      }
      await api.request({
        url: '/erp/product-sync-strategy/incremental',
        method: 'put',
        data: payload,
      })
      message.success('增量同步配置保存成功')
      loadStrategy()
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title="商品同步策略"
          extra={
            <Select
              placeholder="选择ERP配置"
              style={{ width: 240 }}
              value={selectedConfigId}
              onChange={(v) => setSelectedConfigId(v)}
            >
              {configList.map((c) => (
                <Option key={c.id} value={c.id}>{c.configName}</Option>
              ))}
            </Select>
          }
        >
          {!selectedConfigId ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>请先选择ERP配置</div>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <span>全量同步配置</span>
                      {strategy?.fullEnabled === 1 && <Tag color="green">已启用</Tag>}
                    </Space>
                  }
                  loading={loading}
                >
                  {strategy && (
                    <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="上次全量同步">
                        {strategy.fullLastSyncTime
                          ? dayjs(strategy.fullLastSyncTime).format('YYYY-MM-DD HH:mm:ss')
                          : '从未同步'}
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                  <Divider style={{ margin: '8px 0 16px 0' }} />
                  <Form form={fullForm} layout="vertical" onFinish={handleSaveFull}>
                    <Form.Item label="启用全量同步" name="fullEnabled" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item label="Cron表达式" name="fullCronExpression" rules={[{ required: fullForm.getFieldValue('fullEnabled'), message: '请输入Cron表达式' }]}>
                      <Input placeholder="如: 0 0 2 * * ? (每天凌晨2点)" />
                    </Form.Item>
                    <Form.Item label="同步字段" name="fullSyncFields" rules={[{ required: fullForm.getFieldValue('fullEnabled'), message: '请选择同步字段' }]}>
                      <Select mode="multiple" placeholder="请选择需要同步的字段" optionFilterProp="label">
                        {SYNC_FIELDS_OPTIONS.map((f) => (
                          <Option key={f.value} value={f.value} label={f.label}>{f.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                        保存全量配置
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <span>增量同步配置</span>
                      {strategy?.incrementalEnabled === 1 && <Tag color="green">已启用</Tag>}
                    </Space>
                  }
                  loading={loading}
                >
                  {strategy && (
                    <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="上次增量同步">
                        {strategy.incrementalLastSyncTime
                          ? dayjs(strategy.incrementalLastSyncTime).format('YYYY-MM-DD HH:mm:ss')
                          : '从未同步'}
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                  <Divider style={{ margin: '8px 0 16px 0' }} />
                  <Form form={incrementalForm} layout="vertical" onFinish={handleSaveIncremental}>
                    <Form.Item label="启用增量同步" name="incrementalEnabled" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item label="同步间隔(分钟)" name="incrementalFixedInterval" rules={[{ required: incrementalForm.getFieldValue('incrementalEnabled'), message: '请输入同步间隔' }]}>
                      <Input style={{ width: '100%' }} placeholder="如: 30 (每30分钟)" />
                    </Form.Item>
                    <Form.Item label="增量字段" name="incrementalField" rules={[{ required: incrementalForm.getFieldValue('incrementalEnabled'), message: '请选择增量字段' }]}>
                      <Select>
                        <Option value="updateTime">更新时间 (updateTime)</Option>
                        <Option value="createTime">创建时间 (createTime)</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label="同步字段" name="incrementalSyncFields" rules={[{ required: incrementalForm.getFieldValue('incrementalEnabled'), message: '请选择同步字段' }]}>
                      <Select mode="multiple" placeholder="请选择需要同步的字段" optionFilterProp="label">
                        {SYNC_FIELDS_OPTIONS.map((f) => (
                          <Option key={f.value} value={f.value} label={f.label}>{f.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                        保存增量配置
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}

export default ErpProductSyncStrategyPage

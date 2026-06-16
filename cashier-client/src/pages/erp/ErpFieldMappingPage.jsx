import React, { useState, useEffect } from 'react'
import { Table, Button, Input, Select, Tag, Space, message, Card, Alert, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, HolderOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api/request'

const { Option } = Select

const FIELD_TYPES = ['STRING', 'NUMBER', 'DATE', 'BOOLEAN', 'OBJECT', 'ARRAY']
const TRANSFORM_FUNCTIONS = [
  { name: 'formatDate', desc: '格式化日期: formatDate(value, "YYYY-MM-DD")' },
  { name: 'substring', desc: '截取字符串: substring(value, 0, 10)' },
  { name: 'concat', desc: '拼接字符串: concat("prefix_", value)' },
  { name: 'toNumber', desc: '转数字: toNumber(value)' },
  { name: 'multiply', desc: '乘法: multiply(value, 100)' },
  { name: 'round', desc: '四舍五入: round(value, 2)' },
  { name: 'trim', desc: '去空格: trim(value)' },
  { name: 'lowerCase', desc: '转小写: lowerCase(value)' },
  { name: 'upperCase', desc: '转大写: upperCase(value)' },
]

function ErpFieldMappingPage() {
  const [searchParams] = useSearchParams()
  const interfaceMappingId = searchParams.get('interfaceMappingId')
  const direction = searchParams.get('direction') || 'REQUEST'

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [interfaceInfo, setInterfaceInfo] = useState(null)

  useEffect(() => {
    if (interfaceMappingId) {
      loadInterfaceInfo()
      loadData()
    }
  }, [interfaceMappingId, direction])

  const loadInterfaceInfo = async () => {
    try {
      const res = await api.request(
        { url: `/erp/interface-mapping/${interfaceMappingId}`, method: 'get' },
        { offlineQueue: false }
      )
      setInterfaceInfo(res.data)
    } catch (error) {
      console.error('加载接口信息失败:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.request(
        {
          url: '/erp/field-mapping/list',
          method: 'get',
          params: { interfaceMappingId, direction },
        },
        { offlineQueue: false }
      )
      setData((res.data || []).map((item, idx) => ({ ...item, _key: item.id || `new_${idx}` })))
    } catch (error) {
      console.error('加载字段映射失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRow = () => {
    const newRow = {
      _key: `new_${Date.now()}`,
      id: null,
      sort: data.length + 1,
      localField: '',
      localFieldType: 'STRING',
      erpField: '',
      erpFieldType: 'STRING',
      transformExpression: '',
      defaultValue: '',
      isRequired: 0,
      status: 1,
    }
    setData([...data, newRow])
  }

  const handleDeleteRow = (key) => {
    setData(data.filter((item) => item._key !== key))
  }

  const handleCellChange = (key, field, value) => {
    setData(
      data.map((item) => {
        if (item._key === key) {
          return { ...item, [field]: value }
        }
        return item
      })
    )
  }

  const handleDragStart = (index) => (e) => {
    e.dataTransfer.setData('text/plain', index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (targetIndex) => (e) => {
    e.preventDefault()
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (sourceIndex === targetIndex) return
    const newData = [...data]
    const [moved] = newData.splice(sourceIndex, 1)
    newData.splice(targetIndex, 0, moved)
    newData.forEach((item, idx) => {
      item.sort = idx + 1
    })
    setData(newData)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = data.map((item, idx) => ({
        ...item,
        sort: idx + 1,
        interfaceMappingId: Number(interfaceMappingId),
        direction,
      }))
      await api.request({
        url: '/erp/field-mapping/batch-save',
        method: 'post',
        data: payload,
      })
      message.success('保存成功')
      loadData()
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <span
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver}
          onDrop={handleDrop(index)}
          style={{ cursor: 'move', display: 'inline-block', width: '100%' }}
        >
          <HolderOutlined />
        </span>
      ),
    },
    {
      title: '本地字段',
      dataIndex: 'localField',
      key: 'localField',
      width: 180,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record._key, 'localField', e.target.value)}
          placeholder="如: productName"
          size="small"
        />
      ),
    },
    {
      title: '本地字段类型',
      dataIndex: 'localFieldType',
      key: 'localFieldType',
      width: 120,
      render: (value, record) => (
        <Select
          value={value}
          onChange={(v) => handleCellChange(record._key, 'localFieldType', v)}
          size="small"
          style={{ width: '100%' }}
        >
          {FIELD_TYPES.map((t) => (
            <Option key={t} value={t}>{t}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'ERP字段',
      dataIndex: 'erpField',
      key: 'erpField',
      width: 180,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record._key, 'erpField', e.target.value)}
          placeholder="如: goods_name"
          size="small"
        />
      ),
    },
    {
      title: 'ERP字段类型',
      dataIndex: 'erpFieldType',
      key: 'erpFieldType',
      width: 120,
      render: (value, record) => (
        <Select
          value={value}
          onChange={(v) => handleCellChange(record._key, 'erpFieldType', v)}
          size="small"
          style={{ width: '100%' }}
        >
          {FIELD_TYPES.map((t) => (
            <Option key={t} value={t}>{t}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: '转换表达式',
      dataIndex: 'transformExpression',
      key: 'transformExpression',
      width: 200,
      render: (value, record) => (
        <Tooltip
          title={
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>可用函数:</div>
              {TRANSFORM_FUNCTIONS.map((f) => (
                <div key={f.name} style={{ marginBottom: 4 }}>
                  <Tag color="blue">{f.name}</Tag> {f.desc}
                </div>
              ))}
            </div>
          }
        >
          <Input
            value={value}
            onChange={(e) => handleCellChange(record._key, 'transformExpression', e.target.value)}
            placeholder="如: formatDate(value, 'YYYY-MM-DD')"
            size="small"
          />
        </Tooltip>
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleCellChange(record._key, 'defaultValue', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 70,
      align: 'center',
      render: (value, record) => (
        <Tag
          color={value === 1 ? 'red' : 'default'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleCellChange(record._key, 'isRequired', value === 1 ? 0 : 1)}
        >
          {value === 1 ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      align: 'center',
      render: (value, record) => (
        <Tag
          color={value === 1 ? 'green' : 'red'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleCellChange(record._key, 'status', value === 1 ? 0 : 1)}
        >
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRow(record._key)}
        />
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Card
          title={
            <Space>
              <span>字段映射管理</span>
              {interfaceInfo && (
                <>
                  <Tag color="blue">{interfaceInfo.interfaceName}</Tag>
                  <Tag color={direction === 'REQUEST' ? 'cyan' : 'purple'}>
                    {direction === 'REQUEST' ? '请求方向' : '响应方向'}
                  </Tag>
                </>
              )}
            </Space>
          }
          extra={
            <Space>
              <Button icon={<PlusOutlined />} onClick={handleAddRow}>新增行</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                批量保存
              </Button>
            </Space>
          }
        >
          <Alert
            message="提示：拖拽第一列的图标可调整字段顺序；点击必填/状态标签可快速切换；转换表达式支持 formatDate, substring, concat, toNumber, multiply, round 等函数"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            rowKey="_key"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </AppLayout>
  )
}

export default ErpFieldMappingPage

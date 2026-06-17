import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Descriptions,
  Tag,
  Space,
  Row,
  Col,
  Typography,
} from 'antd'
import {
  WarningOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  WifiOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import fraudDetectionService from '../services/fraudDetectionService'
import { useOnlineStatus } from '../hooks/useNetwork'

const { Title, Text } = Typography

const RISK_LEVEL_MAP = {
  1: { color: 'orange', text: '低风险' },
  2: { color: 'warning', text: '中风险' },
  3: { color: 'error', text: '高风险' },
}

const OPERATION_TYPE_MAP = {
  REFUND: { color: 'orange', text: '退款操作' },
  DISCOUNT: { color: 'blue', text: '折扣操作' },
}

export default function OperationLockModal({
  visible,
  lockData,
  onClose,
  onVerified,
}) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (visible) {
      form.resetFields()
      setVerifySuccess(false)
    }
  }, [visible, form])

  const handleVerify = async (values) => {
    if (!lockData) return

    if (!isOnline) {
      return
    }

    setLoading(true)
    try {
      const result = await fraudDetectionService.verifyLock(
        lockData.id,
        {
          username: values.managerUsername,
          password: values.managerPassword,
        },
        values.verifyRemark || ''
      )

      if (result.success) {
        setVerifySuccess(true)
        setTimeout(() => {
          onVerified && onVerified(result.data)
        }, 1500)
      } else {
        Modal.error({
          title: '验证失败',
          content: result.error || '管理员验证失败，请检查账号密码',
        })
      }
    } catch (error) {
      console.error('验证失败:', error)
      Modal.error({
        title: '验证失败',
        content: error.message || '验证过程中发生错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (lockData && !verifySuccess) {
      try {
        await fraudDetectionService.cancelLock(lockData.id)
      } catch (e) {
        console.warn('取消锁定记录失败:', e)
      }
    }
    onClose && onClose()
  }

  if (!lockData) return null

  const riskLevel = RISK_LEVEL_MAP[lockData.risk_level] || RISK_LEVEL_MAP[1]
  const operationType = OPERATION_TYPE_MAP[lockData.operation_type] || {
    color: 'default',
    text: lockData.operation_type,
  }

  let lockDetails = {}
  try {
    lockDetails =
      typeof lockData.lock_details === 'string'
        ? JSON.parse(lockData.lock_details)
        : lockData.lock_details || {}
  } catch (e) {
    console.warn('解析锁定详情失败:', e)
  }

  return (
    <Modal
      title={
        <Space>
          <LockOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
          <span style={{ color: '#ff4d4f' }}>操作已锁定 - AI反欺诈监测</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={680}
      maskClosable={false}
      closable={!verifySuccess}
      keyboard={false}
    >
      {verifySuccess ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <UnlockOutlined
            style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }}
          />
          <Title level={3} style={{ color: '#52c41a', margin: 0 }}>
            验证通过
          </Title>
          <Text type="secondary" style={{ fontSize: 16, marginTop: 8 }}>
            操作已解锁，请继续...
          </Text>
        </div>
      ) : (
        <>
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message={
              <Space>
                <Tag color={riskLevel.color}>{riskLevel.text}</Tag>
                <Tag color={operationType.color}>{operationType.text}</Tag>
                {lockData.is_offline ? (
                  <Tag icon={<CloseCircleOutlined />} color="default">
                    离线触发
                  </Tag>
                ) : (
                  <Tag icon={<WifiOutlined />} color="green">
                    在线触发
                  </Tag>
                )}
              </Space>
            }
            description={lockData.lock_reason}
            style={{ marginBottom: 16 }}
          />

          <Descriptions
            column={2}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="锁定编号">
              {lockData.lock_no}
            </Descriptions.Item>
            <Descriptions.Item label="触发时间">
              {lockData.created_at}
            </Descriptions.Item>
            <Descriptions.Item label="触发规则">
              {lockData.trigger_rule}
            </Descriptions.Item>
            <Descriptions.Item label="操作收银员">
              {lockData.cashier_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="设备编号" span={2}>
              {lockData.device_no || '-'}
            </Descriptions.Item>
          </Descriptions>

          {lockDetails.triggeredRules &&
            lockDetails.triggeredRules.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  触发的规则详情：
                </Text>
                {lockDetails.triggeredRules.map((rule, index) => (
                  <Alert
                    key={index}
                    type="warning"
                    showIcon
                    message={rule.rule_name}
                    description={`当前值: ${rule.current_value}, 阈值: ${rule.threshold}`}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </div>
            )}

          {!isOnline ? (
            <Alert
              type="warning"
              showIcon
              icon={<CloseCircleOutlined />}
              message="当前处于离线状态"
              description="请先连接网络，然后进行联网验证解锁操作"
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              icon={<SafetyOutlined />}
              message="需要联网验证"
              description="为了确保操作安全，请联系管理员进行联网身份验证"
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleVerify}
            style={{ marginTop: 20 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="管理员账号"
                  name="managerUsername"
                  rules={[
                    { required: true, message: '请输入管理员账号' },
                  ]}
                >
                  <Input
                    placeholder="请输入管理员用户名"
                    autoComplete="username"
                    disabled={!isOnline}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="管理员密码"
                  name="managerPassword"
                  rules={[
                    { required: true, message: '请输入管理员密码' },
                  ]}
                >
                  <Input.Password
                    placeholder="请输入管理员密码"
                    autoComplete="current-password"
                    disabled={!isOnline}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="验证备注" name="verifyRemark">
              <Input.TextArea
                rows={2}
                placeholder="请输入验证备注说明（选填）"
                maxLength={200}
                disabled={!isOnline}
              />
            </Form.Item>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={handleCancel} disabled={loading}>
                  取消操作
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!isOnline}
                  icon={<UnlockOutlined />}
                >
                  验证并解锁
                </Button>
              </Space>
            </div>
          </Form>
        </>
      )}
    </Modal>
  )
}

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Checkbox, message } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import apiService from '../api/request'
import { setToken, setUserInfo, getRemember, setRemember } from '../utils/auth'

function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [remember, setRememberState] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const rememberData = getRemember()
    if (rememberData.remember) {
      setRememberState(true)
      form.setFieldsValue({
        username: rememberData.username,
        password: rememberData.password,
        remember: true,
      })
    }
  }, [form])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await apiService.login(values.username, values.password)
      const { token, userInfo } = res.data || res

      setToken(token)
      setUserInfo(userInfo)

      if (values.remember) {
        setRemember(true, values.username, values.password)
      } else {
        setRemember(false, '', '')
      }

      message.success('登录成功')
      navigate('/cashier', { replace: true })
    } catch (error) {
      if (!error.response) {
        if (values.username === 'admin' && values.password === '123456') {
          const mockToken = 'mock_token_' + Date.now()
          const mockUserInfo = {
            id: 1,
            name: '管理员',
            username: values.username,
            role: 'admin',
          }
          setToken(mockToken)
          setUserInfo(mockUserInfo)

          if (values.remember) {
            setRemember(true, values.username, values.password)
          } else {
            setRemember(false, '', '')
          }

          message.success('登录成功（离线模式）')
          navigate('/cashier', { replace: true })
        } else {
          message.error('用户名或密码错误')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-decoration">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">🏪</span>
          </div>
          <h1 className="login-title">{import.meta.env.VITE_APP_TITLE || '离线收银系统'}</h1>
          <p className="login-subtitle">欢迎使用，请登录您的账号</p>
        </div>
        <Form
          form={form}
          name="login"
          initialValues={{ remember: false }}
          onFinish={onFinish}
          size="large"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined className="input-icon" />}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox onChange={(e) => setRememberState(e.target.checked)}>
              记住密码
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              icon={<LoginOutlined />}
              className="login-btn"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        <div className="login-footer">
          <p className="tip-text">
            默认账号：<span className="highlight">admin</span> / <span className="highlight">123456</span>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Login

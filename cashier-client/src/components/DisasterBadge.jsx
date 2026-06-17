import React, { useState, useEffect } from 'react'
import { Tag, Tooltip, Badge, Dropdown, Menu, Button, message, Modal } from 'antd'
import { SafetyOutlined, WarningOutlined, CheckCircleOutlined, DisconnectOutlined, LogoutOutlined } from '@ant-design/icons'
import disasterService from '../services/disasterService'
import { clearAuth } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

export default function DisasterBadge() {
  const navigate = useNavigate()
  const [isDisasterMode, setIsDisasterMode] = useState(false)
  const [mainDeviceOnline, setMainDeviceOnline] = useState(null)
  const [disasterInfo, setDisasterInfo] = useState(null)
  const [onlineDeviceCount, setOnlineDeviceCount] = useState(0)

  useEffect(() => {
    const checkDisasterMode = () => {
      const mode = disasterService.isDisasterMode()
      const info = disasterService.getDisasterModeInfo()
      setIsDisasterMode(mode)
      setDisasterInfo(info)
    }

    checkDisasterMode()

    const handleModeChange = (active) => {
      setIsDisasterMode(active)
      setDisasterInfo(disasterService.getDisasterModeInfo())
    }

    const handleMainDeviceStatus = (status) => {
      setMainDeviceOnline(status.isOnline)
      setOnlineDeviceCount(status.isOnline ? 2 : 1)
    }

    disasterService.on('disasterModeChange', handleModeChange)
    disasterService.on('mainDeviceStatusChange', handleMainDeviceStatus)

    return () => {
      disasterService.off('disasterModeChange', handleModeChange)
      disasterService.off('mainDeviceStatusChange', handleMainDeviceStatus)
    }
  }, [])

  if (!isDisasterMode) {
    return null
  }

  const handleExitDisasterMode = () => {
    Modal.confirm({
      title: '退出灾备模式',
      content: '确认退出灾备模式吗？退出后需要重新登录。',
      onOk: () => {
        disasterService.exitDisasterMode()
        clearAuth()
        navigate('/login', { replace: true })
        message.success('已退出灾备模式')
      },
    })
  }

  const menu = (
    <Menu>
      <Menu.ItemGroup title="灾备模式信息">
        <Menu.Item disabled>
          <div>
            <div style={{ fontWeight: 500 }}>模式：灾备模式</div>
            <div style={{ color: '#999', fontSize: 12 }}>
              已运行：{disasterInfo?.startTime ? getDurationText(new Date(disasterInfo.startTime)) : '-'}
            </div>
          </div>
        </Menu.Item>
        <Menu.Item disabled>
          <div>
            <div style={{ fontWeight: 500 }}>主设备状态</div>
            <div style={{ fontSize: 12 }}>
              {mainDeviceOnline === true ? (
                <span style={{ color: '#52c41a' }}>● 在线</span>
              ) : mainDeviceOnline === false ? (
                <span style={{ color: '#ff4d4f' }}>● 离线/故障</span>
              ) : (
                <span style={{ color: '#faad14' }}>● 检测中...</span>
              )}
            </div>
          </div>
        </Menu.Item>
        <Menu.Item disabled>
          <div>
            <div style={{ fontWeight: 500 }}>同步数据</div>
            <div style={{ color: '#999', fontSize: 12 }}>最近 {disasterInfo?.dataHours || 1} 小时数据</div>
          </div>
        </Menu.Item>
      </Menu.ItemGroup>
      <Menu.Divider />
      <Menu.Item key="exit" icon={<LogoutOutlined />} onClick={handleExitDisasterMode} danger>
        退出灾备模式
      </Menu.Item>
    </Menu>
  )

  const getDurationText = (startTime) => {
    const ms = Date.now() - startTime.getTime()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  return (
    <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 8px' }}>
        <Tooltip title={mainDeviceOnline === false ? '主收银机离线，当前为灾备模式' : '灾备模式运行中'}>
          <Badge
            status={mainDeviceOnline === false ? 'error' : mainDeviceOnline === true ? 'success' : 'processing'}
            text={
              <Tag
                color="orange"
                icon={<SafetyOutlined />}
                style={{ margin: 0, fontWeight: 500 }}
              >
                灾备模式
              </Tag>
            }
          />
        </Tooltip>
        {mainDeviceOnline === false && (
          <Tooltip title="主收银机已离线，当前设备为备用设备">
            <WarningOutlined style={{ color: '#faad14', marginLeft: 4 }} />
          </Tooltip>
        )}
        {mainDeviceOnline === true && (
          <Tooltip title="主收银机已恢复在线">
            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />
          </Tooltip>
        )}
      </div>
    </Dropdown>
  )
}

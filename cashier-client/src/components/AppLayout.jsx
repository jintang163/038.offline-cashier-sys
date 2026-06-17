import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Badge, Button, Space } from 'antd'
import {
  ShoppingCartOutlined,
  OrderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  WifiOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SwapOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  ProductOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  QrcodeOutlined,
  WarningOutlined,
  BellOutlined,
  AlertOutlined,
  MonitorOutlined,
} from '@ant-design/icons'
import useNetworkStatus from '../hooks/useNetwork'
import DisasterBadge from './DisasterBadge'
import DisasterQrcodeModal from './DisasterQrcodeModal'
import disasterService from '../services/disasterService'
import { clearAuth } from '../utils/auth'

function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useNetworkStatus()
  const [disasterModalVisible, setDisasterModalVisible] = useState(false)
  const isDisasterMode = disasterService.isDisasterMode()

  const menuItems = [
    {
      key: '/cashier',
      icon: <ShoppingCartOutlined />,
      label: '收银台',
      onClick: () => navigate('/cashier'),
    },
    {
      key: '/orders',
      icon: <OrderedListOutlined />,
      label: '订单管理',
      onClick: () => navigate('/orders'),
    },
    {
      key: '/daily-report',
      icon: <BarChartOutlined />,
      label: '营业日报',
      onClick: () => navigate('/daily-report'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'erp',
      icon: <AppstoreOutlined />,
      label: 'ERP对接中心',
      children: [
        {
          key: '/erp/monitor',
          icon: <DashboardOutlined />,
          label: '监控大屏',
          onClick: () => navigate('/erp/monitor'),
        },
        {
          key: '/erp/config',
          icon: <DatabaseOutlined />,
          label: 'ERP配置',
          onClick: () => navigate('/erp/config'),
        },
        {
          key: '/erp/interface-mapping',
          icon: <ApiOutlined />,
          label: '接口映射',
          onClick: () => navigate('/erp/interface-mapping'),
        },
        {
          key: '/erp/field-mapping',
          icon: <SwapOutlined />,
          label: '字段映射',
          onClick: () => navigate('/erp/field-mapping'),
        },
        {
          key: '/erp/data-mapping',
          icon: <SwapOutlined />,
          label: '数据映射',
          onClick: () => navigate('/erp/data-mapping'),
        },
        {
          key: '/erp/sync-log',
          icon: <FileTextOutlined />,
          label: '同步日志',
          onClick: () => navigate('/erp/sync-log'),
        },
        {
          key: '/erp/sync-task',
          icon: <ScheduleOutlined />,
          label: '调度任务',
          onClick: () => navigate('/erp/sync-task'),
        },
        {
          key: '/erp/product-sync-strategy',
          icon: <ProductOutlined />,
          label: '商品同步策略',
          onClick: () => navigate('/erp/product-sync-strategy'),
        },
      ],
    },
    {
      key: 'fraud',
      icon: <AlertOutlined />,
      label: 'AI反欺诈管理',
      children: [
        {
          key: '/fraud/suspicious-stores',
          icon: <WarningOutlined />,
          label: '可疑门店',
          onClick: () => navigate('/fraud/suspicious-stores'),
        },
        {
          key: '/fraud/alerts',
          icon: <BellOutlined />,
          label: '风险告警',
          onClick: () => navigate('/fraud/alerts'),
        },
      ],
    },
    {
      key: '/device-monitor',
      icon: <MonitorOutlined />,
      label: '设备监控中心',
      onClick: () => navigate('/device-monitor'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  function handleLogout() {
    disasterService.exitDisasterMode()
    clearAuth()
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
    navigate('/login', { replace: true })
  }

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="sidebar">
          <div className="logo">
            {isDisasterMode ? (
              <Space>
                <SafetyOutlined style={{ color: '#faad14' }} />
                离线收银系统<span style={{ color: '#faad14', fontSize: 12 }}>灾备</span>
              </Space>
            ) : (
              '离线收银系统'
            )}
          </div>
          <div className="menu">
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
            />
          </div>
        </div>
        <div className="content">
          <div className="header">
            <div className="header-left">
              <Badge status={isOnline ? 'success' : 'error'} text={isOnline ? '在线' : '离线'} />
              <WifiOutlined style={{ color: isOnline ? '#52c41a' : '#ff4d4f' }} />
            </div>
            <div className="header-right">
              <Space>
                <DisasterBadge />
                {!isDisasterMode && (
                  <Button
                    type="text"
                    size="small"
                    icon={<QrcodeOutlined />}
                    onClick={() => setDisasterModalVisible(true)}
                  >
                    灾备二维码
                  </Button>
                )}
                <span>欢迎，{userInfo.name || userInfo.nickname || userInfo.username || '收银员'}</span>
              </Space>
            </div>
          </div>
          <div className="page-content">{children}</div>
        </div>
      </div>

      <DisasterQrcodeModal
        visible={disasterModalVisible}
        onClose={() => setDisasterModalVisible(false)}
      />
    </div>
  )
}

export default AppLayout

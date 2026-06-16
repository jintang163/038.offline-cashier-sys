import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Badge } from 'antd'
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
} from '@ant-design/icons'
import useNetworkStatus from '../hooks/useNetwork'

function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useNetworkStatus()

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
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  function handleLogout() {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
    navigate('/login', { replace: true })
  }

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="sidebar">
          <div className="logo">离线收银系统</div>
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
              <span>欢迎，{userInfo.name || '收银员'}</span>
            </div>
          </div>
          <div className="page-content">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default AppLayout

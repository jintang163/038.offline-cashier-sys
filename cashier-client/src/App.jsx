import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin, Alert } from 'antd'
import Login from './pages/Login'
import DisasterLogin from './pages/DisasterLogin'
import Cashier from './pages/Cashier'
import Orders from './pages/Orders'
import DailyReport from './pages/DailyReport'
import Settings from './pages/Settings'
import InvoiceScan from './pages/InvoiceScan'
import ProtectedRoute from './components/ProtectedRoute'
import DeviceSelfCheckAlert from './components/DeviceSelfCheckAlert'
import db from './utils/db'
import syncService from './services/syncService'
import kitchenPrintService from './services/kitchenPrintService'
import loggerService from './services/loggerService'
import selfCheckService from './services/selfCheckService'
import heartbeatService from './services/heartbeatService'
import ErpConfigPage from './pages/erp/ErpConfigPage'
import ErpInterfaceMappingPage from './pages/erp/ErpInterfaceMappingPage'
import ErpFieldMappingPage from './pages/erp/ErpFieldMappingPage'
import ErpDataMappingPage from './pages/erp/ErpDataMappingPage'
import ErpSyncLogPage from './pages/erp/ErpSyncLogPage'
import ErpSyncTaskPage from './pages/erp/ErpSyncTaskPage'
import ErpProductSyncStrategyPage from './pages/erp/ErpProductSyncStrategyPage'
import ErpMonitorDashboard from './pages/erp/ErpMonitorDashboard'
import SuspiciousStores from './pages/fraud/SuspiciousStores'
import FraudAlerts from './pages/fraud/FraudAlerts'

function App() {
  const [dbInit, setDbInit] = useState(false)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init()
        setDbInit(true)
        kitchenPrintService.init()

        loggerService.info('App', 'Application initializing')

        heartbeatService.start(30000)
        loggerService.info('App', 'Heartbeat service started')

        selfCheckService.startAutoCheck(5 * 60 * 1000)
        loggerService.info('App', 'Self-check service started')

        loggerService.startAutoUpload()
        loggerService.info('App', 'Auto log upload started')

        if (navigator.onLine) {
          try {
            await syncService.fullSync()
          } catch (e) {
            loggerService.warn('App', 'Initial sync failed', { error: e.message })
          }
        }

        loggerService.info('App', 'Application initialized successfully')
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setDbError(error.message)
      }
    }

    initApp()

    return () => {
      heartbeatService.stop()
      selfCheckService.stopAutoCheck()
      loggerService.stopAutoUpload()
    }
  }, [])

  if (dbError) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '100px auto' }}>
        <Alert
          type="error"
          showIcon
          message="数据库初始化失败"
          description={dbError}
        />
      </div>
    )
  }

  if (!dbInit) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="正在初始化数据库..." />
      </div>
    )
  }

  return (
    <>
      <DeviceSelfCheckAlert />
      <Routes>
        <Route path="/login" element={<Login />} />
      <Route path="/disaster-login" element={<DisasterLogin />} />
      <Route
        path="/invoice/scan"
        element={<InvoiceScan />}
      />
      <Route
        path="/cashier"
        element={
          <ProtectedRoute>
            <Cashier />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-report"
        element={
          <ProtectedRoute>
            <DailyReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/config"
        element={
          <ProtectedRoute>
            <ErpConfigPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/interface-mapping"
        element={
          <ProtectedRoute>
            <ErpInterfaceMappingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/field-mapping"
        element={
          <ProtectedRoute>
            <ErpFieldMappingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/data-mapping"
        element={
          <ProtectedRoute>
            <ErpDataMappingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/sync-log"
        element={
          <ProtectedRoute>
            <ErpSyncLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/sync-task"
        element={
          <ProtectedRoute>
            <ErpSyncTaskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/product-sync-strategy"
        element={
          <ProtectedRoute>
            <ErpProductSyncStrategyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/monitor"
        element={
          <ProtectedRoute>
            <ErpMonitorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fraud/suspicious-stores"
        element={
          <ProtectedRoute>
            <SuspiciousStores />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fraud/alerts"
        element={
          <ProtectedRoute>
            <FraudAlerts />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/cashier" replace />} />
      </Routes>
    </>
  )
}

export default App

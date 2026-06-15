import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin, Alert } from 'antd'
import Login from './pages/Login'
import Cashier from './pages/Cashier'
import Orders from './pages/Orders'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import db from './utils/db'
import syncService from './services/syncService'

function App() {
  const [dbInit, setDbInit] = useState(false)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init()
        setDbInit(true)

        if (navigator.onLine) {
          try {
            await syncService.fullSync()
          } catch (e) {
            console.warn('Initial sync failed:', e)
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setDbError(error.message)
      }
    }

    initApp()
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
    <Routes>
      <Route path="/login" element={<Login />} />
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
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/cashier" replace />} />
    </Routes>
  )
}

export default App

import { useState, useEffect, useCallback, useRef } from 'react'
import syncService from '../services/syncService'

const listeners = new Set()
let isOnlineGlobal = typeof navigator !== 'undefined' ? navigator.onLine : true

function notifyListeners(status) {
  listeners.forEach((listener) => {
    try {
      listener(status)
    } catch (e) {
      console.error('Network listener error:', e)
    }
  })
}

function handleOnlineGlobal() {
  isOnlineGlobal = true
  notifyListeners({ isOnline: true })
  syncService.handleNetworkRestore()
}

function handleOfflineGlobal() {
  isOnlineGlobal = false
  notifyListeners({ isOnline: false })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnlineGlobal)
  window.addEventListener('offline', handleOfflineGlobal)
}

export function subscribeNetworkStatus(callback) {
  listeners.add(callback)
  callback({ isOnline: isOnlineGlobal })
  return () => listeners.delete(callback)
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function useNetworkStatus(options = {}) {
  const { onOnline, onOffline, autoSync = true, showOfflineAlert = false } = options
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [connectionType, setConnectionType] = useState(null)
  const [downlink, setDownlink] = useState(null)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const wasOnlineRef = useRef(isOnline)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    if (onOnline) {
      onOnline()
    }
    if (autoSync && !wasOnlineRef.current) {
      syncService.handleNetworkRestore()
    }
    wasOnlineRef.current = true
  }, [onOnline, autoSync])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    if (onOffline) {
      onOffline()
    }
    if (showOfflineAlert) {
      setShowOfflineModal(true)
    }
    wasOnlineRef.current = false
  }, [onOffline, showOfflineAlert])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  useEffect(() => {
    if (navigator.connection) {
      const connection = navigator.connection
      setConnectionType(connection.effectiveType)
      setDownlink(connection.downlink)

      const handleChange = () => {
        setConnectionType(connection.effectiveType)
        setDownlink(connection.downlink)
      }

      connection.addEventListener('change', handleChange)
      return () => connection.removeEventListener('change', handleChange)
    }
  }, [])

  const closeOfflineModal = useCallback(() => {
    setShowOfflineModal(false)
  }, [])

  return {
    isOnline,
    connectionType,
    downlink,
    isOffline: !isOnline,
    isSlow: connectionType === 'slow-2g' || connectionType === '2g',
    showOfflineModal,
    closeOfflineModal,
  }
}

export default useOnlineStatus

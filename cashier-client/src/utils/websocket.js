import syncService from '../services/syncService'

class WebSocketClient {
  constructor() {
    this.ws = null
    this.url = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 3000
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.heartbeatInterval = 30000
    this.isManualClose = false
    this.listeners = new Map()
    this.messageHandlers = new Map()
    this.status = 'disconnected'

    this.registerDefaultHandlers()
  }

  connect(url) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.url = url || this.buildWsUrl()
    this.isManualClose = false
    this.status = 'connecting'
    this.emit('statusChange', this.status)

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.scheduleReconnect()
    }
  }

  buildWsUrl() {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api$/, '')
    return `${wsUrl}/ws`
  }

  handleOpen() {
    console.log('WebSocket connected')
    this.status = 'connected'
    this.reconnectAttempts = 0
    this.emit('statusChange', this.status)
    this.emit('open')
    this.startHeartbeat()
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data)
      const { type, payload } = data

      this.emit('message', data)

      const handler = this.messageHandlers.get(type)
      if (handler) {
        handler(payload, data)
      } else {
        console.warn('No handler for message type:', type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error)
    this.emit('error', error)
  }

  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason)
    this.status = 'disconnected'
    this.emit('statusChange', this.status)
    this.emit('close', event)
    this.stopHeartbeat()

    if (!this.isManualClose) {
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      this.status = 'failed'
      this.emit('statusChange', this.status)
      return
    }

    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    this.status = 'reconnecting'
    this.emit('statusChange', this.status)

    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isManualClose) {
        this.connect()
      }
    }, delay)
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() })
      }
    }, this.heartbeatInterval)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
      return true
    }
    return false
  }

  close() {
    this.isManualClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.status = 'disconnected'
    this.emit('statusChange', this.status)
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data)
        } catch (e) {
          console.error(`WebSocket event listener error (${event}):`, e)
        }
      })
    }
  }

  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler)
  }

  unregisterHandler(type) {
    this.messageHandlers.delete(type)
  }

  registerDefaultHandlers() {
    this.registerHandler('pong', (payload) => {
      console.log('Received pong:', payload)
    })

    this.registerHandler('product_update', async (payload) => {
      console.log('Product update received:', payload)
      try {
        await syncService.syncProducts()
        this.emit('productUpdated', payload)
      } catch (error) {
        console.error('Failed to sync products after update:', error)
      }
    })

    this.registerHandler('stock_update', async (payload) => {
      console.log('Stock update received:', payload)
      try {
        await syncService.syncProducts()
        this.emit('stockUpdated', payload)
      } catch (error) {
        console.error('Failed to sync products after stock update:', error)
      }
    })

    this.registerHandler('order_sync_notify', async (payload) => {
      console.log('Order sync notification received:', payload)
      try {
        await syncService.syncOrders()
        this.emit('orderSyncNotify', payload)
      } catch (error) {
        console.error('Failed to sync orders after notification:', error)
      }
    })

    this.registerHandler('sync_trigger', async (payload) => {
      console.log('Sync trigger received:', payload)
      try {
        if (payload?.type === 'all' || !payload?.type) {
          await syncService.syncAll()
        } else if (payload.type === 'products') {
          await syncService.syncProducts()
        } else if (payload.type === 'orders') {
          await syncService.syncOrders()
        }
        this.emit('syncTriggered', payload)
      } catch (error) {
        console.error('Failed to sync after trigger:', error)
      }
    })
  }

  getStatus() {
    return this.status
  }

  isConnected() {
    return this.status === 'connected'
  }
}

const wsClient = new WebSocketClient()
export default wsClient

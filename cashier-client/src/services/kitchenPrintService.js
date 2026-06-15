import db from '../db/dexie'
import wsClient from '../utils/websocket'
import syncService from './syncService'
import api from '../api/request'

const PRINT_STATUS = {
  PENDING: 0,
  PRINTING: 1,
  SUCCESS: 2,
  FAILED: 3,
  CANCELLED: 4,
}

const MAX_RETRY_COUNT = 3
const RETRY_DELAY_MS = 5000
const QUEUE_CHECK_INTERVAL = 3000
const NETWORK_RETRY_CHECK_INTERVAL = 10000

class KitchenPrintService {
  constructor() {
    this.initialized = false
    this.listeners = new Map()
    this.queueTimer = null
    this.networkRetryTimer = null
    this.retryTimers = new Map()
    this.isProcessing = false
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  init() {
    if (this.initialized) return
    this.initialized = true
    this.startQueueProcessor()
    this.startNetworkRetryMonitor()
    this.registerWebSocketHandlers()
    this.registerNetworkHandlers()
    console.log('[KitchenPrint] Service initialized')
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
          console.error(`[KitchenPrint] Event listener error (${event}):`, e)
        }
      })
    }
  }

  registerNetworkHandlers() {
    const handleOnline = () => {
      this.isOnline = true
      console.log('[KitchenPrint] Network restored, retrying failed jobs')
      this.retryAllFailed().catch((err) => {
        console.error('[KitchenPrint] Auto-retry on network restore failed:', err)
      })
      this.syncPrintHistory().catch((err) => {
        console.error('[KitchenPrint] Auto-sync print history failed:', err)
      })
    }

    const handleOffline = () => {
      this.isOnline = false
      console.log('[KitchenPrint] Network offline, print jobs will queue locally')
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
  }

  registerWebSocketHandlers() {
    wsClient.registerHandler('printer_config_update', async (payload) => {
      console.log('[KitchenPrint] Printer config update received:', payload)
      try {
        await syncService.syncPrinterConfig()
        this.emit('printerConfigUpdated', payload)
      } catch (error) {
        console.error('[KitchenPrint] Failed to sync printer config:', error)
      }
    })

    wsClient.registerHandler('print_rule_update', async (payload) => {
      console.log('[KitchenPrint] Print rule update received:', payload)
      try {
        await syncService.syncPrinterConfig()
        this.emit('printRuleUpdated', payload)
      } catch (error) {
        console.error('[KitchenPrint] Failed to sync print rules:', error)
      }
    })

    wsClient.registerHandler('reprint_order', async (payload) => {
      console.log('[KitchenPrint] Reprint order request received:', payload)
      try {
        if (payload?.order_id) {
          await this.reprintOrder(payload.order_id)
        }
      } catch (error) {
        console.error('[KitchenPrint] Failed to reprint order:', error)
      }
    })

    wsClient.registerHandler('print_result', (payload) => {
      console.log('[KitchenPrint] Print result received:', payload)
      this.emit('printResult', payload)
    })
  }

  startQueueProcessor() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer)
    }
    this.queueTimer = setInterval(() => {
      this.processQueue()
    }, QUEUE_CHECK_INTERVAL)
    this.processQueue()
  }

  startNetworkRetryMonitor() {
    if (this.networkRetryTimer) {
      clearInterval(this.networkRetryTimer)
    }
    this.networkRetryTimer = setInterval(() => {
      if (this.isOnline) {
        this.retryAllFailed().catch(() => {})
      }
    }, NETWORK_RETRY_CHECK_INTERVAL)
  }

  stopQueueProcessor() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer)
      this.queueTimer = null
    }
    if (this.networkRetryTimer) {
      clearInterval(this.networkRetryTimer)
      this.networkRetryTimer = null
    }
    this.retryTimers.forEach((timer) => clearTimeout(timer))
    this.retryTimers.clear()
  }

  async processQueue() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const pendingJobs = await db.getPendingPrintQueue()
      for (const job of pendingJobs) {
        if (job.print_status === PRINT_STATUS.PRINTING) {
          continue
        }
        if (job.retry_count >= MAX_RETRY_COUNT && job.print_status === PRINT_STATUS.FAILED) {
          continue
        }
        await this.processPrintJob(job)
      }
    } catch (error) {
      console.error('[KitchenPrint] Queue processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  async processPrintJob(job) {
    try {
      await db.updatePrintQueueStatus(job.id, PRINT_STATUS.PRINTING)
      this.emit('jobStatusChange', { id: job.id, status: PRINT_STATUS.PRINTING })

      const printer = await db.getPrinterById(job.printer_id)
      if (!printer || printer.status !== 1) {
        throw new Error(`打印机不可用: ${job.printer_name || job.printer_code}`)
      }

      const template = job.template_code
        ? await db.getPrintTemplateByCode(job.template_code)
        : await db.getDefaultPrintTemplate('kitchen')

      const printContent = this.renderPrintContent(job, template, printer)

      const printResult = await this.executePrint(printer, printContent, job.copies || 1)

      if (printResult.success) {
        await db.updatePrintQueueStatus(job.id, PRINT_STATUS.SUCCESS)
        await this.addPrintHistory(job, PRINT_STATUS.SUCCESS)
        this.emit('jobPrinted', { id: job.id, job, printer })
        return true
      } else {
        throw new Error(printResult.error || '打印失败')
      }
    } catch (error) {
      console.error(`[KitchenPrint] Print job ${job.id} failed:`, error)
      const newRetryCount = (job.retry_count || 0) + 1

      if (newRetryCount >= MAX_RETRY_COUNT) {
        await db.updatePrintQueueStatus(job.id, PRINT_STATUS.FAILED, error.message)
        await this.addPrintHistory(job, PRINT_STATUS.FAILED, error.message)
        this.emit('jobFailed', { id: job.id, job, error: error.message, retryExhausted: true })
      } else {
        await db.updatePrintQueueStatus(job.id, PRINT_STATUS.PENDING, error.message)
        this.emit('jobFailed', { id: job.id, job, error: error.message, retryExhausted: false })
        this.scheduleRetry(job.id)
      }
      return false
    }
  }

  scheduleRetry(jobId) {
    if (this.retryTimers.has(jobId)) {
      clearTimeout(this.retryTimers.get(jobId))
    }
    const timer = setTimeout(() => {
      this.retryTimers.delete(jobId)
      this.processQueue()
    }, RETRY_DELAY_MS)
    this.retryTimers.set(jobId, timer)
  }

  async executePrint(printer, content, copies = 1) {
    try {
      if (window.electronAPI?.printKitchenTicket) {
        const result = await window.electronAPI.printKitchenTicket({
          printer,
          content,
          copies,
        })
        return result
      }

      if (printer.connection_type === 'network' && printer.ip_address) {
        return await this.printViaNetwork(printer, content, copies)
      }

      if (printer.connection_type === 'bluetooth' && printer.bluetooth_address) {
        return await this.printViaBluetooth(printer, content, copies)
      }

      console.warn('[KitchenPrint] No print adapter available, simulating print')
      this.emit('printSimulated', { printer, content, copies })
      return { success: true, simulated: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async printViaNetwork(printer, content, copies) {
    try {
      const url = `http://${printer.ip_address}${printer.port ? `:${printer.port}` : ''}/print`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, copies }),
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error(`打印机响应错误: ${response.status}`)
      }
      return { success: true }
    } catch (error) {
      if (wsClient.isConnected()) {
        const wsResult = await this.printViaWebSocket(printer, content, copies)
        if (wsResult.success) return wsResult
      }
      throw error
    }
  }

  async printViaBluetooth(printer, content, copies) {
    try {
      if (!window.electronAPI?.printBluetooth) {
        throw new Error('蓝牙打印接口不可用')
      }
      const result = await window.electronAPI.printBluetooth({
        address: printer.bluetooth_address,
        content,
        copies,
      })
      return result || { success: true }
    } catch (error) {
      throw new Error(`蓝牙打印失败: ${error.message}`)
    }
  }

  async printViaWebSocket(printer, content, copies) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        wsClient.unregisterHandler('print_result')
        resolve({ success: false, error: 'WebSocket打印超时' })
      }, 10000)

      const handler = (payload) => {
        if (payload?.printer_id === printer.id || payload?.printer_code === printer.printer_code) {
          clearTimeout(timeout)
          wsClient.unregisterHandler('print_result')
          resolve({ success: payload?.success ?? false, error: payload?.error })
        }
      }

      wsClient.registerHandler('print_result', handler)
      wsClient.send({
        type: 'print_ticket',
        payload: {
          printer_id: printer.id,
          printer_code: printer.printer_code,
          content,
          copies,
        },
      })
    })
  }

  renderPrintContent(job, template, printer) {
    const items = Array.isArray(job.items) ? job.items : []
    const paperWidth = template?.paper_width || 80
    const fontSize = template?.font_size || 12

    const lines = []

    if (template?.header) {
      lines.push(this.formatTemplateText(template.header, job, paperWidth))
      lines.push('')
    }

    lines.push(this.centerText(`=== ${job.category_name || '厨房小票'} ===`, paperWidth))
    lines.push('')
    lines.push(`订单号: ${job.order_no}`)
    lines.push(`时间: ${this.formatDateTime(job.created_at)}`)
    lines.push(`台号/房间: ${job.table_no || '散台'}`)
    lines.push(`人数: ${job.people_count || '-'}`)
    if (job.remark) {
      lines.push(`备注: ${job.remark}`)
    }
    lines.push('')
    lines.push('-'.repeat(paperWidth))
    lines.push('')

    items.forEach((item, index) => {
      const qtyStr = `x${item.quantity || 1}`
      const nameLine = `${index + 1}. ${item.product_name}`
      lines.push(nameLine)
      lines.push(`   ${qtyStr}${item.remark ? `  [${item.remark}]` : ''}`)
      if (item.specification) {
        lines.push(`   规格: ${item.specification}`)
      }
    })

    lines.push('')
    lines.push('-'.repeat(paperWidth))
    lines.push('')

    const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    lines.push(`共 ${totalQty} 道菜`)
    lines.push('')

    if (template?.footer) {
      lines.push(this.formatTemplateText(template.footer, job, paperWidth))
    }

    lines.push(this.centerText('--- 请妥善保管小票 ---', paperWidth))

    return {
      lines,
      paperWidth,
      fontSize,
      copies: job.copies || 1,
      printer_name: printer?.printer_name,
      category_name: job.category_name,
    }
  }

  formatTemplateText(templateText, job, width) {
    return templateText
      .replace(/\{order_no\}/g, job.order_no || '')
      .replace(/\{order_id\}/g, job.order_id || '')
      .replace(/\{date\}/g, this.formatDateTime(job.created_at))
      .replace(/\{category\}/g, job.category_name || '')
      .replace(/\{cashier\}/g, job.cashier_name || '')
  }

  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2))
    return ' '.repeat(padding) + text
  }

  formatDateTime(dateStr) {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      const pad = (n) => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return dateStr
    }
  }

  async printOrder(orderData) {
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      throw new Error('订单数据无效')
    }

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const orderItems = orderData.items || []

    let printTasks

    if (this.isOnline && navigator.onLine) {
      try {
        const resolveResult = await api.post('/printer/resolve-printers', {
          items: orderItems.map((item) => ({
            category_id: item.category_id,
            category_name: item.category_name,
            product_name: item.product_name,
            quantity: item.quantity,
          })),
        })

        const serverTasks = resolveResult.data?.printTasks || []
        if (serverTasks.length > 0) {
          printTasks = serverTasks.map((task) => ({
            categoryId: task.category_id,
            categoryName: task.category_name,
            items: orderItems.filter((i) => i.category_id === task.category_id),
            printerId: task.printer_id,
            printerCode: task.printer_code,
            printerName: task.printer_name,
            connectionType: task.connection_type,
            ipAddress: task.ip_address,
            port: task.port,
            copies: task.copies,
          }))
        }
      } catch (error) {
        console.warn('[KitchenPrint] Server-side resolve failed, falling back to local:', error)
      }
    }

    if (!printTasks) {
      printTasks = await this.resolvePrintersLocally(orderItems)
    }

    const printJobs = []

    for (const task of printTasks) {
      if (!task.items || task.items.length === 0) continue

      const defaultTemplate = await db.getDefaultPrintTemplate('kitchen')

      const jobData = {
        order_id: orderData.id || null,
        order_no: orderData.order_no,
        printer_id: task.printerId,
        printer_code: task.printerCode,
        printer_name: task.printerName,
        category_id: task.categoryId,
        category_name: task.categoryName,
        items: JSON.stringify(task.items),
        total_amount: task.items.reduce((sum, i) => sum + (i.pay_amount || i.subtotal || 0), 0),
        copies: task.copies || 1,
        template_code: defaultTemplate?.template_code || 'default_kitchen',
        table_no: orderData.table_no,
        people_count: orderData.people_count,
        remark: orderData.remark,
        cashier_id: userInfo.id || null,
        cashier_name: userInfo.name || '收银员',
        print_status: PRINT_STATUS.PENDING,
        retry_count: 0,
      }

      const result = await db.addPrintQueue(jobData)
      printJobs.push({ ...result, printer: { id: task.printerId, printer_name: task.printerName }, category: task.categoryName })
    }

    this.emit('orderQueued', { order: orderData, jobs: printJobs })

    if (printJobs.length > 0) {
      setTimeout(() => this.processQueue(), 500)
    }

    return printJobs
  }

  async resolvePrintersLocally(items) {
    const groups = await this.groupItemsByCategory(items)
    const tasks = []

    for (const [categoryId, group] of groups.entries()) {
      const rules = await db.getPrintRuleByCategory(categoryId)
      let printerEntries = []

      if (rules.length > 0) {
        printerEntries = await Promise.all(
          rules.map(async (rule) => {
            const printer = await db.getPrinterById(rule.printer_id)
            return printer ? { printer, rule } : null
          })
        )
        printerEntries = printerEntries.filter(Boolean)
      }

      if (printerEntries.length === 0) {
        const defaultPrinter = await db.getDefaultPrinter()
        if (defaultPrinter) {
          printerEntries = [{ printer: defaultPrinter, rule: { copies: 1 } }]
        }
      }

      for (const { printer, rule } of printerEntries) {
        tasks.push({
          categoryId,
          categoryName: group.categoryName,
          items: group.items,
          printerId: printer.id,
          printerCode: printer.printer_code,
          printerName: printer.printer_name,
          connectionType: printer.connection_type,
          ipAddress: printer.ip_address,
          port: printer.port,
          copies: rule?.copies || 1,
        })
      }
    }

    return tasks
  }

  async groupItemsByCategory(items) {
    const groups = new Map()
    const allCategories = await db.getCategories()
    const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]))

    for (const item of items) {
      const categoryId = item.category_id || 0
      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          categoryId,
          categoryName: categoryMap.get(categoryId) || '其他',
          items: [],
        })
      }
      groups.get(categoryId).items.push(item)
    }

    return groups
  }

  async reprintOrder(orderId) {
    const existingJobs = await db.getPrintQueueByOrder(orderId)
    if (existingJobs.length === 0) {
      throw new Error('未找到该订单的打印记录')
    }

    for (const job of existingJobs) {
      const result = await db.addPrintQueue({
        order_id: job.order_id,
        order_no: job.order_no,
        printer_id: job.printer_id,
        printer_code: job.printer_code,
        printer_name: job.printer_name,
        category_id: job.category_id,
        category_name: job.category_name,
        items: job.items,
        total_amount: job.total_amount,
        copies: job.copies,
        template_code: job.template_code,
        print_status: PRINT_STATUS.PENDING,
        retry_count: 0,
        created_at: new Date().toISOString(),
      })
      this.emit('jobReprint', { id: result.id, order_no: job.order_no })
    }

    setTimeout(() => this.processQueue(), 500)
    return true
  }

  async retryJob(jobId) {
    await db.retryPrintQueue(jobId)
    this.emit('jobRetry', { id: jobId })
    setTimeout(() => this.processQueue(), 500)
    return true
  }

  async retryAllFailed() {
    const failedJobs = await db.getPrintQueue(PRINT_STATUS.FAILED)
    for (const job of failedJobs) {
      if (job.retry_count < MAX_RETRY_COUNT) {
        await db.retryPrintQueue(job.id)
      }
    }
    setTimeout(() => this.processQueue(), 500)
    return true
  }

  async addPrintHistory(job, status, errorMessage = null) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const items = Array.isArray(job.items) ? job.items : []
    return await db.addPrintHistory({
      queue_id: job.id,
      order_id: job.order_id,
      order_no: job.order_no,
      printer_id: job.printer_id,
      printer_code: job.printer_code,
      category_id: job.category_id,
      items_count: items.length,
      copies: job.copies || 1,
      print_status: status,
      print_time: status === PRINT_STATUS.SUCCESS ? new Date().toISOString() : null,
      error_message: errorMessage,
      cashier_id: userInfo.id || job.cashier_id,
      cashier_name: userInfo.name || job.cashier_name,
    })
  }

  async syncPrintHistory() {
    if (!this.isOnline || !navigator.onLine) return

    try {
      const unsyncedRecords = await db.getUnsyncedPrintHistory(100)
      if (unsyncedRecords.length === 0) return

      await api.batchSyncPrintHistory(unsyncedRecords)
      for (const record of unsyncedRecords) {
        await db.markPrintHistorySynced(record.id)
      }
      console.log(`[KitchenPrint] Synced ${unsyncedRecords.length} print history records`)
    } catch (error) {
      console.error('[KitchenPrint] Failed to sync print history:', error)
    }
  }

  async getQueueStats() {
    const allJobs = await db.getPrintQueue()
    return {
      pending: allJobs.filter((j) => j.print_status === PRINT_STATUS.PENDING).length,
      printing: allJobs.filter((j) => j.print_status === PRINT_STATUS.PRINTING).length,
      success: allJobs.filter((j) => j.print_status === PRINT_STATUS.SUCCESS).length,
      failed: allJobs.filter((j) => j.print_status === PRINT_STATUS.FAILED).length,
      total: allJobs.length,
    }
  }

  async testPrinterConnection(printerId) {
    const printer = await db.getPrinterById(printerId)
    if (!printer) {
      return { success: false, error: '打印机不存在' }
    }

    const testJob = {
      order_no: 'TEST' + Date.now(),
      category_name: '测试打印',
      items: JSON.stringify([{ product_name: '测试菜品', quantity: 1 }]),
      copies: 1,
      created_at: new Date().toISOString(),
      cashier_name: '系统测试',
    }

    const template = await db.getDefaultPrintTemplate('kitchen')
    const content = this.renderPrintContent(testJob, template, printer)

    return await this.executePrint(printer, content, 1)
  }

  destroy() {
    this.stopQueueProcessor()
    this.initialized = false
    this.listeners.clear()
  }
}

const kitchenPrintService = new KitchenPrintService()
export default kitchenPrintService
export { PRINT_STATUS }

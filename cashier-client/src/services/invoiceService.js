import db from '../db/dexie'
import api from '../api/request'
import dayjs from 'dayjs'
import QRCode from 'qrcode'
import { message } from 'antd'

class InvoiceService {
  constructor() {
    this.defaultTaxRate = 0.01
    this.qrcodeBaseUrl = window.location.origin + '/invoice/scan'
  }

  generateInvoiceNo() {
    const dateStr = dayjs().format('YYYYMMDDHHmmss')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return 'INV' + dateStr + random
  }

  generateQrcodeToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'QR'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  calculateTaxAmount(totalAmount, taxRate = this.defaultTaxRate) {
    const total = parseFloat(totalAmount) || 0
    const rate = parseFloat(taxRate) || 0
    if (total <= 0) return { amount: '0.00', taxAmount: '0.00' }
    
    const amount = total / (1 + rate)
    const taxAmount = total - amount
    
    return {
      amount: amount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
    }
  }

  async generateQrcodeContent(qrcodeToken, invoiceData = {}) {
    const qrcodeData = {
      token: qrcodeToken,
      invoice_no: invoiceData.invoice_no,
      order_no: invoiceData.order_no,
      total_amount: invoiceData.total_amount,
      created_at: invoiceData.created_at || new Date().toISOString(),
      shop_name: invoiceData.shop_name,
    }
    
    try {
      const qrcodeUrl = `${this.qrcodeBaseUrl}?token=${qrcodeToken}`
      const qrcodeImage = await this.generateQrcodeImage(qrcodeUrl)
      
      return {
        content: qrcodeUrl,
        url: qrcodeUrl,
        image: qrcodeImage,
        data: JSON.stringify(qrcodeData),
      }
    } catch (e) {
      console.warn('生成二维码失败:', e)
      const qrcodeUrl = `${this.qrcodeBaseUrl}?token=${qrcodeToken}`
      return {
        content: qrcodeUrl,
        url: qrcodeUrl,
        image: null,
        data: JSON.stringify(qrcodeData),
      }
    }
  }

  async generateQrcodeImage(text, size = 256) {
    try {
      return await QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    } catch (e) {
      console.warn('生成二维码图片失败:', e)
      return null
    }
  }

  async createInvoice(invoiceData) {
    console.log('开始创建电子发票:', invoiceData)
    
    if (!invoiceData.order_id && !invoiceData.total_amount) {
      throw new Error('订单ID和金额不能为空')
    }

    const invoiceNo = this.generateInvoiceNo()
    const qrcodeToken = this.generateQrcodeToken()
    const taxRate = invoiceData.tax_rate || this.defaultTaxRate
    const { amount, taxAmount } = this.calculateTaxAmount(invoiceData.total_amount, taxRate)

    const qrcodeInfo = await this.generateQrcodeContent(qrcodeToken, {
      ...invoiceData,
      invoice_no: invoiceNo,
    })

    const shopInfo = await this._getShopInfo()
    
    const invoice = {
      invoice_no: invoiceNo,
      order_id: invoiceData.order_id || null,
      order_no: invoiceData.order_no || null,
      shop_id: shopInfo.shop_id,
      shop_name: shopInfo.shop_name,
      shop_tax_no: shopInfo.shop_tax_no,
      buyer_name: invoiceData.buyer_name || '个人',
      buyer_tax_no: invoiceData.buyer_tax_no || null,
      buyer_phone: invoiceData.buyer_phone || null,
      buyer_email: invoiceData.buyer_email || null,
      buyer_address: invoiceData.buyer_address || null,
      buyer_bank: invoiceData.buyer_bank || null,
      total_amount: parseFloat(invoiceData.total_amount).toFixed(2),
      amount: amount,
      tax_amount: taxAmount,
      tax_rate: taxRate.toString(),
      invoice_type: invoiceData.invoice_type || 1,
      invoice_title_type: invoiceData.invoice_title_type || 1,
      invoice_status: 0,
      qrcode_token: qrcodeToken,
      qrcode_content: qrcodeInfo.content,
      qrcode_url: qrcodeInfo.url,
      tax_control_status: 0,
      push_status: 0,
      sync_status: 0,
      remark: invoiceData.remark || null,
      cashier_id: invoiceData.cashier_id || null,
      cashier_name: invoiceData.cashier_name || null,
    }

    const savedInvoice = await db.createInvoice(invoice)
    console.log('电子发票创建成功, invoiceNo:', savedInvoice.invoice_no)

    if (navigator.onLine) {
      try {
        await this._syncInvoiceImmediately(savedInvoice)
      } catch (e) {
        console.warn('联网时立即同步发票失败，将在网络恢复后自动同步:', e)
      }
    }

    return {
      ...savedInvoice,
      qrcode_image: qrcodeInfo.image,
    }
  }

  async createInvoiceFromOrder(orderId, invoiceParams = {}) {
    const order = await db.getOrderById(orderId)
    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.pay_status !== 1) {
      throw new Error('订单未支付，无法开具发票')
    }

    const existingInvoice = await db.getInvoiceByOrderId(orderId)
    if (existingInvoice) {
      return existingInvoice
    }

    return this.createInvoice({
      order_id: orderId,
      order_no: order.order_no,
      total_amount: order.pay_amount,
      ...invoiceParams,
    })
  }

  async getInvoiceById(id) {
    return await db.getInvoiceById(id)
  }

  async getInvoiceByNo(invoiceNo) {
    return await db.getInvoiceByNo(invoiceNo)
  }

  async getInvoiceByQrcodeToken(qrcodeToken) {
    return await db.getInvoiceByQrcodeToken(qrcodeToken)
  }

  async getInvoiceByOrderId(orderId) {
    return await db.getInvoiceByOrderId(orderId)
  }

  async getInvoiceList(params = {}) {
    return await db.getInvoiceList(params)
  }

  async updateInvoice(id, updateData) {
    return await db.updateInvoice(id, updateData)
  }

  async scanInvoiceQrcode(qrcodeToken, scanParams = {}) {
    console.log('扫码存入票夹, token:', qrcodeToken)
    
    let invoice = await db.getInvoiceByQrcodeToken(qrcodeToken)
    
    if (!invoice && navigator.onLine) {
      try {
        const result = await api.get(`/api/invoice/qrcode/${qrcodeToken}`)
        if (result && result.data) {
          invoice = result.data
          await db.batchSaveInvoices([invoice])
        }
      } catch (e) {
        console.warn('从服务端查询发票信息失败:', e)
      }
    }

    if (!invoice) {
      throw new Error('发票信息不存在，请先联网同步')
    }

    await db.incrementInvoiceScanCount(invoice.id)

    const customerIdentifier = scanParams.customer_identifier || scanParams.buyer_phone
    if (!customerIdentifier) {
      throw new Error('顾客标识不能为空')
    }

    const existingWallet = await db.getWalletByInvoiceNo(customerIdentifier, invoice.invoice_no)
    if (existingWallet) {
      return existingWallet
    }

    const walletNo = 'WAL' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    
    const walletData = {
      wallet_no: walletNo,
      customer_identifier: customerIdentifier,
      customer_type: scanParams.customer_type || 1,
      customer_name: scanParams.customer_name || null,
      customer_phone: scanParams.customer_phone || scanParams.buyer_phone || null,
      invoice_id: invoice.id,
      invoice_no: invoice.invoice_no,
      invoice_code: invoice.invoice_code,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.tax_control_time || invoice.created_at,
      invoice_amount: invoice.total_amount,
      buyer_name: invoice.buyer_name,
      shop_id: invoice.shop_id,
      shop_name: invoice.shop_name,
      scan_source: scanParams.scan_source || 1,
      scan_device_info: scanParams.scan_device_info || null,
      tags: scanParams.tags || null,
      remark: scanParams.remark || null,
    }

    const wallet = await db.saveInvoiceToWallet(walletData)
    console.log('发票已存入票夹, walletNo:', wallet.wallet_no)

    if (navigator.onLine) {
      try {
        await api.post('/api/invoice/scan', {
          qrcode_token: qrcodeToken,
          ...scanParams,
        })
      } catch (e) {
        console.warn('同步扫码记录到服务端失败:', e)
      }
    }

    return wallet
  }

  async syncInvoices() {
    console.log('开始同步电子发票到服务端...')
    
    if (!navigator.onLine) {
      console.log('当前离线，跳过发票同步')
      return { success: false, error: 'OFFLINE', synced: 0, failed: 0 }
    }

    const unsyncedInvoices = await db.getUnsyncedInvoices(100)
    console.log(`找到 ${unsyncedInvoices.length} 张未同步的发票`)

    if (unsyncedInvoices.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }

    const batchSize = 20
    let synced = 0
    let failed = 0

    for (let i = 0; i < unsyncedInvoices.length; i += batchSize) {
      const batch = unsyncedInvoices.slice(i, i + batchSize)
      const batchData = batch.map(r => ({
        invoice_no: r.invoice_no,
        invoice_code: r.invoice_code,
        invoice_number: r.invoice_number,
        order_id: r.order_id,
        order_no: r.order_no,
        shop_id: r.shop_id,
        shop_name: r.shop_name,
        shop_tax_no: r.shop_tax_no,
        buyer_name: r.buyer_name,
        buyer_tax_no: r.buyer_tax_no,
        buyer_phone: r.buyer_phone,
        buyer_email: r.buyer_email,
        buyer_address: r.buyer_address,
        buyer_bank: r.buyer_bank,
        total_amount: r.total_amount,
        amount: r.amount,
        tax_amount: r.tax_amount,
        tax_rate: r.tax_rate,
        invoice_type: r.invoice_type,
        invoice_title_type: r.invoice_title_type,
        invoice_status: r.invoice_status,
        remark: r.remark,
        qrcode_token: r.qrcode_token,
        qrcode_content: r.qrcode_content,
        qrcode_url: r.qrcode_url,
        invoice_pdf_url: r.invoice_pdf_url,
        tax_control_serial_no: r.tax_control_serial_no,
        tax_control_request_id: r.tax_control_request_id,
        tax_control_time: r.tax_control_time,
        tax_control_status: r.tax_control_status,
        tax_control_error: r.tax_control_error,
        tax_control_attempts: r.tax_control_attempts,
        push_status: r.push_status,
        push_time: r.push_time,
        push_error: r.push_error,
        push_attempts: r.push_attempts,
        sync_status: r.sync_status,
        sync_attempts: r.sync_attempts,
        sync_error: r.sync_error,
        sync_time: r.sync_time,
        scanned_count: r.scanned_count,
        last_scanned_time: r.last_scanned_time,
        cashier_id: r.cashier_id,
        cashier_name: r.cashier_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))

      try {
        const result = await api.post('/api/invoice/sync/batch', batchData)
        console.log(`发票批次同步成功，数量: ${batchData.length}`)

        for (const invoice of batch) {
          await db.updateInvoiceSyncStatus(invoice.id, 1)
        }
        
        synced += batch.length

        await this._refreshInvoiceStatusFromServer(batch.map(r => r.invoice_no))

      } catch (error) {
        console.error(`发票批次同步失败:`, error)
        const errorMsg = error.message || '同步失败'
        
        for (const invoice of batch) {
          await db.updateInvoiceSyncStatus(invoice.id, 2, errorMsg)
        }
        
        failed += batch.length
      }
    }

    console.log(`发票同步完成，成功: ${synced}, 失败: ${failed}`)
    return { success: true, synced, failed }
  }

  async syncWallets() {
    console.log('开始同步票夹记录到服务端...')
    
    if (!navigator.onLine) {
      console.log('当前离线，跳过票夹同步')
      return { success: false, error: 'OFFLINE', synced: 0, failed: 0 }
    }

    const unsyncedWallets = await db.getUnsyncedWallets(100)
    console.log(`找到 ${unsyncedWallets.length} 条未同步的票夹记录`)

    if (unsyncedWallets.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }

    const batchData = unsyncedWallets.map(w => ({
      wallet_no: w.wallet_no,
      customer_identifier: w.customer_identifier,
      customer_type: w.customer_type,
      customer_name: w.customer_name,
      customer_phone: w.customer_phone,
      invoice_id: w.invoice_id,
      invoice_no: w.invoice_no,
      invoice_code: w.invoice_code,
      invoice_number: w.invoice_number,
      invoice_date: w.invoice_date,
      invoice_amount: w.invoice_amount,
      buyer_name: w.buyer_name,
      shop_id: w.shop_id,
      shop_name: w.shop_name,
      scan_source: w.scan_source,
      scan_time: w.scan_time,
      scan_device_info: w.scan_device_info,
      wallet_status: w.wallet_status,
      is_read: w.is_read,
      is_favorite: w.is_favorite,
      remark: w.remark,
      tags: w.tags,
      sync_status: w.sync_status,
      sync_time: w.sync_time,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }))

    try {
      await api.post('/api/invoice-wallet/sync/batch', batchData)
      
      for (const wallet of unsyncedWallets) {
        await db.updateWalletSyncStatus(wallet.id, 1)
      }

      console.log(`票夹同步完成，成功: ${unsyncedWallets.length}`)
      return { success: true, synced: unsyncedWallets.length, failed: 0 }
    } catch (error) {
      console.error('票夹同步失败:', error)
      return { success: false, error: error.message, synced: 0, failed: unsyncedWallets.length }
    }
  }

  async _syncInvoiceImmediately(invoice) {
    if (!navigator.onLine) return

    try {
      const result = await api.post('/api/invoice/create', {
        order_id: invoice.order_id,
        order_no: invoice.order_no,
        shop_id: invoice.shop_id,
        shop_name: invoice.shop_name,
        buyer_name: invoice.buyer_name,
        buyer_tax_no: invoice.buyer_tax_no,
        buyer_phone: invoice.buyer_phone,
        buyer_email: invoice.buyer_email,
        total_amount: invoice.total_amount,
        invoice_type: invoice.invoice_type,
        invoice_title_type: invoice.invoice_title_type,
        tax_rate: invoice.tax_rate,
        remark: invoice.remark,
        cashier_id: invoice.cashier_id,
        cashier_name: invoice.cashier_name,
      })

      if (result && result.data) {
        await db.updateInvoice(invoice.id, {
          ...result.data,
          sync_status: 1,
          sync_time: new Date().toISOString(),
        })
        console.log('发票立即同步成功:', invoice.invoice_no)
      }
    } catch (e) {
      console.warn('发票立即同步失败:', e)
    }
  }

  async _refreshInvoiceStatusFromServer(invoiceNos) {
    if (!navigator.onLine || !invoiceNos || invoiceNos.length === 0) return

    try {
      const result = await api.get('/api/invoice/list', {
        params: {
          invoice_nos: invoiceNos.join(','),
          page_size: invoiceNos.length,
        },
      })

      if (result && result.data && result.data.items) {
        await db.batchSaveInvoices(result.data.items)
        console.log('发票状态已从服务端刷新')
      }
    } catch (e) {
      console.warn('从服务端刷新发票状态失败:', e)
    }
  }

  async _getShopInfo() {
    try {
      const shopId = await db.getSetting('shopId')
      const shopName = await db.getSetting('shopName')
      const shopTaxNo = await db.getSetting('shopTaxNo')
      
      return {
        shop_id: shopId ? parseInt(shopId) : null,
        shop_name: shopName || '默认门店',
        shop_tax_no: shopTaxNo || null,
      }
    } catch (e) {
      console.warn('获取门店信息失败:', e)
      return {
        shop_id: null,
        shop_name: '默认门店',
        shop_tax_no: null,
      }
    }
  }

  async getWalletList(params = {}) {
    return await db.getWalletList(params)
  }

  async getWalletById(id) {
    return await db.getWalletById(id)
  }

  async markWalletAsRead(id) {
    return await db.markWalletAsRead(id)
  }

  async toggleWalletFavorite(id) {
    return await db.toggleWalletFavorite(id)
  }

  async updateWallet(id, updateData) {
    return await db.updateWallet(id, updateData)
  }
}

export default new InvoiceService()

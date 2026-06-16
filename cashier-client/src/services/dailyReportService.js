import db from '../db/dexie'
import api from '../api/request'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { message } from 'antd'

class DailyReportService {
  constructor() {
    this.generating = false
    this.reportFileStoreName = 'daily_report_files'
  }

  async generateReport(reportDate) {
    const dateStr = typeof reportDate === 'string' ? reportDate : dayjs(reportDate).format('YYYY-MM-DD')
    console.log('开始生成营业日报:', dateStr)

    if (this.generating) {
      throw new Error('正在生成日报，请稍候')
    }

    this.generating = true
    try {
      const report = await db.generateDailyReport(dateStr)
      console.log('营业日报生成成功:', report.report_no)
      try {
        await this._saveReportFilesLocal(dateStr, report)
      } catch (e) {
        console.warn('保存日报文件缓存失败:', e)
      }
      return report
    } catch (error) {
      console.error('生成营业日报失败:', error)
      throw error
    } finally {
      this.generating = false
    }
  }

  async generateTodayReport() {
    const today = dayjs().format('YYYY-MM-DD')
    return this.generateReport(today)
  }

  async checkAndGenerateMissingReports() {
    console.log('检查并补全遗漏的营业日报...')

    const result = await db.getDailyReportList({ page: 1, pageSize: 1000 })
    const existingDates = new Set((result.items || []).map(r => r.report_date))

    const orders = await db.getAllOrders ? (await db.getAllOrders()) : []
    let allOrderDates = new Set()

    try {
      const allOrders = orders.length > 0 ? orders : await db.orders.toArray()
      for (const order of allOrders) {
        if (order.pay_status === 1 && order.created_at) {
          const dateStr = dayjs(order.created_at).format('YYYY-MM-DD')
          allOrderDates.add(dateStr)
        }
      }
    } catch (e) {
      console.warn('获取订单日期失败:', e)
    }

    if (allOrderDates.size === 0) {
      const today = dayjs().format('YYYY-MM-DD')
      allOrderDates.add(today)
    }

    const missingDates = []
    for (const dateStr of allOrderDates) {
      if (!existingDates.has(dateStr)) {
        missingDates.push(dateStr)
      }
    }

    const dateArr = Array.from(allOrderDates).sort()
    if (dateArr.length >= 2) {
      const minDate = dayjs(dateArr[0])
      const maxDate = dayjs(dateArr[dateArr.length - 1])
      let cur = minDate.clone()
      while (cur.isBefore(maxDate) || cur.isSame(maxDate, 'day')) {
        const curStr = cur.format('YYYY-MM-DD')
        if (!existingDates.has(curStr) && !missingDates.includes(curStr)) {
          missingDates.push(curStr)
        }
        cur = cur.add(1, 'day')
      }
    }

    missingDates.sort()

    console.log(`发现 ${missingDates.length} 个遗漏日期需要生成日报:`, missingDates)

    const results = []
    for (const dateStr of missingDates) {
      try {
        const report = await db.generateDailyReport(dateStr)
        try {
          await this._saveReportFilesLocal(dateStr, report)
        } catch (e) {
          console.warn(`保存 ${dateStr} 日报文件失败:`, e)
        }
        results.push({ date: dateStr, success: true, report })
      } catch (e) {
        console.error(`生成日报失败 ${dateStr}:`, e)
        results.push({ date: dateStr, success: false, error: e.message })
      }
    }

    console.log(`遗漏日报补全完成: 成功 ${results.filter(r => r.success).length}, 失败 ${results.filter(r => !r.success).length}`)
    return results
  }

  async getReportByDate(reportDate) {
    const dateStr = typeof reportDate === 'string' ? reportDate : dayjs(reportDate).format('YYYY-MM-DD')
    return await db.getDailyReportByDate(dateStr)
  }

  async getReportList(params = {}) {
    return await db.getDailyReportList(params)
  }

  async getUnsyncedReports(limit = 50) {
    return await db.getUnsyncedDailyReports(limit)
  }

  async saveReport(report) {
    return await db.saveDailyReport(report)
  }

  async updateSyncStatus(id, status, error = null) {
    return await db.updateDailyReportSyncStatus(id, status, error)
  }

  async updateErpPushStatus(id, status, error = null) {
    return await db.updateDailyReportErpPushStatus(id, status, error)
  }

  async batchSaveReports(reports) {
    return await db.batchSaveDailyReports(reports)
  }

  async syncReports() {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    console.log('开始同步营业日报...')

    try {
      await this.checkAndGenerateMissingReports()
    } catch (e) {
      console.warn('补全遗漏日报失败，继续同步:', e)
    }

    try {
      const reportsToSync = await db.getUnsyncedDailyReports(100)

      if (reportsToSync.length === 0) {
        console.log('没有需要同步的营业日报')
        return { success: true, count: 0 }
      }

      console.log(`需要同步 ${reportsToSync.length} 条营业日报`)

      const results = { success: 0, failed: 0, errors: [] }
      const batchSize = 30

      for (let i = 0; i < reportsToSync.length; i += batchSize) {
        const batch = reportsToSync.slice(i, i + batchSize)

        try {
          const batchData = batch.map((r) => ({
            report_no: r.report_no,
            report_date: r.report_date,
            shop_id: r.shop_id,
            shop_name: r.shop_name,
            total_orders: r.total_orders,
            total_amount: r.total_amount,
            discount_amount: r.discount_amount,
            refund_amount: r.refund_amount,
            actual_amount: r.actual_amount,
            cash_amount: r.cash_amount,
            wechat_amount: r.wechat_amount,
            alipay_amount: r.alipay_amount,
            member_card_amount: r.member_card_amount,
            other_pay_amount: r.other_pay_amount,
            member_discount_amount: r.member_discount_amount,
            points_deduction_amount: r.points_deduction_amount,
            total_items: r.total_items,
            avg_order_amount: r.avg_order_amount,
            new_member_count: r.new_member_count,
            cashier_id: r.cashier_id,
            cashier_name: r.cashier_name,
            report_status: r.report_status || 1,
            sync_status: r.sync_status,
            sync_attempts: r.sync_attempts || 0,
            sync_error: r.sync_error,
            sync_time: r.sync_time,
            erp_push_status: r.erp_push_status,
            erp_push_time: r.erp_push_time,
            erp_push_error: r.erp_push_error,
            remark: r.remark,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }))

          const response = await api.post('/daily-report/batch-save', batchData)
          const result = response.data || {}
          const success = result === true || result.success

          if (success) {
            for (const report of batch) {
              await db.updateDailyReportSyncStatus(report.id, 1)
              results.success++
            }
            try {
              const autoPushResponse = await api.post('/daily-report/push-erp/auto')
              const pushResult = autoPushResponse.data || {}
              if (pushResult.success) {
                for (const report of batch) {
                  await this._refreshReportErpStatusFromServer(report.report_date)
                }
              }
            } catch (e) {
              console.warn('触发服务端ERP自动推送失败:', e)
            }
          } else {
            for (const report of batch) {
              results.failed++
              results.errors.push({ id: report.id, reportNo: report.report_no, error: '批量上传失败' })
              await db.updateDailyReportSyncStatus(report.id, 2, '批量上传失败')
            }
          }
        } catch (error) {
          for (const report of batch) {
            results.failed++
            results.errors.push({ id: report.id, reportNo: report.report_no, error: error.message })
            await db.updateDailyReportSyncStatus(report.id, 2, error.message)
          }
        }
      }

      console.log(`营业日报同步完成: 成功 ${results.success} 条, 失败 ${results.failed} 条`)
      return results
    } catch (error) {
      console.error('同步营业日报失败:', error)
      throw error
    }
  }

  async pushReportToErp(reportId) {
    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    try {
      const response = await api.post(`/daily-report/${reportId}/push-erp`)
      return response.data
    } catch (error) {
      console.error('推送日报到ERP失败:', error)
      throw error
    }
  }

  async exportReportToExcel(reportDate) {
    const dateStr = typeof reportDate === 'string' ? reportDate : dayjs(reportDate).format('YYYY-MM-DD')

    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/excel', {
          params: { reportDate: dateStr },
          responseType: 'blob',
        })
        const fileName = `营业日报_${dateStr}.xlsx`
        this._saveBlobToFile(response.data, fileName)
        await this.saveReportFile(dateStr, 'xlsx', response.data)
        return true
      } catch (error) {
        console.warn('服务端Excel导出失败，使用本地生成:', error)
      }
    }

    return this._exportExcelLocal([dateStr], `营业日报_${dateStr}.xlsx`, dateStr)
  }

  async exportReportRangeToExcel(startDate, endDate) {
    const startStr = typeof startDate === 'string' ? startDate : dayjs(startDate).format('YYYY-MM-DD')
    const endStr = typeof endDate === 'string' ? endDate : dayjs(endDate).format('YYYY-MM-DD')

    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/excel/range', {
          params: { startDate: startStr, endDate: endStr },
          responseType: 'blob',
        })
        const fileName = `营业日报_${startStr}_至_${endStr}.xlsx`
        this._saveBlobToFile(response.data, fileName)
        return true
      } catch (error) {
        console.warn('服务端Excel范围导出失败，使用本地生成:', error)
      }
    }

    const dates = []
    let cur = dayjs(startStr)
    const end = dayjs(endStr)
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      dates.push(cur.format('YYYY-MM-DD'))
      cur = cur.add(1, 'day')
    }
    return this._exportExcelLocal(dates, `营业日报_${startStr}_至_${endStr}.xlsx`)
  }

  async exportReportToPdf(reportDate) {
    const dateStr = typeof reportDate === 'string' ? reportDate : dayjs(reportDate).format('YYYY-MM-DD')

    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/pdf', {
          params: { reportDate: dateStr },
          responseType: 'blob',
        })
        const fileName = `营业日报_${dateStr}.pdf`
        this._saveBlobToFile(response.data, fileName)
        await this.saveReportFile(dateStr, 'pdf', response.data)
        return true
      } catch (error) {
        console.warn('服务端PDF导出失败:', error)
        message.error('PDF导出失败，请在联网状态下重试')
        return false
      }
    } else {
      message.warning('离线状态下无法生成PDF，请联网后重试')
      return false
    }
  }

  async exportReportRangeToPdf(startDate, endDate) {
    const startStr = typeof startDate === 'string' ? startDate : dayjs(startDate).format('YYYY-MM-DD')
    const endStr = typeof endDate === 'string' ? endDate : dayjs(endDate).format('YYYY-MM-DD')

    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/pdf/range', {
          params: { startDate: startStr, endDate: endStr },
          responseType: 'blob',
        })
        const fileName = `营业日报_${startStr}_至_${endStr}.pdf`
        this._saveBlobToFile(response.data, fileName)
        return true
      } catch (error) {
        console.warn('服务端PDF范围导出失败:', error)
        message.error('PDF导出失败，请在联网状态下重试')
        return false
      }
    } else {
      message.warning('离线状态下无法生成PDF，请联网后重试')
      return false
    }
  }

  async _exportExcelLocal(dates, fileName, singleDate = null) {
    const reports = []
    for (const dateStr of dates) {
      const report = await db.getDailyReportByDate(dateStr)
      if (report) {
        reports.push(report)
      } else {
        try {
          const newReport = await db.generateDailyReport(dateStr)
          reports.push(newReport)
        } catch (e) {
          console.warn(`生成 ${dateStr} 日报失败:`, e)
        }
      }
    }

    if (reports.length === 0) {
      throw new Error('没有可导出的日报数据')
    }

    const headers = [
      '报表日期', '报表编号', '订单总数', '营业总额', '优惠金额',
      '退菜金额', '实收金额', '现金', '微信', '支付宝',
      '会员卡', '其他支付', '会员折扣', '积分抵扣', '商品总数',
      '客单价', '新增会员数', '收银员', '同步状态', 'ERP推送状态', '备注'
    ]

    const rows = reports.map((r) => ({
      '报表日期': r.report_date,
      '报表编号': r.report_no,
      '订单总数': r.total_orders,
      '营业总额': Number(r.total_amount || 0),
      '优惠金额': Number(r.discount_amount || 0),
      '退菜金额': Number(r.refund_amount || 0),
      '实收金额': Number(r.actual_amount || 0),
      '现金': Number(r.cash_amount || 0),
      '微信': Number(r.wechat_amount || 0),
      '支付宝': Number(r.alipay_amount || 0),
      '会员卡': Number(r.member_card_amount || 0),
      '其他支付': Number(r.other_pay_amount || 0),
      '会员折扣': Number(r.member_discount_amount || 0),
      '积分抵扣': Number(r.points_deduction_amount || 0),
      '商品总数': r.total_items,
      '客单价': Number(r.avg_order_amount || 0),
      '新增会员数': r.new_member_count,
      '收银员': r.cashier_name || '',
      '同步状态': this._getSyncStatusText(r.sync_status),
      'ERP推送状态': this._getErpPushStatusText(r.erp_push_status),
      '备注': r.remark || ''
    }))

    if (reports.length > 1) {
      const totals = this._calculateTotals(reports)
      rows.push({
        '报表日期': '合计',
        '报表编号': '',
        '订单总数': totals.totalOrders,
        '营业总额': totals.totalAmount,
        '优惠金额': totals.discountAmount,
        '退菜金额': totals.refundAmount,
        '实收金额': totals.actualAmount,
        '现金': totals.cashAmount,
        '微信': totals.wechatAmount,
        '支付宝': totals.alipayAmount,
        '会员卡': totals.memberCardAmount,
        '其他支付': totals.otherPayAmount,
        '会员折扣': totals.memberDiscountAmount,
        '积分抵扣': totals.pointsDeductionAmount,
        '商品总数': totals.totalItems,
        '客单价': totals.avgOrderAmount,
        '新增会员数': totals.newMemberCount,
        '收银员': '',
        '同步状态': '',
        'ERP推送状态': '',
        '备注': ''
      })
    }

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })

    const cols = headers.map(h => ({ wch: Math.max(h.length * 2 + 2, 12) }))
    ws['!cols'] = cols

    const wb = XLSX.utils.book_new()
    const sheetName = reports.length === 1 && singleDate ? singleDate : '日报汇总'
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    this._saveBlobToFile(blob, fileName)

    if (singleDate) {
      await this.saveReportFile(singleDate, 'xlsx', blob)
    }

    return true
  }

  _calculateTotals(reports) {
    let totalOrders = 0
    let totalAmount = 0
    let discountAmount = 0
    let refundAmount = 0
    let actualAmount = 0
    let cashAmount = 0
    let wechatAmount = 0
    let alipayAmount = 0
    let memberCardAmount = 0
    let otherPayAmount = 0
    let memberDiscountAmount = 0
    let pointsDeductionAmount = 0
    let totalItems = 0
    let newMemberCount = 0

    for (const r of reports) {
      totalOrders += parseInt(r.total_orders) || 0
      totalAmount += parseFloat(r.total_amount) || 0
      discountAmount += parseFloat(r.discount_amount) || 0
      refundAmount += parseFloat(r.refund_amount) || 0
      actualAmount += parseFloat(r.actual_amount) || 0
      cashAmount += parseFloat(r.cash_amount) || 0
      wechatAmount += parseFloat(r.wechat_amount) || 0
      alipayAmount += parseFloat(r.alipay_amount) || 0
      memberCardAmount += parseFloat(r.member_card_amount) || 0
      otherPayAmount += parseFloat(r.other_pay_amount) || 0
      memberDiscountAmount += parseFloat(r.member_discount_amount) || 0
      pointsDeductionAmount += parseFloat(r.points_deduction_amount) || 0
      totalItems += parseInt(r.total_items) || 0
      newMemberCount += parseInt(r.new_member_count) || 0
    }

    const avgOrderAmount = totalOrders > 0 ? Number((actualAmount / totalOrders).toFixed(2)) : 0

    return {
      totalOrders,
      totalAmount: Number(totalAmount.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      refundAmount: Number(refundAmount.toFixed(2)),
      actualAmount: Number(actualAmount.toFixed(2)),
      cashAmount: Number(cashAmount.toFixed(2)),
      wechatAmount: Number(wechatAmount.toFixed(2)),
      alipayAmount: Number(alipayAmount.toFixed(2)),
      memberCardAmount: Number(memberCardAmount.toFixed(2)),
      otherPayAmount: Number(otherPayAmount.toFixed(2)),
      memberDiscountAmount: Number(memberDiscountAmount.toFixed(2)),
      pointsDeductionAmount: Number(pointsDeductionAmount.toFixed(2)),
      totalItems,
      avgOrderAmount,
      newMemberCount
    }
  }

  _saveBlobToFile(blob, fileName) {
    saveAs(blob, fileName)
  }

  async saveReportFile(dateStr, format, blob) {
    try {
      const store = this.reportFileStoreName
      const key = `${dateStr}_${format}`
      const fileData = {
        key,
        date: dateStr,
        format,
        blob: blob ? await this._blobToArrayBuffer(blob) : null,
        generated_at: new Date().toISOString(),
      }
      if (db[store]) {
        await db[store].put(fileData)
      } else {
        try {
          localStorage.setItem(`report_file_${key}`, JSON.stringify({
            key, date: dateStr, format, generated_at: fileData.generated_at
          }))
        } catch (e) { }
      }
    } catch (e) {
      console.warn('保存报表文件到本地存储失败:', e)
    }
  }

  async getReportFile(dateStr, format) {
    try {
      const key = `${dateStr}_${format}`
      const store = this.reportFileStoreName
      if (db[store]) {
        const data = await db[store].get(key)
        if (data && data.blob) {
          const blob = this._arrayBufferToBlob(data.blob, format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          return { blob, generated_at: data.generated_at }
        }
      }
    } catch (e) { }
    return null
  }

  _blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })
  }

  _arrayBufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType })
  }

  _getSyncStatusText(status) {
    switch (status) {
      case 0: return '未同步'
      case 1: return '已同步'
      case 2: return '同步失败'
      default: return '未知'
    }
  }

  _getErpPushStatusText(status) {
    switch (status) {
      case 0: return '未推送'
      case 1: return '已推送'
      case 2: return '推送失败'
      default: return '未知'
    }
  }

  async _refreshReportErpStatusFromServer(reportDate) {
    try {
      if (!navigator.onLine) return
      const response = await api.get(`/daily-report/date/${reportDate}`)
      const serverReport = response.data
      if (serverReport && serverReport.report_no) {
        const localReport = await db.getDailyReportByDate(reportDate)
        if (localReport) {
          if (serverReport.erp_push_status !== undefined && serverReport.erp_push_status !== localReport.erp_push_status) {
            await db.updateDailyReportErpPushStatus(localReport.id, serverReport.erp_push_status, serverReport.erp_push_error)
          }
          if (serverReport.sync_status !== undefined && serverReport.sync_status !== localReport.sync_status) {
            await db.updateDailyReportSyncStatus(localReport.id, serverReport.sync_status, serverReport.sync_error)
          }
          if (serverReport.report_no && serverReport.report_no !== localReport.report_no) {
            await db.daily_reports.update(localReport.id, { 
              report_no: serverReport.report_no,
              sync_time: serverReport.sync_time,
              erp_push_time: serverReport.erp_push_time
            })
          }
        }
      }
    } catch (e) {
      console.warn('从服务端刷新日报状态失败:', e)
    }
  }

  async _saveReportFilesLocal(dateStr, report) {
    try {
      const reports = [report]
      const headers = [
        '报表日期', '报表编号', '订单总数', '营业总额', '优惠金额',
        '退菜金额', '实收金额', '现金', '微信', '支付宝',
        '会员卡', '其他支付', '会员折扣', '积分抵扣', '商品总数',
        '客单价', '新增会员数', '收银员', '同步状态', 'ERP推送状态', '备注'
      ]

      const rows = reports.map((r) => ({
        '报表日期': r.report_date,
        '报表编号': r.report_no,
        '订单总数': r.total_orders,
        '营业总额': Number(r.total_amount || 0),
        '优惠金额': Number(r.discount_amount || 0),
        '退菜金额': Number(r.refund_amount || 0),
        '实收金额': Number(r.actual_amount || 0),
        '现金': Number(r.cash_amount || 0),
        '微信': Number(r.wechat_amount || 0),
        '支付宝': Number(r.alipay_amount || 0),
        '会员卡': Number(r.member_card_amount || 0),
        '其他支付': Number(r.other_pay_amount || 0),
        '会员折扣': Number(r.member_discount_amount || 0),
        '积分抵扣': Number(r.points_deduction_amount || 0),
        '商品总数': r.total_items,
        '客单价': Number(r.avg_order_amount || 0),
        '新增会员数': r.new_member_count,
        '收银员': r.cashier_name || '',
        '同步状态': this._getSyncStatusText(r.sync_status),
        'ERP推送状态': this._getErpPushStatusText(r.erp_push_status),
        '备注': r.remark || ''
      }))

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
      const cols = headers.map(h => ({ wch: Math.max(h.length * 2 + 2, 12) }))
      ws['!cols'] = cols
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '营业日报')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      await this.saveReportFile(dateStr, 'xlsx', excelBlob)

      if (navigator.onLine) {
        try {
          const pdfResponse = await api.get('/daily-report/export/pdf', {
            params: { reportDate: dateStr },
            responseType: 'blob',
          })
          await this.saveReportFile(dateStr, 'pdf', pdfResponse.data)
        } catch (e) {
          console.warn('离线状态下无法生成PDF，联网后自动重试:', e)
        }
      }
    } catch (e) {
      console.error('保存日报文件失败:', e)
    }
  }

  async getReportSummary(reportDate) {
    const report = await this.getReportByDate(reportDate)
    if (!report) {
      return null
    }

    return {
      totalOrders: report.total_orders,
      totalAmount: report.total_amount,
      actualAmount: report.actual_amount,
      refundAmount: report.refund_amount,
      discountAmount: report.discount_amount,
    }
  }
}

const dailyReportService = new DailyReportService()
export default dailyReportService

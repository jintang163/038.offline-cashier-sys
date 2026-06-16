import db from '../db/dexie'
import api from '../api/request'
import dayjs from 'dayjs'

class DailyReportService {
  constructor() {
    this.generating = false
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
      const reportsToSync = await db.getUnsyncedDailyReports(50)

      if (reportsToSync.length === 0) {
        console.log('没有需要同步的营业日报')
        return { success: true, count: 0 }
      }

      console.log(`需要同步 ${reportsToSync.length} 条营业日报`)

      const results = { success: 0, failed: 0, errors: [] }
      const batchSize = 20

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
            report_status: r.report_status,
            sync_attempts: r.sync_attempts || 0,
            sync_error: r.sync_error,
            remark: r.remark,
            created_at: r.created_at,
          }))

          const response = await api.post('/daily-report/batch-save', batchData)
          const result = response.data || {}

          if (result === true || result.success) {
            for (const report of batch) {
              await db.updateDailyReportSyncStatus(report.id, 1)
              results.success++
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
    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/excel', {
          params: { reportDate },
          responseType: 'blob',
        })
        this._downloadFile(response.data, `daily_report_${reportDate}.xlsx`)
        return true
      } catch (error) {
        console.warn('服务端导出失败，尝试本地导出:', error)
      }
    }
    return this._exportReportToExcelLocal(reportDate)
  }

  async exportReportRangeToExcel(startDate, endDate) {
    if (navigator.onLine) {
      try {
        const response = await api.get('/daily-report/export/excel/range', {
          params: { startDate, endDate },
          responseType: 'blob',
        })
        this._downloadFile(response.data, `daily_report_${startDate}_${endDate}.xlsx`)
        return true
      } catch (error) {
        console.warn('服务端导出失败，尝试本地导出:', error)
      }
    }
    return this._exportReportRangeToExcelLocal(startDate, endDate)
  }

  async _exportReportToExcelLocal(reportDate) {
    const report = await db.getDailyReportByDate(reportDate)
    if (!report) {
      throw new Error('日报不存在')
    }
    return this._generateExcelFile([report], `daily_report_${reportDate}.xlsx`)
  }

  async _exportReportRangeToExcelLocal(startDate, endDate) {
    const result = await db.getDailyReportList({ startDate, endDate, page: 1, pageSize: 1000 })
    if (!result.items || result.items.length === 0) {
      throw new Error('该日期范围内没有日报数据')
    }
    return this._generateExcelFile(result.items, `daily_report_${startDate}_${endDate}.xlsx`)
  }

  _generateExcelFile(reports, fileName) {
    const headers = [
      '报表日期', '报表编号', '订单总数', '营业总额', '优惠金额',
      '退菜金额', '实收金额', '现金', '微信', '支付宝',
      '会员卡', '其他支付', '会员折扣', '积分抵扣', '商品总数',
      '客单价', '新增会员数', '收银员', '同步状态', 'ERP推送状态', '备注'
    ]

    const rows = reports.map((r) => [
      r.report_date,
      r.report_no,
      r.total_orders,
      r.total_amount,
      r.discount_amount,
      r.refund_amount,
      r.actual_amount,
      r.cash_amount,
      r.wechat_amount,
      r.alipay_amount,
      r.member_card_amount,
      r.other_pay_amount,
      r.member_discount_amount,
      r.points_deduction_amount,
      r.total_items,
      r.avg_order_amount,
      r.new_member_count,
      r.cashier_name || '',
      this._getSyncStatusText(r.sync_status),
      this._getErpPushStatusText(r.erp_push_status),
      r.remark || ''
    ])

    if (reports.length > 1) {
      const totals = this._calculateTotals(reports)
      rows.push(totals)
    }

    const csvContent = this._arrayToCsv([headers, ...rows])
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const csvFileName = fileName.replace('.xlsx', '.csv')
    this._downloadFile(blob, csvFileName)
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

    const avgOrderAmount = totalOrders > 0 ? (actualAmount / totalOrders).toFixed(2) : '0.00'

    return [
      '合计', '', totalOrders, totalAmount.toFixed(2), discountAmount.toFixed(2),
      refundAmount.toFixed(2), actualAmount.toFixed(2), cashAmount.toFixed(2),
      wechatAmount.toFixed(2), alipayAmount.toFixed(2), memberCardAmount.toFixed(2),
      otherPayAmount.toFixed(2), memberDiscountAmount.toFixed(2), pointsDeductionAmount.toFixed(2),
      totalItems, avgOrderAmount, newMemberCount, '', '', '', ''
    ]
  }

  _arrayToCsv(data) {
    return data.map((row) =>
      row.map((cell) => {
        const cellStr = String(cell ?? '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"'
        }
        return cellStr
      }).join(',')
    ).join('\n')
  }

  _downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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

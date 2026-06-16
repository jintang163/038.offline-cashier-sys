const stockCheckApi = require('../../api/stockCheck.js')
const stockCheckDB = require('../../utils/stockCheckDB.js')
const network = require('../../utils/network.js')

const app = getApp()

Page({
  data: {
    taskId: null,
    task: null,
    unsyncedItems: [],
    unsyncedRecords: [],
    uploadProgress: 0,
    uploading: false,
    uploadComplete: false,
    networkStatus: true,
    taskStatusMap: {
      0: '草稿',
      1: '已发布',
      2: '进行中',
      3: '已完成',
      4: '已取消'
    },
    checkModeMap: {
      1: '全盘',
      2: '抽盘'
    }
  },

  onLoad(options) {
    const taskId = parseInt(options.taskId)
    this.setData({ taskId })
    this.checkNetwork()
    this.loadData()
  },

  onShow() {
    if (this.data.taskId) {
      this.loadData()
    }
  },

  checkNetwork() {
    network.getNetworkType().then(status => {
      this.setData({
        networkStatus: status.available
      })
    })
  },

  async loadData() {
    try {
      const taskDetail = await stockCheckDB.getLocalTaskDetail(this.data.taskId)
      const unsyncedItems = await stockCheckDB.getUnsyncedItems(this.data.taskId)
      const unsyncedRecords = await stockCheckDB.getUnsyncedRecords(this.data.taskId)

      this.setData({
        task: taskDetail,
        unsyncedItems,
        unsyncedRecords
      })
    } catch (err) {
      console.error('加载数据失败', err)
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      })
    }
  },

  async uploadData() {
    if (!this.data.networkStatus) {
      wx.showToast({
        title: '当前无网络，请检查网络连接',
        icon: 'none'
      })
      return
    }

    if (this.data.unsyncedItems.length === 0 && this.data.unsyncedRecords.length === 0) {
      wx.showToast({
        title: '没有需要上传的数据',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认上传',
      content: `将上传 ${this.data.unsyncedItems.length} 条盘点数据和 ${this.data.unsyncedRecords.length} 条扫码记录，是否继续？`,
      confirmText: '确认上传',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doUpload()
        }
      }
    })
  },

  async doUpload() {
    this.setData({
      uploading: true,
      uploadProgress: 0
    })

    wx.showLoading({
      title: '准备数据...',
      mask: true
    })

    try {
      const items = this.data.unsyncedItems.map(item => ({
        id: item.id,
        actualStock: item.actual_stock,
        checkStatus: item.check_status,
        remark: item.remark,
        isDeleted: item.is_deleted || 0
      }))

      const records = this.data.unsyncedRecords.map(record => ({
        localId: record.local_id,
        itemId: record.item_id,
        barcode: record.barcode,
        scanQuantity: record.scan_quantity,
        inputQuantity: record.input_quantity,
        scanTime: record.scan_time,
        deviceId: record.device_id,
        remark: record.remark,
        isDeleted: record.is_deleted || 0
      }))

      const uploadData = {
        taskId: this.data.taskId,
        items,
        records,
        operatorId: app.globalData.userId || 1,
        operatorName: app.globalData.userName || '库管员'
      }

      this.setData({ uploadProgress: 30 })
      wx.showLoading({
        title: '上传中...',
        mask: true
      })

      await stockCheckApi.uploadCheckData(uploadData)

      this.setData({ uploadProgress: 70 })
      wx.showLoading({
        title: '同步本地状态...',
        mask: true
      })

      await stockCheckDB.markRecordsSynced(this.data.taskId)

      this.setData({ uploadProgress: 90 })

      if (this.data.task && this.data.task.task_status !== 3) {
        try {
          const checkedItems = items.filter(item => item.checkStatus === 1)
          const totalItems = this.data.task.items ? this.data.task.items.length : 0
          
          if (checkedItems.length >= totalItems * 0.9) {
            await stockCheckApi.finishTask(this.data.taskId)
            await stockCheckDB.updateTaskStatus(
              this.data.taskId,
              3,
              null,
              new Date().toISOString()
            )
          } else {
            await stockCheckDB.updateTaskStatus(this.data.taskId, 2)
          }
        } catch (err) {
          console.warn('更新任务状态失败', err)
        }
      }

      this.setData({
        uploadProgress: 100,
        uploadComplete: true,
        uploading: false,
        unsyncedItems: [],
        unsyncedRecords: []
      })

      wx.hideLoading()

      wx.showModal({
        title: '上传成功',
        content: `成功上传 ${items.length} 条盘点数据和 ${records.length} 条扫码记录`,
        showCancel: false,
        confirmText: '确定',
        success: () => {
          this.loadData()
        }
      })

    } catch (err) {
      console.error('上传失败', err)
      this.setData({
        uploading: false,
        uploadProgress: 0
      })
      wx.hideLoading()
      wx.showModal({
        title: '上传失败',
        content: err.message || '网络异常，请稍后重试',
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  goBack() {
    wx.navigateBack()
  },

  goToTaskList() {
    wx.switchTab({
      url: '/pages/stock-check/task-list'
    })
  },

  calculateDiff() {
    if (!this.data.networkStatus) {
      wx.showToast({
        title: '当前无网络，请检查网络连接',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '计算差异',
      content: '确认后系统将自动计算盘点差异并生成差异表，是否继续？',
      confirmText: '确认计算',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '计算中...',
            mask: true
          })

          try {
            await stockCheckApi.calculateDiff(this.data.taskId)
            wx.hideLoading()
            wx.showToast({
              title: '差异计算完成',
              icon: 'success'
            })
          } catch (err) {
            console.error('差异计算失败', err)
            wx.hideLoading()
            wx.showToast({
              title: '差异计算失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})

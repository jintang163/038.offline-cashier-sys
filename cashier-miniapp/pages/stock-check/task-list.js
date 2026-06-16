const stockCheckApi = require('../../api/stockCheck.js')
const stockCheckDB = require('../../utils/stockCheckDB.js')
const sqlite = require('../../utils/sqlite.js')
const network = require('../../utils/network.js')

const app = getApp()

Page({
  data: {
    tasks: [],
    loading: false,
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
    },
    taskTypeMap: {
      1: '日常盘点',
      2: '月度盘点',
      3: '季度盘点',
      4: '年度盘点'
    }
  },

  onLoad() {
    this.init()
    this.checkNetwork()
  },

  onShow() {
    this.loadLocalTasks()
  },

  onPullDownRefresh() {
    this.loadTasks()
  },

  init() {
    sqlite.openDB().then(() => {
      this.loadLocalTasks()
    }).catch(err => {
      console.error('数据库初始化失败', err)
      wx.showToast({
        title: '数据库初始化失败',
        icon: 'none'
      })
    })
  },

  checkNetwork() {
    network.getNetworkType().then(status => {
      this.setData({
        networkStatus: status.available
      })
    })
  },

  loadLocalTasks() {
    stockCheckDB.getLocalTasks().then(tasks => {
      this.setData({
        tasks: tasks.map(task => ({
          ...task,
          statusText: this.data.taskStatusMap[task.task_status] || '未知',
          modeText: this.data.checkModeMap[task.check_mode] || '未知',
          typeText: this.data.taskTypeMap[task.task_type] || '未知'
        }))
      })
    }).catch(err => {
      console.error('加载本地任务失败', err)
    })
  },

  async loadTasks() {
    if (!this.data.networkStatus) {
      wx.showToast({
        title: '当前无网络，请检查网络连接',
        icon: 'none'
      })
      wx.stopPullDownRefresh()
      return
    }

    this.setData({ loading: true })
    try {
      const lastSyncTime = wx.getStorageSync('lastTaskSyncTime') || null
      const result = await stockCheckApi.getTaskList(app.globalData.shopId, lastSyncTime)
      
      if (result && result.length > 0) {
        for (const task of result) {
          await stockCheckDB.saveTask(task)
        }
        wx.setStorageSync('lastTaskSyncTime', new Date().toISOString())
      }
      
      await this.loadLocalTasks()
      
      wx.showToast({
        title: `同步成功${result.length > 0 ? '，更新' + result.length + '个任务' : ''}`,
        icon: 'success'
      })
    } catch (err) {
      console.error('加载任务失败', err)
      wx.showToast({
        title: '加载任务失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  async downloadTask(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    
    if (!task) {
      wx.showToast({
        title: '任务不存在',
        icon: 'none'
      })
      return
    }

    if (task.task_status !== 1 && task.task_status !== 2) {
      wx.showToast({
        title: '该任务不可下载',
        icon: 'none'
      })
      return
    }

    if (!this.data.networkStatus) {
      wx.showToast({
        title: '当前无网络，请检查网络连接',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '下载中...',
      mask: true
    })

    try {
      const result = await stockCheckApi.downloadTask(taskId)
      await stockCheckDB.saveTask(result)
      await stockCheckDB.saveTaskItems(taskId, result.items)
      
      wx.showToast({
        title: '下载成功，共' + result.items.length + '个商品',
        icon: 'success'
      })
      
      setTimeout(() => {
        this.goToDetail(taskId)
      }, 1500)
    } catch (err) {
      console.error('下载任务失败', err)
      wx.showToast({
        title: '下载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  goToDetail(e) {
    const taskId = typeof e === 'number' ? e : e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/stock-check/task-detail?taskId=${taskId}`
    })
  },

  goToScan(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    
    if (!task) {
      wx.showToast({
        title: '任务不存在',
        icon: 'none'
      })
      return
    }

    if (task.task_status === 0 || task.task_status === 4) {
      wx.showToast({
        title: '该任务不可进行盘点',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/stock-check/scan-check?taskId=${taskId}`
    })
  },

  goToUpload(e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/stock-check/upload?taskId=${taskId}`
    })
  }
})

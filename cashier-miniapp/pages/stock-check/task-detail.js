const stockCheckDB = require('../../utils/stockCheckDB.js')

Page({
  data: {
    taskId: null,
    items: [],
    progress: {
      total: 0,
      checked: 0,
      progress: 0
    },
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
    categoryGroups: [],
    activeCategory: 'all',
    filteredItems: []
  },

  onLoad(options) {
    this.setData({
      taskId: parseInt(options.taskId)
    })
    this.loadTaskDetail()
  },

  onShow() {
    this.loadTaskDetail()
  },

  async loadTaskDetail() {
    wx.showLoading({
      title: '加载中...'
    })

    try {
      const result = await stockCheckDB.getLocalTaskDetail(this.data.taskId)
      
      if (!result) {
        wx.hideLoading()
        wx.showToast({
          title: '任务不存在',
          icon: 'none'
        })
        return
      }

      const items = result.items || []
      const categories = [...new Set(items.map(item => item.category_name).filter(Boolean)]
      
      const categoryGroups = [{
        name: '全部',
        key: 'all',
        count: items.length,
        checked: items.filter(i => i.check_status === 1).length
      }]
      
      categories.forEach(cat => {
        const catItems = items.filter(i => i.category_name === cat)
        categoryGroups.push({
          name: cat,
          key: cat,
          count: catItems.length,
          checked: catItems.filter(i => i.check_status === 1).length
        })
      })

      const progress = await stockCheckDB.getCheckProgress(this.data.taskId)

      this.setData({
        task: {
          ...result,
          statusText: this.data.taskStatusMap[result.task_status] || '未知',
          modeText: this.data.checkModeMap[result.check_mode] || '未知'
        },
        items: items.map(item => ({
          ...item,
          statusText: item.check_status === 1 ? '已盘' : '未盘'
        })),
        categoryGroups,
        progress
      })

      this.filterItems()
    } catch (err) {
      console.error('加载任务详情失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  switchCategory(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      activeCategory: key
    })
    this.filterItems()
  },

  filterItems() {
    const { activeCategory, items } = this.data
    let filteredItems = items

    if (activeCategory !== 'all') {
      filteredItems = items.filter(item => item.category_name === activeCategory)
    }

    this.setData({
      filteredItems
    })
  },

  async updateQuantity(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const value = parseInt(e.detail.value)
    
    if (value === '' || isNaN(value)) {
      return
    }

    try {
      await stockCheckDB.updateTaskItem(itemId, {
      actual_stock: value,
      check_status: 1
    })

      const items = this.data.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            actual_stock: value,
            check_status: 1,
            statusText: '已盘'
          }
        }
        return item
      })

      const progress = await stockCheckDB.getCheckProgress(this.data.taskId)

      const categoryGroups = this.data.categoryGroups.map(group => {
        if (group.key === 'all') {
          return {
            ...group,
            checked: progress.checked
          }
        }
        const catItems = items.filter(i => i.category_name === group.key)
        return {
          ...group,
          checked: catItems.filter(i => i.check_status === 1).length
        }
      })

      this.setData({
        items,
        progress,
        categoryGroups
      })

      this.filterItems()

      wx.showToast({
        title: '已保存',
        icon: 'success',
        duration: 1000
      })
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  goToScan() {
    const { taskId, task } = this.data
    if (!task) return
    
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

  goToUpload() {
    const { taskId, task } = this.data
    if (!task) return
    
    wx.navigateTo({
      url: `/pages/stock-check/upload?taskId=${taskId}`
    })
  }
})

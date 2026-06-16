const stockCheckDB = require('../../utils/stockCheckDB.js')
const network = require('../../utils/network.js')

const app = getApp()

Page({
  data: {
    taskId: null,
    task: null,
    items: [],
    scanRecords: [],
    currentItem: null,
    inputQuantity: '',
    scanQuantity: 1,
    networkStatus: true,
    progress: {
      total: 0,
      checked: 0,
      progress: 0
    }
  },

  onLoad(options) {
    this.setData({
      taskId: parseInt(options.taskId)
    })
    this.init()
    this.checkNetwork()
  },

  onShow() {
    this.loadData()
  },

  async init() {
    await this.loadData()
  },

  checkNetwork() {
    network.getNetworkType().then(status => {
      this.setData({
        networkStatus: status.available
      })
    })
  },

  async loadData() {
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
      const progress = await stockCheckDB.getCheckProgress(this.data.taskId)

      this.setData({
        task: result,
        items: items.map(item => ({
          ...item,
          statusText: item.check_status === 1 ? '已盘' : '未盘'
        })),
        progress
      })

      await this.loadScanRecords()
    } catch (err) {
      console.error('加载数据失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  async loadScanRecords() {
    try {
      const records = await stockCheckDB.getUnsyncedRecords(this.data.taskId)
      this.setData({
        scanRecords: records
      })
    } catch (err) {
      console.error('加载扫码记录失败', err)
    }
  },

  scanCode() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: async (res) => {
        const barcode = res.result
        console.log('扫码结果:', barcode)
        
        wx.vibrateShort({
          type: 'medium'
        })

        await this.processBarcode(barcode)
      },
      fail: (err) => {
        console.error('扫码失败', err)
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({
            title: '扫码失败',
            icon: 'none'
          })
        }
      }
    })
  },

  async processBarcode(barcode) {
    if (!barcode || barcode.trim() === '') {
      wx.showToast({
        title: '无效的条码',
        icon: 'none'
      })
      return
    }

    try {
      let items = await stockCheckDB.getItemByBarcode(this.data.taskId, barcode)
      
      if (items.length === 0 && this.data.networkStatus) {
        try {
          const stockCheckApi = require('../../api/stockCheck.js')
          const remoteItem = await stockCheckApi.getItemByBarcode(this.data.taskId, barcode)
          if (remoteItem) {
            items = [remoteItem]
          }
        } catch (err) {
          console.error('从服务器查询条码失败', err)
        }
      }

      if (items.length === 0) {
        wx.showModal({
          title: '未找到商品',
          content: `条码 ${barcode} 不在本次盘点清单中，是否手动添加？`,
          success: async (res) => {
            if (res.confirm) {
              this.showManualInput(barcode)
            }
          }
        })
        return
      }

      const item = items[0]
      this.setData({
        currentItem: item,
        scanQuantity: 1,
        inputQuantity: ''
      })

      wx.showModal({
        title: '扫码成功',
        content: `商品：${item.product_name}\n理论库存：${item.theoretical_stock} ${item.unit}\n请输入实盘数量`,
        editable: true,
        placeholderText: '请输入实盘数量',
        success: async (res) => {
          if (res.confirm) {
            const quantity = parseInt(res.content)
            if (isNaN(quantity) || quantity < 0) {
              wx.showToast({
                title: '请输入有效的数量',
                icon: 'none'
              })
              return
            }
            await this.saveQuantity(item, quantity, barcode)
          }
        }
      })
    } catch (err) {
      console.error('处理条码失败', err)
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      })
    }
  },

  async saveQuantity(item, quantity, barcode) {
    wx.showLoading({
      title: '保存中...'
    })

    try {
      await stockCheckDB.updateTaskItem(item.id, {
        actual_stock: quantity,
        check_status: 1
      })

      const operator = wx.getStorageSync('userInfo') || {}
      await stockCheckDB.addScanRecord({
        taskId: this.data.taskId,
        taskNo: this.data.task.task_no,
        itemId: item.id,
        productId: item.product_id,
        erpGoodsId: item.erp_goods_id,
        barcode: barcode,
        inputQuantity: quantity,
        operatorId: operator.id || 1,
        operatorName: operator.nickname || '库管员',
        deviceId: app.globalData.deviceId || 'unknown'
      })

      const items = this.data.items.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            actual_stock: quantity,
            check_status: 1,
            statusText: '已盘'
          }
        }
        return i
      })

      const progress = await stockCheckDB.getCheckProgress(this.data.taskId)

      this.setData({
        items,
        progress,
        currentItem: null
      })

      await this.loadScanRecords()

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      })
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  showManualInput(barcode) {
    wx.showModal({
      title: '手动录入',
      content: '请输入商品名称或选择商品',
      editable: true,
      placeholderText: '输入商品名称搜索',
      success: async (res) => {
        if (res.confirm && res.content) {
          const keyword = res.content.trim()
          const filteredItems = this.data.items.filter(item => 
            item.product_name.includes(keyword) || 
            item.erp_goods_id === keyword
          )
          
          if (filteredItems.length === 0) {
            wx.showToast({
              title: '未找到匹配商品',
              icon: 'none'
            })
            return
          }

          const item = filteredItems[0]
          wx.showModal({
            title: '确认商品',
            content: `是否选择：${item.product_name}`,
            success: async (res2) => {
              if (res2.confirm) {
                wx.showModal({
                  title: '输入数量',
                  content: `理论库存：${item.theoretical_stock} ${item.unit}`,
                  editable: true,
                  placeholderText: '请输入实盘数量',
                  success: async (res3) => {
                    if (res3.confirm) {
                      const quantity = parseInt(res3.content)
                      if (!isNaN(quantity) && quantity >= 0) {
                        await this.saveQuantity(item, quantity, barcode)
                      } else {
                        wx.showToast({
                          title: '请输入有效的数量',
                          icon: 'none'
                        })
                      }
                    }
                  }
                })
              }
            }
          })
        }
      }
    })
  },

  onQuantityInput(e) {
    this.setData({
      inputQuantity: e.detail.value
    })
  },

  onQuantityChange(e) {
    const itemId = e.currentTarget.dataset.id
    const value = parseInt(e.detail.value)
    
    if (value === '' || isNaN(value)) {
      return
    }

    const item = this.data.items.find(i => i.id === itemId)
    if (!item) return

    this.saveQuantity(item, value, item.barcode)
  },

  async deleteRecord(e) {
    const localId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条扫码记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await stockCheckDB.deleteScanRecord(localId)
            await this.loadScanRecords()
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
          } catch (err) {
            console.error('删除失败', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  viewItemDetail(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === itemId)
    if (!item) return

    wx.showModal({
      title: item.product_name,
      content: `分类：${item.category_name}\n条码：${item.barcode || '-'}\n单位：${item.unit}\n单价：¥${item.price}\n理论库存：${item.theoretical_stock}\n实盘数量：${item.actual_stock !== null ? item.actual_stock : '未录入'}`,
      showCancel: false
    })
  },

  goToUpload() {
    wx.navigateTo({
      url: `/pages/stock-check/upload?taskId=${this.data.taskId}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})

function checkNetwork() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success(res) {
        const isOnline = res.networkType !== 'none'
        resolve(isOnline)
      },
      fail() {
        resolve(false)
      }
    })
  })
}

function getNetworkType() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success(res) {
        resolve({
          networkType: res.networkType,
          available: res.networkType !== 'none'
        })
      },
      fail() {
        resolve({
          networkType: 'unknown',
          available: false
        })
      }
    })
  })
}

function isOnline() {
  const app = getApp()
  return app.globalData.isOnline
}

function showOfflineToast() {
  wx.showToast({
    title: '当前处于离线状态',
    icon: 'none',
    duration: 2000
  })
}

module.exports = {
  checkNetwork,
  getNetworkType,
  isOnline,
  showOfflineToast
}

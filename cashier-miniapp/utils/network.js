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
  isOnline,
  showOfflineToast
}

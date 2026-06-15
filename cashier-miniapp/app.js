const storage = require('./utils/storage.js')
const { checkNetwork } = require('./utils/network.js')

App({
  globalData: {
    isOnline: true,
    cartCount: 0,
    baseUrl: 'https://api.example.com'
  },

  onLaunch() {
    this.initCartCount()
    this.checkNetworkStatus()
    this.initGoodsCache()
    this.listenNetworkChange()
  },

  initCartCount() {
    const cart = storage.getCart()
    let count = 0
    cart.forEach(item => {
      count += item.quantity
    })
    this.globalData.cartCount = count
  },

  checkNetworkStatus() {
    checkNetwork().then(isOnline => {
      this.globalData.isOnline = isOnline
    })
  },

  listenNetworkChange() {
    wx.onNetworkStatusChange(res => {
      this.globalData.isOnline = res.isConnected
      if (this.onlineCallback) {
        this.onlineCallback(res.isConnected)
      }
    })
  },

  initGoodsCache() {
    const goods = storage.getGoods()
    if (!goods || goods.length === 0) {
      const mockGoods = this.getMockGoods()
      storage.setGoods(mockGoods)
    }
  },

  getMockGoods() {
    return [
      {
        id: 1,
        name: '红烧牛肉面',
        price: 28,
        categoryId: 1,
        categoryName: '主食',
        image: '/images/food/noodle.png',
        description: '精选牛肉，秘制汤底',
        sales: 128
      },
      {
        id: 2,
        name: '蛋炒饭',
        price: 18,
        categoryId: 1,
        categoryName: '主食',
        image: '/images/food/rice.png',
        description: '粒粒分明，香气扑鼻',
        sales: 256
      },
      {
        id: 3,
        name: '宫保鸡丁',
        price: 32,
        categoryId: 2,
        categoryName: '热菜',
        image: '/images/food/chicken.png',
        description: '经典川菜，麻辣鲜香',
        sales: 189
      },
      {
        id: 4,
        name: '鱼香肉丝',
        price: 28,
        categoryId: 2,
        categoryName: '热菜',
        image: '/images/food/fish.png',
        description: '酸甜可口，下饭神器',
        sales: 167
      },
      {
        id: 5,
        name: '凉拌黄瓜',
        price: 12,
        categoryId: 3,
        categoryName: '凉菜',
        image: '/images/food/cucumber.png',
        description: '清爽开胃，夏日必备',
        sales: 234
      },
      {
        id: 6,
        name: '可乐',
        price: 6,
        categoryId: 4,
        categoryName: '饮品',
        image: '/images/food/cola.png',
        description: '冰镇可乐，畅爽一下',
        sales: 567
      },
      {
        id: 7,
        name: '柠檬茶',
        price: 8,
        categoryId: 4,
        categoryName: '饮品',
        image: '/images/food/tea.png',
        description: '新鲜柠檬，酸甜可口',
        sales: 345
      },
      {
        id: 8,
        name: '麻婆豆腐',
        price: 22,
        categoryId: 2,
        categoryName: '热菜',
        image: '/images/food/tofu.png',
        description: '麻辣鲜香，嫩滑可口',
        sales: 198
      }
    ]
  },

  getCategories() {
    return [
      { id: 1, name: '主食' },
      { id: 2, name: '热菜' },
      { id: 3, name: '凉菜' },
      { id: 4, name: '饮品' }
    ]
  }
})

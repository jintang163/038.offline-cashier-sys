import db from '../utils/db'

const mockCategories = [
  { id: 1, name: '饮料', sort: 1, status: 1 },
  { id: 2, name: '零食', sort: 2, status: 1 },
  { id: 3, name: '日用百货', sort: 3, status: 1 },
  { id: 4, name: '生鲜水果', sort: 4, status: 1 },
  { id: 5, name: '粮油调味', sort: 5, status: 1 },
]

const mockProducts = [
  { id: 1, barcode: '6901234567890', name: '可口可乐 330ml', category_id: 1, price: 3.5, stock: 100, unit: '瓶', status: 1, image: '🥤' },
  { id: 2, barcode: '6901234567891', name: '百事可乐 330ml', category_id: 1, price: 3.5, stock: 95, unit: '瓶', status: 1, image: '🥤' },
  { id: 3, barcode: '6901234567892', name: '农夫山泉 550ml', category_id: 1, price: 2.0, stock: 200, unit: '瓶', status: 1, image: '💧' },
  { id: 4, barcode: '6901234567893', name: '康师傅冰红茶', category_id: 1, price: 3.0, stock: 80, unit: '瓶', status: 1, image: '🧃' },
  { id: 5, barcode: '6901234567894', name: '蒙牛纯牛奶 250ml', category_id: 1, price: 5.5, stock: 60, unit: '盒', status: 1, image: '🥛' },
  { id: 6, barcode: '6901234567895', name: '乐事薯片 原味', category_id: 2, price: 8.5, stock: 50, unit: '袋', status: 1, image: '🥔' },
  { id: 7, barcode: '6901234567896', name: '奥利奥饼干', category_id: 2, price: 12.0, stock: 40, unit: '盒', status: 1, image: '🍪' },
  { id: 8, barcode: '6901234567897', name: '德芙巧克力', category_id: 2, price: 15.0, stock: 30, unit: '块', status: 1, image: '🍫' },
  { id: 9, barcode: '6901234567898', name: '康师傅方便面', category_id: 2, price: 5.0, stock: 120, unit: '桶', status: 1, image: '🍜' },
  { id: 10, barcode: '6901234567899', name: '三只松鼠坚果', category_id: 2, price: 25.0, stock: 25, unit: '袋', status: 1, image: '🥜' },
  { id: 11, barcode: '6901234567900', name: '心相印抽纸', category_id: 3, price: 12.0, stock: 80, unit: '包', status: 1, image: '🧻' },
  { id: 12, barcode: '6901234567901', name: '蓝月亮洗衣液', category_id: 3, price: 35.0, stock: 20, unit: '瓶', status: 1, image: '🧴' },
  { id: 13, barcode: '6901234567902', name: '高露洁牙膏', category_id: 3, price: 15.0, stock: 45, unit: '支', status: 1, image: '🪥' },
  { id: 14, barcode: '6901234567903', name: '舒肤佳香皂', category_id: 3, price: 8.0, stock: 60, unit: '块', status: 1, image: '🧼' },
  { id: 15, barcode: '6901234567904', name: '红富士苹果', category_id: 4, price: 9.9, stock: 100, unit: '斤', status: 1, image: '🍎' },
  { id: 16, barcode: '6901234567905', name: '香蕉', category_id: 4, price: 5.5, stock: 50, unit: '斤', status: 1, image: '🍌' },
  { id: 17, barcode: '6901234567906', name: '西红柿', category_id: 4, price: 4.0, stock: 80, unit: '斤', status: 1, image: '🍅' },
  { id: 18, barcode: '6901234567907', name: '黄瓜', category_id: 4, price: 3.5, stock: 70, unit: '斤', status: 1, image: '🥒' },
  { id: 19, barcode: '6901234567908', name: '金龙鱼大豆油 5L', category_id: 5, price: 65.0, stock: 15, unit: '桶', status: 1, image: '🫒' },
  { id: 20, barcode: '6901234567909', name: '海天酱油 500ml', category_id: 5, price: 12.0, stock: 40, unit: '瓶', status: 1, image: '🍶' },
  { id: 21, barcode: '6901234567910', name: '老干妈辣椒酱', category_id: 5, price: 11.0, stock: 35, unit: '瓶', status: 1, image: '🌶️' },
  { id: 22, barcode: '6901234567911', name: '东北大米 5kg', category_id: 5, price: 35.0, stock: 20, unit: '袋', status: 1, image: '🍚' },
]

const mockSettings = {
  shopName: '便民超市',
  address: '某某街道123号',
  phone: '13800138000',
  cashierName: '收银员',
  receiptFooter: '欢迎光临，谢谢惠顾！',
  printEnabled: 'true',
}

export async function initMockData() {
  try {
    const categories = await db.getCategories()
    if (categories.length === 0) {
      await db.bulkInsertCategories(
        mockCategories.map((c) => ({
          ...c,
          created_at: new Date().toISOString(),
        }))
      )
    }

    const products = await db.getProducts({ pageSize: 1 })
    if (products.total === 0) {
      await db.bulkInsertProducts(
        mockProducts.map((p) => ({
          ...p,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      )
    }

    const existingSettings = await db.getAllSettings()
    if (Object.keys(existingSettings).length === 0) {
      for (const [key, value] of Object.entries(mockSettings)) {
        await db.setSetting(key, value)
      }
    }

    console.log('Mock data initialized')
    return true
  } catch (error) {
    console.error('Failed to initialize mock data:', error)
    return false
  }
}

export { mockCategories, mockProducts, mockSettings }

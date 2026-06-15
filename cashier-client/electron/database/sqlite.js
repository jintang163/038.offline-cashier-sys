const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'cashier.db')
}

function initDatabase() {
  const dbPath = getDbPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  return db
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      unit TEXT DEFAULT '件',
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      pay_amount REAL NOT NULL DEFAULT 0,
      pay_type TEXT DEFAULT 'cash',
      cashier_id INTEGER,
      cashier_name TEXT,
      member_id INTEGER,
      member_name TEXT,
      status INTEGER DEFAULT 1,
      sync_status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      barcode TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      data TEXT NOT NULL,
      status INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_retry_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

function getProducts(params = {}) {
  const { page = 1, pageSize = 20, keyword = '', categoryId = null } = params
  let sql = 'SELECT * FROM products WHERE status = 1'
  const countSql = 'SELECT COUNT(*) as total FROM products WHERE status = 1'
  const whereClauses = []
  const values = []

  if (keyword) {
    whereClauses.push('(name LIKE ? OR barcode LIKE ?)')
    values.push(`%${keyword}%`, `%${keyword}%`)
  }

  if (categoryId) {
    whereClauses.push('category_id = ?')
    values.push(categoryId)
  }

  if (whereClauses.length > 0) {
    const whereStr = ' AND ' + whereClauses.join(' AND ')
    sql += whereStr
    countSql += whereStr
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?'
  values.push(pageSize, (page - 1) * pageSize)

  const items = db.prepare(sql).all(...values)
  const { total } = db.prepare(countSql).get(...values.slice(0, values.length - 2))

  return { items, total, page, pageSize }
}

function getProductById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
}

function getProductByBarcode(barcode) {
  return db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode)
}

function addProduct(product) {
  const stmt = db.prepare(`
    INSERT INTO products (barcode, name, category_id, price, stock, image, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    product.barcode,
    product.name,
    product.category_id || null,
    product.price || 0,
    product.stock || 0,
    product.image || null,
    product.unit || '件'
  )
  return getProductById(result.lastInsertRowid)
}

function updateProduct(id, product) {
  const stmt = db.prepare(`
    UPDATE products SET 
      barcode = ?, name = ?, category_id = ?, price = ?, stock = ?, 
      image = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  stmt.run(
    product.barcode,
    product.name,
    product.category_id || null,
    product.price || 0,
    product.stock || 0,
    product.image || null,
    product.unit || '件',
    id
  )
  return getProductById(id)
}

function deleteProduct(id) {
  const stmt = db.prepare('UPDATE products SET status = 0 WHERE id = ?')
  return stmt.run(id).changes > 0
}

function getCategories() {
  return db.prepare('SELECT * FROM categories WHERE status = 1 ORDER BY sort ASC, id ASC').all()
}

function addCategory(name, sort = 0) {
  const stmt = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)')
  const result = stmt.run(name, sort)
  return { id: result.lastInsertRowid, name, sort, status: 1 }
}

function updateCategory(id, name, sort) {
  const stmt = db.prepare('UPDATE categories SET name = ?, sort = ? WHERE id = ?')
  stmt.run(name, sort, id)
  return { id, name, sort }
}

function deleteCategory(id) {
  const stmt = db.prepare('UPDATE categories SET status = 0 WHERE id = ?')
  return stmt.run(id).changes > 0
}

function getOrders(params = {}) {
  const { page = 1, pageSize = 20, startDate, endDate, keyword = '' } = params
  let sql = 'SELECT * FROM orders WHERE 1=1'
  const countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1'
  const whereClauses = []
  const values = []

  if (startDate) {
    whereClauses.push('created_at >= ?')
    values.push(startDate)
  }
  if (endDate) {
    whereClauses.push('created_at <= ?')
    values.push(endDate)
  }
  if (keyword) {
    whereClauses.push('order_no LIKE ?')
    values.push(`%${keyword}%`)
  }

  if (whereClauses.length > 0) {
    const whereStr = ' AND ' + whereClauses.join(' AND ')
    sql += whereStr
    countSql += whereStr
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?'
  values.push(pageSize, (page - 1) * pageSize)

  const items = db.prepare(sql).all(...values)
  const { total } = db.prepare(countSql).get(...values.slice(0, values.length - 2))

  return { items, total, page, pageSize }
}

function getOrderById(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (order) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
  }
  return order
}

function createOrder(orderData) {
  const { items, ...orderInfo } = orderData
  const orderNo = generateOrderNo()

  const insertOrder = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO orders (order_no, total_amount, discount_amount, pay_amount, pay_type,
        cashier_id, cashier_name, member_id, member_name, status, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      orderNo,
      orderInfo.total_amount || 0,
      orderInfo.discount_amount || 0,
      orderInfo.pay_amount || 0,
      orderInfo.pay_type || 'cash',
      orderInfo.cashier_id || null,
      orderInfo.cashier_name || null,
      orderInfo.member_id || null,
      orderInfo.member_name || null,
      1,
      0
    )
    const orderId = result.lastInsertRowid

    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, barcode, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    items.forEach((item) => {
      itemStmt.run(
        orderId,
        item.product_id || null,
        item.product_name,
        item.barcode || null,
        item.price,
        item.quantity,
        item.subtotal
      )

      if (item.product_id) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(
          item.quantity,
          item.product_id
        )
      }
    })

    return getOrderById(orderId)
  })

  return insertOrder()
}

function generateOrderNo() {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `OD${dateStr}${random}`
}

function getOfflineQueue(status = 0) {
  return db.prepare('SELECT * FROM offline_queue WHERE status = ? ORDER BY id ASC').all(status)
}

function addOfflineQueue(action, data) {
  const stmt = db.prepare('INSERT INTO offline_queue (action, data) VALUES (?, ?)')
  const result = stmt.run(action, JSON.stringify(data))
  return result.lastInsertRowid
}

function updateOfflineQueueStatus(id, status, error = null) {
  const stmt = db.prepare(`
    UPDATE offline_queue SET status = ?, retry_count = retry_count + 1,
    last_retry_at = CURRENT_TIMESTAMP WHERE id = ?
  `)
  return stmt.run(status, id).changes > 0
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

function setSetting(key, value) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)
  return stmt.run(key, value).changes > 0
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const result = {}
  rows.forEach((row) => {
    result[row.key] = row.value
  })
  return result
}

module.exports = {
  initDatabase,
  getProducts,
  getProductById,
  getProductByBarcode,
  addProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getOrders,
  getOrderById,
  createOrder,
  getOfflineQueue,
  addOfflineQueue,
  updateOfflineQueueStatus,
  getSetting,
  setSetting,
  getAllSettings,
}

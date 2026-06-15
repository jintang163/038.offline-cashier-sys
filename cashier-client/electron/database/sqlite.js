const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

const DB_PATH = (() => {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'cashier.db')
})()

function getDbPath() {
  return DB_PATH
}

function initDatabase() {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  return db
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      erp_goods_id TEXT,
      product_name TEXT NOT NULL,
      category_id INTEGER,
      category_name TEXT,
      barcode TEXT UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      original_price REAL DEFAULT 0,
      unit TEXT DEFAULT '件',
      image TEXT,
      description TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      status INTEGER DEFAULT 1,
      sort INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      erp_order_id TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      pay_amount REAL NOT NULL DEFAULT 0,
      pay_type TEXT DEFAULT 'cash',
      pay_status INTEGER DEFAULT 0,
      order_status INTEGER DEFAULT 1,
      sync_status INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      sync_error TEXT,
      cashier_id INTEGER,
      cashier_name TEXT,
      member_id INTEGER,
      member_name TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      erp_goods_id TEXT,
      product_name TEXT NOT NULL,
      barcode TEXT,
      image TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      pay_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_no TEXT,
      pay_type TEXT NOT NULL,
      pay_amount REAL NOT NULL,
      pay_status INTEGER DEFAULT 0,
      pay_time DATETIME,
      transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sales_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      erp_goods_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      order_date TEXT NOT NULL,
      sync_status INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      sync_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
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
  migrateTables()
}

function migrateTables() {
  const tablesToMigrate = [
    { table: 'products', columns: ['erp_goods_id TEXT', 'category_name TEXT', 'product_name TEXT', 'original_price REAL DEFAULT 0', 'description TEXT', 'sort INTEGER DEFAULT 0'] },
    { table: 'orders', columns: ['erp_order_id TEXT', 'pay_status INTEGER DEFAULT 0', 'order_status INTEGER DEFAULT 1', 'sync_attempts INTEGER DEFAULT 0', 'remark TEXT'] },
    { table: 'order_items', columns: ['erp_goods_id TEXT', 'image TEXT', 'total_amount REAL DEFAULT 0', 'discount_amount REAL DEFAULT 0', 'pay_amount REAL DEFAULT 0'] },
    { table: 'order_payments', columns: ['payment_no TEXT', 'pay_amount REAL NOT NULL DEFAULT 0', 'pay_status INTEGER DEFAULT 0', 'pay_time DATETIME'] },
  ]

  tablesToMigrate.forEach(({ table, columns }) => {
    columns.forEach(column => {
      try {
        const colName = column.split(' ')[0]
        db.prepare(`SELECT ${colName} FROM ${table} LIMIT 1`).get()
      } catch (e) {
        if (e.message.includes('no such column')) {
          db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column}`).run()
        }
      }
    })
  })
}

function getProducts(params = {}) {
  const { page = 1, pageSize = 20, keyword = '', categoryId = null } = params
  let sql = 'SELECT * FROM products WHERE status = 1'
  const countSql = 'SELECT COUNT(*) as total FROM products WHERE status = 1'
  const whereClauses = []
  const values = []

  if (keyword) {
    whereClauses.push('(product_name LIKE ? OR barcode LIKE ?)')
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
    INSERT INTO products (erp_goods_id, product_name, category_id, category_name, barcode, price, original_price, unit, image, description, stock, status, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    product.erp_goods_id || null,
    product.product_name || product.name,
    product.category_id || null,
    product.category_name || null,
    product.barcode,
    product.price || 0,
    product.original_price || product.price || 0,
    product.unit || '件',
    product.image || null,
    product.description || null,
    product.stock || 0,
    product.status ?? 1,
    product.sort || 0
  )
  return getProductById(result.lastInsertRowid)
}

function updateProduct(id, product) {
  const stmt = db.prepare(`
    UPDATE products SET 
      erp_goods_id = ?, product_name = ?, category_id = ?, category_name = ?, 
      barcode = ?, price = ?, original_price = ?, unit = ?, image = ?, 
      description = ?, stock = ?, status = ?, sort = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  stmt.run(
    product.erp_goods_id || null,
    product.product_name || product.name,
    product.category_id || null,
    product.category_name || null,
    product.barcode,
    product.price || 0,
    product.original_price || product.price || 0,
    product.unit || '件',
    product.image || null,
    product.description || null,
    product.stock || 0,
    product.status ?? 1,
    product.sort || 0,
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
    order.payments = db.prepare('SELECT * FROM order_payments WHERE order_id = ?').all(id)
  }
  return order
}

function getOrdersWithItemsAndPayments(syncStatus = 0) {
  let sql = 'SELECT * FROM orders'
  const values = []
  
  if (syncStatus !== null && syncStatus !== undefined) {
    sql += ' WHERE sync_status = ?'
    values.push(syncStatus)
  }
  
  sql += ' ORDER BY id ASC'
  
  const orders = db.prepare(sql).all(...values)
  
  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    order.payments = db.prepare('SELECT * FROM order_payments WHERE order_id = ?').all(order.id)
  }
  
  return orders
}

function getUnsyncedOrders() {
  return getOrdersWithItemsAndPayments(0)
}

function getFailedOrders() {
  return getOrdersWithItemsAndPayments(2)
}

function updateOrderSyncStatus(orderId, syncStatus, syncError = null) {
  const stmt = db.prepare(`
    UPDATE orders SET 
      sync_status = ?, 
      sync_error = ?,
      synced_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE synced_at END
    WHERE id = ?
  `)
  return stmt.run(syncStatus, syncError, syncStatus, orderId).changes > 0
}

function getUnsyncedOrderCount() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM orders WHERE sync_status = 0').get()
  return count
}

function addSalesSummary(summary) {
  const { erp_goods_id, product_name, quantity, total_amount, order_date } = summary
  
  const existing = db.prepare(`
    SELECT * FROM sales_summary 
    WHERE (erp_goods_id = ? OR (erp_goods_id IS NULL AND product_name = ?)) 
    AND order_date = ?
  `).get(erp_goods_id || null, product_name, order_date)
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE sales_summary SET 
        quantity = quantity + ?, 
        total_amount = total_amount + ?,
        sync_status = 0
      WHERE id = ?
    `)
    stmt.run(quantity, total_amount, existing.id)
    return getSalesSummaryById(existing.id)
  } else {
    const stmt = db.prepare(`
      INSERT INTO sales_summary (erp_goods_id, product_name, quantity, total_amount, order_date)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      erp_goods_id || null,
      product_name,
      quantity,
      total_amount,
      order_date
    )
    return getSalesSummaryById(result.lastInsertRowid)
  }
}

function addSalesSummaries(summaries) {
  const insertMany = db.transaction((summaries) => {
    return summaries.map(summary => addSalesSummary(summary))
  })
  return insertMany(summaries)
}

function getSalesSummaryById(id) {
  return db.prepare('SELECT * FROM sales_summary WHERE id = ?').get(id)
}

function getUnsyncedSalesSummaries(limit = 100) {
  return db.prepare(`
    SELECT * FROM sales_summary 
    WHERE sync_status = 0 
    ORDER BY order_date ASC, id ASC 
    LIMIT ?
  `).all(limit)
}

function updateSalesSummarySyncStatus(id, status, error = null) {
  const stmt = db.prepare(`
    UPDATE sales_summary SET 
      sync_status = ?, 
      sync_attempts = sync_attempts + 1,
      sync_error = ?,
      synced_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE synced_at END
    WHERE id = ?
  `)
  return stmt.run(status, error, status, id).changes > 0
}

function getSalesSummaryByDate(startDate, endDate) {
  let sql = 'SELECT * FROM sales_summary WHERE 1=1'
  const values = []
  
  if (startDate) {
    sql += ' AND order_date >= ?'
    values.push(startDate)
  }
  if (endDate) {
    sql += ' AND order_date <= ?'
    values.push(endDate)
  }
  
  sql += ' ORDER BY order_date DESC, id DESC'
  
  return db.prepare(sql).all(...values)
}

function createOrder(orderData) {
  const { items, payments, ...orderInfo } = orderData
  const orderNo = orderInfo.order_no || generateOrderNo()
  const orderDate = new Date().toISOString().split('T')[0]

  const insertOrder = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO orders (order_no, erp_order_id, total_amount, discount_amount, pay_amount, pay_type,
        pay_status, order_status, sync_status, sync_attempts, sync_error,
        cashier_id, cashier_name, member_id, member_name, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      orderNo,
      orderInfo.erp_order_id || null,
      orderInfo.total_amount || 0,
      orderInfo.discount_amount || 0,
      orderInfo.pay_amount || 0,
      orderInfo.pay_type || 'cash',
      orderInfo.pay_status ?? 1,
      orderInfo.order_status ?? 2,
      orderInfo.sync_status ?? 0,
      orderInfo.sync_attempts || 0,
      orderInfo.sync_error || null,
      orderInfo.cashier_id || null,
      orderInfo.cashier_name || null,
      orderInfo.member_id || null,
      orderInfo.member_name || null,
      orderInfo.remark || null,
      orderInfo.created_at || new Date().toISOString()
    )
    const orderId = result.lastInsertRowid

    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, product_id, erp_goods_id, product_name, barcode, image, price, quantity, subtotal, total_amount, discount_amount, pay_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const paymentStmt = db.prepare(`
      INSERT INTO order_payments (order_id, payment_no, pay_type, pay_amount, pay_status, pay_time, transaction_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const salesSummaries = []

    items.forEach((item) => {
      itemStmt.run(
        orderId,
        item.product_id || null,
        item.erp_goods_id || null,
        item.product_name,
        item.barcode || null,
        item.image || null,
        item.price,
        item.quantity,
        item.subtotal,
        item.total_amount || item.subtotal,
        item.discount_amount || 0,
        item.pay_amount || item.subtotal
      )

      if (item.product_id) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(
          item.quantity,
          item.product_id
        )
      }

      salesSummaries.push({
        erp_goods_id: item.erp_goods_id || item.product_id?.toString(),
        product_name: item.product_name,
        quantity: item.quantity,
        total_amount: item.subtotal,
        order_date: orderDate
      })
    })

    if (salesSummaries.length > 0) {
      addSalesSummaries(salesSummaries)
    }

    if (payments && payments.length > 0) {
      payments.forEach((payment) => {
        const paymentNo = payment.payment_no || `PAY${Date.now()}${Math.random().toString(36).substr(2, 4)}`
        paymentStmt.run(
          orderId,
          paymentNo,
          payment.pay_type,
          payment.pay_amount || payment.amount,
          payment.pay_status ?? 1,
          payment.pay_time || new Date().toISOString(),
          payment.transaction_id || null
        )
      })
    } else {
      const paymentNo = `PAY${Date.now()}${Math.random().toString(36).substr(2, 4)}`
      paymentStmt.run(
        orderId,
        paymentNo,
        orderInfo.pay_type || 'cash',
        orderInfo.pay_amount || 0,
        1,
        new Date().toISOString(),
        null
      )
    }

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

function getAllProducts() {
  return db.prepare('SELECT * FROM products WHERE status = 1').all()
}

function getAllCategories() {
  return db.prepare('SELECT * FROM categories WHERE status = 1').all()
}

function getAllOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY id DESC').all()
}

function getAllOrderItems() {
  return db.prepare('SELECT * FROM order_items').all()
}

function getAllOrderPayments() {
  return db.prepare('SELECT * FROM order_payments').all()
}

function backupDatabase(backupPath) {
  return new Promise((resolve, reject) => {
    try {
      const backup = db.backup(backupPath)
      backup
        .then(() => resolve({ success: true, path: backupPath }))
        .catch((err) => reject(err))
    } catch (error) {
      reject(error)
    }
  })
}

function restoreDatabase(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file does not exist')
  }
  
  if (db) {
    db.close()
    db = null
  }
  
  fs.copyFileSync(backupPath, DB_PATH)
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  
  return { success: true }
}

function bulkUpsertProducts(products) {
  const upsert = db.transaction((products) => {
    const stmt = db.prepare(`
      INSERT INTO products (id, erp_goods_id, product_name, category_id, category_name, barcode, price, original_price, unit, image, description, stock, status, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        erp_goods_id = excluded.erp_goods_id,
        product_name = excluded.product_name,
        category_id = excluded.category_id,
        category_name = excluded.category_name,
        barcode = excluded.barcode,
        price = excluded.price,
        original_price = excluded.original_price,
        unit = excluded.unit,
        image = excluded.image,
        description = excluded.description,
        stock = excluded.stock,
        status = excluded.status,
        sort = excluded.sort,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    const stmtByBarcode = db.prepare(`
      INSERT INTO products (erp_goods_id, product_name, category_id, category_name, barcode, price, original_price, unit, image, description, stock, status, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(barcode) DO UPDATE SET
        erp_goods_id = excluded.erp_goods_id,
        product_name = excluded.product_name,
        category_id = excluded.category_id,
        category_name = excluded.category_name,
        price = excluded.price,
        original_price = excluded.original_price,
        unit = excluded.unit,
        image = excluded.image,
        description = excluded.description,
        stock = excluded.stock,
        status = excluded.status,
        sort = excluded.sort,
        updated_at = CURRENT_TIMESTAMP
    `)

    products.forEach((product) => {
      if (product.id) {
        stmt.run(
          product.id,
          product.erp_goods_id || null,
          product.product_name || product.name,
          product.category_id || null,
          product.category_name || null,
          product.barcode || null,
          product.price || 0,
          product.original_price || product.price || 0,
          product.unit || '件',
          product.image || null,
          product.description || null,
          product.stock || 0,
          product.status ?? 1,
          product.sort || 0,
          product.created_at || new Date().toISOString(),
          product.updated_at || new Date().toISOString()
        )
      } else if (product.barcode) {
        stmtByBarcode.run(
          product.erp_goods_id || null,
          product.product_name || product.name,
          product.category_id || null,
          product.category_name || null,
          product.barcode,
          product.price || 0,
          product.original_price || product.price || 0,
          product.unit || '件',
          product.image || null,
          product.description || null,
          product.stock || 0,
          product.status ?? 1,
          product.sort || 0,
          product.created_at || new Date().toISOString(),
          product.updated_at || new Date().toISOString()
        )
      }
    })
  })
  
  upsert(products)
  return true
}

function bulkUpsertCategories(categories) {
  const upsert = db.transaction((categories) => {
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, sort, status, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        sort = excluded.sort,
        status = excluded.status
    `)

    categories.forEach((category) => {
      stmt.run(
        category.id,
        category.name,
        category.sort || 0,
        category.status ?? 1,
        category.created_at || new Date().toISOString()
      )
    })
  })
  
  upsert(categories)
  return true
}

module.exports = {
  DB_PATH,
  getDbPath,
  initDatabase,
  backupDatabase,
  restoreDatabase,
  getProducts,
  getProductById,
  getProductByBarcode,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getOrders,
  getOrderById,
  createOrder,
  getOrdersWithItemsAndPayments,
  getUnsyncedOrders,
  getFailedOrders,
  updateOrderSyncStatus,
  getUnsyncedOrderCount,
  getAllOrders,
  getAllOrderItems,
  getAllOrderPayments,
  addSalesSummary,
  addSalesSummaries,
  getSalesSummaryById,
  getUnsyncedSalesSummaries,
  updateSalesSummarySyncStatus,
  getSalesSummaryByDate,
  getOfflineQueue,
  addOfflineQueue,
  updateOfflineQueueStatus,
  getSetting,
  setSetting,
  getAllSettings,
  bulkUpsertProducts,
  bulkUpsertCategories,
}

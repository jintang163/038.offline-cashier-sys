const DB_NAME = 'cashier_stock_check.db'
const DB_PATH = '_doc/' + DB_NAME

let db = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }
    
    db = uni.openDatabase({
      name: DB_NAME,
      path: DB_PATH,
      success(res) {
        console.log('数据库打开成功', res)
        initTables().then(() => resolve(db)).catch(reject)
      },
      fail(err) {
        console.error('数据库打开失败', err)
        reject(err)
      }
    })
  })
}

function initTables() {
  return new Promise((resolve, reject) => {
    const sqls = [
      `CREATE TABLE IF NOT EXISTS stock_check_task (
        id INTEGER PRIMARY KEY,
        task_no TEXT,
        task_name TEXT,
        task_type INTEGER,
        check_mode INTEGER,
        shop_id INTEGER,
        shop_name TEXT,
        category_id INTEGER,
        category_name TEXT,
        plan_start_time TEXT,
        plan_end_time TEXT,
        actual_start_time TEXT,
        actual_end_time TEXT,
        operator_id INTEGER,
        operator_name TEXT,
        task_status INTEGER,
        sync_status INTEGER,
        erp_task_id TEXT,
        remark TEXT,
        create_time TEXT,
        update_time TEXT,
        is_deleted INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS stock_check_item (
        id INTEGER PRIMARY KEY,
        task_id INTEGER,
        task_no TEXT,
        product_id INTEGER,
        erp_goods_id TEXT,
        product_name TEXT,
        category_name TEXT,
        barcode TEXT,
        unit TEXT,
        price REAL,
        theoretical_stock INTEGER,
        actual_stock INTEGER,
        diff_quantity INTEGER,
        diff_amount REAL,
        check_status INTEGER DEFAULT 0,
        remark TEXT,
        create_time TEXT,
        update_time TEXT,
        is_deleted INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS stock_check_record (
        id INTEGER PRIMARY KEY,
        local_id TEXT UNIQUE,
        task_id INTEGER,
        task_no TEXT,
        item_id INTEGER,
        product_id INTEGER,
        erp_goods_id TEXT,
        barcode TEXT,
        scan_quantity INTEGER DEFAULT 1,
        input_quantity INTEGER,
        operator_id INTEGER,
        operator_name TEXT,
        scan_time TEXT,
        device_id TEXT,
        remark TEXT,
        sync_status INTEGER DEFAULT 0,
        create_time TEXT,
        update_time TEXT,
        is_deleted INTEGER DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS idx_task_id ON stock_check_item(task_id)`,
      `CREATE INDEX IF NOT EXISTS idx_record_task_id ON stock_check_record(task_id)`,
      `CREATE INDEX IF NOT EXISTS idx_barcode ON stock_check_item(barcode)`,
      `CREATE INDEX IF NOT EXISTS idx_record_sync ON stock_check_record(sync_status)`
    ]
    
    executeSqlBatch(sqls).then(resolve).catch(reject)
  })
}

function executeSql(sql, args = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未打开'))
      return
    }
    
    db.transaction(tx => {
      tx.executeSql(sql, args, (tx, res) => {
        resolve(res)
      }, (tx, err) => {
        console.error('SQL执行失败:', sql, err)
        reject(err)
      })
    })
  })
}

function executeSqlBatch(sqls) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未打开'))
      return
    }
    
    db.transaction(tx => {
      let completed = 0
      let hasError = false
      
      sqls.forEach(sql => {
        tx.executeSql(sql, [], () => {
          completed++
          if (completed === sqls.length && !hasError) {
            resolve()
          }
        }, (tx, err) => {
          hasError = true
          console.error('批量SQL执行失败:', sql, err)
          reject(err)
        })
      })
    })
  })
}

function query(sql, args = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未打开'))
      return
    }
    
    db.transaction(tx => {
      tx.executeSql(sql, args, (tx, res) => {
        const list = []
        for (let i = 0; i < res.rows.length; i++) {
          list.push(res.rows.item(i))
        }
        resolve(list)
      }, (tx, err) => {
        console.error('SQL查询失败:', sql, err)
        reject(err)
      })
    })
  })
}

function insert(table, data) {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map(() => '?').join(', ')
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  return executeSql(sql, values)
}

function update(table, data, where, whereArgs = []) {
  const sets = Object.keys(data).map(key => `${key} = ?`).join(', ')
  const values = Object.values(data).concat(whereArgs)
  const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`
  return executeSql(sql, values)
}

function del(table, where, whereArgs = []) {
  const sql = `DELETE FROM ${table} WHERE ${where}`
  return executeSql(sql, whereArgs)
}

function closeDB() {
  if (db) {
    db.close({
      success() {
        console.log('数据库已关闭')
        db = null
      },
      fail(err) {
        console.error('数据库关闭失败', err)
      }
    })
  }
}

module.exports = {
  openDB,
  closeDB,
  executeSql,
  executeSqlBatch,
  query,
  insert,
  update,
  del
}

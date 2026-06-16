const DB_PREFIX = 'cashier_db_'

let tables = {}

function openDB() {
  return new Promise((resolve) => {
    try {
      const savedTables = wx.getStorageSync(DB_PREFIX + 'tables') || []
      savedTables.forEach(tableName => {
        const data = wx.getStorageSync(DB_PREFIX + tableName) || []
        tables[tableName] = data
      })
      console.log('本地数据库初始化成功')
      resolve(tables)
    } catch (e) {
      console.error('本地数据库初始化失败', e)
      resolve(tables)
    }
  })
}

function initTable(tableName, primaryKey = 'id') {
  if (!tables[tableName]) {
    tables[tableName] = []
    saveTable(tableName)
    const savedTables = wx.getStorageSync(DB_PREFIX + 'tables') || []
    if (savedTables.indexOf(tableName) === -1) {
      savedTables.push(tableName)
      wx.setStorageSync(DB_PREFIX + 'tables', savedTables)
    }
  }
}

function saveTable(tableName) {
  try {
    wx.setStorageSync(DB_PREFIX + tableName, tables[tableName] || [])
  } catch (e) {
    console.error('保存表数据失败', tableName, e)
  }
}

function query(sql, args = []) {
  return new Promise((resolve, reject) => {
    try {
      const tableName = extractTableName(sql)
      if (!tableName || !tables[tableName]) {
        resolve([])
        return
      }

      const whereClause = extractWhere(sql)
      let result = tables[tableName]

      if (whereClause) {
        result = applyWhere(result, whereClause, args)
      }

      const orderBy = extractOrderBy(sql)
      if (orderBy) {
        result = applyOrderBy(result, orderBy)
      }

      resolve(JSON.parse(JSON.stringify(result)))
    } catch (e) {
      console.error('查询失败', sql, e)
      reject(e)
    }
  })
}

function insert(table, data) {
  return new Promise((resolve, reject) => {
    try {
      initTable(table)
      const newItem = { ...data }
      tables[table].push(newItem)
      saveTable(table)
      resolve({ insertId: newItem.id || null, rowsAffected: 1 })
    } catch (e) {
      console.error('插入失败', table, data, e)
      reject(e)
    }
  })
}

function update(table, data, where, whereArgs = []) {
  return new Promise((resolve, reject) => {
    try {
      if (!tables[table]) {
        resolve({ rowsAffected: 0 })
        return
      }

      let affectedCount = 0
      const whereConditions = parseWhereClause(where, whereArgs)

      tables[table].forEach(item => {
        if (matchConditions(item, whereConditions)) {
          Object.assign(item, data)
          item.update_time = item.update_time || new Date().toISOString()
          affectedCount++
        }
      })

      if (affectedCount > 0) {
        saveTable(table)
      }

      resolve({ rowsAffected: affectedCount })
    } catch (e) {
      console.error('更新失败', table, data, e)
      reject(e)
    }
  })
}

function del(table, where, whereArgs = []) {
  return new Promise((resolve, reject) => {
    try {
      if (!tables[table]) {
        resolve({ rowsAffected: 0 })
        return
      }

      const whereConditions = parseWhereClause(where, whereArgs)
      const originalLength = tables[table].length
      tables[table] = tables[table].filter(item => !matchConditions(item, whereConditions))
      const affectedCount = originalLength - tables[table].length

      if (affectedCount > 0) {
        saveTable(table)
      }

      resolve({ rowsAffected: affectedCount })
    } catch (e) {
      console.error('删除失败', table, where, e)
      reject(e)
    }
  })
}

function executeSql(sql, args = []) {
  return new Promise((resolve, reject) => {
    const sqlUpper = sql.trim().toUpperCase()
    
    if (sqlUpper.startsWith('SELECT')) {
      query(sql, args).then(result => {
        resolve({ rows: { length: result.length, item: (i) => result[i] } })
      }).catch(reject)
    } else if (sqlUpper.startsWith('INSERT')) {
      const tableName = extractTableName(sql)
      const data = extractInsertData(sql, args)
      insert(tableName, data).then(resolve).catch(reject)
    } else if (sqlUpper.startsWith('UPDATE')) {
      const tableName = extractTableName(sql)
      const data = extractUpdateData(sql, args)
      const where = extractWhere(sql)
      const whereArgs = extractWhereArgs(sql, args)
      update(tableName, data, where, whereArgs).then(resolve).catch(reject)
    } else if (sqlUpper.startsWith('DELETE')) {
      const tableName = extractTableName(sql)
      const where = extractWhere(sql)
      const whereArgs = extractWhereArgs(sql, args)
      del(tableName, where, whereArgs).then(resolve).catch(reject)
    } else if (sqlUpper.startsWith('CREATE TABLE')) {
      const tableName = extractTableName(sql)
      initTable(tableName)
      resolve({ rowsAffected: 0 })
    } else if (sqlUpper.startsWith('CREATE INDEX')) {
      resolve({ rowsAffected: 0 })
    } else {
      resolve({ rowsAffected: 0 })
    }
  })
}

function executeSqlBatch(sqls) {
  return new Promise(async (resolve, reject) => {
    try {
      for (const sql of sqls) {
        await executeSql(sql)
      }
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

function closeDB() {
  tables = {}
}

function extractTableName(sql) {
  const match = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+['"]?(\w+)['"]?/i)
  return match ? match[1] : null
}

function extractWhere(sql) {
  const match = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i)
  return match ? match[1].trim() : null
}

function extractOrderBy(sql) {
  const match = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i)
  return match ? match[1].trim() : null
}

function applyWhere(data, whereClause, args) {
  const conditions = parseWhereClause(whereClause, args)
  return data.filter(item => matchConditions(item, conditions))
}

function applyOrderBy(data, orderBy) {
  const parts = orderBy.split(',')
  const sortFields = []
  
  parts.forEach(part => {
    const trimmed = part.trim()
    const fieldParts = trimmed.split(/\s+/)
    sortFields.push({
      field: fieldParts[0],
      order: (fieldParts[1] || 'ASC').toUpperCase()
    })
  })

  return [...data].sort((a, b) => {
    for (const sortField of sortFields) {
      const valA = a[sortField.field]
      const valB = b[sortField.field]
      
      if (valA < valB) return sortField.order === 'ASC' ? -1 : 1
      if (valA > valB) return sortField.order === 'ASC' ? 1 : -1
    }
    return 0
  })
}

function parseWhereClause(whereClause, args) {
  const conditions = []
  let argIndex = 0
  
  const parts = whereClause.split(/\s+AND\s+/i)
  
  parts.forEach(part => {
    const trimmed = part.trim()
    
    const eqMatch = trimmed.match(/^(\w+)\s*=\s*\?$/)
    if (eqMatch) {
      conditions.push({ field: eqMatch[1], operator: '=', value: args[argIndex++] })
      return
    }
    
    const isNullMatch = trimmed.match(/^(\w+)\s+IS NULL$/i)
    if (isNullMatch) {
      conditions.push({ field: isNullMatch[1], operator: 'IS NULL', value: null })
      return
    }
    
    const isNotNullMatch = trimmed.match(/^(\w+)\s+IS NOT NULL$/i)
    if (isNotNullMatch) {
      conditions.push({ field: isNotNullMatch[1], operator: 'IS NOT NULL', value: null })
      return
    }
  })
  
  return conditions
}

function matchConditions(item, conditions) {
  for (const condition of conditions) {
    const val = item[condition.field]
    
    switch (condition.operator) {
      case '=':
        if (val !== condition.value) return false
        break
      case 'IS NULL':
        if (val !== null && val !== undefined && val !== '') return false
        break
      case 'IS NOT NULL':
        if (val === null || val === undefined || val === '') return false
        break
      default:
        break
    }
  }
  return true
}

function extractInsertData(sql, args) {
  const valuesMatch = sql.match(/VALUES\s*\((.+?)\)/i)
  if (!valuesMatch) return {}
  
  const columnsMatch = sql.match(/\((.+?)\)\s*VALUES/i)
  if (!columnsMatch) return {}
  
  const columns = columnsMatch[1].split(',').map(c => c.trim())
  const data = {}
  
  columns.forEach((col, index) => {
    if (index < args.length) {
      data[col] = args[index]
    }
  })
  
  return data
}

function extractUpdateData(sql, args) {
  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
  if (!setMatch) return {}
  
  const setClauses = setMatch[1].split(',')
  const data = {}
  let argIndex = 0
  
  setClauses.forEach(clause => {
    const trimmed = clause.trim()
    const eqMatch = trimmed.match(/^(\w+)\s*=\s*\?$/)
    if (eqMatch && argIndex < args.length) {
      data[eqMatch[1]] = args[argIndex++]
    }
  })
  
  return data
}

function extractWhereArgs(sql, args) {
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i)
  if (!whereMatch) return []
  
  const whereClause = whereMatch[1]
  const placeholders = (whereClause.match(/\?/g) || []).length
  
  if (placeholders === 0) return []
  
  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
  let setPlaceholders = 0
  if (setMatch) {
    setPlaceholders = (setMatch[1].match(/\?/g) || []).length
  }
  
  return args.slice(setPlaceholders, setPlaceholders + placeholders)
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

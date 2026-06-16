const sqlite = require('./sqlite.js')

function saveTask(task) {
  return new Promise((resolve, reject) => {
    sqlite.query('SELECT id FROM stock_check_task WHERE id = ?', [task.id]).then(existing => {
      if (existing.length > 0) {
        sqlite.update('stock_check_task', {
          task_no: task.taskNo,
          task_name: task.taskName,
          task_type: task.taskType,
          check_mode: task.checkMode,
          shop_id: task.shopId,
          shop_name: task.shopName,
          category_id: task.categoryId,
          category_name: task.categoryName,
          plan_start_time: task.planStartTime,
          plan_end_time: task.planEndTime,
          actual_start_time: task.actualStartTime,
          actual_end_time: task.actualEndTime,
          operator_id: task.operatorId,
          operator_name: task.operatorName,
          task_status: task.taskStatus,
          sync_status: task.syncStatus,
          erp_task_id: task.erpTaskId,
          remark: task.remark,
          update_time: new Date().toISOString()
        }, 'id = ?', [task.id]).then(resolve).catch(reject)
      } else {
        sqlite.insert('stock_check_task', {
          id: task.id,
          task_no: task.taskNo,
          task_name: task.taskName,
          task_type: task.taskType,
          check_mode: task.checkMode,
          shop_id: task.shopId,
          shop_name: task.shopName,
          category_id: task.categoryId,
          category_name: task.categoryName,
          plan_start_time: task.planStartTime,
          plan_end_time: task.planEndTime,
          actual_start_time: task.actualStartTime,
          actual_end_time: task.actualEndTime,
          operator_id: task.operatorId,
          operator_name: task.operatorName,
          task_status: task.taskStatus,
          sync_status: task.syncStatus,
          erp_task_id: task.erpTaskId,
          remark: task.remark,
          create_time: new Date().toISOString(),
          update_time: new Date().toISOString()
        }).then(resolve).catch(reject)
      }
    }).catch(reject)
  })
}

function saveTaskItems(taskId, items) {
  return new Promise((resolve, reject) => {
    sqlite.del('stock_check_item', 'task_id = ?', [taskId]).then(() => {
      const promises = items.map(item => {
        return sqlite.insert('stock_check_item', {
          id: item.id,
          task_id: taskId,
          task_no: item.taskNo,
          product_id: item.productId,
          erp_goods_id: item.erpGoodsId,
          product_name: item.productName,
          category_name: item.categoryName,
          barcode: item.barcode,
          unit: item.unit,
          price: item.price,
          theoretical_stock: item.theoreticalStock,
          actual_stock: item.actualStock,
          diff_quantity: item.diffQuantity,
          diff_amount: item.diffAmount,
          check_status: item.checkStatus || 0,
          remark: item.remark,
          create_time: new Date().toISOString(),
          update_time: new Date().toISOString()
        })
      })
      Promise.all(promises).then(resolve).catch(reject)
    }).catch(reject)
  })
}

function getLocalTasks() {
  return sqlite.query('SELECT * FROM stock_check_task WHERE is_deleted = 0 ORDER BY create_time DESC')
}

function getLocalTaskDetail(taskId) {
  return new Promise((resolve, reject) => {
    sqlite.query('SELECT * FROM stock_check_task WHERE id = ?', [taskId]).then(tasks => {
      if (tasks.length === 0) {
        resolve(null)
        return
      }
      sqlite.query('SELECT * FROM stock_check_item WHERE task_id = ? AND is_deleted = 0 ORDER BY category_name, product_name', [taskId]).then(items => {
        resolve({
          ...tasks[0],
          items
        })
      }).catch(reject)
    }).catch(reject)
  })
}

function updateTaskItem(itemId, data) {
  return sqlite.update('stock_check_item', {
    ...data,
    update_time: new Date().toISOString()
  }, 'id = ?', [itemId])
}

function getItemByBarcode(taskId, barcode) {
  return sqlite.query('SELECT * FROM stock_check_item WHERE task_id = ? AND barcode = ? AND is_deleted = 0', [taskId, barcode])
}

function addScanRecord(record) {
  const localId = 'REC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  return sqlite.insert('stock_check_record', {
    local_id: localId,
    task_id: record.taskId,
    task_no: record.taskNo,
    item_id: record.itemId,
    product_id: record.productId,
    erp_goods_id: record.erpGoodsId,
    barcode: record.barcode,
    scan_quantity: record.scanQuantity || 1,
    input_quantity: record.inputQuantity,
    operator_id: record.operatorId,
    operator_name: record.operatorName,
    scan_time: record.scanTime || new Date().toISOString(),
    device_id: record.deviceId,
    remark: record.remark,
    sync_status: 0,
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString()
  })
}

function deleteScanRecord(localId) {
  return sqlite.del('stock_check_record', 'local_id = ?', [localId])
}

function getUnsyncedRecords(taskId) {
  return sqlite.query('SELECT * FROM stock_check_record WHERE task_id = ? AND sync_status = 0 AND is_deleted = 0 ORDER BY scan_time', [taskId])
}

function getRecordsByItemId(itemId) {
  return sqlite.query('SELECT * FROM stock_check_record WHERE item_id = ? AND is_deleted = 0 ORDER BY scan_time DESC', [itemId])
}

function getUnsyncedItems(taskId) {
  return sqlite.query('SELECT * FROM stock_check_item WHERE task_id = ? AND check_status = 1 AND is_deleted = 0', [taskId])
}

function markRecordsSynced(taskId) {
  return sqlite.update('stock_check_record', {
    sync_status: 1,
    update_time: new Date().toISOString()
  }, 'task_id = ? AND sync_status = 0', [taskId])
}

function updateTaskStatus(taskId, status, actualStartTime, actualEndTime) {
  const data = {
    task_status: status,
    update_time: new Date().toISOString()
  }
  if (actualStartTime) {
    data.actual_start_time = actualStartTime
  }
  if (actualEndTime) {
    data.actual_end_time = actualEndTime
  }
  return sqlite.update('stock_check_task', data, 'id = ?', [taskId])
}

function getCheckProgress(taskId) {
  return new Promise((resolve, reject) => {
    sqlite.query('SELECT COUNT(*) as total FROM stock_check_item WHERE task_id = ? AND is_deleted = 0', [taskId]).then(totalRes => {
      sqlite.query('SELECT COUNT(*) as checked FROM stock_check_item WHERE task_id = ? AND check_status = 1 AND is_deleted = 0', [taskId]).then(checkedRes => {
        resolve({
          total: totalRes[0].total,
          checked: checkedRes[0].checked,
          progress: totalRes[0].total > 0 ? Math.round(checkedRes[0].checked / totalRes[0].total * 100) : 0
        })
      }).catch(reject)
    }).catch(reject)
  })
}

module.exports = {
  saveTask,
  saveTaskItems,
  getLocalTasks,
  getLocalTaskDetail,
  updateTaskItem,
  getItemByBarcode,
  addScanRecord,
  deleteScanRecord,
  getUnsyncedRecords,
  getRecordsByItemId,
  getUnsyncedItems,
  markRecordsSynced,
  updateTaskStatus,
  getCheckProgress
}

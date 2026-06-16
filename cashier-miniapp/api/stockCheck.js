const request = require('../utils/request.js')

function getTaskList(shopId, lastSyncTime) {
  return request.get('/api/stock/check/task/download/list', {
    shopId,
    lastSyncTime
  })
}

function downloadTask(taskId) {
  return request.get(`/api/stock/check/task/${taskId}/download`)
}

function uploadCheckData(data) {
  return request.post('/api/stock/check/task/upload', data)
}

function startTask(taskId, operatorId, operatorName) {
  return request.post(`/api/stock/check/task/${taskId}/start`, {
    operatorId,
    operatorName
  })
}

function finishTask(taskId) {
  return request.post(`/api/stock/check/task/${taskId}/finish`)
}

function getItemByBarcode(taskId, barcode) {
  return request.get('/api/stock/check/item/barcode', {
    taskId,
    barcode
  })
}

function calculateDiff(taskId) {
  return request.post(`/api/stock/check/task/${taskId}/calculate-diff`)
}

function syncToErp(taskId) {
  return request.post(`/api/stock/check/task/${taskId}/sync-erp`)
}

module.exports = {
  getTaskList,
  downloadTask,
  uploadCheckData,
  startTask,
  finishTask,
  getItemByBarcode,
  calculateDiff,
  syncToErp
}

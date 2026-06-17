const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  backupDatabase: (backupPath) => ipcRenderer.invoke('backup-database', { backupPath }),
  restoreDatabase: (backupPath) => ipcRenderer.invoke('restore-database', { backupPath }),

  sqliteExec: (method, ...params) =>
    ipcRenderer.invoke('sqlite-exec', { method, params }),

  logWrite: (level, module, message, data) =>
    ipcRenderer.invoke('log-write', { level, module, message, data }),
  logGetDir: () => ipcRenderer.invoke('log-get-dir'),
  logListFiles: () => ipcRenderer.invoke('log-list-files'),
  logReadFile: (fileName, limit) =>
    ipcRenderer.invoke('log-read-file', { fileName, limit }),
  logCompressFile: (fileName) =>
    ipcRenderer.invoke('log-compress-file', { fileName }),
  logCompressDate: (dateStr) =>
    ipcRenderer.invoke('log-compress-date', { dateStr }),
  logDeleteFile: (fileName) =>
    ipcRenderer.invoke('log-delete-file', { fileName }),
  logCleanupOld: (daysToKeep) =>
    ipcRenderer.invoke('log-cleanup-old', { daysToKeep }),

  getSystemInfo: () => ipcRenderer.invoke('system-info'),
  getDiskInfo: (targetPath) => ipcRenderer.invoke('disk-info', { targetPath }),
  logUpload: (uploadNo, filePath, apiBaseUrl, token) =>
    ipcRenderer.invoke('log-upload', { uploadNo, filePath, apiBaseUrl, token }),
})

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
})

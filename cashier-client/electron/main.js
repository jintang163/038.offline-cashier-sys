const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let db = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: '离线收银系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  try {
    db = require('./database/sqlite')
    db.initDatabase()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

ipcMain.handle('get-db-path', () => {
  try {
    if (!db) {
      throw new Error('Database not initialized')
    }
    return { success: true, data: db.getDbPath() }
  } catch (error) {
    console.error('Get db path error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('backup-database', async (event, { backupPath }) => {
  try {
    if (!db) {
      throw new Error('Database not initialized')
    }
    
    if (!backupPath) {
      const defaultPath = path.join(app.getPath('documents'), `cashier_backup_${Date.now()}.db')
      backupPath = dialog.showSaveDialogSync(mainWindow, {
        defaultPath,
        filters: [{ name: 'Database Files', ['*.db'] }],
      })
      if (!backupPath) {
        throw new Error('No backup path selected')
      }
    }
    
    const result = await db.backupDatabase(backupPath)
    return { success: true, data: result }
  } catch (error) {
    console.error('Backup database error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('restore-database', async (event, { backupPath }) => {
  try {
    if (!db) {
      throw new Error('Database not initialized')
    }
    
    if (!backupPath) {
      const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Database Files', extensions: ['db'] }],
      })
      if (!files || files.length === 0) {
        throw new Error('No backup file selected')
      }
      backupPath = files[0]
    }
    
    const result = db.restoreDatabase(backupPath)
    return { success: true, data: result }
  } catch (error) {
    console.error('Restore database error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('sqlite-exec', async (event, { method, params }) => {
  try {
    if (!db) {
      throw new Error('Database not initialized')
    }
    const result = await db[method](...params)
    return { success: true, data: result }
  } catch (error) {
    console.error('SQLite error:', error)
    return { success: false, error: error.message }
  }
})

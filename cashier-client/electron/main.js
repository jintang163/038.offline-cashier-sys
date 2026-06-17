const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'
const LoggerManager = require('./logger')

let mainWindow = null
let db = null
let logger = null

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

  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    logger = new LoggerManager(logDir)
    logger.info('Main', 'Logger initialized', { logDir })
  } catch (error) {
    console.error('Failed to initialize logger:', error)
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

ipcMain.handle('log-write', (event, { level, module, message, data }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    logger[level]?.(module, message, data)
    return { success: true }
  } catch (error) {
    console.error('Log write error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-get-dir', () => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    return { success: true, data: logger.getLogDir() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-list-files', () => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    return { success: true, data: logger.getLogFiles() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-read-file', (event, { fileName, limit }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    const content = logger.readLogFile(fileName, limit)
    return { success: true, data: content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-compress-file', async (event, { fileName }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    const result = await logger.compressLogFile(fileName)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-compress-date', async (event, { dateStr }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    const result = await logger.compressLogsByDate(dateStr)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-delete-file', (event, { fileName }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    const result = logger.deleteOldLogFile(fileName)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-cleanup-old', (event, { daysToKeep }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    const result = logger.cleanupOldLogs(daysToKeep || 30)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('system-info', () => {
  try {
    if (!logger) {
      const os = require('os')
      return {
        success: true,
        data: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          type: os.type(),
          release: os.release(),
          uptime: os.uptime(),
          totalMem: os.totalmem(),
          freeMem: os.freemem(),
          usedMem: os.totalmem() - os.freemem(),
          cpuCount: os.cpus().length,
        },
      }
    }
    return { success: true, data: logger.getSystemInfo() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('disk-info', (event, { targetPath }) => {
  try {
    if (!logger) {
      return { success: false, error: 'Logger not initialized' }
    }
    return { success: true, data: logger.getDiskInfo(targetPath) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('log-upload', async (event, { uploadNo, filePath, apiBaseUrl, token }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const FormData = require('form-data')
    const axios = require('axios')

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found: ' + filePath }
    }

    const fileBuffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)

    const formData = new FormData()
    formData.append('uploadNo', uploadNo)
    formData.append('file', fileBuffer, fileName)

    const headers = {
      ...formData.getHeaders(),
    }
    if (token) {
      headers.Authorization = 'Bearer ' + token
    }

    const response = await axios.post(apiBaseUrl + '/device/log/upload', formData, {
      headers,
      timeout: 120000,
    })

    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      return { success: false, error: res.message || 'Upload failed' }
    }
    return { success: true, data: res.data }
  } catch (error) {
    console.error('Log upload error:', error)
    return { success: false, error: error.message }
  }
})

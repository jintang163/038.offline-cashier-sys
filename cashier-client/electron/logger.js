const fs = require('fs')
const path = require('path')
const os = require('os')
const zlib = require('zlib')
const { pipeline } = require('stream')
const { promisify } = require('util')
const pipe = promisify(pipeline)

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

class LoggerManager {
  constructor(logDir) {
    this.logDir = logDir
    this.currentLogFile = null
    this.currentDate = null
    this.minLevel = LOG_LEVELS.DEBUG
    this.ensureLogDir()
    this.updateCurrentLogFile()
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  updateCurrentLogFile() {
    const today = new Date().toISOString().split('T')[0]
    if (this.currentDate !== today) {
      this.currentDate = today
      this.currentLogFile = path.join(this.logDir, `cashier-${today}.log`)
    }
  }

  formatMessage(level, module, message, data) {
    const timestamp = new Date().toISOString()
    const pid = process.pid
    let msg = `[${timestamp}] [${level}] [PID:${pid}] [${module}] ${message}`
    if (data !== undefined) {
      try {
        if (typeof data === 'object') {
          msg += ' ' + JSON.stringify(data)
        } else {
          msg += ' ' + String(data)
        }
      } catch (e) {
        msg += ' [Data serialization error]'
      }
    }
    return msg
  }

  log(level, module, message, data) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return
    }
    this.updateCurrentLogFile()
    const logMessage = this.formatMessage(level, module, message, data)
    try {
      fs.appendFileSync(this.currentLogFile, logMessage + '\n', 'utf8')
    } catch (error) {
      console.error('Failed to write log:', error)
    }
    if (LOG_LEVELS[level] >= LOG_LEVELS.INFO) {
      console.log(logMessage)
    }
  }

  debug(module, message, data) {
    this.log('DEBUG', module, message, data)
  }

  info(module, message, data) {
    this.log('INFO', module, message, data)
  }

  warn(module, message, data) {
    this.log('WARN', module, message, data)
  }

  error(module, message, data) {
    this.log('ERROR', module, message, data)
  }

  getLogDir() {
    return this.logDir
  }

  getLogFiles() {
    this.ensureLogDir()
    const files = fs.readdirSync(this.logDir)
    return files
      .filter(f => f.endsWith('.log') || f.endsWith('.zip'))
      .map(f => {
        const filePath = path.join(this.logDir, f)
        const stat = fs.statSync(filePath)
        return {
          name: f,
          path: filePath,
          size: stat.size,
          createdTime: stat.birthtime.toISOString(),
          modifiedTime: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime))
  }

  readLogFile(fileName, limit = 1000) {
    const filePath = path.join(this.logDir, fileName)
    if (!fs.existsSync(filePath)) {
      throw new Error('Log file not found: ' + fileName)
    }
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    if (lines.length > limit) {
      return lines.slice(-limit).join('\n')
    }
    return content
  }

  async compressLogFile(fileName) {
    const sourcePath = path.join(this.logDir, fileName)
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Log file not found: ' + fileName)
    }
    const zipFileName = fileName + '.zip'
    const zipPath = path.join(this.logDir, zipFileName)
    const gzip = zlib.createGzip()
    const sourceStream = fs.createReadStream(sourcePath)
    const destStream = fs.createWriteStream(zipPath)
    await pipe(sourceStream, gzip, destStream)
    return {
      fileName: zipFileName,
      path: zipPath,
      size: fs.statSync(zipPath).size,
    }
  }

  async compressLogsByDate(dateStr) {
    const targetFile = `cashier-${dateStr}.log`
    const files = this.getLogFiles()
    const logFile = files.find(f => f.name === targetFile)
    if (!logFile) {
      return null
    }
    return await this.compressLogFile(targetFile)
  }

  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      type: os.type(),
      release: os.release(),
      version: os.version ? os.version() : '',
      uptime: os.uptime(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      usedMem: os.totalmem() - os.freemem(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || '',
      loadavg: os.loadavg(),
      tmpdir: os.tmpdir(),
      homedir: os.homedir(),
      networkInterfaces: this.getNetworkInterfaces(),
    }
  }

  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces()
    const result = []
    for (const [name, ifaces] of Object.entries(interfaces)) {
      for (const iface of ifaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          result.push({
            name,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac,
          })
        }
      }
    }
    return result
  }

  getDiskInfo(targetPath) {
    const checkPath = targetPath || this.logDir
    try {
      const stat = fs.statSync(checkPath)
      let total = 0
      let free = 0
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process')
          const driveLetter = path.parse(checkPath).root
          const output = execSync(`wmic logicaldisk where "DeviceID='${driveLetter.replace('\\', '')}'" get Size,FreeSpace`, { encoding: 'utf8' })
          const lines = output.trim().split('\n').filter(l => l.trim())
          if (lines.length >= 2) {
            const parts = lines[1].trim().split(/\s+/)
            if (parts.length >= 2) {
              free = parseInt(parts[0], 10) || 0
              total = parseInt(parts[1], 10) || 0
            }
          }
        } catch (e) {
          total = 500 * 1024 * 1024 * 1024
          free = 100 * 1024 * 1024 * 1024
        }
      } else {
        try {
          const { execSync } = require('child_process')
          const output = execSync(`df -k "${checkPath}" | tail -1`, { encoding: 'utf8' })
          const parts = output.trim().split(/\s+/)
          if (parts.length >= 4) {
            total = parseInt(parts[1], 10) * 1024
            free = parseInt(parts[3], 10) * 1024
          }
        } catch (e) {
          total = 500 * 1024 * 1024 * 1024
          free = 100 * 1024 * 1024 * 1024
        }
      }
      const used = total - free
      const usageRate = total > 0 ? (used / total * 100).toFixed(2) : '0.00'
      let status = 0
      if (usageRate >= 90) {
        status = 2
      } else if (usageRate >= 75) {
        status = 1
      }
      return {
        path: checkPath,
        total,
        free,
        used,
        usageRate: parseFloat(usageRate),
        status,
      }
    } catch (error) {
      return {
        path: checkPath,
        total: 0,
        free: 0,
        used: 0,
        usageRate: 0,
        status: 3,
        error: error.message,
      }
    }
  }

  deleteOldLogFile(fileName) {
    const filePath = path.join(this.logDir, fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }

  cleanupOldLogs(daysToKeep = 30) {
    const files = this.getLogFiles()
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
    let deletedCount = 0
    for (const file of files) {
      const fileTime = new Date(file.createdTime).getTime()
      if (fileTime < cutoffTime) {
        try {
          this.deleteOldLogFile(file.name)
          deletedCount++
        } catch (e) {
          console.error('Failed to delete old log:', file.name, e)
        }
      }
    }
    return deletedCount
  }
}

module.exports = LoggerManager

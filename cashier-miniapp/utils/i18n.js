const zhCN = require('../locale/zh-CN.js')
const enUS = require('../locale/en-US.js')
const jaJP = require('../locale/ja-JP.js')

const LANGUAGE_KEY = 'app_language'
const DEFAULT_LANGUAGE = 'zh-CN'

const LANGUAGES = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en-US', name: 'English' },
  { code: 'ja-JP', name: '日本語' }
]

const LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP
}

let currentLanguage = DEFAULT_LANGUAGE
let currentLocale = LOCALE_MAP[DEFAULT_LANGUAGE]
let changeListeners = []

function init() {
  try {
    const saved = wx.getStorageSync(LANGUAGE_KEY)
    if (saved && LOCALE_MAP[saved]) {
      currentLanguage = saved
      currentLocale = LOCALE_MAP[saved]
    }
  } catch (e) {
    console.warn('Failed to load language setting', e)
  }
}

function t(key) {
  if (!key) return ''

  const parts = key.split('.')
  let value = currentLocale

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part]
    } else {
      return key
    }
  }

  if (typeof value === 'string') {
    if (arguments.length > 1) {
      const args = Array.prototype.slice.call(arguments, 1)
      return value.replace(/\{(\d+)\}/g, (match, index) => {
        return args[index] !== undefined ? args[index] : match
      })
    }
    return value
  }

  return key
}

function tWithParams(key, params) {
  const value = t(key)
  if (typeof value === 'string' && params) {
    return value.replace(/\{(\w+)\}/g, (match, name) => {
      return params[name] !== undefined ? params[name] : match
    })
  }
  return value
}

function getLanguage() {
  return currentLanguage
}

function setLanguage(lang) {
  if (!LOCALE_MAP[lang]) {
    console.warn('Unsupported language:', lang)
    return false
  }

  if (currentLanguage !== lang) {
    currentLanguage = lang
    currentLocale = LOCALE_MAP[lang]

    try {
      wx.setStorageSync(LANGUAGE_KEY, lang)
    } catch (e) {
      console.warn('Failed to save language setting', e)
    }

    notifyChange()
  }

  return true
}

function getLanguages() {
  return LANGUAGES
}

function getCurrentLanguageInfo() {
  return LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0]
}

function onChange(callback) {
  if (typeof callback === 'function') {
    changeListeners.push(callback)
    return () => {
      const index = changeListeners.indexOf(callback)
      if (index > -1) {
        changeListeners.splice(index, 1)
      }
    }
  }
  return () => {}
}

function notifyChange() {
  changeListeners.forEach(callback => {
    try {
      callback(currentLanguage)
    } catch (e) {
      console.error('Error in language change listener', e)
    }
  })
}

function getPageTranslations(keys) {
  const result = {}
  keys.forEach(key => {
    result[key] = t(key)
  })
  return result
}

function mixinPageTranslations(page, keys) {
  const translations = getPageTranslations(keys)
  page.setData({ i18n: translations })
}

init()

module.exports = {
  t,
  tWithParams,
  getLanguage,
  setLanguage,
  getLanguages,
  getCurrentLanguageInfo,
  onChange,
  getPageTranslations,
  mixinPageTranslations,
  init
}

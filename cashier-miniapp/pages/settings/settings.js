const i18n = require('../../utils/i18n.js')
const exchangeRate = require('../../utils/exchangeRate.js')
const network = require('../../utils/network.js')

Page({
  data: {
    languages: [],
    currentLang: '',
    currencies: [],
    currentCurrency: '',
    networkStatus: true,
    rateCacheInfo: {},
    i18n: {}
  },

  onLoad() {
    this.loadData()
    this.checkNetwork()
    this.loadI18n()

    this.unsubscribeLangChange = i18n.onChange(() => {
      this.loadI18n()
      this.loadData()
    })
  },

  onUnload() {
    if (this.unsubscribeLangChange) {
      this.unsubscribeLangChange()
    }
  },

  loadI18n() {
    this.setData({
      i18n: i18n.getPageTranslations([
        'common.settings',
        'common.language',
        'common.currency',
        'common.confirm',
        'common.cancel',
        'common.home',
        'payment.exchangeRate',
        'payment.selectCurrency',
        'network.online',
        'network.offline',
        'message.languageChanged'
      ])
    })
  },

  loadData() {
    const languages = i18n.getLanguages().map(lang => ({
      ...lang,
      selected: lang.code === i18n.getLanguage()
    }))

    const currencies = exchangeRate.getEnabledCurrencies().map(cur => ({
      ...cur,
      selected: cur.code === exchangeRate.getSelectedCurrency()
    }))

    this.setData({
      languages,
      currentLang: i18n.getLanguage(),
      currencies,
      currentCurrency: exchangeRate.getSelectedCurrency(),
      rateCacheInfo: exchangeRate.getCacheInfo()
    })
  },

  checkNetwork() {
    network.getNetworkType().then(status => {
      this.setData({
        networkStatus: status.available
      })
    })
  },

  onSelectLanguage(e) {
    const langCode = e.currentTarget.dataset.code
    if (langCode === this.data.currentLang) return

    wx.showModal({
      title: this.data.i18n['common.language'],
      content: i18n.tWithParams('message.languageChanged', { lang: langCode }),
      confirmText: this.data.i18n['common.confirm'],
      cancelText: this.data.i18n['common.cancel'],
      success: (res) => {
        if (res.confirm) {
          i18n.setLanguage(langCode)
          this.loadData()
          wx.showToast({
            title: this.data.i18n['message.languageChanged'],
            icon: 'success'
          })
        }
      }
    })
  },

  onSelectCurrency(e) {
    const currencyCode = e.currentTarget.dataset.code
    if (currencyCode === this.data.currentCurrency) return

    exchangeRate.setSelectedCurrency(currencyCode)
    this.loadData()
    wx.showToast({
      title: `${this.data.i18n['payment.selectCurrency']}: ${currencyCode}`,
      icon: 'success'
    })
  },

  async onSyncRates() {
    if (!this.data.networkStatus) {
      wx.showToast({
        title: i18n.t('network.noNetwork'),
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: i18n.t('common.loading') })

    try {
      const success = await exchangeRate.syncRatesFromServer()
      wx.hideLoading()

      if (success) {
        this.loadData()
        wx.showToast({
          title: i18n.t('common.success'),
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: i18n.t('common.fail'),
          icon: 'none'
        })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({
        title: i18n.t('common.fail'),
        icon: 'none'
      })
    }
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  goBack() {
    wx.navigateBack()
  }
})

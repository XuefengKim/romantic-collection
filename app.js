const env = require('./config/env')
const statsService = require('./services/statsService')
const catalogRepository = require('./repositories/catalogRepository')

App({
  onLaunch() {
    statsService.initializeStats()
  },

  getEnv() {
    return env
  },

  getStatsService() {
    return statsService
  },

  getCatalogRepository() {
    return catalogRepository
  },

  globalData: {
    userInfo: null
  }
})

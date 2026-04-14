const env = require('./config/env')
const statsService = require('./services/statsService')
const catalogRepository = require('./repositories/catalogRepository')

App({
  onLaunch() {
    if (env.DATA_SOURCE === 'local') {
      const result = statsService.initializeStats()

      if (result && typeof result.catch === 'function') {
        result.catch(() => {})
      }
    }
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
    userInfo: null,
    pairStatus: null
  }
})

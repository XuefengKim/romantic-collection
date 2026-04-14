const env = require('../config/env')
const storage = require('../utils/storage')
const apiClient = require('../services/api/client')

function loadStats() {
  if (env.DATA_SOURCE === 'remote') {
    return storage.get(env.STORAGE_KEYS.STATS, null)
  }

  return storage.get(env.STORAGE_KEYS.STATS, null)
}

function saveStats(stats) {
  storage.set(env.STORAGE_KEYS.STATS, stats)
  return stats
}

function clearStats() {
  storage.remove(env.STORAGE_KEYS.STATS)
}

function fetchRemoteStats() {
  return apiClient.get('/miniapp/stats')
}

function saveRemoteStats(stats) {
  return apiClient.post('/miniapp/stats', stats)
}

module.exports = {
  loadStats,
  saveStats,
  clearStats,
  fetchRemoteStats,
  saveRemoteStats
}

const env = require('../config/env')
const storage = require('../utils/storage')
const apiClient = require('../services/api/client')

function loadStats() {
  if (env.DATA_SOURCE === 'remote') {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

  return storage.get(env.STORAGE_KEYS.STATS, null)
}

function saveStats(stats) {
  if (env.DATA_SOURCE === 'remote') {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

  storage.set(env.STORAGE_KEYS.STATS, stats)
  return stats
}

function clearStats() {
  if (env.DATA_SOURCE === 'remote') {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

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

const env = require('../config/env')
const storage = require('../utils/storage')
const apiClient = require('../services/api/client')

function canUseLocalStatsStorage() {
  return env.DATA_SOURCE !== 'remote' || !!storage.get(env.STORAGE_KEYS.LOCAL_BIND_MODE, false)
}

function loadStats() {
  if (!canUseLocalStatsStorage()) {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

  return storage.get(env.STORAGE_KEYS.STATS, null)
}

function saveStats(stats) {
  if (!canUseLocalStatsStorage()) {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

  storage.set(env.STORAGE_KEYS.STATS, stats)
  return stats
}

function clearStats() {
  if (!canUseLocalStatsStorage()) {
    throw new Error('Remote stats repository is not implemented yet. Keep ENABLE_REMOTE_SYNC=false until API wiring is completed.')
  }

  storage.remove(env.STORAGE_KEYS.STATS)
}

function fetchRemoteStats() {
  return apiClient.get('/api/home/state', {}, {}, true)
}

function checkinRemote(taskId) {
  return apiClient.post('/api/home/checkin', { taskId }, {}, true)
}

function drawRemote() {
  return apiClient.post('/api/home/draw', {}, {}, true)
}

function fetchRemoteCollection() {
  return apiClient.get('/api/collection', {}, {}, true)
}

function markRemoteFullAchievementShown() {
  return apiClient.post('/api/collection/achievement/full-collection/viewed', {}, {}, true)
}

module.exports = {
  loadStats,
  saveStats,
  clearStats,
  fetchRemoteStats,
  checkinRemote,
  drawRemote,
  fetchRemoteCollection,
  markRemoteFullAchievementShown
}

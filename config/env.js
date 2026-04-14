const STORAGE_KEYS = {
  STATS: 'romanticCollectionStats'
}

const FEATURE_FLAGS = {
  ENABLE_REMOTE_SYNC: false,
  ENABLE_SHARE: false,
  ENABLE_RANK: false
}

module.exports = {
  APP_NAME: '我们的浪漫收藏本',
  DATA_SOURCE: FEATURE_FLAGS.ENABLE_REMOTE_SYNC ? 'remote' : 'local',
  API_BASE_URL: 'https://api.lovecollection.online',
  API_TIMEOUT: 8000,
  STORAGE_KEYS,
  FEATURE_FLAGS
}

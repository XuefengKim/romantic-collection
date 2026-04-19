const STORAGE_KEYS = {
  STATS: 'romanticCollectionStats',
  AUTH_TOKEN: 'romanticCollectionAuthToken',
  USER_PROFILE: 'romanticCollectionUserProfile',
  PAIR_STATUS: 'romanticCollectionPairStatus',
  LOCAL_BIND_MODE: 'romanticCollectionLocalBindMode'
}

const FEATURE_FLAGS = {
  ENABLE_REMOTE_SYNC: true,
  ENABLE_SHARE: false,
  ENABLE_RANK: false,
  ENABLE_LOCAL_ANONYMOUS_BIND: true
}

module.exports = {
  APP_NAME: '我们的浪漫收藏本',
  DATA_SOURCE: FEATURE_FLAGS.ENABLE_REMOTE_SYNC ? 'remote' : 'local',
  API_BASE_URL: 'https://api.lovecollection.online',
  API_TIMEOUT: 15000,
  LOCAL_ANONYMOUS_BIND_CODE: 'HAKBONG',
  STORAGE_KEYS,
  FEATURE_FLAGS
}

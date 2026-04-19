const env = require('../config/env')
const storage = require('../utils/storage')
const apiClient = require('./api/client')

let loginPromise = null

function getStoredSession() {
  return {
    token: storage.get(env.STORAGE_KEYS.AUTH_TOKEN, ''),
    user: storage.get(env.STORAGE_KEYS.USER_PROFILE, null),
    pairStatus: storage.get(env.STORAGE_KEYS.PAIR_STATUS, null)
  }
}

function updateGlobalData(session) {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.userInfo = session.user || null
      app.globalData.pairStatus = session.pairStatus || null
    }
  } catch (error) {
    // App 尚未 ready 时忽略
  }
}

function persistSession(session) {
  storage.set(env.STORAGE_KEYS.AUTH_TOKEN, session.token || '')
  storage.set(env.STORAGE_KEYS.USER_PROFILE, session.user || null)
  storage.set(env.STORAGE_KEYS.PAIR_STATUS, session.pairStatus || null)
  updateGlobalData(session)
  return session
}

function isLocalAnonymousBound() {
  return !!storage.get(env.STORAGE_KEYS.LOCAL_BIND_MODE, false)
}

function enterLocalAnonymousBind() {
  storage.set(env.STORAGE_KEYS.LOCAL_BIND_MODE, true)
  const anonymousId = `local-anonymous-${Date.now()}`
  return persistSession({
    token: 'local-anonymous-bind',
    user: {
      id: anonymousId,
      openId: anonymousId,
      nickname: '匿名伴侣'
    },
    pairStatus: 'bound'
  })
}

function exitLocalAnonymousBind() {
  storage.remove(env.STORAGE_KEYS.LOCAL_BIND_MODE)
}

function clearSession() {
  storage.remove(env.STORAGE_KEYS.AUTH_TOKEN)
  storage.remove(env.STORAGE_KEYS.USER_PROFILE)
  storage.remove(env.STORAGE_KEYS.PAIR_STATUS)
  updateGlobalData({ user: null, pairStatus: null })
}

function resetAllLocalState() {
  clearSession()
  exitLocalAnonymousBind()
  storage.remove(env.STORAGE_KEYS.STATS)
  updateGlobalData({ user: null, pairStatus: null })
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error('wx.login 未返回 code'))
          return
        }

        resolve(res.code)
      },
      fail(error) {
        reject(error)
      }
    })
  })
}

async function login() {
  if (loginPromise) {
    return loginPromise
  }

  loginPromise = (async () => {
    const code = await wxLogin()
    const data = await apiClient.post('/api/auth/wechat-login', { code })

    return persistSession({
      token: data.token,
      user: data.user,
      pairStatus: data.pairStatus
    })
  })()

  try {
    return await loginPromise
  } finally {
    loginPromise = null
  }
}

async function ensureLogin(options = {}) {
  const { forceRefresh = false } = options
  const session = getStoredSession()

  if (isLocalAnonymousBound()) {
    updateGlobalData(Object.assign({}, session, {
      pairStatus: 'bound'
    }))
    return Object.assign({}, session, {
      token: session.token || 'local-anonymous-bind',
      pairStatus: 'bound'
    })
  }

  if (!forceRefresh && session.token) {
    updateGlobalData(session)
    return session
  }

  if (forceRefresh) {
    clearSession()
  }

  return login()
}

function updatePairStatus(pairStatus) {
  const session = getStoredSession()
  return persistSession(Object.assign({}, session, {
    pairStatus
  }))
}

module.exports = {
  getStoredSession,
  persistSession,
  clearSession,
  resetAllLocalState,
  login,
  ensureLogin,
  updatePairStatus,
  isLocalAnonymousBound,
  enterLocalAnonymousBind,
  exitLocalAnonymousBind
}

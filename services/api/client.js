const env = require('../../config/env')
const storage = require('../../utils/storage')

function buildHeader(header = {}, needAuth = false) {
  const nextHeader = Object.assign({
    'content-type': 'application/json'
  }, header)

  if (needAuth) {
    const token = storage.get(env.STORAGE_KEYS.AUTH_TOKEN, '')
    if (token) {
      nextHeader.Authorization = `Bearer ${token}`
    }
  }

  return nextHeader
}

function buildApiError({ message, code, statusCode, data }) {
  return {
    message: message || 'API request failed',
    code,
    statusCode,
    data
  }
}

function request({ url, method = 'GET', data = {}, header = {}, needAuth = false }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.API_BASE_URL}${url}`,
      method,
      data,
      timeout: env.API_TIMEOUT,
      header: buildHeader(header, needAuth),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!res.data || typeof res.data !== 'object') {
            reject(buildApiError({
              message: 'API 返回格式异常',
              statusCode: res.statusCode,
              data: res.data
            }))
            return
          }

          if (res.data.code === 0) {
            resolve(res.data.data)
            return
          }

          reject(buildApiError({
            message: res.data.message,
            code: res.data.code,
            statusCode: res.statusCode,
            data: res.data.data
          }))
          return
        }

        reject(buildApiError({
          message: (res.data && res.data.message) || 'API request failed',
          code: res.data && res.data.code,
          statusCode: res.statusCode,
          data: res.data && res.data.data
        }))
      },
      fail(error) {
        reject(buildApiError({
          message: error.errMsg || '网络请求失败',
          data: error
        }))
      }
    })
  })
}

function get(url, data, header, needAuth = false) {
  return request({ url, method: 'GET', data, header, needAuth })
}

function post(url, data, header, needAuth = false) {
  return request({ url, method: 'POST', data, header, needAuth })
}

function put(url, data, header, needAuth = false) {
  return request({ url, method: 'PUT', data, header, needAuth })
}

module.exports = {
  request,
  get,
  post,
  put
}

const env = require('../../config/env')

function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.API_BASE_URL}${url}`,
      method,
      data,
      timeout: env.API_TIMEOUT,
      header: Object.assign({
        'content-type': 'application/json'
      }, header),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        reject({
          message: 'API request failed',
          statusCode: res.statusCode,
          data: res.data
        })
      },
      fail(error) {
        reject(error)
      }
    })
  })
}

function get(url, data, header) {
  return request({ url, method: 'GET', data, header })
}

function post(url, data, header) {
  return request({ url, method: 'POST', data, header })
}

function put(url, data, header) {
  return request({ url, method: 'PUT', data, header })
}

module.exports = {
  request,
  get,
  post,
  put
}

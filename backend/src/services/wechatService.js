const axios = require('axios')
const env = require('../config/env')
const { appError } = require('../utils/appError')

async function getWechatSession(code) {
  if (!env.appId || !env.appSecret) {
    throw appError('服务端未配置微信登录参数 APPID / APP_SECRET', 500, 500)
  }

  const response = await axios.get(env.wechatCode2SessionUrl, {
    timeout: 10000,
    params: {
      appid: env.appId,
      secret: env.appSecret,
      js_code: code,
      grant_type: 'authorization_code'
    }
  })

  const data = response.data || {}

  if (data.errcode) {
    throw appError(`微信登录失败：${data.errmsg || 'code2Session error'}`, 400, 400)
  }

  if (!data.openid) {
    throw appError('微信登录失败：未获取到 openid', 400, 400)
  }

  return {
    openid: data.openid,
    unionid: data.unionid || null,
    sessionKey: data.session_key || null
  }
}

module.exports = {
  getWechatSession
}

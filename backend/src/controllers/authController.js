const { success } = require('../utils/response')
const { signUserToken } = require('../services/tokenService')
const { getWechatSession } = require('../services/wechatService')
const { getOrCreateUserByWechatIdentity, getUserProfile } = require('../services/userService')
const { getPairStatusByUserId } = require('../services/coupleService')
const { appError } = require('../utils/appError')

async function wechatLogin(req, res, next) {
  try {
    const code = String(req.body.code || '').trim()

    if (!code) {
      throw appError('缺少 wx.login code', 400, 400)
    }

    const wechatIdentity = await getWechatSession(code)
    const user = await getOrCreateUserByWechatIdentity(wechatIdentity)
    const pairStatus = await getPairStatusByUserId(user.id)
    const token = signUserToken(user)

    res.json(success({
      token,
      user,
      pairStatus
    }))
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await getUserProfile(req.auth.userId)

    if (!user) {
      throw appError('用户不存在', 404, 404)
    }

    const pairStatus = await getPairStatusByUserId(user.id)

    res.json(success({
      user,
      pairStatus
    }))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  wechatLogin,
  me
}

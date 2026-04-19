const { success } = require('../utils/response')
const { createInviteCodeForUser, bindCoupleByInviteCode, unbindCoupleByUserId } = require('../services/coupleService')
const { appError } = require('../utils/appError')

async function createInviteCode(req, res, next) {
  try {
    const inviteCode = await createInviteCodeForUser(req.auth.userId)

    res.json(success({
      inviteCode: inviteCode.code,
      expiresAt: inviteCode.expiresAt.toISOString()
    }))
  } catch (err) {
    next(err)
  }
}

async function bindCouple(req, res, next) {
  try {
    const inviteCode = String(req.body.inviteCode || '').trim().toUpperCase()

    if (!inviteCode) {
      throw appError('缺少邀请码', 400, 400)
    }

    const pair = await bindCoupleByInviteCode(req.auth.userId, inviteCode)

    res.json(success({
      pairStatus: 'bound',
      pairId: pair.id,
      inviteCode
    }, '绑定成功'))
  } catch (err) {
    next(err)
  }
}

async function unbindCouple(req, res, next) {
  try {
    const result = await unbindCoupleByUserId(req.auth.userId)

    res.json(success({
      pairStatus: result.pairStatus,
      reset: result.reset
    }, '解绑成功'))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createInviteCode,
  bindCouple,
  unbindCouple
}

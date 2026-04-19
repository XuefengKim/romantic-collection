const env = require('../config/env')
const coupleRepository = require('../repositories/coupleRepository')
const authService = require('./authService')

function normalizeInviteCode(inviteCode) {
  return String(inviteCode || '').trim().toUpperCase()
}

async function runWithLoginRetry(operation) {
  try {
    await authService.ensureLogin()
    return await operation()
  } catch (error) {
    if (error && (error.code === 401 || error.statusCode === 401)) {
      await authService.ensureLogin({ forceRefresh: true })
      return operation()
    }

    throw error
  }
}

async function createInviteCode() {
  const result = await runWithLoginRetry(() => coupleRepository.createInviteCode())
  return {
    inviteCode: normalizeInviteCode(result.inviteCode),
    expiresAt: result.expiresAt
  }
}

function bindCoupleLocally(normalizedInviteCode) {
  authService.enterLocalAnonymousBind()

  return {
    pairStatus: 'bound',
    pairId: `local-pair-${Date.now()}`,
    inviteCode: normalizedInviteCode,
    source: 'local'
  }
}

async function bindCouple(inviteCode) {
  const normalizedInviteCode = normalizeInviteCode(inviteCode)

  if (!normalizedInviteCode) {
    throw new Error('请输入邀请码')
  }

  if (env.FEATURE_FLAGS.ENABLE_LOCAL_ANONYMOUS_BIND && normalizedInviteCode === env.LOCAL_ANONYMOUS_BIND_CODE) {
    return bindCoupleLocally(normalizedInviteCode)
  }

  const result = await runWithLoginRetry(() => coupleRepository.bindCouple(normalizedInviteCode))
  authService.updatePairStatus(result.pairStatus || 'bound')

  return {
    pairStatus: result.pairStatus || 'bound',
    pairId: result.pairId,
    inviteCode: normalizeInviteCode(result.inviteCode || normalizedInviteCode),
    source: 'remote'
  }
}

async function unbindCouple() {
  if (authService.isLocalAnonymousBound()) {
    return {
      pairStatus: 'unbound',
      reset: true,
      source: 'local'
    }
  }

  const result = await runWithLoginRetry(() => coupleRepository.unbindCouple())
  authService.updatePairStatus(result.pairStatus || 'unbound')

  return {
    pairStatus: result.pairStatus || 'unbound',
    reset: !!result.reset,
    source: 'remote'
  }
}

module.exports = {
  normalizeInviteCode,
  createInviteCode,
  bindCouple,
  unbindCouple
}

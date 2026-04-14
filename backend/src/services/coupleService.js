const prisma = require('../lib/prisma')
const { INVITE_CODE_EXPIRES_MS } = require('../config/business')
const { appError } = require('../utils/appError')

function normalizePairUsers(userIdA, userIdB) {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA]
}

async function getActivePairByUserId(userId) {
  return prisma.couplePair.findFirst({
    where: {
      status: 'active',
      OR: [{ userAId: userId }, { userBId: userId }]
    }
  })
}

async function getPairStatusByUserId(userId) {
  const pair = await getActivePairByUserId(userId)
  return pair ? 'bound' : 'unbound'
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

async function createInviteCodeForUser(userId) {
  const pair = await getActivePairByUserId(userId)
  if (pair) {
    throw appError('你已经绑定了情侣关系，无法重复生成邀请码', 409, 409)
  }

  for (let i = 0; i < 10; i += 1) {
    const code = generateInviteCode()
    const expiresAt = new Date(Date.now() + INVITE_CODE_EXPIRES_MS)

    try {
      return await prisma.inviteCode.create({
        data: {
          code,
          creatorId: userId,
          status: 'active',
          expiresAt
        }
      })
    } catch (error) {
      if (error.code === 'P2002') {
        continue
      }
      throw error
    }
  }

  throw appError('邀请码生成失败，请稍后重试', 500, 500)
}

async function bindCoupleByInviteCode(currentUserId, inviteCodeText) {
  const selfPair = await getActivePairByUserId(currentUserId)
  if (selfPair) {
    throw appError('你已经绑定过情侣关系', 409, 409)
  }

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code: inviteCodeText },
    include: {
      creator: true
    }
  })

  if (!inviteCode) {
    throw appError('邀请码不存在', 404, 404)
  }

  if (inviteCode.status !== 'active') {
    throw appError('邀请码已失效或已被使用', 409, 409)
  }

  if (inviteCode.expiresAt.getTime() < Date.now()) {
    throw appError('邀请码已过期', 409, 409)
  }

  if (inviteCode.creatorId === currentUserId) {
    throw appError('不能绑定自己创建的邀请码', 409, 409)
  }

  const creatorPair = await getActivePairByUserId(inviteCode.creatorId)
  if (creatorPair) {
    throw appError('邀请码创建者已经绑定过情侣关系', 409, 409)
  }

  const [userAId, userBId] = normalizePairUsers(inviteCode.creatorId, currentUserId)

  const pair = await prisma.$transaction(async tx => {
    const createdPair = await tx.couplePair.create({
      data: {
        userAId,
        userBId,
        status: 'active'
      }
    })

    await tx.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        status: 'used',
        usedById: currentUserId
      }
    })

    await tx.inviteCode.updateMany({
      where: {
        creatorId: inviteCode.creatorId,
        status: 'active',
        id: { not: inviteCode.id }
      },
      data: {
        status: 'revoked'
      }
    })

    return createdPair
  })

  return pair
}

module.exports = {
  getActivePairByUserId,
  getPairStatusByUserId,
  createInviteCodeForUser,
  bindCoupleByInviteCode
}

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

async function assertBoundUser(userId, message = '请先完成情侣绑定，再进入你们的秘密空间') {
  const pair = await getActivePairByUserId(userId)
  if (!pair) {
    throw appError(message, 403, 403)
  }

  return pair
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
    const createdPair = await tx.couplePair.upsert({
      where: {
        userAId_userBId: {
          userAId,
          userBId
        }
      },
      update: {
        status: 'active'
      },
      create: {
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

async function resetUserGameData(tx, userId) {
  await tx.checkinRecord.deleteMany({
    where: { userId }
  })

  await tx.drawRecord.deleteMany({
    where: { userId }
  })

  await tx.userCardCollection.deleteMany({
    where: { userId }
  })

  await tx.userStat.upsert({
    where: { userId },
    update: {
      totalHearts: 0,
      drawChances: 0,
      totalDrawEarned: 0,
      totalDrawUsed: 0,
      fullCollectionAchievementShown: false
    },
    create: {
      userId,
      totalHearts: 0,
      drawChances: 0,
      totalDrawEarned: 0,
      totalDrawUsed: 0,
      fullCollectionAchievementShown: false
    }
  })
}

async function unbindCoupleByUserId(userId) {
  const pair = await getActivePairByUserId(userId)
  if (!pair) {
    throw appError('当前未绑定，无需取消绑定', 409, 409)
  }

  const userIds = [pair.userAId, pair.userBId]

  await prisma.$transaction(async tx => {
    await tx.couplePair.update({
      where: { id: pair.id },
      data: {
        status: 'cancelled'
      }
    })

    await tx.inviteCode.updateMany({
      where: {
        creatorId: { in: userIds },
        status: 'active'
      },
      data: {
        status: 'revoked'
      }
    })

    await Promise.all(userIds.map(currentUserId => resetUserGameData(tx, currentUserId)))
  })

  return {
    pairId: pair.id,
    userIds,
    pairStatus: 'unbound',
    reset: true
  }
}

module.exports = {
  getActivePairByUserId,
  getPairStatusByUserId,
  assertBoundUser,
  createInviteCodeForUser,
  bindCoupleByInviteCode,
  unbindCoupleByUserId
}

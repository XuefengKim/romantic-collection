const prisma = require('../lib/prisma')

async function getOrCreateUserByWechatIdentity({ openid, unionid = null }) {
  const user = await prisma.user.upsert({
    where: { openid },
    update: {
      unionid: unionid || undefined
    },
    create: {
      openid,
      unionid
    }
  })

  await prisma.userStat.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id
    }
  })

  return user
}

async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      stats: true
    }
  })
}

module.exports = {
  getOrCreateUserByWechatIdentity,
  getUserProfile
}

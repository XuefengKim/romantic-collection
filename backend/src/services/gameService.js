const prisma = require('../lib/prisma')
const { HEARTS_PER_DRAW, CHECKIN_COOLDOWN_MS } = require('../config/business')
const { appError } = require('../utils/appError')
const { assertBoundUser } = require('./coupleService')

async function getOrCreateUserStats(userId) {
  return prisma.userStat.upsert({
    where: { userId },
    update: {},
    create: { userId }
  })
}

function buildCollectedCardsMap(collections) {
  return collections.reduce((result, item) => {
    result[item.cardId] = item.quantity
    return result
  }, {})
}

function buildLastCheckinMap(checkins) {
  const result = {}

  checkins.forEach(item => {
    if (!result[item.taskId]) {
      result[item.taskId] = item.createdAt.getTime()
    }
  })

  return result
}

async function getUserCollectionState(userId) {
  const [stats, collections, allCards] = await Promise.all([
    getOrCreateUserStats(userId),
    prisma.userCardCollection.findMany({
      where: { userId, quantity: { gt: 0 } },
      orderBy: { cardId: 'asc' }
    }),
    prisma.cardCatalog.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    })
  ])

  const collectedCards = buildCollectedCardsMap(collections)

  const cardList = allCards.map(card => ({
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    desc: card.description,
    color: card.color,
    owned: collectedCards[card.id] || 0
  }))

  const unlockedCount = cardList.filter(card => card.owned > 0).length
  const shouldShowFullAchievement =
    cardList.length > 0 &&
    unlockedCount === cardList.length &&
    !stats.fullCollectionAchievementShown

  return {
    cardList,
    collectedCards,
    unlockedCount,
    totalCards: cardList.length,
    shouldShowFullAchievement
  }
}

async function markFullCollectionAchievementShown(userId) {
  await getOrCreateUserStats(userId)

  return prisma.userStat.update({
    where: { userId },
    data: {
      fullCollectionAchievementShown: true
    }
  })
}

async function buildHomeState(userId, pairStatus, tasks) {
  const [stats, checkins, collectionState] = await Promise.all([
    getOrCreateUserStats(userId),
    prisma.checkinRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }),
    getUserCollectionState(userId)
  ])

  return {
    pairStatus,
    stats: {
      totalHearts: stats.totalHearts,
      drawChances: stats.drawChances,
      totalDrawEarned: stats.totalDrawEarned,
      totalDrawUsed: stats.totalDrawUsed,
      collectedCards: collectionState.collectedCards,
      lastCheckin: buildLastCheckinMap(checkins),
      meta: {
        fullCollectionAchievementShown: stats.fullCollectionAchievementShown
      }
    },
    tasks
  }
}

async function performCheckin(userId, taskId) {
  await assertBoundUser(userId)

  const [task, stats, latestCheckin] = await Promise.all([
    prisma.taskCatalog.findFirst({
      where: { id: taskId, active: true }
    }),
    getOrCreateUserStats(userId),
    prisma.checkinRecord.findFirst({
      where: { userId, taskId },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!task) {
    throw appError('任务不存在或已下线', 404, 404)
  }

  if (latestCheckin && Date.now() - latestCheckin.createdAt.getTime() < CHECKIN_COOLDOWN_MS) {
    throw appError('该任务刚打卡过，请稍后再试', 409, 409)
  }

  const heartDelta = 1
  const beforeHearts = stats.totalHearts
  const afterHearts = beforeHearts + heartDelta
  const drawChanceDelta = Math.floor(afterHearts / HEARTS_PER_DRAW) - Math.floor(beforeHearts / HEARTS_PER_DRAW)

  const result = await prisma.$transaction(async tx => {
    await tx.checkinRecord.create({
      data: {
        userId,
        taskId,
        heartsDelta: heartDelta
      }
    })

    const updatedStats = await tx.userStat.update({
      where: { userId },
      data: {
        totalHearts: { increment: heartDelta },
        drawChances: { increment: drawChanceDelta },
        totalDrawEarned: { increment: drawChanceDelta }
      }
    })

    return updatedStats
  })

  return {
    task: {
      id: task.id,
      name: task.name,
      desc: task.description
    },
    heartDelta,
    drawChanceDelta,
    stats: result
  }
}

async function performDraw(userId) {
  await assertBoundUser(userId)
  const stats = await getOrCreateUserStats(userId)

  if (stats.drawChances <= 0) {
    throw appError('当前没有可用抽卡次数', 409, 409)
  }

  const cards = await prisma.cardCatalog.findMany({
    where: { active: true },
    orderBy: { id: 'asc' }
  })

  if (!cards.length) {
    throw appError('卡池暂未配置，请先初始化卡牌数据', 500, 500)
  }

  const card = cards[Math.floor(Math.random() * cards.length)]

  const result = await prisma.$transaction(async tx => {
    const existingCollection = await tx.userCardCollection.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId: card.id
        }
      }
    })

    const drawRecord = await tx.drawRecord.create({
      data: {
        userId,
        cardId: card.id,
        rarity: card.rarity
      }
    })

    const updatedStats = await tx.userStat.update({
      where: { userId },
      data: {
        drawChances: { decrement: 1 },
        totalDrawUsed: { increment: 1 }
      }
    })

    const collection = await tx.userCardCollection.upsert({
      where: {
        userId_cardId: {
          userId,
          cardId: card.id
        }
      },
      update: {
        quantity: { increment: 1 }
      },
      create: {
        userId,
        cardId: card.id,
        quantity: 1
      }
    })

    return {
      drawRecord,
      updatedStats,
      collection,
      isNew: !existingCollection || existingCollection.quantity === 0
    }
  })

  return {
    card: {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      desc: card.description,
      color: card.color
    },
    quantity: result.collection.quantity,
    isNew: result.isNew,
    drawRecordId: result.drawRecord.id,
    stats: result.updatedStats
  }
}

module.exports = {
  getOrCreateUserStats,
  getUserCollectionState,
  markFullCollectionAchievementShown,
  buildHomeState,
  performCheckin,
  performDraw
}

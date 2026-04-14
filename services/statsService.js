const statsRepository = require('../repositories/statsRepository')
const catalogRepository = require('../repositories/catalogRepository')

const CHECKIN_COOLDOWN_MS = 60000
const HEARTS_PER_DRAW = 5

function createDefaultStats() {
  return {
    totalHearts: 0,
    drawChances: 0,
    totalDrawEarned: 0,
    totalDrawUsed: 0,
    collectedCards: {},
    lastCheckin: {},
    meta: {
      fullCollectionAchievementShown: false
    }
  }
}

function sumCollectedCards(collectedCards = {}) {
  return Object.values(collectedCards).reduce((sum, count) => sum + count, 0)
}

function computeDrawChances(stats) {
  return Math.max(0, (stats.totalDrawEarned || 0) - (stats.totalDrawUsed || 0))
}

function normalizeStats(rawStats) {
  const defaultStats = createDefaultStats()
  const merged = Object.assign({}, defaultStats, rawStats || {})
  merged.collectedCards = Object.assign({}, defaultStats.collectedCards, (rawStats && rawStats.collectedCards) || {})
  merged.lastCheckin = Object.assign({}, defaultStats.lastCheckin, (rawStats && rawStats.lastCheckin) || {})
  merged.meta = Object.assign({}, defaultStats.meta, (rawStats && rawStats.meta) || {})

  const collectedDrawCount = sumCollectedCards(merged.collectedCards)
  const legacyDrawChances = Number.isFinite(merged.drawChances) ? merged.drawChances : 0
  const inferredEarned = Math.max(
    Math.floor((merged.totalHearts || 0) / HEARTS_PER_DRAW),
    collectedDrawCount + legacyDrawChances,
    merged.totalDrawEarned || 0
  )

  merged.totalDrawEarned = inferredEarned
  merged.totalDrawUsed = Math.max(collectedDrawCount, merged.totalDrawUsed || 0)
  merged.drawChances = computeDrawChances(merged)

  return merged
}

function persistStats(stats) {
  const normalized = normalizeStats(stats)
  statsRepository.saveStats(normalized)
  return normalized
}

function initializeStats() {
  const existing = statsRepository.loadStats()
  if (!existing) {
    return persistStats(createDefaultStats())
  }

  return persistStats(existing)
}

function getStats() {
  return normalizeStats(statsRepository.loadStats() || createDefaultStats())
}

function getTasks() {
  return catalogRepository.getTasks()
}

function getCardPool() {
  return catalogRepository.getCardPool()
}

function getTaskCooldown(stats, taskId, now = Date.now()) {
  const lastCheckin = stats.lastCheckin[taskId] || 0
  const remaining = Math.ceil((CHECKIN_COOLDOWN_MS - (now - lastCheckin)) / 1000)
  return remaining > 0 ? remaining : 0
}

function checkinTask(taskId) {
  const stats = getStats()
  const cooldown = getTaskCooldown(stats, taskId)

  if (cooldown > 0) {
    return {
      success: false,
      reason: 'cooldown',
      cooldown,
      stats
    }
  }

  const updatedStats = Object.assign({}, stats, {
    totalHearts: stats.totalHearts + 1,
    lastCheckin: Object.assign({}, stats.lastCheckin)
  })
  updatedStats.lastCheckin[taskId] = Date.now()

  const previousEarned = Math.floor(stats.totalHearts / HEARTS_PER_DRAW)
  const currentEarned = Math.floor(updatedStats.totalHearts / HEARTS_PER_DRAW)
  const gainedDraws = Math.max(0, currentEarned - previousEarned)
  updatedStats.totalDrawEarned = stats.totalDrawEarned + gainedDraws
  updatedStats.drawChances = computeDrawChances(updatedStats)

  const savedStats = persistStats(updatedStats)

  return {
    success: true,
    gainedDraws,
    stats: savedStats
  }
}

function drawCard() {
  const stats = getStats()

  if (stats.drawChances <= 0) {
    return {
      success: false,
      reason: 'no_draw_chance',
      stats
    }
  }

  const cardPool = getCardPool()
  const randomIndex = Math.floor(Math.random() * cardPool.length)
  const drawnCard = cardPool[randomIndex]
  const nextCollectedCount = (stats.collectedCards[drawnCard.id] || 0) + 1

  const updatedStats = Object.assign({}, stats, {
    totalDrawUsed: stats.totalDrawUsed + 1,
    collectedCards: Object.assign({}, stats.collectedCards)
  })
  updatedStats.collectedCards[drawnCard.id] = nextCollectedCount
  updatedStats.drawChances = computeDrawChances(updatedStats)

  const savedStats = persistStats(updatedStats)

  return {
    success: true,
    drawnCard,
    cardCount: nextCollectedCount,
    stats: savedStats
  }
}

function getCollectionSummary() {
  const stats = getStats()
  const cardList = getCardPool()
  const collectedCount = Object.keys(stats.collectedCards).filter(id => stats.collectedCards[id] > 0).length

  return {
    cardList,
    collectedCards: stats.collectedCards,
    collectedCount,
    totalCount: cardList.length,
    shouldShowFullAchievement: collectedCount === cardList.length && !stats.meta.fullCollectionAchievementShown
  }
}

function markFullCollectionAchievementShown() {
  const stats = getStats()
  const updatedStats = Object.assign({}, stats, {
    meta: Object.assign({}, stats.meta, {
      fullCollectionAchievementShown: true
    })
  })

  return persistStats(updatedStats)
}

module.exports = {
  CHECKIN_COOLDOWN_MS,
  HEARTS_PER_DRAW,
  createDefaultStats,
  initializeStats,
  getStats,
  getTasks,
  getCardPool,
  getTaskCooldown,
  checkinTask,
  drawCard,
  getCollectionSummary,
  markFullCollectionAchievementShown,
  normalizeStats
}

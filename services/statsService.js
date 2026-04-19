const env = require('../config/env')
const statsRepository = require('../repositories/statsRepository')
const catalogRepository = require('../repositories/catalogRepository')
const authService = require('./authService')

const CHECKIN_COOLDOWN_MS = 60000
const HEARTS_PER_DRAW = 5

let remoteHomeStateCache = null

function isRemoteMode() {
  return env.DATA_SOURCE === 'remote'
}

function isLocalPlayableMode() {
  return !isRemoteMode() || authService.isLocalAnonymousBound()
}

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

function createDefaultHomeState() {
  return {
    pairStatus: authService.isLocalAnonymousBound() ? 'bound' : null,
    stats: createDefaultStats(),
    tasks: catalogRepository.getTasks()
  }
}

function sumCollectedCards(collectedCards = {}) {
  return Object.values(collectedCards).reduce((sum, count) => sum + count, 0)
}

function computeDrawChances(stats) {
  return Math.max(0, (stats.totalDrawEarned || 0) - (stats.totalDrawUsed || 0))
}

function normalizeTasks(rawTasks) {
  const defaultTasks = catalogRepository.getTasks()
  return {
    romantic: Array.isArray(rawTasks && rawTasks.romantic) ? rawTasks.romantic : defaultTasks.romantic,
    housework: Array.isArray(rawTasks && rawTasks.housework) ? rawTasks.housework : defaultTasks.housework
  }
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

function normalizeHomeState(rawState = {}) {
  return {
    pairStatus: rawState.pairStatus || null,
    stats: normalizeStats(rawState.stats),
    tasks: normalizeTasks(rawState.tasks)
  }
}

function setRemoteHomeStateCache(homeState) {
  remoteHomeStateCache = normalizeHomeState(homeState)
  return remoteHomeStateCache
}

function getRemoteHomeStateCache() {
  return remoteHomeStateCache || createDefaultHomeState()
}

function resetRuntimeState() {
  remoteHomeStateCache = null
}

function persistStats(stats) {
  const normalized = normalizeStats(stats)
  statsRepository.saveStats(normalized)
  return normalized
}

function initializeLocalStats() {
  const existing = statsRepository.loadStats()
  if (!existing) {
    return persistStats(createDefaultStats())
  }

  return persistStats(existing)
}

async function initializeStats() {
  if (isLocalPlayableMode()) {
    return initializeLocalStats()
  }

  try {
    await authService.ensureLogin()
  } catch (error) {
    return createDefaultStats()
  }

  return getHomeState().then(homeState => homeState.stats)
}

function getStats() {
  if (isRemoteMode() && !authService.isLocalAnonymousBound()) {
    return getRemoteHomeStateCache().stats
  }

  return normalizeStats(statsRepository.loadStats() || createDefaultStats())
}

function getTasks() {
  if (isRemoteMode() && !authService.isLocalAnonymousBound()) {
    return getRemoteHomeStateCache().tasks
  }

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

async function getHomeState() {
  if (isLocalPlayableMode()) {
    return {
      pairStatus: authService.isLocalAnonymousBound() ? 'bound' : null,
      stats: getStats(),
      tasks: getTasks()
    }
  }

  const remoteState = await runWithLoginRetry(() => statsRepository.fetchRemoteStats())
  return setRemoteHomeStateCache(remoteState)
}

function checkinTaskLocal(taskId) {
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

async function checkinTask(taskId) {
  if (isLocalPlayableMode()) {
    return checkinTaskLocal(taskId)
  }

  const result = await runWithLoginRetry(() => statsRepository.checkinRemote(taskId))
  const cachedHomeState = getRemoteHomeStateCache()
  const nextStats = normalizeStats(Object.assign({}, cachedHomeState.stats, result.stats, {
    lastCheckin: Object.assign({}, cachedHomeState.stats.lastCheckin, {
      [taskId]: Date.now()
    })
  }))

  setRemoteHomeStateCache(Object.assign({}, cachedHomeState, {
    stats: nextStats
  }))

  return {
    success: true,
    gainedDraws: result.drawChanceDelta || 0,
    stats: nextStats
  }
}

function drawCardLocal() {
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

async function drawCard() {
  if (isLocalPlayableMode()) {
    return drawCardLocal()
  }

  const result = await runWithLoginRetry(() => statsRepository.drawRemote())
  const cachedHomeState = getRemoteHomeStateCache()
  const nextCollectedCards = Object.assign({}, cachedHomeState.stats.collectedCards, {
    [result.card.id]: result.quantity
  })
  const nextStats = normalizeStats(Object.assign({}, cachedHomeState.stats, result.stats, {
    collectedCards: nextCollectedCards
  }))

  setRemoteHomeStateCache(Object.assign({}, cachedHomeState, {
    stats: nextStats
  }))

  return {
    success: true,
    drawnCard: result.card,
    cardCount: result.quantity,
    stats: nextStats
  }
}

function getCollectionSummaryLocal() {
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

async function getCollectionSummary() {
  if (isLocalPlayableMode()) {
    return getCollectionSummaryLocal()
  }

  return runWithLoginRetry(() => statsRepository.fetchRemoteCollection())
}

function markFullCollectionAchievementShownLocal() {
  const stats = getStats()
  const updatedStats = Object.assign({}, stats, {
    meta: Object.assign({}, stats.meta, {
      fullCollectionAchievementShown: true
    })
  })

  return persistStats(updatedStats)
}

async function markFullCollectionAchievementShown() {
  if (isLocalPlayableMode()) {
    return markFullCollectionAchievementShownLocal()
  }

  await runWithLoginRetry(() => statsRepository.markRemoteFullAchievementShown())

  const cachedHomeState = getRemoteHomeStateCache()
  const nextStats = normalizeStats(Object.assign({}, cachedHomeState.stats, {
    meta: Object.assign({}, cachedHomeState.stats.meta, {
      fullCollectionAchievementShown: true
    })
  }))

  setRemoteHomeStateCache(Object.assign({}, cachedHomeState, {
    stats: nextStats
  }))

  return nextStats
}

module.exports = {
  CHECKIN_COOLDOWN_MS,
  HEARTS_PER_DRAW,
  createDefaultStats,
  initializeStats,
  getHomeState,
  getStats,
  getTasks,
  getCardPool,
  getTaskCooldown,
  checkinTask,
  drawCard,
  getCollectionSummary,
  markFullCollectionAchievementShown,
  normalizeStats,
  resetRuntimeState
}

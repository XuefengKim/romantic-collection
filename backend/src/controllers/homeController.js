const { success } = require('../utils/response')
const { getPairStatusByUserId } = require('../services/coupleService')
const { getActiveTasksGrouped } = require('../services/catalogService')
const { buildHomeState, performCheckin, performDraw } = require('../services/gameService')
const { appError } = require('../utils/appError')

async function getHomeState(req, res, next) {
  try {
    const [pairStatus, tasks] = await Promise.all([
      getPairStatusByUserId(req.auth.userId),
      getActiveTasksGrouped()
    ])

    const data = await buildHomeState(req.auth.userId, pairStatus, tasks)
    res.json(success(data))
  } catch (err) {
    next(err)
  }
}

async function checkin(req, res, next) {
  try {
    const taskId = Number(req.body.taskId)

    if (!taskId || Number.isNaN(taskId)) {
      throw appError('缺少有效 taskId', 400, 400)
    }

    const result = await performCheckin(req.auth.userId, taskId)

    res.json(success({
      taskId,
      task: result.task,
      heartDelta: result.heartDelta,
      drawChanceDelta: result.drawChanceDelta,
      stats: {
        totalHearts: result.stats.totalHearts,
        drawChances: result.stats.drawChances,
        totalDrawEarned: result.stats.totalDrawEarned,
        totalDrawUsed: result.stats.totalDrawUsed
      }
    }, '打卡成功'))
  } catch (err) {
    next(err)
  }
}

async function draw(req, res, next) {
  try {
    const result = await performDraw(req.auth.userId)

    res.json(success({
      card: result.card,
      quantity: result.quantity,
      isNew: result.isNew,
      drawRecordId: result.drawRecordId,
      stats: {
        totalHearts: result.stats.totalHearts,
        drawChances: result.stats.drawChances,
        totalDrawEarned: result.stats.totalDrawEarned,
        totalDrawUsed: result.stats.totalDrawUsed
      }
    }, '抽卡成功'))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getHomeState,
  checkin,
  draw
}

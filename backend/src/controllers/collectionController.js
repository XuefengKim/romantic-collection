const { success } = require('../utils/response')
const { getUserCollectionState, markFullCollectionAchievementShown } = require('../services/gameService')
const { assertBoundUser } = require('../services/coupleService')

async function getCollection(req, res, next) {
  try {
    await assertBoundUser(req.auth.userId)
    const data = await getUserCollectionState(req.auth.userId)

    res.json(success({
      cardList: data.cardList,
      collectedCards: data.collectedCards,
      collectedCount: data.unlockedCount,
      totalCount: data.totalCards,
      shouldShowFullAchievement: data.shouldShowFullAchievement,
      unlockedCount: data.unlockedCount,
      totalCards: data.totalCards
    }))
  } catch (err) {
    next(err)
  }
}

async function markFullAchievementViewed(req, res, next) {
  try {
    await assertBoundUser(req.auth.userId)
    await markFullCollectionAchievementShown(req.auth.userId)

    res.json(success({
      fullCollectionAchievementShown: true
    }, '已记录成就弹窗状态'))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getCollection,
  markFullAchievementViewed
}

const { success } = require('../utils/response')
const { getUserCollectionState, markFullCollectionAchievementShown } = require('../services/gameService')

async function getCollection(req, res, next) {
  try {
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

const { success } = require('../utils/response')
const { getUserCollectionState } = require('../services/gameService')

async function getCollection(req, res, next) {
  try {
    const data = await getUserCollectionState(req.auth.userId)

    res.json(success({
      cardList: data.cardList,
      collectedCards: data.collectedCards,
      collectedCount: data.unlockedCount,
      totalCount: data.totalCards,
      shouldShowFullAchievement: false,
      unlockedCount: data.unlockedCount,
      totalCards: data.totalCards
    }))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getCollection
}

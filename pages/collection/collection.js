const statsService = require('../../services/statsService')

function getErrorMessage(error, fallback = '操作失败，请稍后重试') {
  return (error && error.message) || fallback
}

Page({
  data: {
    cardList: [],
    collectedCards: {},
    collectedCount: 0,
    totalCount: 0,
    showFullAchievement: false
  },

  onLoad() {
    this.refreshCollectionData()
  },

  onShow() {
    if (this.hasInitialized) {
      this.refreshCollectionData()
    }
  },

  async refreshCollectionData() {
    try {
      const summary = await statsService.getCollectionSummary()

      this.setData({
        cardList: summary.cardList,
        collectedCards: summary.collectedCards,
        collectedCount: summary.collectedCount,
        totalCount: summary.totalCount,
        showFullAchievement: summary.shouldShowFullAchievement
      })

      this.hasPendingAchievement = summary.shouldShowFullAchievement
      this.hasInitialized = true
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '加载收藏册失败'),
        icon: 'none'
      })
    }
  },

  async persistAchievementIfNeeded() {
    if (this.hasPendingAchievement) {
      await statsService.markFullCollectionAchievementShown()
      this.hasPendingAchievement = false
    }
  },

  goBack() {
    wx.navigateBack()
  },

  async closeAchievementModal() {
    try {
      await this.persistAchievementIfNeeded()
      this.setData({
        showFullAchievement: false
      })
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '记录成就状态失败'),
        icon: 'none'
      })
    }
  },

  async shareAchievement() {
    try {
      await this.persistAchievementIfNeeded()
      wx.showToast({
        title: '分享功能开发中',
        icon: 'none'
      })
      this.setData({
        showFullAchievement: false
      })
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '记录成就状态失败'),
        icon: 'none'
      })
    }
  },

  stopPropagation() {}
})

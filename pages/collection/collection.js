const statsService = require('../../services/statsService')

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

  refreshCollectionData() {
    const summary = statsService.getCollectionSummary()

    this.setData({
      cardList: summary.cardList,
      collectedCards: summary.collectedCards,
      collectedCount: summary.collectedCount,
      totalCount: summary.totalCount,
      showFullAchievement: summary.shouldShowFullAchievement
    })

    this.hasPendingAchievement = summary.shouldShowFullAchievement
    this.hasInitialized = true
  },

  persistAchievementIfNeeded() {
    if (this.hasPendingAchievement) {
      statsService.markFullCollectionAchievementShown()
      this.hasPendingAchievement = false
    }
  },

  goBack() {
    wx.navigateBack()
  },

  closeAchievementModal() {
    this.persistAchievementIfNeeded()
    this.setData({
      showFullAchievement: false
    })
  },

  shareAchievement() {
    this.persistAchievementIfNeeded()
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
    this.closeAchievementModal()
  },

  stopPropagation() {}
})

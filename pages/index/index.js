const statsService = require('../../services/statsService')

function getErrorMessage(error, fallback = '操作失败，请稍后重试') {
  return (error && error.message) || fallback
}

Page({
  data: {
    stats: statsService.createDefaultStats(),
    tasks: {
      romantic: [],
      housework: []
    },
    taskStates: {},
    showDrawModal: false,
    drawnCard: null,
    cardCount: 0,
    cardRarityColor: '',
    hearts: [],
    isPageLoading: true
  },

  onLoad() {
    this.setData({
      tasks: statsService.getTasks()
    })

    this.refreshPageData()
    this.startCooldownTimer()
  },

  onShow() {
    if (this.hasInitialized) {
      this.refreshPageData()
    }
  },

  async refreshPageData(options = {}) {
    const { showLoading = false } = options

    try {
      if (showLoading) {
        wx.showLoading({ title: '加载中...' })
      }

      const homeState = await statsService.getHomeState()
      this.setData({
        stats: homeState.stats,
        tasks: homeState.tasks,
        isPageLoading: false
      })
      this.initTaskStates(homeState.stats)
      this.hasInitialized = true
    } catch (error) {
      this.setData({ isPageLoading: false })
      wx.showToast({
        title: getErrorMessage(error, '加载失败'),
        icon: 'none'
      })
    } finally {
      if (showLoading) {
        wx.hideLoading()
      }
    }
  },

  initTaskStates(stats = this.data.stats) {
    const allTasks = this.data.tasks.romantic.concat(this.data.tasks.housework)
    const taskStates = {}

    allTasks.forEach(task => {
      taskStates[task.id] = {
        cooldown: statsService.getTaskCooldown(stats, task.id)
      }
    })

    this.setData({ taskStates })
  },

  startCooldownTimer() {
    this.timer = setInterval(() => {
      const taskStates = Object.assign({}, this.data.taskStates)
      let needUpdate = false

      Object.keys(taskStates).forEach(id => {
        if (taskStates[id].cooldown > 0) {
          taskStates[id].cooldown -= 1
          needUpdate = true
        }
      })

      if (needUpdate) {
        this.setData({ taskStates })
      }
    }, 1000)
  },

  async checkinTask(e) {
    const taskId = Number(e.currentTarget.dataset.id)

    try {
      const result = await statsService.checkinTask(taskId)

      if (!result.success) {
        return
      }

      const taskStates = Object.assign({}, this.data.taskStates)
      taskStates[taskId] = { cooldown: Math.ceil(statsService.CHECKIN_COOLDOWN_MS / 1000) }

      this.setData({
        stats: result.stats,
        taskStates
      })

      wx.showToast({
        title: result.gainedDraws > 0 ? '打卡成功，获得抽卡机会 ✨' : '打卡成功 +1心意',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '打卡失败'),
        icon: 'none'
      })
    }
  },

  async openDraw() {
    try {
      const result = await statsService.drawCard()

      if (!result.success) {
        wx.showToast({
          title: '暂无抽卡机会',
          icon: 'none'
        })
        return
      }

      this.setData({
        stats: result.stats,
        showDrawModal: true,
        drawnCard: result.drawnCard,
        cardCount: result.cardCount,
        cardRarityColor: result.drawnCard.color
      })

      if (result.drawnCard.rarity === 'SSR' || result.drawnCard.rarity === 'UR') {
        wx.vibrateShort({ type: 'heavy' })
      } else {
        wx.vibrateShort({ type: 'light' })
      }

      this.createFloatingHearts()
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '抽卡失败'),
        icon: 'none'
      })
    }
  },

  createFloatingHearts() {
    const hearts = []
    const count = Math.floor(Math.random() * 2) + 2

    for (let index = 0; index < count; index += 1) {
      hearts.push({
        left: Math.random() * 80 + 10,
        delay: Math.random() * 0.5,
        icon: Math.random() > 0.5 ? '💖' : '💕'
      })
    }

    this.setData({ hearts })

    setTimeout(() => {
      this.setData({ hearts: [] })
    }, 3000)
  },

  closeDrawModal() {
    this.setData({
      showDrawModal: false
    })
  },

  stopPropagation() {},

  goToCollection() {
    wx.navigateTo({
      url: '/pages/collection/collection'
    })
  },

  goToRank() {
    wx.showToast({
      title: '功能开发中，敬请期待',
      icon: 'none'
    })
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
})

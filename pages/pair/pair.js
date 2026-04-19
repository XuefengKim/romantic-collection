const statsService = require('../../services/statsService')
const coupleService = require('../../services/coupleService')
const authService = require('../../services/authService')

function getErrorMessage(error, fallback = '操作失败，请稍后重试') {
  return (error && error.message) || fallback
}

function formatExpireText(expiresAt) {
  if (!expiresAt) return ''

  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return ''

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${month}-${day} ${hour}:${minute} 失效`
}

Page({
  data: {
    pairStatus: null,
    inviteCode: '',
    inviteCodeExpiresText: '',
    bindInviteCode: '',
    isInviteLoading: false,
    isBindLoading: false,
    isRefreshing: false,
    isUnbindLoading: false,
    isBindCelebrating: false,
    showBindSuccessScreen: false,
    celebrationHearts: []
  },

  onLoad() {
    this.refreshPageData()
    this.startStatusPolling()
  },

  onShow() {
    this.refreshPageData()
    this.startStatusPolling()
  },

  onHide() {
    this.stopStatusPolling()
  },

  onUnload() {
    this.stopStatusPolling()
    this.clearCelebrationTimers()
  },

  clearCelebrationTimers() {
    if (this.bindSuccessScreenTimer) {
      clearTimeout(this.bindSuccessScreenTimer)
      this.bindSuccessScreenTimer = null
    }

    if (this.bindSuccessHeartsTimer) {
      clearTimeout(this.bindSuccessHeartsTimer)
      this.bindSuccessHeartsTimer = null
    }
  },

  buildCelebrationHearts() {
    return ['💖', '✨', '💕', '💗', '✨', '💞'].map((icon, index) => ({
      id: `${Date.now()}-${index}`,
      icon,
      left: 10 + index * 14,
      delay: index * 0.12
    }))
  },

  triggerBindSuccessFlow() {
    this.clearCelebrationTimers()
    this.stopStatusPolling()
    this.setData({
      pairStatus: 'bound',
      bindInviteCode: '',
      inviteCode: '',
      inviteCodeExpiresText: '',
      isBindCelebrating: true,
      showBindSuccessScreen: false,
      celebrationHearts: []
    })

    this.bindSuccessScreenTimer = setTimeout(() => {
      this.setData({
        showBindSuccessScreen: true,
        celebrationHearts: this.buildCelebrationHearts()
      })
    }, 420)

    this.bindSuccessHeartsTimer = setTimeout(() => {
      this.setData({ celebrationHearts: [] })
    }, 3600)
  },

  enterSecretSpace() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  startStatusPolling() {
    this.stopStatusPolling()
    this.pollTimer = setInterval(() => {
      if (this.data.pairStatus !== 'bound' && !this.data.isRefreshing) {
        this.refreshPageData({ silent: true })
      }
    }, 10000)
  },

  stopStatusPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  async refreshPageData(options = {}) {
    const { silent = false } = options
    const session = authService.getStoredSession()

    if (authService.isLocalAnonymousBound()) {
      this.setData({
        pairStatus: 'bound',
        isRefreshing: false,
        isBindCelebrating: false,
        showBindSuccessScreen: false
      })
      this.stopStatusPolling()
      return
    }

    if (!session.token) {
      this.setData({
        pairStatus: session.pairStatus || 'unbound',
        isRefreshing: false,
        isBindCelebrating: false,
        showBindSuccessScreen: false
      })
      return
    }

    this.setData({ isRefreshing: !silent })
    try {
      const homeState = await statsService.getHomeState()
      this.setData({
        pairStatus: homeState.pairStatus || 'unbound',
        isBindCelebrating: false,
        showBindSuccessScreen: false
      })
      if (homeState.pairStatus === 'bound') {
        this.stopStatusPolling()
      }
    } catch (error) {
      if (!silent) {
        wx.showToast({
          title: getErrorMessage(error, '刷新失败'),
          icon: 'none'
        })
      }
    } finally {
      this.setData({ isRefreshing: false })
    }
  },

  onInviteCodeInput(e) {
    this.setData({
      bindInviteCode: coupleService.normalizeInviteCode(e.detail.value)
    })
  },

  async generateInviteCode() {
    if (this.data.isInviteLoading || this.data.pairStatus === 'bound') {
      return
    }

    this.setData({ isInviteLoading: true })
    try {
      const result = await coupleService.createInviteCode()
      this.setData({
        inviteCode: result.inviteCode,
        inviteCodeExpiresText: formatExpireText(result.expiresAt)
      })
      wx.showToast({ title: '邀请码已生成', icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '生成失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ isInviteLoading: false })
    }
  },

  copyInviteCode() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '请先生成邀请码', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' })
      }
    })
  },

  async bindByInviteCode() {
    const inviteCode = coupleService.normalizeInviteCode(this.data.bindInviteCode)

    if (!inviteCode || this.data.isBindLoading) {
      if (!inviteCode) {
        wx.showToast({ title: '请输入邀请码', icon: 'none' })
      }
      return
    }

    this.setData({ isBindLoading: true, bindInviteCode: inviteCode })
    try {
      const result = await coupleService.bindCouple(inviteCode)
      if ((result && result.pairStatus) === 'bound') {
        if (result.source === 'local') {
          await statsService.initializeStats()
        }
        this.triggerBindSuccessFlow()
      }
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '绑定失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ isBindLoading: false })
    }
  },

  async resetAfterUnbind() {
    this.clearCelebrationTimers()
    this.stopStatusPolling()
    statsService.resetRuntimeState()
    authService.resetAllLocalState()
    wx.reLaunch({ url: '/pages/pair/pair' })
  },

  onTapUnbind() {
    if (this.data.isUnbindLoading) {
      return
    }

    wx.showModal({
      title: '确认取消绑定吗？',
      content: '取消后，你们将解除当前绑定关系，并删除所有数据（包括心意、抽卡次数、收藏册等内容），且无法恢复。',
      cancelText: '我再想想',
      confirmText: '确认取消绑定',
      confirmColor: '#d6336c',
      success: async ({ confirm }) => {
        if (!confirm) {
          return
        }

        this.setData({ isUnbindLoading: true })
        try {
          await coupleService.unbindCouple()
          wx.showToast({ title: '已取消绑定', icon: 'success' })
          setTimeout(() => {
            this.resetAfterUnbind()
          }, 300)
        } catch (error) {
          wx.showToast({
            title: getErrorMessage(error, '取消绑定失败'),
            icon: 'none'
          })
        } finally {
          this.setData({ isUnbindLoading: false })
        }
      }
    })
  }
})

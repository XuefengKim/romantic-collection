const apiClient = require('../services/api/client')

function createInviteCode() {
  return apiClient.post('/api/couple/invite-code', {}, {}, true)
}

function bindCouple(inviteCode) {
  return apiClient.post('/api/couple/bind', {
    inviteCode
  }, {}, true)
}

function unbindCouple() {
  return apiClient.post('/api/couple/unbind', {}, {}, true)
}

module.exports = {
  createInviteCode,
  bindCouple,
  unbindCouple
}

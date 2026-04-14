const tasks = require('../constants/tasks')
const cardPool = require('../constants/cards')

function getTasks() {
  return JSON.parse(JSON.stringify(tasks))
}

function getCardPool() {
  return JSON.parse(JSON.stringify(cardPool))
}

module.exports = {
  getTasks,
  getCardPool
}

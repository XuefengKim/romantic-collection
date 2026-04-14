const prisma = require('../lib/prisma')

async function getActiveTasksGrouped() {
  const tasks = await prisma.taskCatalog.findMany({
    where: { active: true },
    orderBy: { id: 'asc' }
  })

  return tasks.reduce((result, task) => {
    if (!result[task.category]) {
      result[task.category] = []
    }

    result[task.category].push({
      id: task.id,
      name: task.name,
      desc: task.description
    })

    return result
  }, { romantic: [], housework: [] })
}

async function getActiveCards() {
  const cards = await prisma.cardCatalog.findMany({
    where: { active: true },
    orderBy: { id: 'asc' }
  })

  return cards.map(card => ({
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    desc: card.description,
    color: card.color
  }))
}

module.exports = {
  getActiveTasksGrouped,
  getActiveCards
}

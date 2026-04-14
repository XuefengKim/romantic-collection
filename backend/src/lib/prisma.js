require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { PrismaMariaDb } = require('@prisma/adapter-mariadb')

const globalForPrisma = globalThis

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL 未配置，无法初始化 Prisma Client')
  }

  const adapter = new PrismaMariaDb(databaseUrl)
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.__prisma__ || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma__ = prisma
}

module.exports = prisma

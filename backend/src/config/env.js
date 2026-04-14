require('dotenv').config()

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appId: process.env.APPID || '',
  appSecret: process.env.APP_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  databaseUrl: process.env.DATABASE_URL || '',
  wechatCode2SessionUrl: process.env.WECHAT_CODE2SESSION_URL || 'https://api.weixin.qq.com/sns/jscode2session'
}

const jwt = require('jsonwebtoken')
const env = require('../config/env')

function auth(req, res, next) {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token) {
    const error = new Error('未登录或登录已失效')
    error.status = 401
    error.code = 401
    return next(error)
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.auth = payload
    return next()
  } catch (err) {
    const error = new Error('登录态无效，请重新登录')
    error.status = 401
    error.code = 401
    return next(error)
  }
}

module.exports = auth

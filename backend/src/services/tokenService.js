const jwt = require('jsonwebtoken')
const env = require('../config/env')

function signUserToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      openid: user.openid
    },
    env.jwtSecret,
    {
      expiresIn: '30d'
    }
  )
}

module.exports = {
  signUserToken
}

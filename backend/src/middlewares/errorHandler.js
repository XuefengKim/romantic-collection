const { fail } = require('../utils/response')

function errorHandler(err, req, res, next) {
  console.error('[API_ERROR]', err)

  if (res.headersSent) {
    return next(err)
  }

  const status = err.status || 500
  const code = err.code || status

  res.status(status).json(fail(code, err.message || '服务器开小差了，请稍后再试'))
}

module.exports = errorHandler

function appError(message, status = 500, code = status) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

module.exports = {
  appError
}

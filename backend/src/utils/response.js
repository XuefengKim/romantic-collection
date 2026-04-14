function success(data = {}, message = 'ok') {
  return {
    code: 0,
    message,
    data
  }
}

function fail(code, message, data = null) {
  return {
    code,
    message,
    data
  }
}

module.exports = {
  success,
  fail
}

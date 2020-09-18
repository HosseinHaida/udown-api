const { errorMessage, status } = require('../helpers/status')
// Send a response based on the type of error occured
const catchError = function (message, errorType, res) {
  errorMessage.error = message
  return res.status(status[errorType]).send(errorMessage)
}

module.exports = {
  catchError,
}

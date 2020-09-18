const db = require('../db').Instance()
const userHasScope = async function (id, scope) {
  const user = await db('users').select('scopes').where({ id: id }).first()
  return user.scopes.includes(scope)
}
module.exports = {
  userHasScope,
}

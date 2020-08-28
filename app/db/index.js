const Knex = require('knex')
const DbConfig = require('../../knexfile')
const { env } = require('../../config')

let knexInstance

function Instance() {
  if (!knexInstance) {
    knexInstance = Knex(DbConfig[env])
  }
  return knexInstance
}

module.exports = {
  Instance,
}

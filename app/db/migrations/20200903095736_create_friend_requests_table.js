module.exports.up = async function (knex) {
  await knex.schema.createTable('friend_requests', (table) => {
    table.integer('requester_id').references('users.id').notNullable()
    table.integer('requestee_id').references('users.id').notNullable()
    table.timestamp('created_at').notNullable()
    table.unique(['requester_id', 'requestee_id'])
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('friend_requests')
}

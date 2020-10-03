module.exports.up = async function (knex) {
  await knex.schema.createTable('event_participants', (table) => {
    table.integer('event_id').references('events.id')
    table.integer('probability')
    table.integer('user_id').references('users.id').notNullable()
    table.text('be_there_at').notNullable()
    table.integer('guests').defaultTo(0)
    table.specificType('will_bring', 'text ARRAY')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.integer('updated_by').references('users.id')
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('event_participants')
}

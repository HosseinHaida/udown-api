module.exports.up = async function (knex) {
  await knex.schema.createTable('events', (table) => {
    table.increments('id')
    table.integer('location_id').references('locations.id')
    table.integer('guests')
    table.integer('min_viable_population').notNullable()
    table.integer('created_by').references('users.id').notNullable()
    table.text('sport_type').notNullable()
    table.specificType('whats_needed', 'text ARRAY')
    table.timestamp('happens_at')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.integer('updated_by').references('users.id')
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('events')
}

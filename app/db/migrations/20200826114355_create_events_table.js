module.exports.up = async function (knex) {
  await knex.schema.createTable('events', (table) => {
    table.increments('id')
    table.integer('location_id').references('locations.id')
    table.boolean('guests_allowed').defaultTo(true)
    table.integer('guests').defaultTo(0)
    table.specificType('hide_from', 'integer ARRAY')
    table.boolean('only_close_friends').defaultTo(false)
    table.boolean('is_public').defaultTo(false)
    table.boolean('canceled').defaultTo(false)
    table.integer('min_viable_population').notNullable()
    table.integer('max_viable_population').defaultTo(0)
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

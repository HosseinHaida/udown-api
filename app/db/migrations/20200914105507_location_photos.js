module.exports.up = async function (knex) {
  await knex.schema.createTable('location_photos', (table) => {
    table.increments('id')
    table.integer('location_id').references('locations.id')
    table.text('url').notNullable()
    table.timestamp('created_at').notNullable()
    table.integer('created_by').references('users.id').notNullable()
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('location_photos')
}

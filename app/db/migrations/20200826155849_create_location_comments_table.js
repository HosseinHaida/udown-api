module.exports.up = async function (knex) {
  await knex.schema.createTable('location_comments', (table) => {
    table.increments('id')
    table.integer('location_id').references('locations.id')
    table.text('text').notNullable()
    table.integer('rating').notNullable() // MAX = 10
    table.timestamp('created_at').notNullable()
    table.integer('created_by').references('users.id').notNullable()
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('location_comments')
}

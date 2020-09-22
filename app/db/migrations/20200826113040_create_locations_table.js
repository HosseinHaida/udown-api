module.exports.up = async function (knex) {
  await knex.schema.createTable('locations', (table) => {
    table.increments('id')
    table.text('name').notNullable().unique()
    table.text('maps_url').notNullable()
    table.text('city').notNullable()
    table.text('region').notNullable()
    table.text('cost')
    table.text('photo')
    table.text('meta')
    table.specificType('sport_types', 'text ARRAY').notNullable()
    table.boolean('girls_allowed').defaultTo(false)
    table.boolean('verified').defaultTo(false)
    table.timestamp('created_at')
    table.integer('created_by')
    table.timestamp('updated_at')
    table.integer('updated_by')
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('locations')
}

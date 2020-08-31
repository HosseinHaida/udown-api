module.exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id')
    table.text('username').notNullable().unique()
    table.text('password_hash').notNullable()
    table.text('first_name').notNullable()
    table.text('last_name').notNullable()
    table.text('gender').notNullable()
    table.text('photo')
    table.text('city')
    table.text('bio')
    table.integer('height').notNullable()
    table.specificType('sports', 'text ARRAY').notNullable()
    table.specificType('photos', 'text ARRAY')
    table.specificType('friends', 'integer ARRAY')
    table.specificType('scopes', 'text ARRAY')
    table.boolean('verified').defaultTo(false)
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.integer('updated_by')
  })
}

module.exports.down = async function down(knex) {
  await knex.schema.dropTable('users')
}

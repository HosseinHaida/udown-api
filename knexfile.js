// Update with your config settings.

require('dotenv').config();

module.exports = {
  // development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: './data/migrations',
    },
    seeds: { directory: './data/seeds' },
  // },
  // testing: {
  //   client: 'pg',
  //   connection: {
  //     host: process.env.DB_HOST,
  //     user: process.env.DB_USER,
  //     password: process.env.DB_PASS,
  //     database: process.env.DB_NAME
  //   },
  //   migrations: {
  //     directory: './data/migrations',
  //   },
  //   seeds: { directory: './data/seeds' },
  // },
  // production: {
  //   client: 'pg',
  //   connection: {
  //     host: process.env.DB_HOST,
  //     user: process.env.DB_USER,
  //     password: process.env.DB_PASS,
  //     database: process.env.DB_NAME
  //   },
  //   migrations: {
  //     directory: './data/migrations',
  //   },
  //   seeds: { directory: './data/seeds' },
  // },
};
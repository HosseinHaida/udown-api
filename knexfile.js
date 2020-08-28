const path = require('path')

const ENV = process.env.NODE_ENV || 'development'

require('dotenv').config({ path: path.resolve(process.cwd(), `.env.${ENV}`) })

module.exports[ENV] = {
  // development: {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
  migrations: {
    directory: './app/db/migrations',
  },
  seeds: { directory: './app/db/seeds' },
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
}

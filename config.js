const dotenv = require('dotenv')
const path = require('path')

const env = process.env.NODE_ENV || 'development'
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) })

const sessionIsSameSite = {
  Strict: 'Strict',
  Lax: 'Lax',
  false: false,
}

const boolMap = {
  true: true,
  false: false,
}

const config = {
  env: env,
  uploadDir: {
    user: process.env.UPLOAD_DIR_USER,
    location: process.env.LOCATION,
  },
  session: {
    passsword: process.env.SESSION_PASSWORD,
    ttl: parseInt(process.env.SESSION_TTL),
    keepAlive: boolMap[process.env.SESSION_KEEP_ALIVE],
    isSameSite: sessionIsSameSite[process.env.SESSION_SAME_SITE],
    isSecure: boolMap[process.env.SESSION_SECURE],
    isHttpOnly: boolMap[process.env.SESSION_HTTP_ONLY],
  },
  passwordGeneration: {
    length: 8,
    numbers: true,
    uppercase: false,
    excludeSimilarCharacters: true,
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS),
  },
}

module.exports = config

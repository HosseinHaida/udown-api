const express = require('express')
const cors = require('cors')
const usersRoute = require('./app/routes/usersRoute.js')
const locationsRoute = require('./app/routes/locationsRoute.js')
const eventsRoute = require('./app/routes/eventsRoute.js')

const path = require('path')

const env = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(process.cwd(), `.env.${env}`) })

const app = express()

// Add middleware for parsing URL encoded bodies (which are usually sent by browser)
app.use(cors())
// Add middleware for parsing JSON and urlencoded data and populating `req.body`
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
// app.use(express.static(process.env.UPLOAD_DIR))

app.use('/api/v1', usersRoute)
app.use('/api/v1', locationsRoute)
app.use('/api/v1', eventsRoute)

app.listen(process.env.PORT).on('listening', () => {
  console.log(`🚀 We are live on ${process.env.PORT}`)
})

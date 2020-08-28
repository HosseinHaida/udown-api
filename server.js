const express = require('express')
const cors = require('cors')
const usersRoute = require('./app/routes/usersRoute.js')
// import seedRoute from './app/routes/seedRoute';
// import tripRoute from './app/routes/tripRoute';
// import busRoute from './app/routes/busRoute';
// import bookingRoute from './app/routes/bookingRoute';
// import familyRoute from './app/routes/familyRoute';

const path = require('path')

const env = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(process.cwd(), `.env.${env}`) })

const app = express()

// Add middleware for parsing URL encoded bodies (which are usually sent by browser)
app.use(cors())
// Add middleware for parsing JSON and urlencoded data and populating `req.body`
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use('/api/v1', usersRoute)
// app.use('/api/v1', familyRoute);
// app.use('/api/v1', seedRoute);
// app.use('/api/v1', adminRoute);
// app.use('/api/v1', tripRoute);
// app.use('/api/v1', busRoute);
// app.use('/api/v1', bookingRoute);

app.listen(process.env.PORT).on('listening', () => {
  console.log(`🚀 We are live on ${process.env.PORT}`)
})

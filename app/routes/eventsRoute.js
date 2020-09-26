const express = require('express')

const { fetchEventsList } = require('../controllers/eventsController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.get('/events/list/:type', verifyAuth, fetchEventsList)

module.exports = router

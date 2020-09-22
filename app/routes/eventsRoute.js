const express = require('express')

const { fetchEventsList } = require('../controllers/eventsController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.get(
  '/events/list/:page/:how_many/:search_text?',
  verifyAuth,
  fetchEventsList
)

module.exports = router

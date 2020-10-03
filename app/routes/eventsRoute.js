const express = require('express')

const {
  fetchEventsList,
  fetchEvent,
  addParticipent,
  insertEvent,
  cancelEvent,
} = require('../controllers/eventsController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.get('/events/list/:type/:show_canceled', verifyAuth, fetchEventsList)
router.get('/event/fetch/:id', verifyAuth, fetchEvent)
router.post('/event/sign', verifyAuth, addParticipent)
router.post('/event/new', verifyAuth, insertEvent)
router.post('/event/cancel', verifyAuth, cancelEvent)

module.exports = router

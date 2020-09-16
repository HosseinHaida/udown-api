const express = require('express')

const {
  fetchLocationsList,
  fetchLocation,
  updateLocation,
  insertLocation,
  comment,
  deleteComment,
  setPhoto,
  deletePhoto,
} = require('../controllers/locationsController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.get('/locations/list/:page/:how_many/:search_text?', fetchLocationsList)
router.get('/location/fetch/:id', fetchLocation)
router.post('/location/update', verifyAuth, updateLocation)
router.post('/location/insert', verifyAuth, insertLocation)
router.post('/location/comment', verifyAuth, comment)
router.delete(
  '/location/comment/delete/:comment_id/:location_id',
  verifyAuth,
  deleteComment
)
router.post('/location/set_photo/:location_id/:index', verifyAuth, setPhoto)
router.delete(
  '/location/photo/delete/:location_id/:id',
  verifyAuth,
  deletePhoto
)

module.exports = router

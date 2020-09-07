const express = require('express')

const {
  signupUser,
  siginUser,
  setPhoto,
  fetchUsersList,
  // updateUserScopes,
  fetchUser,
  updateUser,
  makeFriendsWith,
  fetchInboundRequestsCount,
} = require('../controllers/usersController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.get('/auth/fetch', verifyAuth, fetchUser)
router.post('/auth/set_photo', verifyAuth, setPhoto)
// router.put('/user/:id', verifyAuth, updateUserScopes)
router.post('/auth/update', verifyAuth, updateUser)
router.post('/auth/friend/request', verifyAuth, makeFriendsWith)
router.get(
  '/auth/inbound_requests_count',
  verifyAuth,
  fetchInboundRequestsCount
)
router.get('/users/list/:type', verifyAuth, fetchUsersList)
router.get('/users/list', fetchUsersList)

// fetch users routes
// router.get(
//   '/users/list/friends_only/:page/:how_many/:search_text?',
//   verifyAuth,
//   fetchUsersList
// )
// router.get('/users/list/:page/:how_many/:search_text?', fetchUsersList)

module.exports = router

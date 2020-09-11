const express = require('express')

const {
  signupUser,
  siginUser,
  setPhoto,
  fetchUsersList,
  updateUserScopes,
  fetchUser,
  updateUser,
  makeFriendsWith,
  fetchInboundRequestsCount,
  // fetchUserScopes,
} = require('../controllers/usersController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// Routes
router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.get('/auth/fetch', verifyAuth, fetchUser)
router.post('/auth/set_photo', verifyAuth, setPhoto)
router.post('/user/scopes', verifyAuth, updateUserScopes)
router.post('/auth/update', verifyAuth, updateUser)
router.post('/auth/friend/request', verifyAuth, makeFriendsWith)
router.get(
  '/auth/inbound_requests_count',
  verifyAuth,
  fetchInboundRequestsCount
)
// router.get('/user/scopes/:id', fetchUserScopes)
router.get('/users/list/:type', verifyAuth, fetchUsersList)
router.get('/users/list', fetchUsersList)

module.exports = router

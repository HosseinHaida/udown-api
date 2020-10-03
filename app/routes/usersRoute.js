const express = require('express')

const {
  signupUser,
  siginUser,
  setPhoto,
  fetchUsersList,
  updateUserScopes,
  fetchUser,
  updateUser,
  handleFriendRequest,
  fetchInboundRequestsCount,
  verifyUser,
  removeVerification,
  addToCloseFriends,
  removeFromCloseFriends,
  fetchUsersAsOptions,
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
router.post('/auth/friend/request', verifyAuth, handleFriendRequest)
router.get(
  '/auth/inbound_requests_count',
  verifyAuth,
  fetchInboundRequestsCount
)
router.get('/users/list/:type', verifyAuth, fetchUsersList)
router.get('/users/list', fetchUsersList)
router.get('/users/list/options/:search_text', fetchUsersAsOptions)
router.post('/auth/verify', verifyAuth, verifyUser)
router.delete('/auth/remove/verification/:id', verifyAuth, removeVerification)
router.post('/auth/friend/add/close', verifyAuth, addToCloseFriends)
router.delete(
  '/auth/friend/remove/close/:id',
  verifyAuth,
  removeFromCloseFriends
)

module.exports = router

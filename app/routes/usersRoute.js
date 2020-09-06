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
} = require('../controllers/usersController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// users Routes

router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.get('/auth/fetch', verifyAuth, fetchUser)
router.post('/auth/set_photo', verifyAuth, setPhoto)
router.put('/user/:id', verifyAuth, updateUserScopes)
router.post('/auth/update', verifyAuth, updateUser)
router.post('/auth/friend/request', verifyAuth, makeFriendsWith)

// fetch users routes
router.get(
  '/users/list/friends/:page/:how_many/:search_text?',
  verifyAuth,
  fetchUsersList
)
router.get('/users/list/:page/:how_many/:search_text?', fetchUsersList)

module.exports = router

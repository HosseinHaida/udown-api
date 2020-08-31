const express = require('express')

const {
  signupUser,
  siginUser,
  //   searchFirstnameOrLastname,
  setPhoto,
  fetchUsersList,
  updateUserScopes,
  fetchUser,
} = require('../controllers/usersController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// users Routes

router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.get('/auth/fetch', verifyAuth, fetchUser)
router.get('/users/list/:page/:howMany', fetchUsersList)
router.post('/auth/set_photo', verifyAuth, setPhoto)
router.put('/user/:id', verifyAuth, updateUserScopes)
// router.get('/users/first_name', searchFirstnameOrLastname);

module.exports = router

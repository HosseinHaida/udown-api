const express = require('express')

const {
  signupUser,
  siginUser,
  //   searchFirstnameOrLastname,
  updateUserScopes,
} = require('../controllers/usersController.js')

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// users Routes

router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.put('/user/:id', verifyAuth, updateUserScopes)
// router.get('/users/first_name', searchFirstnameOrLastname);

module.exports = router

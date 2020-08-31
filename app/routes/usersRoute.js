const express = require('express')
const { errorMessage, status } = require('../helpers/status')
const { hashString } = require('../helpers/validations')
const multer = require('multer')

const {
  signupUser,
  siginUser,
  //   searchFirstnameOrLastname,
  setPhoto,
  fetchUsersList,
  updateUserScopes,
  fetchUser,
} = require('../controllers/usersController.js')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_DIR + process.env.UPLOAD_DIR_USER)
  },
  filename: function (req, file, cb) {
    const { username } = req.user
    const fileNameSplitedByDots = file.originalname.split('.')
    const fileFormat = fileNameSplitedByDots[fileNameSplitedByDots.length - 1]
    let weirdName = ''
    for (let i = 0; i < username.length; i++) {
      weirdName = weirdName.concat(username.charCodeAt(i) + i * (i + 4))
    }
    const fileNameToBeSaved = weirdName + '.' + fileFormat
    cb(null, fileNameToBeSaved)
    req.uploaded_photo_name = fileNameToBeSaved
  },
})

const upload = multer({
  limits: {
    fileSize: 800000,
  },
  storage,
})

const verifyAuth = require('../middlewares/verifyAuth.js')

const router = express.Router()

// users Routes

router.post('/auth/signup', signupUser)
router.post('/auth/signin', siginUser)
router.get('/auth/fetch', verifyAuth, fetchUser)
router.get('/users/list/:page/:howMany', fetchUsersList)
router.post('/auth/set_photo', verifyAuth, upload.single('photo'), setPhoto)
router.put('/user/:id', verifyAuth, updateUserScopes)
// router.get('/users/first_name', searchFirstnameOrLastname);

module.exports = router

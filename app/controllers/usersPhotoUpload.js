// const { errorMessage, status } = require('../helpers/status')
const multer = require('multer')

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
    fileSize: 1000000,
  },
  storage,
}).single('photo')

module.exports = {
  upload,
}

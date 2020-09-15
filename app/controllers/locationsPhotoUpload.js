const multer = require('multer')
var fs = require('fs')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = process.env.UPLOAD_DIR + process.env.UPLOAD_DIR_LOCATION
    // fs.mkdirSync(path, { recursive: true })
    return cb(null, path)
  },
  filename: function (req, file, cb) {
    const { location_id } = req.params
    const fileNameSplitedByDots = file.originalname.split('.')
    const fileFormat = fileNameSplitedByDots[fileNameSplitedByDots.length - 1]
    const fileNameToBeSaved =
      location_id +
      '_' +
      Math.floor(Math.random() * 1000000000000000) +
      '.' +
      fileFormat
    cb(null, fileNameToBeSaved)
    req.uploaded_photo_name = fileNameToBeSaved
  },
})

const upload = multer({
  limits: {
    fileSize: 2000000,
  },
  storage,
}).single('photo')

module.exports = {
  upload,
}

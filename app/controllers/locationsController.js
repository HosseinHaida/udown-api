const db = require('../db').Instance()
var fs = require('fs')
const moment = require('moment')
const { isEmpty } = require('../helpers/validations')

const { errorMessage, successMessage, status } = require('../helpers/status')
const { upload } = require('./locationsPhotoUpload')
const multer = require('multer')

/**
 * Set photos for locations
 * @param {object} req
 * @param {object} res
 * @returns {object} array of photos and location cover photo
 */
const setPhoto = async (req, res) => {
  const { location_id, index } = req.params
  const { user_id } = req.user
  try {
    const user = await db('users')
      .select('scopes')
      .where({ id: user_id })
      .first()
    if (!user.scopes.includes('edit_locations')) {
      return catchError('You can not edit locations', 'bad', res)
    }
    // fetch location photo if index was set to 'cover'
    // to see if there was a photo; then replace it
    if (index === 'cover') {
      const thisLocation = await db('locations')
        .select('photo')
        .where('id', location_id)
        .first()
      if (!isEmpty(thisLocation.photo)) {
        // Pick photo name from the end of the previous photo URL
        const prevPhotoName = /[^/]*$/.exec(thisLocation.photo)[0]
        const relativePathToPrevPhoto =
          process.env.UPLOAD_DIR +
          process.env.UPLOAD_DIR_LOCATION +
          prevPhotoName
        fs.unlink(relativePathToPrevPhoto, function (err) {
          if (err) console.log('Could not find and delete previous photo')
        })
      }
    }
  } catch (error) {
    return catchError('Error looking for previous photo', 'error', res)
  }
  // Actually do the upload
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return catchError('Upload was not successful', 'error', res)
    } else if (err) {
      return catchError('An error occured when uploading', 'error', res)
    }
    // Everything went fine with multer and uploading
    const photoName = req.uploaded_photo_name
    if (!photoName) {
      return catchError('Faced issues saving photo', 'error', res)
    }
    try {
      // Generate photo URL to be saved in DB
      const path =
        process.env.SERVER_URL +
        ':' +
        process.env.PORT +
        '/' +
        process.env.UPLOAD_DIR_LOCATION +
        photoName
      if (index === 'cover') {
        const updated_at = moment(new Date())
        await db('locations')
          .where({ id: location_id })
          .update({ photo: path, updated_at: updated_at, updated_by: user_id })
      }
      if (index === 'new') {
        const created_at = moment(new Date())
        const newPhoto = {
          url: path,
          location_id,
          created_at,
          created_by: user_id,
        }
        await db('location_photos').insert(newPhoto)
      }
      const photos = await fetchLocationPhotos(location_id)
      const location = await db('locations')
        .select('photo')
        .where('id', location_id)
        .first()
      successMessage.photo = location.photo
      successMessage.photos = photos
      return res.status(status.success).send(successMessage)
    } catch (error) {
      return catchError('Operation was not successful', 'error', res)
    }
  })
}

/**
 * Delete photo
 * @param {object} req
 * @param {object} res
 * @returns {object} array of photos and location cover photo
 */
const deletePhoto = async (req, res) => {
  const { id, location_id } = req.params
  const { user_id } = req.user
  try {
    const user = await db('users')
      .select('scopes')
      .where({ id: user_id })
      .first()
    if (!user.scopes.includes('edit_locations')) {
      return catchError('You can not edit locations', 'bad', res)
    }
    const thisPhoto = await db('location_photos')
      .select('url')
      .where({ id: id })
      .first()
    const prevPhotoName = /[^/]*$/.exec(thisPhoto.url)[0]
    const relativePathToPrevPhoto =
      process.env.UPLOAD_DIR + process.env.UPLOAD_DIR_LOCATION + prevPhotoName
    fs.unlink(relativePathToPrevPhoto, function (err) {
      if (err) console.log('Could not find and delete previous photo')
    })
    await db('location_photos').where({ id: id }).del()
    const photos = await fetchLocationPhotos(location_id)
    const location = await db('locations')
      .select('photo')
      .where('id', location_id)
      .first()
    successMessage.photo = location.photo
    successMessage.photos = photos
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Error looking for previous photo', 'error', res)
  }
}

/**
 * Fetch locations list ( + [search] implemented)
 * @param {object} req
 * @param {object} res
 * @returns {object} locations objects array
 */
const fetchLocationsList = async (req, res) => {
  const { page, how_many, search_text } = req.params
  const offset = (Number(page) - 1) * Number(how_many)
  try {
    // Create query for total number of locations
    const totalLocationsQuery = db('locations').count('*').first()
    // Create query to fetch locations
    const query = db('locations')
      .select(
        'id',
        'name',
        'maps_url',
        'city',
        'region',
        'photo',
        'cost',
        'meta',
        'sport_types',
        'girls_allowed',
        'created_at'
      )
      .offset(offset)
      .limit(how_many)

    if (!isEmpty(search_text)) {
      const where = (column) =>
        `LOWER(${column}) LIKE '%${search_text.toLowerCase()}%'`

      // Change query to fetch locations based on search_text
      query
        .whereRaw(where('name'))
        .orWhereRaw(where('city'))
        .orWhereRaw(where('region'))
      // Change query for total number of locations based on search_text
      totalLocationsQuery
        .whereRaw(where('name'))
        .orWhereRaw(where('city'))
        .orWhereRaw(where('region'))
    }
    // Calculate number of locations and pages
    const total = await totalLocationsQuery
    const totalCount = total.count
    const totalPages = Math.ceil(total.count / how_many)
    // Actually query the DB for locations
    const locations = await query
    // Check if nothing was found
    if (isEmpty(locations)) {
      return catchError('Could not find any locations', 'notfound', res)
    }
    successMessage.locations = locations
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Fetch Location
 * @param {object} req
 * @param {object} res
 * @returns {object} location object
 */
const fetchLocation = async (req, res) => {
  const { id } = req.params
  const locationId = Number(id)
  try {
    // Find location in DB
    const thisLocation = await db('locations')
      .select('*')
      .where({ id: locationId })
      .first()
    // Check if nothing was found
    if (!thisLocation) {
      return catchError('Location could not be found', 'notfound', res)
    }
    // Fetch comments
    const comments = await fetchLocationComments(locationId)
    // Fetch photos
    const photos = await fetchLocationPhotos(locationId)
    // Create location obj with token && send to client
    successMessage.location = thisLocation
    successMessage.location.comments = comments
    successMessage.location.photos = photos
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Update location general
 * @param {object} req
 * @param {object} res
 * @returns {object} location object
 */
const updateLocation = async (req, res) => {
  const { user_id } = req.user
  const {
    id,
    name,
    city,
    region,
    maps_url,
    cost,
    meta,
    sport_types,
    girls_allowed,
  } = req.body

  const updated_at = moment(new Date())

  const columnsToBeUpdated = {
    name,
    city,
    region,
    maps_url,
    cost,
    meta,
    sport_types,
    girls_allowed,
    updated_by: user_id,
    updated_at: updated_at,
  }
  if (
    isEmpty(name) ||
    isEmpty(city) ||
    isEmpty(region) ||
    isEmpty(maps_url) ||
    isEmpty(cost) ||
    isEmpty(meta) ||
    isEmpty(sport_types) ||
    isEmpty(girls_allowed)
  ) {
    return catchError('Empty fields', 'bad', res)
  }
  const updateQuery = db('locations').where({ id: id })
  try {
    const user = await db('users')
      .select('scopes')
      .where({ id: user_id })
      .first()
    if (!user.scopes.includes('edit_locations')) {
      return catchError('You are not authorized to do this!', 'bad', res)
    }
    // Actually do the update query
    await updateQuery.update(columnsToBeUpdated)
    // Fetch the same location after the update
    const location = await db('locations').select('*').where({ id: id }).first()
    const comments = await fetchLocationComments(id)

    // Create location obj with comments && send to client
    successMessage.location = location
    successMessage.location.comments = comments
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successfull', 'error', res)
  }
}

/**
 * Save new comment
 * @param {object} req
 * @param {object} res
 * @returns {object} comments array
 */
const comment = async (req, res) => {
  const { user_id } = req.user
  const { location_id, text, rating } = req.body

  const created_at = moment(new Date())
  const columnsToBeInserted = {
    location_id,
    text,
    rating,
    created_at,
    created_by: user_id,
  }
  if (isEmpty(location_id) || isEmpty(text) || isEmpty(rating)) {
    return catchError('Empty fields', 'bad', res)
  }
  try {
    const user = await db('users')
      .select('scopes')
      .where({ id: user_id })
      .first()
    if (!user.scopes.includes('add_comments')) {
      return catchError('You are not authorized to comment', 'bad', res)
    }
    // Actually do the insert
    await db('location_comments').insert(columnsToBeInserted)
    // Create comments array && send to client
    const comments = await fetchLocationComments(location_id)
    successMessage.comments = comments
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successfull', 'error', res)
  }
}

/**
 * Delete comment
 * @param {object} req
 * @param {object} res
 * @returns {object} comments array
 */
const deleteComment = async (req, res) => {
  const { user_id } = req.user
  const { comment_id, location_id } = req.params

  if (isEmpty(comment_id) || isEmpty(location_id)) {
    return catchError('Empty fields', 'bad', res)
  }
  try {
    const user = await db('users')
      .select('scopes')
      .where({ id: user_id })
      .first()
    const thisComment = await db('location_comments')
      .select('created_by')
      .where({ id: comment_id })
      .first()
    if (
      !user.scopes.includes('delete_comments') &&
      thisComment.created_by !== user_id
    ) {
      return catchError(
        'You are not authorized to delete this comment',
        'bad',
        res
      )
    }
    await db('location_comments').where({ id: comment_id }).del()
    successMessage.message = 'Comment deleted'
    // Create comments array && send to client
    const comments = await fetchLocationComments(location_id)
    successMessage.comments = comments
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successfull', 'error', res)
  }
}

const fetchLocationComments = async (location_id) => {
  const commentsOnThisLocation = await db('location_comments')
    .count('*')
    .where({ location_id: location_id })
    .first()
  let comments = []
  if (commentsOnThisLocation.count > 0) {
    comments = await db('location_comments')
      .select(
        'location_comments.id',
        'location_comments.text',
        'location_comments.rating',
        'location_comments.created_at',
        'users.username',
        'users.photo',
        'users.first_name',
        'users.last_name'
      )
      .join('users', 'location_comments.created_by', '=', 'users.id')
      .where({ location_id: location_id })
      .orderBy('location_comments.created_at', 'desc')
  }
  return comments
}

const fetchLocationPhotos = async (location_id) => {
  const photosOfThisLocation = await db('location_photos')
    .count('*')
    .where({ location_id: location_id })
    .first()
  let photos = []
  if (photosOfThisLocation.count > 0) {
    photos = await db('location_photos')
      .select(
        'location_photos.id',
        'location_photos.url',
        'location_photos.created_at',
        'users.username'
      )
      .join('users', 'location_photos.created_by', '=', 'users.id')
      .where({ location_id: location_id })
      .orderBy('location_photos.created_at', 'desc')
  }
  return photos
}

// Send a response based on the type of error occured
const catchError = function (message, errorType, res) {
  errorMessage.error = message
  return res.status(status[errorType]).send(errorMessage)
}

module.exports = {
  // setPhoto,
  fetchLocationsList,
  fetchLocation,
  updateLocation,
  comment,
  deleteComment,
  setPhoto,
  deletePhoto,
}

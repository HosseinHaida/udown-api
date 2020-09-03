const db = require('../db').Instance()
var fs = require('fs')
const moment = require('moment')
const {
  hashString,
  validatePassword,
  isEmpty,
  generateUserToken,
  comparePassword,
} = require('../helpers/validations')

const { errorMessage, successMessage, status } = require('../helpers/status')
const { upload } = require('./usersPhotoUpload')
const multer = require('multer')
const { search } = require('../routes/usersRoute')

/**
 * Signup
 * @param {object} req
 * @param {object} res
 * @returns {object} reflection object
 */
const signupUser = async (req, res) => {
  const {
    username,
    password,
    first_name,
    last_name,
    gender,
    height,
    sports,
  } = req.body
  // Insertion created_at
  const created_at = moment(new Date())
  if (
    isEmpty(username) ||
    isEmpty(first_name) ||
    isEmpty(last_name) ||
    isEmpty(password) ||
    isEmpty(gender) ||
    isEmpty(height) ||
    isEmpty(sports)
  ) {
    return catchError('Empty fields', 'bad', res)
  }
  if (!validatePassword(password)) {
    return catchError('Short password', 'bad', res)
  }
  const password_hash = hashString(password)
  const userPayload = {
    username,
    first_name,
    last_name,
    password_hash,
    gender,
    height,
    sports,
    friends: [],
    created_at,
  }
  try {
    // Insert user to DB
    const r = await db('users').insert(userPayload)
    // Select the same user from DB
    const thisUser = await db
      .select(
        'username',
        'id',
        'scopes',
        'first_name',
        'last_name',
        'gender',
        'height'
      )
      .from({ u: 'users' })
      .where('u.username', userPayload.username)
      .first()
    // Generate token for the user
    const token = generateUserToken(
      thisUser.username,
      thisUser.id,
      thisUser.scopes,
      thisUser.first_name,
      thisUser.last_name,
      thisUser.gender,
      thisUser.height
    )
    // Create user obj with token && send to client
    successMessage.user = thisUser
    successMessage.user.token = token
    return res.status(status.created).send(successMessage)
  } catch (error) {
    if (error.routine === '_bt_check_unique') {
      return catchError('Username already exists', 'conflict', res)
    } else {
      return catchError('Operation was not successfull', 'error', res)
    }
  }
}

/**
 * Signin
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const siginUser = async (req, res) => {
  const { username, password } = req.body
  if (isEmpty(username) || isEmpty(password)) {
    return catchError('Username or password is missing', 'bad', res)
  }
  if (!validatePassword(password)) {
    return catchError('Please enter a valid password', 'bad', res)
  }
  try {
    const userWithThisUsernameInDb = await db('users')
      .count('*')
      .where('username', username)
      .first()
    if (Number(userWithThisUsernameInDb.count) === 1) {
      // Find user in DB
      const thisUser = await fetchThisUser(username, 'username')
      // Check if the right password
      if (!comparePassword(thisUser.password_hash, password)) {
        return catchError('Password is incorrect', 'bad', res)
      }
      // Generate token for user
      const token = generateUserToken(
        thisUser.username,
        thisUser.id,
        thisUser.scopes,
        thisUser.first_name,
        thisUser.last_name,
        thisUser.gender,
        thisUser.height
      )
      delete thisUser.password_hash
      // Create user obj with token && send to client
      successMessage.user = thisUser
      successMessage.user.token = token
      return res.status(status.success).send(successMessage)
    } else {
      return catchError('Username does not exist', 'notfound', res)
    }
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Fetch User
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const fetchUser = async (req, res) => {
  const { username, user_id } = req.user
  try {
    // Find user in DB
    const thisUser = await fetchThisUser(user_id, 'id')
    // Check if no one was found
    if (!thisUser) {
      return catchError('User could not be found', 'notfound', res)
    }
    delete thisUser.password_hash
    // Create user obj with token && send to client
    successMessage.user = thisUser
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Fetch users list (search also practical)
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const fetchUsersList = async (req, res) => {
  const { how_many, page, search_text } = req.params
  try {
    // Create query for total number of users
    const totalUsersQuery = db('users').count('*').first()
    // Create query to fetch users
    const query = db
      .select(
        'id',
        'username',
        'scopes',
        'first_name',
        'last_name',
        'gender',
        'height',
        'bio',
        'photo',
        'sports',
        'photos',
        'friends',
        'verified',
        'city',
        'created_at'
      )
      .from('users')
      .offset((page - 1) * how_many)
      .limit(how_many)

    if (!isEmpty(search_text)) {
      const whereValue = `%${search_text.toLowerCase()}%`
      const whereKeyFor = (column) => `LOWER(${column}) LIKE ?`
      // Change query to fetch users based on search_text
      query
        .whereRaw(whereKeyFor('username'), whereValue)
        .orWhereRaw(whereKeyFor('first_name'), whereValue)
        .orWhereRaw(whereKeyFor('last_name'), whereValue)
      // Change query for total number of users based on search_text
      totalUsersQuery
        .whereRaw(whereKeyFor('username'), whereValue)
        .orWhereRaw(whereKeyFor('first_name'), whereValue)
        .orWhereRaw(whereKeyFor('last_name'), whereValue)
    }
    // Calculate number of users and pages
    const total = await totalUsersQuery
    const totalCount = total.count
    const totalPages = Math.ceil(total.count / how_many)
    // Actually query the DB for users
    const users = await query
    // Check if no one was found
    if (isEmpty(users)) {
      return catchError('Could not find any user', 'notfound', res)
    }
    successMessage.users = users
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Set photo for user
 * @param {object} req
 * @param {object} res
 * @returns {object} updated user
 */
const setPhoto = async (req, res) => {
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
    const { username } = req.user
    try {
      const path =
        process.env.SERVER_URL +
        ':' +
        process.env.PORT +
        '/' +
        process.env.UPLOAD_DIR_USER +
        photoName
      const thisUser = await db('users')
        .select('photo')
        .where('username', username)
        .first()
      if (!isEmpty(thisUser.photo)) {
        const prevPhotoName = /[^/]*$/.exec(thisUser.photo)[0]
        const relativePathToPrevPhoto =
          process.env.UPLOAD_DIR + process.env.UPLOAD_DIR_USER + prevPhotoName
        fs.unlink(relativePathToPrevPhoto, function (err) {
          if (err)
            return catchError(
              'Could not find and delete previous photo',
              'error',
              res
            )
        })
      }
      const updated_at = moment(new Date())
      await db('users')
        .where({ username: username })
        .update({ photo: path, updated_at: updated_at })
      successMessage.photo_path = path
      return res.status(status.success).send(successMessage)
    } catch (error) {
      return catchError('Operation was not successful', 'error', res)
    }
  })
}

/**
 * Update user general
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const updateUser = async (req, res) => {
  const { user_id } = req.user
  const old_username = req.user.username
  const {
    first_name,
    last_name,
    gender,
    city,
    bio,
    height,
    sports,
    old_password,
    new_password,
  } = req.body
  const new_username = req.body.username
  const updated_at = moment(new Date())
  const columnsToBeUpdated = {
    first_name,
    last_name,
    gender,
    city,
    bio,
    height,
    sports,
    updated_at,
  }

  const updateQuery = db('users').where({ id: user_id })

  let thisUser
  if (!isEmpty(new_password) || !isEmpty(new_username)) {
    try {
      thisUser = await db
        .select('password_hash', 'username')
        .from({ u: 'users' })
        .where('u.id', user_id)
        .first()
    } catch (error) {
      return catchError('Could not fetch user from database', 'error', res)
    }
  }
  if (!isEmpty(new_password)) {
    // Check if old password is empty
    if (isEmpty(old_password)) {
      return catchError('Old password is missing', 'bad', res)
    }
    // Check if passwords are short
    if (!validatePassword(new_password) || !validatePassword(old_password)) {
      return catchError('Short password', 'bad', res)
    }
    // Check if the right password
    if (!comparePassword(thisUser.password_hash, old_password)) {
      return catchError('Password is incorrect', 'bad', res)
    }
    columnsToBeUpdated['password_hash'] = hashString(new_password)
  }
  if (!isEmpty(new_username)) {
    columnsToBeUpdated['username'] = new_username
  }
  try {
    // Actually do the update query
    await updateQuery.update(columnsToBeUpdated)
    // Fetch the same user after the update
    const user = await fetchThisUser(user_id, 'id')
    // Generate token for user
    const token = generateUserToken(
      user.username,
      user.id,
      user.scopes,
      user.first_name,
      user.last_name,
      user.gender,
      user.height
    )
    delete user.password_hash
    // Create user obj with token && send to client
    successMessage.user = user
    successMessage.user.token = token
    return res.status(status.success).send(successMessage)
  } catch (error) {
    if (error.routine === '_bt_check_unique') {
      return catchError('Username already exists', 'conflict', res)
    } else {
      return catchError('Operation was not successfull', 'error', res)
    }
  }
}

/**
 * Update scopes of a user
 * @param {object} req
 * @param {object} res
 * @returns {object} updated user
 */
const updateUserScopes = async (req, res) => {
  const { user_id } = req.params
  const { scopesToBeGiven } = req.body

  const { scopes } = req.user
  if (!scopes.includes('edit_sbs_scopes')) {
    return catchError('Sorry, you are not allowed to do this', 'bad', res)
  }
  if (isEmpty(scopesToBeGiven)) {
    return catchError('Scopes array is needed', 'bad', res)
  }
  const findUserQuery = 'SELECT * FROM users WHERE id=$1'
  const updateUser = `UPDATE users
        SET scopes=$1 WHERE id=$2 returning *`
  try {
    const { rows } = await dbQuery.query(findUserQuery, [id])
    const dbResponse = rows[0]
    if (!dbResponse) {
      return catchError('User could not be found', 'notfound', res)
    }
    const values = [scopesToBeGiven, id]
    const response = await dbQuery.query(updateUser, values)
    const dbResult = response.rows[0]
    delete dbResult.password
    successMessage.data = dbResult
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Fetch user from DB
 * @param {integer} id
 * @returns {object} user
 */
const fetchThisUser = async (value, whichColoumn) =>
  await db
    .select(
      'id',
      'username',
      'password_hash',
      'scopes',
      'first_name',
      'last_name',
      'gender',
      'height',
      'bio',
      'photo',
      'sports',
      'photos',
      'friends',
      'verified',
      'city',
      'created_at',
      'updated_at'
    )
    .from({ u: 'users' })
    .where(`u.${whichColoumn}`, value)
    .first()

// Send a response based on the type of error occured
const catchError = function (message, errorType, res) {
  errorMessage.error = message
  return res.status(status[errorType]).send(errorMessage)
}

module.exports = {
  signupUser,
  siginUser,
  fetchUser,
  setPhoto,
  updateUser,
  fetchUsersList,
  updateUserScopes,
}

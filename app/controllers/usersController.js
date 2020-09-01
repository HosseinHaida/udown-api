const db = require('../db').Instance()
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
    errorMessage.error = 'Empty fields'
    return res.status(status.bad).send(errorMessage)
  }
  if (!validatePassword(password)) {
    errorMessage.error = 'Short password'
    return res.status(status.bad).send(errorMessage)
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
        'height',
        'bio'
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
      errorMessage.error = 'User with that username already exists!'
      return res.status(status.conflict).send(errorMessage)
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
    errorMessage.error = 'Username or Password detail is missing'
    return res.status(status.bad).send(errorMessage)
  }
  if (!validatePassword(password)) {
    errorMessage.error = 'Please enter a valid Password'
    return res.status(status.bad).send(errorMessage)
  }
  try {
    // Find user in DB
    const thisUser = await db
      .select(
        'username',
        'password_hash',
        'id',
        'scopes',
        'first_name',
        'last_name',
        'gender',
        'height',
        'bio'
      )
      .from({ u: 'users' })
      .where('u.username', username)
      .first()
    // Check if no one was found
    if (!thisUser) {
      errorMessage.error = 'User with this username does not exist'
      return res.status(status.notfound).send(errorMessage)
    }
    // Check if the right password
    if (!comparePassword(thisUser.password_hash, password)) {
      errorMessage.error = 'The password you provided is incorrect'
      return res.status(status.bad).send(errorMessage)
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
  } catch (error) {
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

/**
 * Fetch User
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const fetchUser = async (req, res) => {
  const { username } = req.user
  try {
    // Find user in DB
    const thisUser = await db
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
        'city'
      )
      .from({ u: 'users' })
      .where('u.username', username)
      .first()
    // Check if no one was found
    if (!thisUser) {
      errorMessage.error = "Couldn't find user"
      return res.status(status.notfound).send(errorMessage)
    }
    // Create user obj with token && send to client
    successMessage.user = thisUser
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

/**
 * Fetch users list
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
      errorMessage.error = "Couldn't find any users"
      return res.status(status.notfound).send(errorMessage)
    }
    successMessage.users = users
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
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
      errorMessage.error = 'Upload operation was not successful'
      return res.status(status.error).send(errorMessage)
    } else if (err) {
      errorMessage.error = 'An unknown error occurred when uploading'
      return res.status(status.error).send(errorMessage)
    }
    // Everything went fine with multer and uploading
    const photoName = req.uploaded_photo_name
    if (!photoName) {
      errorMessage.error = 'Faced issues saving photo'
      return res.status(status.error).send(errorMessage)
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
      await db('users').where({ username: username }).update({ photo: path })
      successMessage.photo_path = path
      return res.status(status.success).send(successMessage)
    } catch (error) {
      errorMessage.error = 'Operation was not successful'
      return res.status(status.error).send(errorMessage)
    }
  })
}

/**
 * Update scopes of a user
 * @param {object} req
 * @param {object} res
 * @returns {object} updated user
 */
const updateUserScopes = async (req, res) => {
  const { id } = req.params
  const { scopesToBeGiven } = req.body

  const { scopes } = req.user
  if (!scopes.includes('edit_sbs_scopes')) {
    errorMessage.error =
      'Sorry. You are unauthorized to give privilages to a user'
    return res.status(status.bad).send(errorMessage)
  }
  if (isEmpty(scopesToBeGiven)) {
    errorMessage.error = 'Scopes array is needed'
    return res.status(status.bad).send(errorMessage)
  }
  const findUserQuery = 'SELECT * FROM users WHERE id=$1'
  const updateUser = `UPDATE users
        SET scopes=$1 WHERE id=$2 returning *`
  try {
    const { rows } = await dbQuery.query(findUserQuery, [id])
    const dbResponse = rows[0]
    if (!dbResponse) {
      errorMessage.error = 'User Cannot be found'
      return res.status(status.notfound).send(errorMessage)
    }
    const values = [scopesToBeGiven, id]
    const response = await dbQuery.query(updateUser, values)
    const dbResult = response.rows[0]
    delete dbResult.password
    successMessage.data = dbResult
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'Operation was not successful'
    return res.status(status.error).send(errorMessage)
  }
}

module.exports = {
  signupUser,
  siginUser,
  fetchUser,
  setPhoto,
  fetchUsersList,
  updateUserScopes,
}

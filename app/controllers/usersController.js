const db = require('../db').Instance()
const moment = require('moment')
const {
  hashPassword,
  validatePassword,
  isEmpty,
  generateUserToken,
  comparePassword,
} = require('../helpers/validations')

const { errorMessage, successMessage, status } = require('../helpers/status')

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
  const password_hash = hashPassword(password)
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
        'height'
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

module.exports = { signupUser, siginUser, updateUserScopes }

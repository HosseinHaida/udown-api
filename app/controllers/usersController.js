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
const { search, all } = require('../routes/usersRoute')

// const verifyAuth = require('../middlewares/verifyAuth.js')

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
  const { user_id } = req.user
  try {
    // Find user in DB
    const thisUser = await fetchThisUser(user_id, 'id')
    const userRequests = await fetchThisUserRequests(user_id)
    // Check if no one was found
    if (!thisUser) {
      return catchError('User could not be found', 'notfound', res)
    }
    delete thisUser.password_hash
    // Create user obj with token && send to client
    successMessage.user = thisUser
    successMessage.user.outbound_requests = userRequests
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Fetch User inbound requests count
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const fetchInboundRequestsCount = async (req, res) => {
  const { user_id } = req.user
  try {
    // Find all inbound reqs for user in DB
    const reqs = await db('friend_requests')
      .count('*')
      .where('requestee_id', user_id)
      .first()
    const count = reqs.count
    successMessage.inbound_requests_count = count
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not fetch inbound requests count', 'error', res)
  }
}

/**
 * Fetch users list ( + [search, fetch only friends] implemented)
 * @param {object} req
 * @param {object} res
 * @returns {object} user object
 */
const fetchUsersList = async (req, res) => {
  const { how_many, page, search_text } = req.params
  const offset = (Number(page) - 1) * Number(how_many)
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
      .offset(offset)
      .limit(how_many)
    // If type of users is set to 'friends'
    let friendsIds = []
    if (req.route.path.includes('/friends_only/')) {
      const { user_id } = req.user
      const user = await db
        .select('friends')
        .from('users')
        .where({ id: user_id })
        .first()
      friendsIds = user.friends
      query.whereIn('id', friendsIds)
      totalUsersQuery.whereIn('id', friendsIds)
    }

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
  const { username } = req.user
  try {
    // Fetch user photo column from users to see
    // if the user already has a photo assigned
    const thisUser = await db('users')
      .select('photo')
      .where('username', username)
      .first()
    if (!isEmpty(thisUser.photo)) {
      // Pick photo name from the end of the previous photo URL
      const prevPhotoName = /[^/]*$/.exec(thisUser.photo)[0]
      const relativePathToPrevPhoto =
        process.env.UPLOAD_DIR + process.env.UPLOAD_DIR_USER + prevPhotoName
      fs.unlink(relativePathToPrevPhoto, function (err) {
        if (err) console.log('Could not find and delete previous photo')
      })
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
      // Generate photo URL to be saved with user in DB
      const path =
        process.env.SERVER_URL +
        ':' +
        process.env.PORT +
        '/' +
        process.env.UPLOAD_DIR_USER +
        photoName
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
    // Fetch all user requests
    const userRequests = await fetchThisUserRequests(user_id)
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
    successMessage.user.outbound_requests = userRequests
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
 * Insert friend request or make'em friends
 * if the request exists the other way too
 * @param {object} req
 * @param {object} res
 * @returns {object} reflection object
 */
const makeFriendsWith = async (req, res) => {
  const { requestee_id } = req.body
  if (isEmpty(requestee_id)) {
    return catchError('Do not know who to send the request to', 'bad', res)
  }
  const { user_id } = req.user
  try {
    const sameRequest = await db('friend_requests')
      .count('*')
      .where({ requester_id: user_id, requestee_id: requestee_id })
      .first()
    // If the request already exists
    if (Number(sameRequest.count) === 1) {
      return catchError('Request already exists', 'conflict', res)
    }
    // Fetch friends of both users
    const userFriendsQuery = db
      .select('friends')
      .from({ u: 'users' })
      .where('u.id', user_id)
      .first()
    const user = await userFriendsQuery
    const userQuery = db('users').where({ id: user_id })
    const requestee = await db
      .select('friends')
      .from({ u: 'users' })
      .where('u.id', requestee_id)
      .first()
    const requesteeQuery = db('users').where({ id: requestee_id })
    const sameRequestButFromTheOtherPerson = await db('friend_requests')
      .count('*')
      .where({ requester_id: requestee_id, requestee_id: user_id })
      .first()
    // If request exists from the other way around
    if (Number(sameRequestButFromTheOtherPerson.count) === 1) {
      await db('friend_requests')
        .where({
          requester_id: requestee_id,
          requestee_id: user_id,
        })
        .del()
      // user and requestee
      const userFriendsUpdated = user.friends.concat([requestee_id])
      const requesteeFriendsUpdated = requestee.friends.concat([user_id])
      const updated_at = moment(new Date())
      await userQuery.update({
        friends: userFriendsUpdated,
        updated_at: updated_at,
      })
      await requesteeQuery.update({
        friends: requesteeFriendsUpdated,
        updated_at: updated_at,
      })
      successMessage.message = 'You are friends now, because you both wanted to'
    }
    // If there is no similar request
    if (
      Number(sameRequest.count) === 0 &&
      Number(sameRequestButFromTheOtherPerson.count) === 0
    ) {
      // user and requestee
      // If they are already friends
      if (
        user.friends.includes(requestee_id) &&
        requestee.friends.includes(user_id)
      ) {
        catchError('You are already friends', 'bad', res)
      } else if (
        !user.friends.includes(requestee_id) &&
        requestee.friends.includes(user_id)
      ) {
        const updated_at = moment(new Date())
        const userFriendsUpdated = user.friends.concat([requestee_id])
        await userQuery.update({
          friends: userFriendsUpdated,
          updated_at: updated_at,
        })
        // console.log('updated userFriends')
      } else if (
        user.friends.includes(requestee_id) &&
        !requestee.friends.includes(user_id)
      ) {
        const updated_at = moment(new Date())
        const requesteeFriendsUpdated = requestee.friends.concat([user_id])
        await requesteeQuery.update({
          friends: requesteeFriendsUpdated,
          updated_at: updated_at,
        })
        // console.log('updated requesteeFriends')
      } else {
        const created_at = moment(new Date())
        await db('friend_requests').insert({
          requester_id: user_id,
          requestee_id,
          created_at,
        })
        successMessage.message = 'Sent Request'
      }
    }

    const thisUser = await userFriendsQuery
    const allUserRequests = await fetchThisUserRequests(user_id)
    successMessage.user_friends = thisUser.friends
    successMessage.outbound_requests = allUserRequests
    return res.status(status.created).send(successMessage)
  } catch (error) {
    {
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

const fetchThisUserRequests = async (id) => {
  const userRequests = await db
    .select('requestee_id', 'created_at')
    .from({ u: 'friend_requests' })
    .where({ 'u.requester_id': id })
  let userRequestsArray = []
  userRequests.forEach((element) => {
    userRequestsArray.push(element.requestee_id)
  })
  return userRequestsArray
}

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
  makeFriendsWith,
  updateUserScopes,
  fetchInboundRequestsCount,
}

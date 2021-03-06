const db = require('../db').Instance()
var fs = require('fs')
const moment = require('moment')
const {
  hashString,
  validatePassword,
  isEmpty,
  generateUserToken,
  comparePassword,
  doArraysContainTheSame,
} = require('../helpers/validations')
const { catchError } = require('./catchError')

const { successMessage, status } = require('../helpers/status')
const { upload } = require('./usersPhotoUpload')
const multer = require('multer')
const { userHasScope } = require('./scopesController')

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
    scopes: ['add_events', 'add_comments'],
    friends: [],
    close_friends: [],
    created_at,
  }
  try {
    // Insert user to DB
    const r = await db('users').insert(userPayload)
    // Select the same user from DB
    const thisUser = await db
      .select('username', 'id', 'first_name', 'last_name', 'gender', 'height')
      .from({ u: 'users' })
      .where('u.username', userPayload.username)
      .first()
    // Generate token for the user
    const token = generateUserToken(
      thisUser.username,
      thisUser.id,
      thisUser.first_name,
      thisUser.last_name,
      thisUser.gender,
      thisUser.height
    )
    // Create user obj with token && send to client
    successMessage.user = thisUser
    successMessage.user.outbound_requests = []
    successMessage.user.inbound_requests = []
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
        thisUser.first_name,
        thisUser.last_name,
        thisUser.gender,
        thisUser.height
      )
      delete thisUser.password_hash
      // Create user obj with token && send to client
      const userRequests = await fetchThisUserRequests(thisUser.id)
      const userRequestsInbound = await fetchThisUserRequestsInbound(
        thisUser.id
      )

      successMessage.user = thisUser
      successMessage.user.outbound_requests = userRequests
      successMessage.user.inbound_requests = userRequestsInbound
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
    const userRequestsInbound = await fetchThisUserRequestsInbound(user_id)
    // Check if no one was found
    if (!thisUser) {
      return catchError('User could not be found', 'notfound', res)
    }
    delete thisUser.password_hash
    // Create user obj with token && send to client
    successMessage.user = thisUser
    successMessage.user.outbound_requests = userRequests
    successMessage.user.inbound_requests = userRequestsInbound
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
 * Fetch users list ( + [search, friends, requests] implemented)
 * @param {object} req
 * @param {object} res
 * @returns {object} users array
 */
const fetchUsersList = async (req, res) => {
  const { how_many, page, search_text } = req.query
  const { type } = req.params
  const offset = (Number(page) - 1) * Number(how_many)
  try {
    // Create query to fetch users
    const query = db.from('users')

    if (!isEmpty(search_text)) {
      const where = (column) =>
        `LOWER(${column}) LIKE '%${search_text.toLowerCase()}%'`

      // Change query to fetch users based on search_text
      query.where(function () {
        this.whereRaw(where('username'))
          .orWhereRaw(where('first_name'))
          .orWhereRaw(where('last_name'))
      })
    }

    // If type of users is set to 'friends'
    if (type === 'friends') {
      const { user_id } = req.user
      const user = await db
        .select('friends')
        .from('users')
        .where({ id: user_id })
        .first()
      query.whereIn('id', user.friends)
    }
    // If type of users is set to 'close'
    if (type === 'close') {
      const { user_id } = req.user
      const user = await db
        .select('close_friends')
        .from('users')
        .where({ id: user_id })
        .first()
      query.whereIn('id', user.close_friends)
    }
    // If type of users is set to 'requests'
    if (type === 'requests') {
      const { user_id } = req.user
      const userInRequests = await fetchThisUserRequestsInbound(user_id)
      query.whereIn('id', userInRequests)
    }

    // Calculate number of users and pages
    const usersCountQuery = query.clone().count('*').first()
    const usersCount = await usersCountQuery
    const totalCount = Number(usersCount.count)
    const totalPages = Math.ceil(totalCount / how_many)
    // Actually query the DB for users
    const users = await query
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
        'friends',
        'verified',
        'city',
        'created_at'
      )
      .offset(offset)
      .limit(how_many)
      .orderBy('first_name')
    // Send response
    successMessage.users = users
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not fetch users list', 'error', res)
  }
}

/**
 * Fetch users list as options ( + [search])
 * @param {object} req
 * @param {object} res
 * @returns {object} users array as options for select input
 */
const fetchUsersAsOptions = async (req, res) => {
  const { search_text } = req.params
  try {
    // Create query to fetch users
    const query = db
      .from('users')
      // .select({ label: 'username', value: 'id' })
      .select('id', 'username', 'first_name', 'last_name')
    if (!isEmpty(search_text)) {
      const where = (column) =>
        `LOWER(${column}) LIKE '%${search_text.toLowerCase()}%'`

      // Change query to fetch users based on search_text
      query.where(function () {
        this.whereRaw(where('username'))
          .orWhereRaw(where('first_name'))
          .orWhereRaw(where('last_name'))
      })
    }
    // Actually query the DB for users
    const users = await query.orderBy('first_name')
    // Send response
    if (isEmpty(search_text)) {
      successMessage.users = []
    } else {
      successMessage.users = users
    }
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not fetch users', 'error', res)
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
        // ':' +
        // process.env.PORT +
        '/static/' +
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
    const userRequestsInbound = await fetchThisUserRequestsInbound(user_id)
    // Generate token for user
    const token = generateUserToken(
      user.username,
      user.id,
      user.first_name,
      user.last_name,
      user.gender,
      user.height
    )
    delete user.password_hash
    // Create user obj with token && send to client
    successMessage.user = user
    successMessage.user.outbound_requests = userRequests
    successMessage.user.inbound_requests = userRequestsInbound
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
 * or remove friend
 * @param {object} req
 * @param {object} res
 * @returns {object} reflection object
 */
const handleFriendRequest = async (req, res) => {
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
      await db('friend_requests')
        .where({ requester_id: user_id, requestee_id: requestee_id })
        .del()
      successMessage.message = 'Removed this friend request'
    }
    // Fetch friends of both users
    const userFriendsQuery = db
      .select('friends', 'close_friends')
      .from({ u: 'users' })
      .where('u.id', user_id)
      .first()
    const user = await userFriendsQuery
    const requestee = await db
      .select('friends', 'close_friends')
      .from({ u: 'users' })
      .where('u.id', requestee_id)
      .first()
    const sameRequestButFromTheOtherPerson = await db('friend_requests')
      .count('*')
      .where({ requester_id: requestee_id, requestee_id: user_id })
      .first()
    const updated_at = moment(new Date())
    // If request exists from the other way around
    if (Number(sameRequestButFromTheOtherPerson.count) === 1) {
      await db.transaction(async (trx) => {
        // user and requestee
        const userFriendsUpdated = user.friends.concat([requestee_id])
        const requesteeFriendsUpdated = requestee.friends.concat([user_id])
        await trx('friend_requests')
          .where({
            requester_id: requestee_id,
            requestee_id: user_id,
          })
          .del()
        await trx('users').where({ id: user_id }).update({
          friends: userFriendsUpdated,
          updated_at: updated_at,
        })
        await trx('users').where({ id: requestee_id }).update({
          friends: requesteeFriendsUpdated,
          updated_at: updated_at,
        })
        const reqs = await trx('friend_requests')
          .count('*')
          .where('requestee_id', user_id)
          .first()
        const count = reqs.count
        successMessage.inbound_requests_count = count
        successMessage.message = 'You are now friends'
      })
    }
    // If there is no similar request
    if (
      Number(sameRequest.count) === 0 &&
      Number(sameRequestButFromTheOtherPerson.count) === 0
    ) {
      // If they are already friends
      if (
        user.friends.includes(requestee_id) &&
        requestee.friends.includes(user_id)
      ) {
        await db.transaction(async (trx) => {
          // Remove one another from the friends array of each user
          const userFriendsUpdated = user.friends.filter(function (id) {
            return id !== requestee_id
          })
          const userCloseFriendsUpdated = user.close_friends.filter(function (
            id
          ) {
            return id !== requestee_id
          })
          const requesteeFriendsUpdated = requestee.friends.filter(function (
            id
          ) {
            return id !== user_id
          })
          const requesteeCloseFriendsUpdated = requestee.close_friends.filter(
            function (id) {
              return id !== user_id
            }
          )
          await trx('users').where({ id: user_id }).update({
            friends: userFriendsUpdated,
            close_friends: userCloseFriendsUpdated,
            updated_at: updated_at,
          })
          await trx('users').where({ id: requestee_id }).update({
            friends: requesteeFriendsUpdated,
            close_friends: requesteeCloseFriendsUpdated,
            updated_at: updated_at,
          })
          successMessage.message = 'You removed him/her from your friends'
        })
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
    const allUserRequestsInbound = await fetchThisUserRequestsInbound(user_id)
    successMessage.user_friends = thisUser.friends
    successMessage.user_close_friends = thisUser.close_friends
    successMessage.outbound_requests = allUserRequests
    successMessage.inbound_requests = allUserRequestsInbound
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
  const { user_id } = req.user
  const { scopes, id } = req.body
  try {
    const usersPreviousScopes = await db('users')
      .select('scopes', 'username')
      .where({ id: id })
      .first()
    if (!(await userHasScope(user_id, 'edit_users_scopes'))) {
      return catchError('Sorry, you are not allowed to do this', 'bad', res)
    }
    const couldEditScopes = await userHasScope(id, 'edit_users_scopes')
    const couldSuspendAdmins = await userHasScope(id, 'suspend_admins')
    const userCanSuspendAdmins = await userHasScope(user_id, 'suspend_admins')
    const nowCannotEditScopes = !scopes.includes('edit_users_scopes')
    const nowCanSuspendAdmins = scopes.includes('suspend_admins')
    if (doArraysContainTheSame(usersPreviousScopes.scopes, scopes)) {
      return catchError('Scopes unchanged', 'bad', res)
    }
    if (couldEditScopes && nowCannotEditScopes && !userCanSuspendAdmins) {
      return catchError('Sorry, you can not suspend admins', 'bad', res)
    }
    if (!userCanSuspendAdmins && nowCanSuspendAdmins && !couldSuspendAdmins) {
      return catchError("You can't do that", 'bad', res)
    }
    if (couldSuspendAdmins && !nowCanSuspendAdmins && !userCanSuspendAdmins) {
      return catchError("You can't suspend them from suspending :|", 'bad', res)
    }

    const updated_at = moment(new Date())
    await db('users')
      .where({ id: id })
      .update({ scopes: scopes, updated_at: updated_at, updated_by: user_id })
    successMessage.scopes = scopes
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Verify user
 * @param {object} req
 * @param {object} res
 */
const verifyUser = async (req, res) => {
  const { user_id } = req.user
  const { id } = req.body
  try {
    if (!(await userHasScope(user_id, 'verify_users'))) {
      return catchError('You are not allowed to verify users', 'bad', res)
    }
    const user = await db('users')
      .select('verified', 'username')
      .where({ id: id })
      .first()
    if (user.verified) {
      return catchError(user.username + 'is already verified', 'bad', res)
    }
    const updated_at = moment(new Date())
    await db('users')
      .where({ id: id })
      .update({ verified: true, updated_at: updated_at, updated_by: user_id })
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Remove user verification
 * @param {object} req
 * @param {object} res
 */
const removeVerification = async (req, res) => {
  const { user_id } = req.user
  const { id } = req.params
  try {
    if (!(await userHasScope(user_id, 'verify_users'))) {
      return catchError(
        "You are not allowed to remove user's verification status",
        'bad',
        res
      )
    }
    const user = await db('users')
      .select('verified', 'username')
      .where({ id: id })
      .first()
    if (!user.verified) {
      return catchError(user.username + 'is not verified yet', 'bad', res)
    }
    const updated_at = moment(new Date())
    await db('users')
      .where({ id: id })
      .update({ verified: false, updated_at: updated_at, updated_by: user_id })
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Add user to close friends
 * @param {object} req
 * @param {object} res
 */
const addToCloseFriends = async (req, res) => {
  const { user_id } = req.user
  const { id } = req.body
  try {
    const user = await db('users')
      .select('close_friends', 'friends')
      .where({ id: user_id })
      .first()
    if (!user.friends.includes(Number(id))) {
      return catchError('You are not yet friends', 'bad', res)
    }
    if (user.close_friends.includes(Number(id))) {
      return catchError('You are already close friends', 'bad', res)
    }
    const userCloseFriendsUpdated = user.close_friends.concat([Number(id)])
    const updated_at = moment(new Date())
    await db('users').where({ id: user_id }).update({
      close_friends: userCloseFriendsUpdated,
      updated_at: updated_at,
      updated_by: user_id,
    })
    successMessage.close_friends = userCloseFriendsUpdated
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Operation was not successful', 'error', res)
  }
}

/**
 * Rmove user from close friends
 * @param {object} req
 * @param {object} res
 */
const removeFromCloseFriends = async (req, res) => {
  const { user_id } = req.user
  const { id } = req.params
  try {
    const user = await db('users')
      .select('close_friends', 'friends')
      .where({ id: user_id })
      .first()

    if (!user.friends.includes(Number(id))) {
      return catchError('You are not yet friends, let alone close', 'bad', res)
    }
    if (!user.close_friends.includes(Number(id))) {
      return catchError('You are not close friends', 'bad', res)
    }
    const userCloseFriendsUpdated = user.close_friends.filter(function (
      userId
    ) {
      return userId != id
    })
    const updated_at = moment(new Date())
    await db('users').where({ id: user_id }).update({
      close_friends: userCloseFriendsUpdated,
      updated_at: updated_at,
      updated_by: user_id,
    })
    successMessage.close_friends = userCloseFriendsUpdated
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
    .select('*')
    .from({ u: 'users' })
    .where(`u.${whichColoumn}`, value)
    .first()

/**
 * Fetch user requests (outbound)
 * @param {integer} id
 * @returns {object} requests array
 */
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

/**
 * Fetch user requests (inbound)
 * @param {integer} id
 * @returns {object} requests array
 */
const fetchThisUserRequestsInbound = async (id) => {
  const userRequests = await db
    .select('requester_id', 'created_at')
    .from({ u: 'friend_requests' })
    .where({ 'u.requestee_id': id })
  let userRequestsArray = []
  userRequests.forEach((element) => {
    userRequestsArray.push(element.requester_id)
  })
  return userRequestsArray
}

module.exports = {
  signupUser,
  siginUser,
  fetchUser,
  setPhoto,
  updateUser,
  fetchUsersList,
  fetchUsersAsOptions,
  handleFriendRequest,
  updateUserScopes,
  fetchInboundRequestsCount,
  verifyUser,
  removeVerification,
  addToCloseFriends,
  removeFromCloseFriends,
}

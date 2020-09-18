const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

/**
 * Hash Password Method
 * @param {string} password
 * @returns {string} returns hashed password
 */
const saltRounds = 10
const salt = bcrypt.genSaltSync(saltRounds)
const hashString = (password) => bcrypt.hashSync(password, salt)

/**
 * comparePassword
 * @param {string} hashedPassword
 * @param {string} password
 * @returns {Boolean} return True or False
 */
const comparePassword = (hashedPassword, password) => {
  return bcrypt.compareSync(password, hashedPassword)
}

/**
 * isValidEmail helper method
 * @param {string} email
 * @returns {Boolean} True or False
 */
// const isValidEmail = (email) => {
//   const regEx = /\S+@\S+\.\S+/;
//   return regEx.test(email);
// };

/**
 * validatePassword helper method
 * @param {string} password
 * @returns {Boolean} True or False
 */
const validatePassword = (password) => {
  if (password.length <= 8 || password === '') {
    return false
  }
  return true
}
/**
 * isEmpty helper method
 * @param {string, integer} input
 * @returns {Boolean} True or False
 */
const isEmpty = (input) => {
  if (input === undefined || input === '' || input === null) {
    return true
  } else {
    return false
  }
}

/**
 * empty helper method
 * @param {string, integer} input
 * @returns {Boolean} True or False
 */
const empty = (input) => {
  if (input === undefined || input === '') {
    return true
  }
}

/**
 *
 * @param {array, array} input
 * @returns {Boolean} True or False
 */
const doArraysContainTheSame = (arrayOne, arrayTwo) =>
  arrayOne.sort().join(',') === arrayTwo.sort().join(',')

/**
 * Generate Token
 * @param {string} id
 * @returns {string} token
 */
const generateUserToken = (
  username,
  id,
  first_name,
  last_name,
  gender,
  height
) => {
  const token = jwt.sign(
    {
      username,
      user_id: id,
      first_name,
      last_name,
      gender,
      height,
    },
    process.env.SECRET,
    { expiresIn: '14d' }
  )
  return token
}

module.exports = {
  /* isValidEmail ,*/
  validatePassword,
  isEmpty,
  empty,
  hashString,
  comparePassword,
  generateUserToken,
  doArraysContainTheSame,
}

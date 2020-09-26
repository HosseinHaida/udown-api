const db = require('../db').Instance()
const moment = require('moment')
const { isEmpty } = require('../helpers/validations')
const { catchError } = require('./catchError')
const { userHasScope } = require('./scopesController')

const { successMessage, status } = require('../helpers/status')

/**
 * Fetch events list ( + [search])
 * @param {object} req
 * @param {object} res
 * @returns {object} locations objects array
 */
const fetchEventsList = async (req, res) => {
  const { user_id } = req.user
  const { how_many, page, search_text } = req.query
  const { type } = req.params
  try {
    if (
      type !== 'friends' &&
      type !== 'close' &&
      type !== 'public' &&
      type !== 'all'
    ) {
      return catchError('Not valid search parameters', 'bad', res)
    }
    const offset = (Number(page) - 1) * Number(how_many)
    // Create query to fetch events
    const query = db('events')
      .join('users', 'users.id', '=', 'events.created_by')
      .join('locations', 'locations.id', '=', 'events.location_id')
      .select(
        'events.id',
        'events.location_id',
        'locations.name',
        'events.guests',
        'locations.city',
        'events.min_viable_population',
        'events.max_viable_population',
        'events.created_by',
        'events.sport_type',
        'events.whats_needed',
        'events.happens_at',
        'events.created_at',
        'users.username',
        'users.first_name',
        'users.last_name',
        'users.photo',
        'users.verified',
        'events.only_close_friends',
        'events.is_public'
      )
      .whereRaw(`${user_id} <> ALL (events.hide_from)`)

    // If user searched something
    if (!isEmpty(search_text)) {
      const where = (column) =>
        `LOWER(${column}) LIKE '%${search_text.toLowerCase()}%'`

      query.andWhere(function () {
        this.whereRaw(where('name'))
          .orWhereRaw(where('locations.city'))
          .orWhereRaw(where('username'))
          .orWhereRaw(where('first_name'))
          .orWhereRaw(where('last_name'))
          .orWhereRaw(where('sport_type'))
      })
    }

    if (type === 'all') {
      query.andWhere(function () {
        this.whereRaw(
          `${user_id} = ANY(users.friends) AND only_close_friends = false OR (${user_id} = ANY(users.close_friends) AND only_close_friends = true) OR users.id = ${user_id} OR is_public = true`
        )
      })
    } else if (type === 'public') {
      query.andWhere('is_public', true)
    } else if (type === 'friends') {
      query
        .andWhereRaw(`${user_id} = ANY(users.friends)`)
        .andWhereRaw(`only_close_friends = false`)
        .andWhereRaw(`is_public = false`)
    } else if (type === 'close') {
      query
        .andWhereRaw(`${user_id} = ANY(users.close_friends)`)
        .andWhereRaw(`only_close_friends = true`)
    }

    // Actually query the DB for events
    const events = await query
      .offset(offset)
      .limit(how_many)
      .orderBy('happens_at')
    // Calculate number of events and pages
    const totalCount = events.length
    const totalPages = Math.ceil(totalCount / how_many)
    // Check if nothing was found
    if (isEmpty(events)) {
      return catchError('Could not find any events', 'notfound', res)
    }
    successMessage.events = events
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.log(error)
    return catchError('Operation was not successful', 'error', res)
  }
}

module.exports = {
  fetchEventsList,
}

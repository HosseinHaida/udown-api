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
  const { page, how_many, search_text } = req.params
  const offset = (Number(page) - 1) * Number(how_many)
  try {
    // Create query to fetch locations
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
        'users.verified'
      )
    // change the query to have results based on search_text
    if (!isEmpty(search_text)) {
      const where = (column) =>
        `LOWER(${column}) LIKE '%${search_text.toLowerCase()}%'`
      // Change query to fetch events based on search_text
      query
        .whereRaw(where('name'))
        .orWhereRaw(where('locations.city'))
        .orWhereRaw(where('username'))
        .orWhereRaw(where('first_name'))
        .orWhereRaw(where('last_name'))
        .orWhereRaw(where('sport_type'))
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
    return catchError('Operation was not successful', 'error', res)
  }
}

module.exports = {
  fetchEventsList,
}

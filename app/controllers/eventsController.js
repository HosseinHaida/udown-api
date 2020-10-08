const db = require('../db').Instance()
const moment = require('moment')
const { isEmpty } = require('../helpers/validations')
const { catchError } = require('./catchError')
const { userHasScope } = require('./scopesController')
const { successMessage, status } = require('../helpers/status')
const { Query } = require('pg')

/**
 * Fetch events list ( + [search])
 * @param {object} req
 * @param {object} res
 * @returns {object} locations objects array
 */
const fetchEventsList = async (req, res) => {
  const { user_id } = req.user
  const { how_many, page, search_text } = req.query
  const { type, show_canceled } = req.params
  try {
    if (
      type !== 'friends' &&
      type !== 'close' &&
      type !== 'public' &&
      type !== 'all' &&
      type !== 'self'
    ) {
      return catchError('Search type unknown', 'bad', res)
    }
    const offset = (Number(page) - 1) * Number(how_many)
    // Create query to fetch events
    const query = db('events')
      .join('users', 'users.id', '=', 'events.created_by')
      .join('locations', 'locations.id', '=', 'events.location_id')
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
    }
    if (type === 'public') {
      query.andWhere('is_public', true)
    }
    if (type === 'friends') {
      query
        .andWhereRaw(`${user_id} = ANY(users.friends)`)
        .andWhereRaw(`only_close_friends = false`)
        .andWhereRaw(`is_public = false`)
    }
    if (type === 'close') {
      query
        .andWhereRaw(`${user_id} = ANY(users.close_friends)`)
        .andWhereRaw(`only_close_friends = true`)
    }
    if (type === 'self') {
      var eventsUserIsIn = db('event_participants')
        .where({ user_id: user_id })
        .select('event_id')
      query.where(function () {
        this.where('events.id', 'in', eventsUserIsIn).orWhere(
          'events.created_by',
          user_id
        )
      })
    } else {
      const now = new Date(moment())
      const prevDayFromNow = new Date(now.getTime() - 60000 * 60 * 4)
      query.where('happens_at', '>=', prevDayFromNow)
    }
    if (show_canceled === 'false') {
      query.where(function () {
        this.where({ 'events.canceled': false })
      })
    }

    // Calculate number of events and pages
    const eventsCountQuery = query.clone().count('*').first()
    const eventsCount = await eventsCountQuery
    const totalCount = Number(eventsCount.count)
    const totalPages = Math.ceil(totalCount / how_many)
    // Actually query the DB for events
    const events = await query
      .select(
        'events.id',
        'events.location_id',
        'locations.name',
        'events.guests',
        'events.canceled',
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
      .offset(offset)
      .limit(how_many)
      .orderBy('happens_at')

    // Check if nothing was found
    if (isEmpty(events)) {
      return catchError('Could not find any events', 'notfound', res)
    }
    successMessage.events = events
    successMessage.total = totalCount
    successMessage.pages = totalPages
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not fetch events list', 'error', res)
  }
}

/**
 * Fetch event
 * @param {object} req
 * @param {object} res
 * @returns {object} event object
 */
const fetchEvent = async (req, res) => {
  const { id } = req.params
  const { user_id } = req.user
  const eventId = Number(id)
  try {
    // Find event from DB
    const thisEvent = await db('events')
      .join('users', 'users.id', '=', 'events.created_by')
      .join('locations', 'locations.id', '=', 'events.location_id')
      .where({ 'events.id': eventId })
      .select(
        'events.id',
        'events.location_id',
        'locations.name',
        'events.guests',
        'events.guests_allowed',
        'events.canceled',
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
        'events.hide_from',
        'events.only_close_friends',
        'users.close_friends',
        'users.friends',
        'events.is_public',
        'users.verified'
      )
      .first()

    if (
      thisEvent.hide_from.includes(user_id) ||
      (thisEvent.only_close_friends === true &&
        !thisEvent.close_friends.includes(user_id) &&
        thisEvent.created_by !== user_id) ||
      (thisEvent.is_public === false &&
        thisEvent.only_close_friends === false &&
        !thisEvent.friends.includes(user_id) &&
        thisEvent.created_by !== user_id)
    ) {
      return catchError('Event was not found', 'bad', res)
    }

    const participants = await fetchEventParticipants(eventId)

    if (thisEvent.created_by != user_id) {
      delete thisEvent.hide_from
      delete thisEvent.close_friends
      delete thisEvent.friends
    }

    // Create event obj with participants && send to client
    successMessage.event = thisEvent
    successMessage.event.participants = participants
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not fetch event', 'error', res)
  }
}

/**
 * Insert new event
 * @param {object} req
 * @param {object} res
 */
const insertEvent = async (req, res) => {
  const { user_id } = req.user
  const {
    location_id,
    guests_allowed,
    guests,
    hide_from,
    only_close_friends,
    is_public,
    min_viable_population,
    max_viable_population,
    sport_type,
    whats_needed,
    happens_at,
  } = req.body
  const created_at = moment(new Date())
  const columnsToBeInserted = {
    location_id,
    guests_allowed,
    guests: guests,
    only_close_friends,
    is_public,
    min_viable_population,
    max_viable_population,
    created_by: user_id,
    sport_type,
    whats_needed,
    happens_at: moment(happens_at),
    created_at,
  }
  let hide_from_ids_array = []
  if (hide_from.length > 0) {
    hide_from_ids_array = hide_from.map((item) => item.value)
  }
  columnsToBeInserted.hide_from = hide_from_ids_array
  if (
    isEmpty(location_id) ||
    isEmpty(guests_allowed) ||
    isEmpty(only_close_friends) ||
    isEmpty(is_public) ||
    isEmpty(min_viable_population) ||
    isEmpty(max_viable_population) ||
    isEmpty(sport_type) ||
    isEmpty(whats_needed) ||
    isEmpty(happens_at) ||
    isEmpty(created_at)
  ) {
    return catchError('Empty fields', 'bad', res)
  }
  const insertQuery = db('events')
  try {
    if (!(await userHasScope(user_id, 'add_events'))) {
      return catchError('You are not authorized to add events!', 'bad', res)
    }
    // Actually do the insert query
    await insertQuery.insert(columnsToBeInserted)
    return res.status(status.success).send()
  } catch (error) {
    return catchError('Insert was not successfull', 'error', res)
  }
}

/**
 * Add participant
 * @param {object} req
 * @param {object} res
 * @returns {object} participants array
 */
const addParticipent = async (req, res) => {
  const { event_id, probability, be_there_at, guests, will_bring } = req.body
  const { user_id } = req.user
  const eventId = Number(event_id)
  try {
    const created_at = moment(new Date())
    const columnsToBeInserted = {
      event_id,
      probability,
      user_id,
      be_there_at,
      guests,
      will_bring,
      created_at,
    }
    if (isEmpty(event_id) || isEmpty(probability) || isEmpty(be_there_at)) {
      return catchError('Empty fields', 'bad', res)
    }
    if (Number(probability) < 0 || Number(probability) > 100) {
      return catchError('The percentage provided is not valid', 'bad', res)
    }
    const event = await db('events')
      .where({ id: eventId })
      .select(
        'created_by',
        'happens_at',
        'hide_from',
        'only_close_friends',
        'max_viable_population',
        'guests_allowed',
        'canceled'
      )
      .first()
    if (!event.guests_allowed && !isEmpty(guests)) {
      return catchError('Guests are not allowed', 'bad', res)
    }
    if (event.canceled) {
      return catchError('Event is canceled by creator', 'bad', res)
    }
    if (event.created_by === user_id) {
      return catchError('This is your own event :)', 'bad', res)
    }
    const thisParticipantIfAlready = await db('event_participants')
      .count('*')
      .where({ event_id: eventId, user_id: user_id })
      .first()
    if (thisParticipantIfAlready.count >= 1) {
      // return catchError("You've already announced you were down :)", 'bad', res)
      delete columnsToBeInserted.created_at
      columnsToBeInserted.updated_at = moment(new Date())
      const timeLeft = remainingMinutes(
        new Date(event.happens_at),
        new Date(columnsToBeInserted.updated_at)
      )
      if (timeLeft < 0) {
        return catchError('Event has already taken place', 'bad', res)
      }
      if (timeLeft < 60 && timeLeft > 0) {
        return catchError('Sorry, there is no time for that', 'bad', res)
      }
      await db('event_participants')
        .where({ event_id: eventId, user_id: user_id })
        .update(columnsToBeInserted)
      successMessage.updated = true
    }
    const allParticipants = await db('event_participants')
      .count('*')
      .where({ event_id: eventId })
      .first()
    if (
      event.max_viable_population > 0 &&
      allParticipants.count >= event.max_viable_population &&
      thisParticipantIfAlready.count < 1
    ) {
      return catchError('Exceeding capacity', 'bad', res)
    }
    const creator = await db('users')
      .where({ id: event.created_by })
      .select('friends', 'close_friends')
      .first()
    if (
      (event.only_close_friends === true &&
        !creator.close_friends.includes(user_id)) ||
      (event.is_public === false &&
        event.only_close_friends === false &&
        !creator.friends.includes(user_id)) ||
      event.hide_from.includes(user_id)
    ) {
      return catchError('Event is protected', 'bad', res)
    }
    if (thisParticipantIfAlready.count < 1) {
      const insertQuery = db('event_participants')
      // Actually do the update query
      await insertQuery.insert(columnsToBeInserted)
      // Fetch participants and send to client
    }

    const participants = await fetchEventParticipants(eventId)
    successMessage.participants = participants
    return res.status(status.success).send(successMessage)
  } catch (error) {
    return catchError('Could not sign you for the event', 'error', res)
  }
}

/**
 * Cancel event
 * @param {object} req
 * @param {object} res
 */
const cancelEvent = async (req, res) => {
  const { id } = req.body
  const { user_id } = req.user
  const eventId = Number(id)
  try {
    const updated_at = moment(new Date())
    const event = await db('events')
      .where({ id: eventId })
      .select('created_by', 'happens_at', 'canceled')
      .first()
    if (event.canceled) {
      return catchError('Event is already canceled', 'bad', res)
    }
    if (event.created_by !== user_id) {
      return catchError('This is not your event :|', 'bad', res)
    }
    const timeLeft = remainingMinutes(
      new Date(event.happens_at),
      new Date(updated_at)
    )
    if (timeLeft < 0) {
      return catchError('Event has already taken place', 'bad', res)
    }
    if (timeLeft < 60 && timeLeft > 0) {
      return catchError('Sorry, there is no time for that', 'bad', res)
    }
    await db('events').where({ id: eventId }).update({ canceled: true })
    return res.status(status.success).send()
  } catch (error) {
    return catchError('Could not cancel event', 'error', res)
  }
}

/**
 * Fetch participants from DB
 * @param {object} req
 * @param {object} res
 * @returns {object} participants array
 */
const fetchEventParticipants = async (eventId) => {
  const eventParticipants = await db('event_participants')
    .count('*')
    .where({ event_id: eventId })
    .first()
  let participants = []
  if (eventParticipants.count > 0) {
    participants = await db('event_participants')
      .join('users', 'users.id', '=', 'event_participants.user_id')
      .select(
        'event_id',
        'probability',
        'user_id',
        'be_there_at',
        'guests',
        'will_bring',
        'event_participants.created_at',
        'users.username',
        'users.first_name',
        'users.last_name',
        'users.photo',
        'users.verified',
        'event_participants.created_at'
      )
      .orderBy('event_participants.created_at')
      .where({ event_id: eventId })
  }
  return participants
}

const remainingMinutes = function (date1, date2) {
  var difference = date1.getTime() - date2.getTime()
  var minutesDifference = Math.floor(difference / 1000 / 60)
  return minutesDifference
}

module.exports = {
  fetchEventsList,
  fetchEvent,
  addParticipent,
  insertEvent,
  cancelEvent,
}

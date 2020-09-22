exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('events')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('events').insert([
        {
          location_id: 1,
          guests: 3,
          is_public: true,
          min_viable_population: 6,
          created_by: 1,
          sport_type: 'basketball',
          whats_needed: ['Ball', 'Water'],
          happens_at: '2020-09-23 18:00:40+04:30',
          created_at: '2020-09-18 09:00:40+04:30',
        },
        {
          location_id: 1,
          guests: 3,
          hide_from: [1],
          min_viable_population: 6,
          created_by: 2,
          sport_type: 'basketball',
          whats_needed: ['Ball', 'Pump', 'Water'],
          happens_at: '2020-09-22 18:00:40+04:30',
          created_at: '2020-09-18 09:00:40+04:30',
        },
        {
          location_id: 2,
          guests: 3,
          hide_from: [4, 5],
          min_viable_population: 6,
          created_by: 3,
          sport_type: 'basketball',
          whats_needed: ['Ball', 'Pump', 'Water'],
          happens_at: '2020-09-28 18:00:40+04:30',
          created_at: '2020-09-18 09:00:40+04:30',
        },
      ])
    })
}

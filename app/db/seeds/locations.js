exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('locations')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('locations').insert([
        {
          name: 'Kuye Emam Jafar',
          maps_url: 'https://goo.gl/maps/B58cm3RhK7tPC5dt6',
          photo: '',
          city: 'Esfahan',
          region: 'Kuye Emam Jafar',
          cost: 'No entrance fees',
          meta: `No WC,
Good environment
One rim 3m high, the other 2.80`,
          sport_types: ['basketball', 'volleyball', 'soccer'],
          girls_allowed: true,
          created_at: '2020-05-19 10:00:40+04:30',
          created_by: null,
          verified: true,
        },
        //         {
        //           name: 'Moshtagh',
        //           maps_url: 'https://goo.gl/maps/WWY3JurfXYedCnwD8',
        //           photo: '',
        //           city: 'Esfahan',
        //           region: 'Moshtagh',
        //           cost: '2,000t entrance fee',
        //           meta: `WC,
        // Good environment,
        // Surrounded by trees,
        // Standard glass backboard rims,
        // Just that super slippery asphalt`,
        //           sport_types: ['basketball', 'soccer'],
        //           girls_allowed: false,
        //           created_at: '2020-05-19 10:00:40+04:30',
        //           created_by: null,
        //           verified: false,
        //         },
        //         {
        //           name: 'Bagh Ghadir',
        //           maps_url: 'https://goo.gl/maps/yu1X8cn5KcSuYndv6',
        //           photo: '',
        //           city: 'Esfahan',
        //           region: 'Bagh Ghadir',
        //           cost: '120,000t Entrance Fee',
        //           meta: `WC,
        // Beautiful floor covering,
        // Standard glass backboard rims`,
        //           sport_types: ['basketball'],
        //           girls_allowed: true,
        //           created_at: '2020-05-19 10:00:40+04:30',
        //           created_by: null,
        //           verified: false,
        //         },
      ])
    })
}

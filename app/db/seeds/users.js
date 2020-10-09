exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('users')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        {
          password_hash:
            '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
          gender: 'Male',
          city: 'Esfahan',
          first_name: 'Hossein',
          last_name: 'Heidari',
          photo: '',
          height: 180,
          username: 'hossein',
          bio: `A passionate freestylist.
09366188190 whatsapp me for verification etc.`,
          created_at: '2020-05-19 10:00:40',
          updated_at: null,
          updated_by: null,
          sports: ['basketball'],
          friends: [],
          close_friends: [],
          scopes: [
            'add_events',
            'add_locations',
            'edit_locations',
            'verify_locations',
            'edit_users_scopes',
            'suspend_admins',
            'verify_users',
            'add_comments',
            'delete_comments',
          ],
          verified: true,
        },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Male',
        //   city: 'Esfahan',
        //   first_name: 'Mehran',
        //   last_name: 'Shabani',
        //   photo: '',
        //   height: 189,
        //   username: 'mehran',
        //   bio: 'Grind, strive, achieve.',
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_events', 'add_comments'],
        //   verified: true,
        // },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Female',
        //   city: 'Esfahan',
        //   first_name: 'Parnia',
        //   last_name: 'Esna',
        //   photo: '',
        //   height: 180,
        //   username: 'parnia',
        //   bio: 'Lose yourself to dance.',
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_events', 'add_comments'],
        //   verified: true,
        // },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Female',
        //   city: 'Esfahan',
        //   first_name: 'Masoome',
        //   last_name: 'Ismaili',
        //   photo: '',
        //   height: 180,
        //   username: 'masoome',
        //   bio: 'Three time MVP champion.',
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_locations', 'add_events', 'add_comments'],
        //   verified: true,
        // },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Male',
        //   city: 'Esfahan',
        //   first_name: 'Shahin',
        //   last_name: 'Babaii',
        //   photo: '',
        //   height: 180,
        //   username: 'shahin',
        //   bio: 'Fundamentals it is.',
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_locations', 'add_comments', 'add_events'],
        //   verified: true,
        // },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Male',
        //   city: 'Esfahan',
        //   first_name: 'Arsalan',
        //   last_name: 'Jaberzade',
        //   photo: '',
        //   height: 180,
        //   username: 'arsalan',
        //   bio: "Don' hesitate to score",
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_locations', 'add_events', 'add_comments'],
        //   verified: true,
        // },
        // {
        //   password_hash:
        //     '$2a$10$FeqkWFlhSAWYzihpiG.GL.MOk3p7.zsDLL3L8QgTKb1pH/p.PkkDK',
        //   gender: 'Male',
        //   city: 'Esfahan',
        //   first_name: 'Jafar',
        //   last_name: 'Shaftalian',
        //   photo: '',
        //   height: 180,
        //   username: 'jafar',
        //   bio: 'whass my name',
        //   created_at: '2020-05-19 10:00:40',
        //   updated_at: null,
        //   updated_by: null,
        //   sports: ['basketball'],
        //   friends: [],
        //   close_friends: [],
        //   scopes: ['add_locations', 'add_comments', 'add_events'],
        //   verified: true,
        // },
      ])
    })
}

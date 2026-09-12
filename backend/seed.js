const db = require('./db');

function seed() {
  const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
  if (serviceCount === 0) {
    const insertService = db.prepare(
      'INSERT INTO services (name, duration_minutes, price, active) VALUES (?, ?, ?, 1)'
    );
    insertService.run('Haircut', 30, 25);
    insertService.run('Consultation', 60, 50);
    insertService.run('Massage Therapy', 45, 65);
    console.log('Seeded services');
  }

  const hoursCount = db.prepare('SELECT COUNT(*) AS c FROM working_hours').get().c;
  if (hoursCount === 0) {
    const insertHours = db.prepare(
      'INSERT INTO working_hours (day_of_week, start_time, end_time, is_open) VALUES (?, ?, ?, ?)'
    );
    // 0 = Sunday, 6 = Saturday. Default: every day open 9am-6pm so the demo works immediately.
    for (let day = 0; day <= 6; day++) {
      insertHours.run(day, '09:00', '18:00', 1);
    }
    console.log('Seeded working hours (daily 9am-6pm)');
  }

  const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
  if (settingsCount === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
      'slot_duration_minutes',
      '30'
    );
    console.log('Seeded settings (slot_duration_minutes=30)');
  }
}

seed();

module.exports = seed;

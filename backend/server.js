const express = require('express');
const cors = require('cors');
const db = require('./db');
const seed = require('./seed');
const { getAvailableSlots, getMonthSummary, getSlotDuration } = require('./availability');

seed(); // ensure default data exists on boot

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// -------------------- helpers --------------------
function formatBookingCode(id) {
  return `BK-${String(id).padStart(6, '0')}`;
}

function bookingWithCode(row) {
  if (!row) return row;
  return { ...row, code: formatBookingCode(row.id) };
}

// -------------------- SERVICES --------------------
app.get('/api/services', (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = includeInactive
    ? db.prepare('SELECT * FROM services ORDER BY id').all()
    : db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY id').all();
  res.json(rows);
});

app.post('/api/services', (req, res) => {
  const { name, duration_minutes, price } = req.body;
  if (!name || !duration_minutes || price === undefined) {
    return res.status(400).json({ error: 'name, duration_minutes, price are required' });
  }
  const info = db
    .prepare('INSERT INTO services (name, duration_minutes, price, active) VALUES (?, ?, ?, 1)')
    .run(name, duration_minutes, price);
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  const name = req.body.name ?? existing.name;
  const duration_minutes = req.body.duration_minutes ?? existing.duration_minutes;
  const price = req.body.price ?? existing.price;
  const active = req.body.active ?? existing.active;

  db.prepare('UPDATE services SET name = ?, duration_minutes = ?, price = ?, active = ? WHERE id = ?').run(
    name,
    duration_minutes,
    price,
    active,
    id
  );
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.json(row);
});

app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  // Soft-delete if it has bookings, else hard delete
  const hasBookings = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE service_id = ?').get(id).c;
  if (hasBookings > 0) {
    db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(id);
    return res.json({ ok: true, softDeleted: true });
  }
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  res.json({ ok: true, softDeleted: false });
});

// -------------------- WORKING HOURS --------------------
app.get('/api/working-hours', (req, res) => {
  const rows = db.prepare('SELECT * FROM working_hours ORDER BY day_of_week').all();
  res.json(rows);
});

// Bulk update: expects array of { day_of_week, start_time, end_time, is_open }
app.put('/api/working-hours', (req, res) => {
  const days = req.body;
  if (!Array.isArray(days)) return res.status(400).json({ error: 'Expected an array of day objects' });

  const update = db.prepare(
    'UPDATE working_hours SET start_time = ?, end_time = ?, is_open = ? WHERE day_of_week = ?'
  );
  db.transaction(() => {
    for (const item of days) {
      update.run(item.start_time, item.end_time, item.is_open ? 1 : 0, item.day_of_week);
    }
  });

  const rows = db.prepare('SELECT * FROM working_hours ORDER BY day_of_week').all();
  res.json(rows);
});

// -------------------- SETTINGS --------------------
app.get('/api/settings', (req, res) => {
  res.json({ slot_duration_minutes: getSlotDuration() });
});

app.put('/api/settings', (req, res) => {
  const { slot_duration_minutes } = req.body;
  if (!slot_duration_minutes) return res.status(400).json({ error: 'slot_duration_minutes required' });
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    'slot_duration_minutes',
    String(slot_duration_minutes)
  );
  res.json({ slot_duration_minutes: getSlotDuration() });
});

// -------------------- BLOCKED SLOTS --------------------
app.get('/api/blocked-slots', (req, res) => {
  const rows = db.prepare('SELECT * FROM blocked_slots ORDER BY date, start_time').all();
  res.json(rows);
});

app.post('/api/blocked-slots', (req, res) => {
  const { date, start_time, end_time, reason } = req.body;
  if (!date || !start_time || !end_time) {
    return res.status(400).json({ error: 'date, start_time, end_time are required' });
  }
  const info = db
    .prepare('INSERT INTO blocked_slots (date, start_time, end_time, reason) VALUES (?, ?, ?, ?)')
    .run(date, start_time, end_time, reason || null);
  const row = db.prepare('SELECT * FROM blocked_slots WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.delete('/api/blocked-slots/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM blocked_slots WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM blocked_slots WHERE id = ?').run(id);
  res.json({ ok: true });
});

// -------------------- AVAILABILITY --------------------
app.get('/api/availability', (req, res) => {
  const { date, service_id } = req.query;
  if (!date || !service_id) return res.status(400).json({ error: 'date and service_id are required' });
  const result = getAvailableSlots(date, service_id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result.slots);
});

app.get('/api/availability/summary', (req, res) => {
  const { year, month, service_id } = req.query;
  if (!year || !month || !service_id) {
    return res.status(400).json({ error: 'year, month, service_id are required' });
  }
  const summary = getMonthSummary(parseInt(year, 10), parseInt(month, 10), service_id);
  res.json(summary);
});

// -------------------- BOOKINGS --------------------

// Admin: list bookings (optional filters: date, status)
app.get('/api/bookings', (req, res) => {
  const { date, status, from, to } = req.query;
  let query = `
    SELECT bookings.*, services.name AS service_name, services.duration_minutes, services.price
    FROM bookings
    JOIN services ON services.id = bookings.service_id
    WHERE 1=1
  `;
  const params = [];
  if (date) {
    query += ' AND bookings.date = ?';
    params.push(date);
  }
  if (from) {
    query += ' AND bookings.date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND bookings.date <= ?';
    params.push(to);
  }
  if (status) {
    query += ' AND bookings.status = ?';
    params.push(status);
  }
  query += ' ORDER BY bookings.date DESC, bookings.start_time DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows.map(bookingWithCode));
});

// Public: create a booking (conflict-safe via transaction)
app.post('/api/bookings', (req, res) => {
  const { customer_name, email, phone, service_id, date, start_time } = req.body;
  if (!customer_name || !email || !phone || !service_id || !date || !start_time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(service_id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  try {
    const booking = db.transaction(() => {
      // Re-check availability inside the transaction to prevent race conditions / double booking
      const { slots, error } = getAvailableSlots(date, service_id);
      if (error) throw new Error(error);

      const match = slots.find((s) => s.start_time === start_time);
      if (!match) {
        throw new Error('SLOT_UNAVAILABLE');
      }

      const info = db
        .prepare(
          `INSERT INTO bookings (customer_name, email, phone, service_id, date, start_time, end_time, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
        )
        .run(customer_name, email, phone, service_id, date, match.start_time, match.end_time);

      return db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
    });

    res.status(201).json(bookingWithCode(booking));
  } catch (err) {
    if (err.message === 'SLOT_UNAVAILABLE') {
      return res
        .status(409)
        .json({ error: 'That time slot is no longer available. Please choose another slot.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Admin: update booking status
app.put('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['confirmed', 'cancelled', 'completed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.json(bookingWithCode(row));
});

// Public: look up a booking by ID + email (for self-service view/cancel)
app.post('/api/bookings/lookup', (req, res) => {
  const { booking_id, email } = req.body;
  if (!booking_id || !email) return res.status(400).json({ error: 'booking_id and email are required' });

  // accept either raw numeric id or 'BK-000123' style code
  const numericId = String(booking_id).replace(/\D/g, '');
  const row = db
    .prepare(
      `SELECT bookings.*, services.name AS service_name, services.duration_minutes, services.price
       FROM bookings JOIN services ON services.id = bookings.service_id
       WHERE bookings.id = ? AND lower(bookings.email) = lower(?)`
    )
    .get(numericId, email);

  if (!row) return res.status(404).json({ error: 'No booking found for that ID and email' });
  res.json(bookingWithCode(row));
});

// Public: customer cancels their own booking
app.post('/api/bookings/cancel', (req, res) => {
  const { booking_id, email } = req.body;
  if (!booking_id || !email) return res.status(400).json({ error: 'booking_id and email are required' });

  const numericId = String(booking_id).replace(/\D/g, '');
  const row = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND lower(email) = lower(?)')
    .get(numericId, email);

  if (!row) return res.status(404).json({ error: 'No booking found for that ID and email' });
  if (row.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(row.id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.id);
  res.json(bookingWithCode(updated));
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Booking Scheduler API running on http://localhost:${PORT}`);
});

const db = require('./db');

// Convert 'HH:MM' to minutes since midnight
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getSlotDuration() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('slot_duration_minutes');
  return row ? parseInt(row.value, 10) : 30;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute available start times for a given date + service.
 * Returns array of { start_time, end_time }
 */
function getAvailableSlots(date, serviceId) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) return { error: 'Service not found', slots: [] };

  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  const hours = db.prepare('SELECT * FROM working_hours WHERE day_of_week = ?').get(dayOfWeek);
  if (!hours || !hours.is_open) return { error: null, slots: [] };

  const workStart = toMinutes(hours.start_time);
  const workEnd = toMinutes(hours.end_time);
  const duration = service.duration_minutes;
  const step = getSlotDuration();

  const blocked = db.prepare('SELECT * FROM blocked_slots WHERE date = ?').all(date);
  const bookings = db
    .prepare("SELECT * FROM bookings WHERE date = ? AND status != 'cancelled'")
    .all(date);

  const blockedRanges = blocked.map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);
  const bookedRanges = bookings.map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);

  const slots = [];
  for (let start = workStart; start + duration <= workEnd; start += step) {
    const end = start + duration;
    const hitsBlocked = blockedRanges.some(([bs, be]) => rangesOverlap(start, end, bs, be));
    const hitsBooking = bookedRanges.some(([bs, be]) => rangesOverlap(start, end, bs, be));

    // Don't offer slots in the past for today's date (compared in server-local time)
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const isToday = date === todayLocal;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isPast = isToday && start <= nowMinutes;

    if (!hitsBlocked && !hitsBooking && !isPast) {
      slots.push({ start_time: toHHMM(start), end_time: toHHMM(end) });
    }
  }

  return { error: null, slots };
}

/**
 * For a date range, return a status per date: 'available' | 'full' | 'closed'
 */
function getMonthSummary(year, month, serviceId) {
  // month is 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const hours = db.prepare('SELECT * FROM working_hours WHERE day_of_week = ?').get(dayOfWeek);
    if (!hours || !hours.is_open) {
      result[date] = 'closed';
      continue;
    }
    const { slots } = getAvailableSlots(date, serviceId);
    result[date] = slots.length > 0 ? 'available' : 'full';
  }
  return result;
}

module.exports = { getAvailableSlots, getMonthSummary, toMinutes, toHHMM, rangesOverlap, getSlotDuration };

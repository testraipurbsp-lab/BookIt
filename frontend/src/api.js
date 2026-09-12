/**
 * Supabase-backed data layer. Every exported function here has the
 * exact same name and signature as the old localStorage/axios
 * versions, so no page component needs to change.
 */
import { supabase } from './supabaseClient.js';

function apiError(message) {
  const err = new Error(message);
  err.response = { data: { error: message } };
  return err;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function formatBookingCode(id) {
  return `BK-${String(id).padStart(6, '0')}`;
}
function bookingWithCode(row) {
  if (!row) return row;
  return { ...row, code: formatBookingCode(row.id) };
}
function flattenService(row) {
  const { services: svc, ...rest } = row;
  return {
    ...rest,
    service_name: svc?.name,
    duration_minutes: svc?.duration_minutes,
    price: svc?.price,
  };
}
function pad(n) {
  return String(n).padStart(2, '0');
}

// ================= SERVICES =================
export async function getServices(all = false) {
  let query = supabase.from('services').select('*').order('id');
  if (!all) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw apiError(error.message);
  return data;
}

export async function createService(data) {
  const { data: row, error } = await supabase
    .from('services')
    .insert({
      name: data.name,
      duration_minutes: Number(data.duration_minutes),
      price: Number(data.price),
      active: true,
    })
    .select()
    .single();
  if (error) throw apiError(error.message);
  return row;
}

export async function updateService(id, data) {
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.duration_minutes !== undefined) patch.duration_minutes = Number(data.duration_minutes);
  if (data.price !== undefined) patch.price = Number(data.price);
  if (data.active !== undefined) patch.active = !!data.active;

  const { data: row, error } = await supabase.from('services').update(patch).eq('id', id).select().single();
  if (error) throw apiError(error.message);
  return row;
}

export async function deleteService(id) {
  const { count, error: countErr } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', id);
  if (countErr) throw apiError(countErr.message);

  if (count > 0) {
    const { error } = await supabase.from('services').update({ active: false }).eq('id', id);
    if (error) throw apiError(error.message);
    return { ok: true, softDeleted: true };
  }
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw apiError(error.message);
  return { ok: true, softDeleted: false };
}

// ================= WORKING HOURS =================
export async function getWorkingHours() {
  const { data, error } = await supabase.from('working_hours').select('*').order('day_of_week');
  if (error) throw apiError(error.message);
  return data;
}

export async function updateWorkingHours(days) {
  const rows = days.map((d) => ({
    day_of_week: d.day_of_week,
    start_time: d.start_time,
    end_time: d.end_time,
    is_open: !!d.is_open,
  }));
  const { error } = await supabase.from('working_hours').upsert(rows, { onConflict: 'day_of_week' });
  if (error) throw apiError(error.message);
  return getWorkingHours();
}

// ================= SETTINGS =================
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'slot_duration_minutes')
    .maybeSingle();
  if (error) throw apiError(error.message);
  return { slot_duration_minutes: data ? Number(data.value) : 30 };
}

export async function updateSettings(data) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'slot_duration_minutes', value: String(Number(data.slot_duration_minutes)) }, { onConflict: 'key' });
  if (error) throw apiError(error.message);
  return { slot_duration_minutes: Number(data.slot_duration_minutes) };
}

// ================= BLOCKED SLOTS =================
export async function getBlockedSlots() {
  const { data, error } = await supabase.from('blocked_slots').select('*').order('date').order('start_time');
  if (error) throw apiError(error.message);
  return data;
}

export async function createBlockedSlot(data) {
  if (!data.date || !data.start_time || !data.end_time) {
    throw apiError('date, start_time, end_time are required');
  }
  const { data: row, error } = await supabase
    .from('blocked_slots')
    .insert({ date: data.date, start_time: data.start_time, end_time: data.end_time, reason: data.reason || null })
    .select()
    .single();
  if (error) throw apiError(error.message);
  return row;
}

export async function deleteBlockedSlot(id) {
  const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
  if (error) throw apiError(error.message);
  return { ok: true };
}

// ================= AVAILABILITY =================
async function fetchContext(serviceId, startDate, endDate) {
  const [svcRes, whRes, bsRes, bkRes, setRes] = await Promise.all([
    supabase.from('services').select('*').eq('id', serviceId).eq('active', true).maybeSingle(),
    supabase.from('working_hours').select('*'),
    supabase.from('blocked_slots').select('*').gte('date', startDate).lte('date', endDate),
    supabase.from('bookings').select('*').neq('status', 'cancelled').gte('date', startDate).lte('date', endDate),
    supabase.from('settings').select('value').eq('key', 'slot_duration_minutes').maybeSingle(),
  ]);
  if (svcRes.error) throw apiError(svcRes.error.message);
  if (whRes.error) throw apiError(whRes.error.message);
  if (bsRes.error) throw apiError(bsRes.error.message);
  if (bkRes.error) throw apiError(bkRes.error.message);

  return {
    service: svcRes.data,
    workingHours: whRes.data || [],
    blockedSlots: bsRes.data || [],
    bookings: bkRes.data || [],
    step: setRes.data ? Number(setRes.data.value) : 30,
  };
}

function computeSlotsForDate(date, ctx) {
  const { service, workingHours, blockedSlots, bookings, step } = ctx;
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  const hours = workingHours.find((h) => h.day_of_week === dayOfWeek);
  if (!hours || !hours.is_open) return [];

  const workStart = toMinutes(hours.start_time);
  const workEnd = toMinutes(hours.end_time);
  const duration = service.duration_minutes;

  const blockedRanges = blockedSlots
    .filter((b) => b.date === date)
    .map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);
  const bookedRanges = bookings
    .filter((b) => b.date === date)
    .map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);

  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isToday = date === todayLocal;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = [];
  for (let start = workStart; start + duration <= workEnd; start += step) {
    const end = start + duration;
    const hitsBlocked = blockedRanges.some(([bs, be]) => rangesOverlap(start, end, bs, be));
    const hitsBooking = bookedRanges.some(([bs, be]) => rangesOverlap(start, end, bs, be));
    const isPast = isToday && start <= nowMinutes;
    if (!hitsBlocked && !hitsBooking && !isPast) {
      slots.push({ start_time: toHHMM(start), end_time: toHHMM(end) });
    }
  }
  return slots;
}

export async function getAvailability(date, serviceId) {
  const ctx = await fetchContext(serviceId, date, date);
  if (!ctx.service) throw apiError('Service not found');
  return computeSlotsForDate(date, ctx);
}

export async function getMonthSummary(year, month, serviceId) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad(month)}-01`;
  const endDate = `${year}-${pad(month)}-${pad(daysInMonth)}`;

  const ctx = await fetchContext(serviceId, startDate, endDate);
  if (!ctx.service) throw apiError('Service not found');

  const result = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad(month)}-${pad(d)}`;
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const hours = ctx.workingHours.find((h) => h.day_of_week === dayOfWeek);
    if (!hours || !hours.is_open) {
      result[date] = 'closed';
      continue;
    }
    const slots = computeSlotsForDate(date, ctx);
    result[date] = slots.length > 0 ? 'available' : 'full';
  }
  return result;
}

// ================= BOOKINGS =================
export async function listBookings(params = {}) {
  let query = supabase.from('bookings').select('*, services(name, duration_minutes, price)');
  if (params.date) query = query.eq('date', params.date);
  if (params.from) query = query.gte('date', params.from);
  if (params.to) query = query.lte('date', params.to);
  if (params.status) query = query.eq('status', params.status);
  query = query.order('date', { ascending: false }).order('start_time', { ascending: false });

  const { data, error } = await query;
  if (error) throw apiError(error.message);
  return data.map((row) => bookingWithCode(flattenService(row)));
}

export async function createBooking(data) {
  const { customer_name, email, phone, service_id, date, start_time } = data;
  if (!customer_name || !email || !phone || !service_id || !date || !start_time) {
    throw apiError('All fields are required');
  }

  const { data: result, error } = await supabase.rpc('create_booking_safe', {
    p_customer_name: customer_name,
    p_email: email,
    p_phone: phone,
    p_service_id: Number(service_id),
    p_date: date,
    p_start_time: start_time,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('SLOT_UNAVAILABLE')) {
      throw apiError('That time slot is no longer available. Please choose another slot.');
    }
    if (msg.includes('Service not found')) throw apiError('Service not found');
    throw apiError(msg || 'Failed to create booking');
  }

  const row = Array.isArray(result) ? result[0] : result;
  return bookingWithCode(row);
}

export async function updateBookingStatus(id, status) {
  const valid = ['confirmed', 'cancelled', 'completed'];
  if (!valid.includes(status)) throw apiError('Invalid status');

  const { data, error } = await supabase.from('bookings').update({ status }).eq('id', id).select().single();
  if (error) throw apiError('Booking not found');
  return bookingWithCode(data);
}

export async function lookupBooking(booking_id, email) {
  if (!booking_id || !email) throw apiError('booking_id and email are required');
  const numericId = Number(String(booking_id).replace(/\D/g, ''));

  const { data, error } = await supabase
    .from('bookings')
    .select('*, services(name, duration_minutes, price)')
    .eq('id', numericId)
    .ilike('email', email)
    .maybeSingle();

  if (error || !data) throw apiError('No booking found for that ID and email');
  return bookingWithCode(flattenService(data));
}

export async function cancelBooking(booking_id, email) {
  if (!booking_id || !email) throw apiError('booking_id and email are required');
  const numericId = Number(String(booking_id).replace(/\D/g, ''));

  const { data: existing, error: findErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', numericId)
    .ilike('email', email)
    .maybeSingle();

  if (findErr || !existing) throw apiError('No booking found for that ID and email');
  if (existing.status === 'cancelled') throw apiError('Booking is already cancelled');

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', numericId)
    .select()
    .single();
  if (error) throw apiError(error.message);
  return bookingWithCode(data);
}

export default {};
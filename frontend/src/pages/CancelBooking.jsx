import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { lookupBooking, cancelBooking } from '../api.js';

export default function CancelBooking() {
  const [bookingId, setBookingId] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!bookingId.trim() || !email.trim()) {
      toast.error('Enter your Booking ID and email');
      return;
    }
    setLoading(true);
    setBooking(null);
    try {
      const data = await lookupBooking(bookingId.trim(), email.trim());
      setBooking(data);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Booking not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelling(true);
    try {
      const updated = await cancelBooking(bookingId.trim(), email.trim());
      setBooking(updated);
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full min-w-0">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Manage Your Booking</h1>
      <p className="text-slate-500 mb-6 text-sm">
        Enter your Booking ID (e.g. BK-000001) and the email you booked with.
      </p>

      <form onSubmit={handleLookup} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Booking ID</span>
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="BK-000001"
            className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl hover:bg-brand-600"
        >
          {loading ? 'Looking up…' : 'Find Booking'}
        </button>
      </form>

      {booking && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm mt-6 text-sm space-y-2">
          <Row label="Booking ID" value={booking.code} strong />
          <Row label="Service" value={booking.service_name} />
          <Row label="Date" value={format(new Date(booking.date + 'T00:00:00'), 'EEEE, MMM d, yyyy')} />
          <Row label="Time" value={`${booking.start_time} – ${booking.end_time}`} />
          <Row label="Name" value={booking.customer_name} />
          <Row
            label="Status"
            value={booking.status}
            capitalize
            badgeColor={
              booking.status === 'confirmed'
                ? 'bg-emerald-100 text-emerald-700'
                : booking.status === 'cancelled'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
            }
          />

          {booking.status === 'confirmed' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full mt-4 border border-red-200 text-red-600 font-medium py-2.5 rounded-xl hover:bg-red-50 disabled:opacity-60"
            >
              {cancelling ? 'Cancelling…' : 'Cancel This Booking'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong, capitalize, badgeColor }) {
  return (
    <div className="flex justify-between items-center gap-3 min-w-0">
      <span className="text-slate-500 flex-shrink-0">{label}</span>
      {badgeColor ? (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgeColor}`}>{value}</span>
      ) : (
        <span className={`${strong ? 'font-semibold text-slate-800' : 'text-slate-700'} ${capitalize ? 'capitalize' : ''} text-right break-words min-w-0`}>
          {value}
        </span>
      )}
    </div>
  );
}

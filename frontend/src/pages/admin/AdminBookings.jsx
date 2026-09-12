import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import toast from 'react-hot-toast';
import { listBookings, updateBookingStatus } from '../../api.js';

const STATUS_STYLES = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-200 text-slate-600',
};

export default function AdminBookings() {
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [viewMonth, setViewMonth] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(viewMonth), 'yyyy-MM-dd');
    listBookings({ from, to })
      .then(setBookings)
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [viewMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = bookings;
    if (statusFilter !== 'all') rows = rows.filter((b) => b.status === statusFilter);
    if (selectedDate) rows = rows.filter((b) => b.date === format(selectedDate, 'yyyy-MM-dd'));
    return rows.sort((a, b) => (a.date + a.start_time < b.date + b.start_time ? 1 : -1));
  }, [bookings, statusFilter, selectedDate]);

  const countsByDate = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      map[b.date] = (map[b.date] || 0) + 1;
    }
    return map;
  }, [bookings]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ToggleButton active={view === 'list'} onClick={() => setView('list')}>
            List
          </ToggleButton>
          <ToggleButton active={view === 'calendar'} onClick={() => setView('calendar')}>
            Calendar
          </ToggleButton>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-brand-600 hover:underline"
            >
              Clear date filter ({format(selectedDate, 'MMM d')})
            </button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 max-w-full"
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {view === 'calendar' && (
        <div className="mb-6 max-w-full">
          <AdminMiniCalendar
            viewMonth={viewMonth}
            onMonthChange={setViewMonth}
            countsByDate={countsByDate}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(selectedDate && isSameDay(d, selectedDate) ? null : d)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading bookings…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">No bookings found for this filter.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm max-w-full">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{b.code}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800 whitespace-nowrap">{b.customer_name}</div>
                    <div className="text-xs text-slate-400">{b.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.service_name}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {format(new Date(b.date + 'T00:00:00'), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {b.start_time}–{b.end_time}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      {b.status !== 'confirmed' && (
                        <ActionBtn onClick={() => handleStatusChange(b.id, 'confirmed')}>Confirm</ActionBtn>
                      )}
                      {b.status !== 'completed' && (
                        <ActionBtn onClick={() => handleStatusChange(b.id, 'completed')}>Complete</ActionBtn>
                      )}
                      {b.status !== 'cancelled' && (
                        <ActionBtn danger onClick={() => handleStatusChange(b.id, 'cancelled')}>
                          Cancel
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
        active ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-md border ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AdminMiniCalendar({ viewMonth, onMonthChange, countsByDate, selectedDate, onSelectDate }) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const goPrev = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };
  const goNext = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 max-w-md w-full min-w-0">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-slate-100">
          ‹
        </button>
        <h3 className="font-semibold text-slate-800 text-sm sm:text-base text-center px-2">
          {format(viewMonth, 'MMMM yyyy')}
        </h3>
        <button onClick={goNext} className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-slate-100">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] sm:text-xs font-medium text-slate-400 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, viewMonth);
          const count = countsByDate[key] || 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs sm:text-sm relative min-w-0 ${
                !inMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-50'
              } ${isSelected ? '!bg-brand-500 !text-white font-semibold' : ''}`}
            >
              {format(day, 'd')}
              {count > 0 && inMonth && (
                <span
                  className={`text-[8px] sm:text-[9px] mt-0.5 ${isSelected ? 'text-white' : 'text-brand-600'}`}
                >
                  {count} booked
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

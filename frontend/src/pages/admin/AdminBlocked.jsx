import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getBlockedSlots, createBlockedSlot, deleteBlockedSlot } from '../../api.js';

const emptyForm = { date: '', start_time: '00:00', end_time: '23:59', reason: '', fullDay: true };

export default function AdminBlocked() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getBlockedSlots()
      .then(setItems)
      .catch(() => toast.error('Failed to load blocked dates'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      toast.error('Please choose a date');
      return;
    }
    setSaving(true);
    try {
      await createBlockedSlot({
        date: form.date,
        start_time: form.fullDay ? '00:00' : form.start_time,
        end_time: form.fullDay ? '23:59' : form.end_time,
        reason: form.reason.trim() || null,
      });
      toast.success('Block added');
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add block');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this block?')) return;
    try {
      await deleteBlockedSlot(id);
      toast.success('Block removed');
      load();
    } catch {
      toast.error('Failed to remove block');
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm">No blocked dates or times yet.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-slate-800">
                      {format(new Date(b.date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.start_time === '00:00' && b.end_time === '23:59'
                        ? 'Full day'
                        : `${b.start_time} – ${b.end_time}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.reason || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-20">
          <h3 className="font-semibold text-slate-800 mb-4">Block a Date / Time</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.fullDay}
                onChange={(e) => setForm({ ...form, fullDay: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Block the entire day</span>
            </label>

            {!form.fullDay && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                />
                <span className="text-slate-400 text-sm">to</span>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                />
              </div>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Reason (optional)</span>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Public holiday"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl hover:bg-brand-600"
            >
              {saving ? 'Saving…' : 'Add Block'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

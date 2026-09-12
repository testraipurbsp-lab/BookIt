import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getWorkingHours, updateWorkingHours, getSettings, updateSettings } from '../../api.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminHours() {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);

  useEffect(() => {
    Promise.all([getWorkingHours(), getSettings()])
      .then(([h, s]) => {
        setHours(h.sort((a, b) => a.day_of_week - b.day_of_week));
        setSlotDuration(s.slot_duration_minutes);
      })
      .catch(() => toast.error('Failed to load working hours'))
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (day_of_week, patch) => {
    setHours((prev) => prev.map((h) => (h.day_of_week === day_of_week ? { ...h, ...patch } : h)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWorkingHours(hours);
      await updateSettings({ slot_duration_minutes: Number(slotDuration) });
      toast.success('Working hours saved');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500 text-sm">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-800 mb-1">Slot Duration</h3>
        <p className="text-sm text-slate-500 mb-3">
          How often new booking slots start (e.g. every 30 minutes).
        </p>
        <select
          value={slotDuration}
          onChange={(e) => setSlotDuration(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Working Hours</h3>
        <div className="space-y-3">
          {hours.map((h) => (
            <div key={h.day_of_week} className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 w-32 shrink-0">
                <input
                  type="checkbox"
                  checked={!!h.is_open}
                  onChange={(e) => updateDay(h.day_of_week, { is_open: e.target.checked ? 1 : 0 })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">{DAY_NAMES[h.day_of_week]}</span>
              </label>

              {h.is_open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={h.start_time}
                    onChange={(e) => updateDay(h.day_of_week, { start_time: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-slate-400 text-sm">to</span>
                  <input
                    type="time"
                    value={h.end_time}
                    onChange={(e) => updateDay(h.day_of_week, { end_time: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-slate-400">Closed</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-brand-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-brand-600"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

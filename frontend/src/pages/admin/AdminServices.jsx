import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getServices, createService, updateService, deleteService } from '../../api.js';

const emptyForm = { name: '', duration_minutes: 30, price: 0 };

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getServices(true)
      .then(setServices)
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: s.price });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.duration_minutes || form.price === '') {
      toast.error('Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateService(editingId, {
          name: form.name.trim(),
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
        });
        toast.success('Service updated');
      } else {
        await createService({
          name: form.name.trim(),
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
        });
        toast.success('Service added');
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await deleteService(id);
      toast.success('Service removed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete service');
    }
  };

  const handleToggleActive = async (s) => {
    try {
      await updateService(s.id, { active: s.active ? 0 : 1 });
      load();
    } catch {
      toast.error('Failed to update service');
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading services…</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.duration_minutes} min</td>
                    <td className="px-4 py-3 text-slate-600">${Number(s.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No services yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-20">
          <h3 className="font-semibold text-slate-800 mb-4">{editingId ? 'Edit Service' : 'Add Service'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="e.g. Haircut"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Duration (minutes)</span>
              <input
                type="number"
                min="5"
                step="5"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Price ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </label>

            <div className="flex gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-500 disabled:opacity-60 text-white font-medium py-2 rounded-xl hover:bg-brand-600"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

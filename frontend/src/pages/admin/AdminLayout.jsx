import { NavLink, Outlet } from 'react-router-dom';

const tabClass = ({ isActive }) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
    isActive
      ? 'bg-white text-slate-900 shadow-soft'
      : 'text-slate-500 hover:text-slate-800'
  }`;

export default function AdminLayout() {
  return (
    <div>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1">
          Admin
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 mt-3 tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Manage services, hours, blocked times, and bookings.</p>
      </div>

      <div className="inline-flex flex-wrap gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
        <NavLink to="/admin/bookings" className={tabClass}>
          Bookings
        </NavLink>
        <NavLink to="/admin/services" className={tabClass}>
          Services
        </NavLink>
        <NavLink to="/admin/hours" className={tabClass}>
          Working Hours
        </NavLink>
        <NavLink to="/admin/blocked" className={tabClass}>
          Blocked Dates
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
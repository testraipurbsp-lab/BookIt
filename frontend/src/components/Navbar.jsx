import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
    isActive
      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Navbar() {
  return (
    <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 min-h-16 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-soft flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
              <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 3V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8" cy="13.5" r="1.15" fill="currentColor" />
              <circle cx="12" cy="13.5" r="1.15" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display font-bold text-lg text-slate-800 tracking-tight">BookIt</span>
        </NavLink>

        <nav className="flex items-center gap-1 max-w-full overflow-x-auto">
          <NavLink to="/" end className={linkClass}>
            Book Appointment
          </NavLink>
          <NavLink to="/cancel" className={linkClass}>
            Manage Booking
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

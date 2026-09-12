import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import CustomerBooking from './pages/CustomerBooking.jsx';
import CancelBooking from './pages/CancelBooking.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminBookings from './pages/admin/AdminBookings.jsx';
import AdminServices from './pages/admin/AdminServices.jsx';
import AdminHours from './pages/admin/AdminHours.jsx';
import AdminBlocked from './pages/admin/AdminBlocked.jsx';

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-brand-300/40 blur-3xl animate-blob" />
      <div className="absolute top-10 right-[-100px] h-[380px] w-[380px] rounded-full bg-accent-300/35 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-160px] left-1/3 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl animate-blob animation-delay-4000" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 md:py-14 relative z-10">
        <Routes>
          <Route path="/" element={<CustomerBooking />} />
          <Route path="/cancel" element={<CancelBooking />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="bookings" replace />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="hours" element={<AdminHours />} />
            <Route path="blocked" element={<AdminBlocked />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-slate-400 py-6 relative z-10">
        BookIt Appointment Scheduler — demo app
      </footer>
    </div>
  );
}
import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  getServices,
  getMonthSummary,
  getAvailability,
  createBooking,
} from '../api.js';
import MonthCalendar from '../components/MonthCalendar.jsx';

const STEPS = [
  { label: 'Service', icon: IconCalendar },
  { label: 'Date & Time', icon: IconClock },
  { label: 'Your Details', icon: IconUser },
  { label: 'Confirmation', icon: IconCheck },
];

const AVATAR_STYLES = [
  'bg-brand-50 text-brand-600',
  'bg-accent-50 text-accent-600',
  'bg-amber-50 text-amber-600',
];

const FEATURES = [
  {
    icon: IconSparkle,
    title: 'Instant confirmation',
    desc: "Get your booking ID the moment you reserve a slot — no waiting, no phone calls.",
  },
  {
    icon: IconShield,
    title: 'Conflict-free scheduling',
    desc: 'Every slot is re-checked the instant you book, so two people can never grab the same time.',
  },
  {
    icon: IconRefresh,
    title: 'Manage anytime',
    desc: 'Look up or cancel your appointment later using just your booking ID and email.',
  },
];

export default function CustomerBooking() {
  const [step, setStep] = useState(0);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  const [viewMonth, setViewMonth] = useState(new Date());
  const [dayStatus, setDayStatus] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [form, setForm] = useState({ customer_name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load services
  useEffect(() => {
    setServicesLoading(true);
    getServices()
      .then((data) => setServices(data))
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setServicesLoading(false));
  }, []);

  // Load month summary whenever service or viewed month changes
  const loadSummary = useCallback(() => {
    if (!selectedService) return;
    setSummaryLoading(true);
    getMonthSummary(viewMonth.getFullYear(), viewMonth.getMonth() + 1, selectedService.id)
      .then((data) => setDayStatus(data))
      .catch(() => toast.error('Failed to load calendar availability'))
      .finally(() => setSummaryLoading(false));
  }, [selectedService, viewMonth]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handlePickService = (service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setStep(1);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    getAvailability(dateStr, selectedService.id)
      .then((data) => setSlots(data))
      .catch(() => toast.error('Failed to load time slots'))
      .finally(() => setSlotsLoading(false));
  };

  const handleContinueToDetails = () => {
    if (!selectedSlot) {
      toast.error('Please choose a time slot');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        customer_name: form.customer_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        service_id: selectedService.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
      });
      setConfirmedBooking(booking);
      setStep(3);
      toast.success('Booking confirmed!');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not create booking. Please try another slot.';
      toast.error(msg);
      // Refresh slots in case of conflict
      if (selectedDate) handleSelectDate(selectedDate);
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setStep(0);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setForm({ customer_name: '', email: '', phone: '' });
    setConfirmedBooking(null);
  };

  return (
    <div>
      {step === 0 ? (
        <HeroSection />
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Book your <span className="text-gradient-brand">appointment</span>
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">Pick a service, choose a time, and you're all set.</p>
        </div>
      )}

      <Stepper step={step} />

      <div key={step} className="animate-fade-up">
        {step === 0 && (
          <>
            <ServiceStep services={services} loading={servicesLoading} onPick={handlePickService} />
            <FeatureStrip />
          </>
        )}

        {step === 1 && selectedService && (
          <DateTimeStep
            service={selectedService}
            viewMonth={viewMonth}
            onMonthChange={setViewMonth}
            dayStatus={dayStatus}
            summaryLoading={summaryLoading}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            slots={slots}
            slotsLoading={slotsLoading}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onBack={() => setStep(0)}
            onContinue={handleContinueToDetails}
          />
        )}

        {step === 2 && (
          <DetailsStep
            form={form}
            setForm={setForm}
            service={selectedService}
            date={selectedDate}
            slot={selectedSlot}
            submitting={submitting}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
          />
        )}

        {step === 3 && confirmedBooking && (
          <ConfirmationStep booking={confirmedBooking} service={selectedService} onStartOver={startOver} />
        )}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1">
          <IconSparkle className="h-3.5 w-3.5" />
          Instant confirmation · no account needed
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-slate-900 mt-4 tracking-tight leading-[1.1]">
          Book your <span className="text-gradient-brand">appointment</span> in seconds
        </h1>
        <p className="text-slate-500 mt-3 text-base max-w-md">
          Pick a service, choose a time that works for you, and get instant confirmation — no calls, no waiting on a reply.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
          <IconClock className="h-3.5 w-3.5" />
          <span>Most appointments available 9 AM – 6 PM</span>
        </div>
      </div>

      <div className="relative hidden lg:block animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="absolute -inset-6 bg-gradient-to-br from-brand-200/50 to-accent-200/50 rounded-[2.5rem] blur-3xl" />
        <div className="relative bg-white rounded-3xl shadow-lift border border-slate-200/70 p-6 rotate-2 hover:rotate-0 transition-transform duration-500 max-w-sm ml-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-semibold text-slate-800 text-sm">Today's Schedule</span>
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white">
              <IconClock className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-2.5">
            <ScheduleRow time="9:30" service="Haircut" status="Confirmed" style="bg-emerald-50 text-emerald-600" />
            <ScheduleRow time="11:00" service="Consultation" status="Confirmed" style="bg-emerald-50 text-emerald-600" />
            <ScheduleRow time="2:00" service="Massage Therapy" status="Open" style="bg-slate-100 text-slate-500" />
          </div>
        </div>
        <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-lift border border-slate-200/70 px-4 py-3 flex items-center gap-2.5 animate-float">
          <span className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <IconCheck className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-xs font-semibold text-slate-700">Booking confirmed</span>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ time, service, status, style }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-slate-500 w-10">{time}</span>
        <span className="text-sm text-slate-700 font-medium">{service}</span>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style}`}>{status}</span>
    </div>
  );
}

function FeatureStrip() {
  return (
    <div className="mt-16 pt-10 border-t border-slate-200/70 grid sm:grid-cols-3 gap-6">
      {FEATURES.map(({ icon: Icon, title, desc }, i) => (
        <div
          key={title}
          className="animate-fade-up"
          style={{ animationDelay: `${i * 90 + 120}ms` }}
        >
          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200/70 shadow-soft flex items-center justify-center text-brand-600">
            <Icon className="h-5 w-5" />
          </div>
          <h4 className="font-display font-semibold text-slate-800 mt-3 text-sm">{title}</h4>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? 'bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft'
                    : current
                    ? 'bg-white text-brand-600 border-2 border-brand-500 shadow-glow'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <IconCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-sm hidden sm:inline font-medium ${
                  current ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-3 rounded-full ${done ? 'bg-gradient-to-r from-brand-500 to-accent-500' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ServiceStep({ services, loading, onPick }) {
  if (loading) return <p className="text-slate-500">Loading services…</p>;
  if (services.length === 0) return <p className="text-slate-500">No services available right now.</p>;

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {services.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onPick(s)}
          style={{ animationDelay: `${i * 70}ms` }}
          className="animate-fade-up group relative text-left bg-white border border-slate-200/70 rounded-2xl p-5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-200 transition-all duration-200 overflow-hidden"
        >
          <span className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center font-display font-semibold text-sm ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}
          >
            {s.name.charAt(0).toUpperCase()}
          </div>

          <h3 className="font-display font-semibold text-slate-800 mt-3.5">{s.name}</h3>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <IconClock className="h-3.5 w-3.5" />
            {s.duration_minutes} min
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-brand-700 font-display font-semibold text-lg">${Number(s.price).toFixed(2)}</p>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Select <IconChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function DateTimeStep({
  service,
  viewMonth,
  onMonthChange,
  dayStatus,
  summaryLoading,
  selectedDate,
  onSelectDate,
  slots,
  slotsLoading,
  selectedSlot,
  onSelectSlot,
  onBack,
  onContinue,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 bg-brand-50/60 border border-brand-100 rounded-xl px-4 py-2.5">
        <p className="text-sm text-slate-600">
          Booking <span className="font-semibold text-slate-800">{service.name}</span>{' '}
          <span className="text-slate-400">· {service.duration_minutes} min</span>
        </p>
        <button onClick={onBack} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
          Change service
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <MonthCalendar
          viewMonth={viewMonth}
          onMonthChange={onMonthChange}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          dayStatus={dayStatus}
          loading={summaryLoading}
        />

        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/70 p-5">
          <h3 className="font-display font-semibold text-slate-800 mb-3">
            {selectedDate ? `Available times — ${format(selectedDate, 'EEEE, MMM d')}` : 'Select a date'}
          </h3>

          {!selectedDate && (
            <p className="text-sm text-slate-400">Choose a date on the calendar to see open times.</p>
          )}

          {selectedDate && slotsLoading && <p className="text-sm text-slate-400">Loading time slots…</p>}

          {selectedDate && !slotsLoading && slots.length === 0 && (
            <p className="text-sm text-slate-400">No available slots on this date. Please pick another day.</p>
          )}

          {selectedDate && !slotsLoading && slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.start_time === slot.start_time;
                return (
                  <button
                    key={slot.start_time}
                    onClick={() => onSelectSlot(slot)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-500 to-accent-500 border-transparent text-white shadow-soft scale-105'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                  >
                    {slot.start_time}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={onContinue}
            disabled={!selectedSlot}
            className={`mt-6 w-full font-semibold py-2.5 rounded-xl transition-all ${
              selectedSlot
                ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-soft hover:opacity-90'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsStep({ form, setForm, service, date, slot, submitting, onBack, onSubmit }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/70 p-6">
        <h3 className="font-display font-semibold text-slate-800 mb-1">Confirm your details</h3>
        <p className="text-sm text-slate-500 mb-5">
          {service.name} • {format(date, 'EEE, MMM d')} at {slot.start_time}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Full name"
            value={form.customer_name}
            onChange={(v) => setForm({ ...form, customer_name: v })}
            placeholder="Jane Doe"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="jane@example.com"
          />
          <Field
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="(555) 123-4567"
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-brand-500 to-accent-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl shadow-soft hover:opacity-90 transition-opacity"
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
    </label>
  );
}

function ConfirmationStep({ booking, service, onStartOver }) {
  return (
    <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-soft border border-slate-200/70 p-8">
      <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-accent-500 text-white flex items-center justify-center shadow-lift">
        <IconCheck className="h-7 w-7" />
      </div>
      <h3 className="font-display font-bold text-xl text-slate-800 mt-4">Booking Confirmed!</h3>
      <p className="text-slate-500 text-sm mt-1">A confirmation has been recorded for you.</p>

      <div className="flex justify-center mt-5">
        <span className="font-display font-semibold tracking-wide text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-4 py-1.5 text-sm">
          {booking.code}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mt-5 text-left text-sm space-y-2">
        <Row label="Service" value={service.name} />
        <Row label="Date" value={format(new Date(booking.date + 'T00:00:00'), 'EEEE, MMM d, yyyy')} />
        <Row label="Time" value={`${booking.start_time} – ${booking.end_time}`} />
        <Row label="Name" value={booking.customer_name} />
        <Row label="Status" value={booking.status} capitalize />
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Keep your Booking ID and email — you'll need them to cancel or look up this appointment.
      </p>

      <button
        onClick={onStartOver}
        className="mt-6 w-full bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold py-2.5 rounded-xl shadow-soft hover:opacity-90 transition-opacity"
      >
        Book Another Appointment
      </button>
    </div>
  );
}

function Row({ label, value, capitalize }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-700 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}

/* ---------- inline icons (no extra dependency) ---------- */

function IconCalendar({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 3V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8V12L14.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 13l4.5 4.5L19 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkle({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3l1.8 4.9L18.7 9.7 13.8 11.5 12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5l7 2.5v5.2c0 4.4-2.9 7.9-7 9.3-4.1-1.4-7-4.9-7-9.3V6l7-2.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRefresh({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4.5 12a7.5 7.5 0 0112.6-5.5M19.5 12a7.5 7.5 0 01-12.6 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M17 4.5v3h-3M7 19.5v-3h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
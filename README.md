# BookIt — Booking / Appointment Scheduler

A full-stack appointment booking system:

- **Frontend:** React + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express
- **Database:** SQLite (file-based, zero setup — `better-sqlite3`)

Includes a public booking flow for customers and an admin dashboard for managing
services, working hours, blocked dates, and bookings. Ships pre-seeded with 3
sample services and default 9am–6pm daily working hours so it works immediately.

---

## 1. Project structure

```
booking-scheduler/
├── backend/
│   ├── server.js          # Express app + all API routes
│   ├── db.js               # SQLite connection + schema
│   ├── availability.js     # Slot-generation / conflict logic
│   ├── seed.js              # Seeds default services, hours, settings
│   ├── package.json
│   └── database.sqlite     # created automatically on first run
└── frontend/
    ├── src/
    │   ├── pages/            # CustomerBooking, CancelBooking, admin/*
    │   ├── components/       # Navbar, MonthCalendar
    │   ├── api.js             # Axios client for the backend API
    │   ├── App.jsx, main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js         # proxies /api → http://localhost:4000
    ├── tailwind.config.js
    └── package.json
```

## 2. Requirements

- Node.js 18+ and npm

## 3. Setup & run

Open **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend (API on port 4000)

```bash
cd backend
npm install
node server.js
```

On first run this automatically creates `database.sqlite` and seeds it with:
- 3 services: **Haircut** (30 min, $25), **Consultation** (60 min, $50), **Massage Therapy** (45 min, $65)
- Working hours: every day, 9:00 AM – 6:00 PM
- Slot duration: 30 minutes

You should see:
```
Booking Scheduler API running on http://localhost:4000
```

### Terminal 2 — Frontend (Vite dev server on port 5173)

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser. API calls from the frontend
are proxied to `http://localhost:4000` automatically (see `vite.config.js`), so
no extra configuration is needed.

> To use a different backend port, set `PORT` when starting the backend
> (`PORT=5000 node server.js`) and update the proxy target in `frontend/vite.config.js`.

## 4. Using the app

### Customer booking flow — `http://localhost:5173/`
1. Pick a service.
2. Pick a date on the calendar (fully booked/closed days are greyed out and disabled).
3. Pick an open time slot (pill buttons — greyed out slots are unavailable).
4. Enter your name, email, and phone.
5. Get a confirmation screen with your **Booking ID** (e.g. `BK-000001`).

### Manage / cancel a booking — `http://localhost:5173/cancel`
Enter your Booking ID + the email you booked with to look up and cancel your
appointment.

### Admin dashboard — `http://localhost:5173/admin`
No login is required for this demo (see "Notes" below for production advice).
- **Bookings** — list and calendar views; filter by date/status; mark bookings
  as confirmed / completed / cancelled.
- **Services** — add, edit, activate/deactivate, or delete services.
- **Working Hours** — set open/closed + start/end time per day of week, and the
  global slot duration (15/30/60 min).
- **Blocked Dates** — block a full day or a specific time range (holidays,
  breaks, etc.), with an optional reason.

## 5. How booking conflicts are prevented

Available slots are computed server-side (`backend/availability.js`) by:
1. Taking the working hours for that date's weekday.
2. Generating candidate start times stepped by the slot duration.
3. Removing any candidate slot that overlaps an existing **blocked slot** or an
   existing **non-cancelled booking** for that date.
4. Removing any candidate slot that has already passed today.

When a customer submits a booking, the server **re-validates availability
inside a database transaction** right before inserting the row (`POST
/api/bookings` in `server.js`). If two people try to book the same slot at
nearly the same time, the second request will find the slot no longer in the
available list and receives a `409 Conflict` with a clear error message — no
double-booking is possible.

## 6. API overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/services` | List active services (`?all=1` for all) |
| POST | `/api/services` | Create a service |
| PUT | `/api/services/:id` | Update a service |
| DELETE | `/api/services/:id` | Delete (or soft-delete if it has bookings) |
| GET | `/api/working-hours` | Get working hours for all 7 days |
| PUT | `/api/working-hours` | Bulk update working hours |
| GET | `/api/settings` | Get global settings (slot duration) |
| PUT | `/api/settings` | Update global settings |
| GET | `/api/blocked-slots` | List blocked dates/times |
| POST | `/api/blocked-slots` | Add a block |
| DELETE | `/api/blocked-slots/:id` | Remove a block |
| GET | `/api/availability?date=&service_id=` | Available time slots for a date |
| GET | `/api/availability/summary?year=&month=&service_id=` | Per-day status for a month (`available`/`full`/`closed`) |
| GET | `/api/bookings` | List bookings (filters: `date`, `from`, `to`, `status`) |
| POST | `/api/bookings` | Create a booking (conflict-checked) |
| PUT | `/api/bookings/:id/status` | Update booking status |
| POST | `/api/bookings/lookup` | Look up a booking by ID + email |
| POST | `/api/bookings/cancel` | Cancel a booking by ID + email |

## 7. Notes & possible extensions

- **Admin auth:** This demo leaves `/admin` open for simplicity. For production,
  add authentication (e.g. a login screen + JWT/session middleware guarding all
  `/api` write routes used by the admin pages).
- **Email confirmations:** Not wired up in this build. The cleanest free option
  is [EmailJS](https://www.emailjs.com/) — call `emailjs.send(...)` from
  `handleSubmit` in `CustomerBooking.jsx` right after `createBooking()` succeeds,
  using the returned booking's details as template variables.
- **Timezones:** All times are treated as the business's local time (no timezone
  conversion). For multi-timezone use, store times in UTC and convert client-side.
- **Resetting demo data:** Stop the backend, delete `backend/database.sqlite`
  (and the `-shm`/`-wal` files if present), then restart `node server.js` to
  reseed from scratch.

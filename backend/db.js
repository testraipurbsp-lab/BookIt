const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS working_hours (
  day_of_week INTEGER PRIMARY KEY, -- 0=Sunday .. 6=Saturday
  start_time TEXT NOT NULL,        -- 'HH:MM' 24hr
  end_time TEXT NOT NULL,          -- 'HH:MM' 24hr
  is_open INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- 'YYYY-MM-DD'
  start_time TEXT NOT NULL,        -- 'HH:MM'
  end_time TEXT NOT NULL,          -- 'HH:MM'
  reason TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  date TEXT NOT NULL,              -- 'YYYY-MM-DD'
  start_time TEXT NOT NULL,        -- 'HH:MM'
  end_time TEXT NOT NULL,          -- 'HH:MM'
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled | completed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

/**
 * Simple transaction helper (node:sqlite's DatabaseSync has no built-in
 * .transaction() like better-sqlite3, so we wrap BEGIN/COMMIT/ROLLBACK).
 */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
module.exports.transaction = transaction;

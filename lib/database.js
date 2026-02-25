/**
 * SmartAC SQLite Database Module
 * Usage tracking, runtime sessions, savings calculation, device & settings storage.
 * Uses better-sqlite3 for synchronous, fast SQLite operations.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'smartac.db');

let db;

// ── Efficiency factor by temperature (inverter AC) ──
// Lower temp = compressor works harder = more power
const EFFICIENCY_FACTORS = {
  16: 1.0, 17: 0.95, 18: 1.0, 19: 0.90,
  20: 0.85, 21: 0.78, 22: 0.72, 23: 0.65,
  24: 0.60, 25: 0.55, 26: 0.50, 27: 0.45,
  28: 0.42, 29: 0.40, 30: 0.38,
};

function getEfficiencyFactor(temp) {
  if (!temp) return 0.6; // default balanced
  const t = Math.round(Math.min(30, Math.max(16, temp)));
  return EFFICIENCY_FACTORS[t] || 0.6;
}

/**
 * Initialize database — create tables if they don't exist.
 */
function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runtime_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      started_at DATETIME NOT NULL DEFAULT (datetime('now')),
      ended_at DATETIME,
      avg_temp REAL,
      mode TEXT,
      wattage INTEGER,
      kwh_used REAL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      name TEXT,
      brand TEXT,
      model TEXT,
      wattage INTEGER DEFAULT 1500,
      room TEXT,
      connection_type TEXT DEFAULT 'cloud',
      ip TEXT,
      port INTEGER,
      custom_presets TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_usage_device_time ON usage_events(device_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_device_time ON runtime_sessions(device_id, started_at);

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🏠',
      device_ids TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      name TEXT NOT NULL,
      time TEXT NOT NULL,
      days TEXT DEFAULT '[]',
      action TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_type TEXT DEFAULT 'Bearer',
      expires_at DATETIME NOT NULL,
      scope TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Migration: add ip/port columns to devices table (safe to run multiple times)
  try { db.exec('ALTER TABLE devices ADD COLUMN ip TEXT'); } catch (_) { /* already exists */ }
  try { db.exec('ALTER TABLE devices ADD COLUMN port INTEGER'); } catch (_) { /* already exists */ }

  // Insert default settings if not exist
  const defaults = {
    electricity_rate: JSON.stringify({ amount: 8, currency: 'INR', symbol: '₹' }),
    temperature_unit: JSON.stringify('C'),
    baseline_hours: JSON.stringify(8),
    baseline_temp: JSON.stringify(18),
    co2_per_kwh: JSON.stringify(0.82),
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  console.log('✓ SQLite database initialized at', DB_PATH);
  return db;
}

// ──────────────────────────────────────
//  USAGE EVENTS
// ──────────────────────────────────────

function logEvent(deviceId, eventType, details = {}) {
  const stmt = db.prepare(
    'INSERT INTO usage_events (device_id, event_type, details) VALUES (?, ?, ?)'
  );
  return stmt.run(deviceId, eventType, JSON.stringify(details));
}

function getEvents(deviceId, limit = 50) {
  return db.prepare(
    'SELECT * FROM usage_events WHERE device_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(deviceId, limit).map(row => ({
    ...row,
    details: JSON.parse(row.details || '{}'),
  }));
}

// ──────────────────────────────────────
//  RUNTIME SESSIONS
// ──────────────────────────────────────

function startSession(deviceId, wattage, temp, mode) {
  // Close any open session first
  endSession(deviceId);

  const stmt = db.prepare(
    'INSERT INTO runtime_sessions (device_id, avg_temp, mode, wattage) VALUES (?, ?, ?, ?)'
  );
  return stmt.run(deviceId, temp || 24, mode || 'cool', wattage || 1500);
}

function endSession(deviceId) {
  const openSession = db.prepare(
    'SELECT * FROM runtime_sessions WHERE device_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1'
  ).get(deviceId);

  if (!openSession) return null;

  // Calculate kWh used
  const startTime = new Date(openSession.started_at + 'Z').getTime();
  const endTime = Date.now();
  const hoursRun = (endTime - startTime) / (1000 * 60 * 60);
  const effFactor = getEfficiencyFactor(openSession.avg_temp);
  const kwhUsed = (openSession.wattage / 1000) * effFactor * hoursRun;

  db.prepare(
    "UPDATE runtime_sessions SET ended_at = datetime('now'), kwh_used = ? WHERE id = ?"
  ).run(Math.round(kwhUsed * 1000) / 1000, openSession.id);

  return { ...openSession, ended_at: new Date().toISOString(), kwh_used: kwhUsed, hoursRun };
}

// ──────────────────────────────────────
//  USAGE STATS
// ──────────────────────────────────────

function getUsageStats(deviceId, period = 'month') {
  const since = getStartDate(period);

  const sessions = db.prepare(
    'SELECT * FROM runtime_sessions WHERE device_id = ? AND started_at >= ? ORDER BY started_at DESC'
  ).all(deviceId, since);

  const events = db.prepare(
    'SELECT event_type, COUNT(*) as count FROM usage_events WHERE device_id = ? AND created_at >= ? GROUP BY event_type'
  ).all(deviceId, since);

  let totalHours = 0;
  let totalKwh = 0;
  let tempSum = 0;
  let tempCount = 0;
  const modeUsage = {};

  for (const s of sessions) {
    const startTime = new Date(s.started_at + (s.started_at.endsWith('Z') ? '' : 'Z')).getTime();
    const endTime = s.ended_at
      ? new Date(s.ended_at + (s.ended_at.endsWith('Z') ? '' : 'Z')).getTime()
      : Date.now();
    const hours = (endTime - startTime) / (1000 * 60 * 60);

    totalHours += hours;
    totalKwh += s.kwh_used || 0;

    if (s.avg_temp) {
      tempSum += s.avg_temp;
      tempCount++;
    }

    if (s.mode) {
      modeUsage[s.mode] = (modeUsage[s.mode] || 0) + 1;
    }
  }

  const mostUsedMode = Object.entries(modeUsage).sort((a, b) => b[1] - a[1])[0];

  return {
    period,
    since,
    totalSessions: sessions.length,
    totalHoursOn: Math.round(totalHours * 10) / 10,
    totalKwh: Math.round(totalKwh * 10) / 10,
    avgTemp: tempCount > 0 ? Math.round(tempSum / tempCount * 10) / 10 : null,
    mostUsedMode: mostUsedMode ? mostUsedMode[0] : null,
    eventBreakdown: events,
  };
}

// ──────────────────────────────────────
//  SAVINGS CALCULATION
// ──────────────────────────────────────

function getSavings(deviceId, period = 'month') {
  const settings = getSettings();
  const rate = JSON.parse(settings.electricity_rate || '{"amount":8,"currency":"INR","symbol":"₹"}');
  const baselineHours = JSON.parse(settings.baseline_hours || '8');
  const baselineTemp = JSON.parse(settings.baseline_temp || '18');
  const co2Factor = JSON.parse(settings.co2_per_kwh || '0.82');

  // Get device wattage
  const device = getDevice(deviceId);
  const wattage = device?.wattage || 1500;

  // Calculate days in period
  const daysMap = { day: 1, week: 7, month: 30, year: 365 };
  const days = daysMap[period] || 30;

  // Baseline: worst-case scenario (running at baselineTemp for baselineHours/day)
  const baselineEfficiency = getEfficiencyFactor(baselineTemp);
  const baselineKwh = (wattage / 1000) * baselineEfficiency * baselineHours * days;
  const baselineCost = baselineKwh * rate.amount;

  // Actual: from tracked sessions
  const stats = getUsageStats(deviceId, period);
  const actualKwh = stats.totalKwh;
  const actualCost = actualKwh * rate.amount;

  // Savings
  const savedKwh = Math.max(0, baselineKwh - actualKwh);
  const savedCost = savedKwh * rate.amount;
  const savedCo2 = savedKwh * co2Factor;
  const percentage = baselineKwh > 0 ? Math.round((savedKwh / baselineKwh) * 1000) / 10 : 0;

  return {
    period,
    baseline: {
      hours: baselineHours * days,
      temp: baselineTemp,
      kwhTotal: Math.round(baselineKwh * 10) / 10,
      cost: Math.round(baselineCost * 10) / 10,
    },
    actual: {
      hours: stats.totalHoursOn,
      avgTemp: stats.avgTemp,
      kwhTotal: Math.round(actualKwh * 10) / 10,
      cost: Math.round(actualCost * 10) / 10,
    },
    saved: {
      kwh: Math.round(savedKwh * 10) / 10,
      cost: Math.round(savedCost * 10) / 10,
      co2: Math.round(savedCo2 * 100) / 100,
      percentage,
    },
    currency: {
      code: rate.currency,
      symbol: rate.symbol,
      rate: rate.amount,
    },
  };
}

// ──────────────────────────────────────
//  SETTINGS
// ──────────────────────────────────────

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) {
    obj[r.key] = r.value;
  }
  return obj;
}

function updateSettings(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    key,
    typeof value === 'string' ? value : JSON.stringify(value)
  );
}

// ──────────────────────────────────────
//  DEVICES
// ──────────────────────────────────────

function saveDevice(device) {
  db.prepare(`
    INSERT OR REPLACE INTO devices (device_id, name, brand, model, wattage, room, connection_type, ip, port, custom_presets)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    device.device_id || device.deviceId,
    device.name || null,
    device.brand || null,
    device.model || null,
    device.wattage || 1500,
    device.room || null,
    device.connection_type || device.connectionType || 'cloud',
    device.ip || null,
    device.port || null,
    JSON.stringify(device.custom_presets || device.customPresets || []),
  );
}

function getDevice(deviceId) {
  const row = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
  if (!row) return null;
  return {
    ...row,
    custom_presets: JSON.parse(row.custom_presets || '[]'),
  };
}

function getAllDevices() {
  return db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all().map(row => ({
    ...row,
    custom_presets: JSON.parse(row.custom_presets || '[]'),
  }));
}

// ──────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'day': now.setDate(now.getDate() - 1); break;
    case 'week': now.setDate(now.getDate() - 7); break;
    case 'month': now.setMonth(now.getMonth() - 1); break;
    case 'year': now.setFullYear(now.getFullYear() - 1); break;
    default: now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

// ──────────────────────────────────────
//  ROOMS
// ──────────────────────────────────────

function getRooms() {
  return db.prepare('SELECT * FROM rooms ORDER BY created_at DESC').all().map(row => ({
    ...row,
    device_ids: JSON.parse(row.device_ids || '[]'),
  }));
}

function saveRoom(room) {
  const id = room.id || `room_${Date.now()}`;
  db.prepare(`
    INSERT OR REPLACE INTO rooms (id, name, icon, device_ids)
    VALUES (?, ?, ?, ?)
  `).run(id, room.name, room.icon || '🏠', JSON.stringify(room.device_ids || []));
  return { id, ...room };
}

function updateRoom(id, updates) {
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  if (!existing) return null;
  const merged = {
    name: updates.name ?? existing.name,
    icon: updates.icon ?? existing.icon,
    device_ids: updates.device_ids ? JSON.stringify(updates.device_ids) : existing.device_ids,
  };
  db.prepare('UPDATE rooms SET name = ?, icon = ?, device_ids = ? WHERE id = ?')
    .run(merged.name, merged.icon, merged.device_ids, id);
  return { id, ...merged, device_ids: JSON.parse(merged.device_ids) };
}

function deleteRoom(id) {
  return db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
}

// ──────────────────────────────────────
//  SCHEDULES
// ──────────────────────────────────────

function getSchedules(deviceId) {
  let rows;
  if (deviceId) {
    rows = db.prepare('SELECT * FROM schedules WHERE device_id = ? ORDER BY time ASC').all(deviceId);
  } else {
    rows = db.prepare('SELECT * FROM schedules ORDER BY time ASC').all();
  }
  return rows.map(row => ({
    ...row,
    days: JSON.parse(row.days || '[]'),
    action: JSON.parse(row.action || '{}'),
    enabled: !!row.enabled,
  }));
}

function saveSchedule(schedule) {
  const id = schedule.id || `sched_${Date.now()}`;
  db.prepare(`
    INSERT OR REPLACE INTO schedules (id, device_id, name, time, days, action, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    schedule.device_id,
    schedule.name,
    schedule.time,
    JSON.stringify(schedule.days || []),
    JSON.stringify(schedule.action || {}),
    schedule.enabled !== false ? 1 : 0
  );
  return { id, ...schedule };
}

function updateSchedule(id, updates) {
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) return null;
  const merged = {
    device_id: updates.device_id ?? existing.device_id,
    name: updates.name ?? existing.name,
    time: updates.time ?? existing.time,
    days: updates.days ? JSON.stringify(updates.days) : existing.days,
    action: updates.action ? JSON.stringify(updates.action) : existing.action,
    enabled: updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled,
  };
  db.prepare('UPDATE schedules SET device_id = ?, name = ?, time = ?, days = ?, action = ?, enabled = ? WHERE id = ?')
    .run(merged.device_id, merged.name, merged.time, merged.days, merged.action, merged.enabled, id);
  return { id, ...merged, days: JSON.parse(merged.days), action: JSON.parse(merged.action), enabled: !!merged.enabled };
}

function deleteSchedule(id) {
  return db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
}

// ──────────────────────────────────────
//  OAUTH TOKENS
// ──────────────────────────────────────

function saveOAuthToken({ access_token, refresh_token, expires_in, scope }) {
  const expires_at = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO oauth_tokens (id, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES (1, ?, ?, ?, ?, datetime('now'))
  `).run(access_token, refresh_token, expires_at, scope || '');
  return { access_token, refresh_token, expires_at, scope };
}

function getOAuthToken() {
  const row = db.prepare('SELECT * FROM oauth_tokens WHERE id = 1').get();
  if (!row) return null;
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    scope: row.scope,
    is_expired: new Date(row.expires_at) <= new Date(),
  };
}

function deleteOAuthToken() {
  return db.prepare('DELETE FROM oauth_tokens WHERE id = 1').run();
}

function close() {
  if (db) db.close();
}

module.exports = {
  initDB,
  logEvent,
  getEvents,
  startSession,
  endSession,
  getUsageStats,
  getSavings,
  getSettings,
  updateSettings,
  saveDevice,
  getDevice,
  getAllDevices,
  getRooms,
  saveRoom,
  updateRoom,
  deleteRoom,
  getSchedules,
  saveSchedule,
  updateSchedule,
  deleteSchedule,
  saveOAuthToken,
  getOAuthToken,
  deleteOAuthToken,
  close,
};

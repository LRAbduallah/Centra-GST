const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function initDatabase(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables & indexes
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_profile_id ON catalog(profile_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_profile_id ON invoices(profile_id);
  `);
}

function getProfiles() {
  const rows = db.prepare('SELECT data FROM profiles').all();
  return rows.map(r => JSON.parse(r.data));
}

function upsertProfile(id, data) {
  db.prepare(`
    INSERT INTO profiles (id, data, updated_at)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(id, JSON.stringify(data));
}

function deleteProfile(id) {
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
}

function getCatalog(profileId) {
  const rows = db.prepare('SELECT data FROM catalog WHERE profile_id = ?').all(profileId);
  return rows.map(r => JSON.parse(r.data));
}

function upsertCatalogItem(id, profileId, data) {
  db.prepare('INSERT OR REPLACE INTO catalog (id, profile_id, data, updated_at) VALUES (?, ?, ?, unixepoch())')
    .run(id, profileId, JSON.stringify(data));
}

function deleteCatalogItem(id) {
  db.prepare('DELETE FROM catalog WHERE id = ?').run(id);
}

function getInvoices(profileId) {
  if (profileId && profileId !== 'all') {
    const rows = db.prepare('SELECT data FROM invoices WHERE profile_id = ? ORDER BY created_at DESC').all(profileId);
    return rows.map(r => JSON.parse(r.data));
  } else {
    const rows = db.prepare('SELECT data FROM invoices ORDER BY created_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
  }
}

function upsertInvoice(id, profileId, data) {
  const epoch = Math.floor((data.generatedAt || Date.now()) / 1000);
  db.prepare('INSERT OR REPLACE INTO invoices (id, profile_id, data, created_at) VALUES (?, ?, ?, ?)')
    .run(id, profileId, JSON.stringify(data), epoch);
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, JSON.stringify(value));
}

function closeDatabase() {
  if (db) {
    try {
      db.close();
      console.log('SQLite database closed successfully.');
    } catch (err) {
      console.error('Error closing SQLite database:', err);
    }
    db = null;
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  getProfiles,
  upsertProfile,
  deleteProfile,
  getCatalog,
  upsertCatalogItem,
  deleteCatalogItem,
  getInvoices,
  upsertInvoice,
  deleteInvoice,
  getSetting,
  setSetting
};

// ===== Core - Database Migration =====
import Database from 'better-sqlite3';
import path from 'path';

export function migrateCoreDatabase(dbPath: string): void {
  const db = new Database(dbPath);

  try {
    // Check if area_description column exists
    const householdsInfo = db.prepare(`PRAGMA table_info(households)`).all() as any[];
    const hasAreaDescription = householdsInfo.some((col) => col.name === 'area_description');

    if (!hasAreaDescription) {
      console.log('[MIGRATE] Adding area_description column to households...');
      db.exec('ALTER TABLE households ADD COLUMN area_description TEXT;');
      console.log('[OK] area_description column added');
    }

    // Check if household_id column exists in offers
    const offersInfo = db.prepare(`PRAGMA table_info(offers)`).all() as any[];
    const hasHouseholdId = offersInfo.some((col) => col.name === 'household_id');

    if (!hasHouseholdId) {
      console.log('[MIGRATE] Adding household_id column to offers...');
      db.exec('ALTER TABLE offers ADD COLUMN household_id TEXT;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_offers_household ON offers(household_id);');
      console.log('[OK] household_id column and index added');
    }

    // Check if sync_status exists
    const offersHasSync = offersInfo.some((col) => col.name === 'sync_status');
    if (!offersHasSync) {
      console.log('[MIGRATE] Adding sync_status column to offers...');
      db.exec("ALTER TABLE offers ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';");
      console.log('[OK] sync_status column added to offers');
    }

    const requestsInfo = db.prepare(`PRAGMA table_info(requests)`).all() as any[];
    const requestsHasSync = requestsInfo.some((col) => col.name === 'sync_status');
    if (!requestsHasSync) {
      console.log('[MIGRATE] Adding sync_status column to requests...');
      db.exec("ALTER TABLE requests ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';");
      console.log('[OK] sync_status column added to requests');
    }

    console.log('[OK] Core database migration complete');
  } catch (error: any) {
    console.error('[ERROR] Migration failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

export function migrateCoreIfDatabaseExists(dbPath?: string): void {
  const finalPath = dbPath || path.join(__dirname, '../../data/core.db');
  const exists = require('fs').existsSync(finalPath);

  if (exists) {
    migrateCoreDatabase(finalPath);
  }
}

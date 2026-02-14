// ===== Edge Hub - Database Manager =====
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { CREATE_TABLES_SQL, SEED_DATA_SQL } from './schema';
import { seedExtendedData } from './seed-data';
import { migrateHubIfDatabaseExists } from './migrate';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/hub.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

export function initDatabase(seed: boolean = false): void {
  const database = getDatabase();

  // Run migrations if database already exists
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/hub.db');
  migrateHubIfDatabaseExists(dbPath);

  const statements = CREATE_TABLES_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  database.transaction(() => {
    for (const stmt of statements) {
      database.exec(stmt + ';');
    }
  })();

  if (seed) {
    const seedStatements = SEED_DATA_SQL.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    database.transaction(() => {
      for (const stmt of seedStatements) {
        database.exec(stmt + ';');
      }
    })();

    const adminHash = bcrypt.hashSync('admin123', 10);
    const fieldHash = bcrypt.hashSync('field123', 10);
    const donorHash = bcrypt.hashSync('donor123', 10);

    const updatePassword = database.prepare('UPDATE users SET password_hash = ? WHERE username = ?');
    updatePassword.run(adminHash, 'admin');
    updatePassword.run(fieldHash, 'field1');
    updatePassword.run(fieldHash, 'field2');
    updatePassword.run(donorHash, 'donor1');

    // Generate extended seed data (households, needs, inventory, etc.)
    seedExtendedData();
  }

  console.log('[OK] قاعدة البيانات جاهزة');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

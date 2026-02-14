// ===== Core - Database Manager (SQLite) =====
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { CREATE_TABLES_SQL, SEED_DATA_SQL } from './schema';
import { migrateCoreIfDatabaseExists } from './migrate';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'core.db');
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
  const dataDir = path.join(__dirname, '../../data');
  const dbPath = process.env.DB_PATH || path.join(dataDir, 'core.db');
  migrateCoreIfDatabaseExists(dbPath);

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
    const donorHash = bcrypt.hashSync('donor123', 10);

    const updatePassword = database.prepare('UPDATE users SET password_hash = ? WHERE username = ?');
    updatePassword.run(adminHash, 'core_admin');
    updatePassword.run(donorHash, 'donor1');
  }

  console.log('[Core] Database initialized');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

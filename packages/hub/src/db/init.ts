// ===== Edge Hub - DB Initialization Script =====
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { initDatabase, getDatabase } from './database';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize with seed data
initDatabase(true);

// Set proper password hashes for seed users
const db = getDatabase();
const adminHash = bcrypt.hashSync('admin123', 10);
const fieldHash = bcrypt.hashSync('field123', 10);
const donorHash = bcrypt.hashSync('donor123', 10);

db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(adminHash, 'admin');
db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(fieldHash, 'field1');
db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(fieldHash, 'field2');
db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(donorHash, 'donor1');

console.log('[OK] تم تهيئة قاعدة البيانات بنجاح');
console.log('  المستخدمين:');
console.log('  - admin / admin123 (مدير)');
console.log('  - field1 / field123 (عامل ميداني)');
console.log('  - field2 / field123 (عامل ميداني)');
console.log('  - donor1 / donor123 (متبرع)');

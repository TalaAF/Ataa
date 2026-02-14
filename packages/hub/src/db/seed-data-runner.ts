// ===== Hub - Standalone Seed Data Runner =====
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize with seed data (includes extended data)
initDatabase(true);
console.log('[OK] Seed data generation complete');

// ===== Core - DB Initialization Script =====
import { initDatabase } from './database';

initDatabase(true);

console.log('[Core] Database initialized successfully');
console.log('  Users:');
console.log('  - core_admin / admin123 (admin)');
console.log('  - donor1 / donor123 (donor)');

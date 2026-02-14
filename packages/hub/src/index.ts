// ===== عطاء - Edge Hub Server =====
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './db/database';
import authRoutes from './routes/auth';
import householdsRoutes from './routes/households';
import needsRoutes from './routes/needs';
import inventoryRoutes from './routes/inventory';
import distributionsRoutes from './routes/distributions';
import offersRequestsRoutes from './routes/offers-requests';
import dashboardRoutes from './routes/dashboard';
import syncRoutes from './routes/sync';
import aiRoutes from './routes/ai';
import publicRoutes from './routes/public';
import familyPortalRoutes from './routes/family-portal';
import familyExchangeRoutes from './routes/family-exchange';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
initDatabase(true);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Routes (public first - no auth required)
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/family/portal', familyPortalRoutes);
app.use('/api/family/exchange', familyExchangeRoutes);
app.use('/api/households', householdsRoutes);
app.use('/api/needs', needsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/distributions', distributionsRoutes);
app.use('/api', offersRequestsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hub_id: process.env.HUB_ID || 'hub-default',
    timestamp: new Date().toISOString(),
    name: 'عطاء - Edge Hub',
  });
});

// Serve static files for dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('خطأ:', err);
  res.status(500).json({ success: false, error: 'خطأ داخلي في الخادم' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║       عطاء - Edge Hub Server         ║`);
  console.log(`║   نظام توزيع المساعدات الإنسانية      ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  Server: http://${HOST}:${PORT}        ║`);
  console.log(`║  Hub ID: ${(process.env.HUB_ID || 'hub-default').padEnd(26)}║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nإيقاف الخادم...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default app;

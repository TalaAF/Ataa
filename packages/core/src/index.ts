// ===== Ataa - Central Core Server =====
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from './db/database';

import authRoutes from './routes/auth';
import householdsRoutes from './routes/households';
import needsRoutes from './routes/needs';
import inventoryRoutes from './routes/inventory';
import distributionsRoutes from './routes/distributions';
import syncRoutes from './routes/sync';
import dashboardRoutes from './routes/dashboard';
import donorRoutes from './routes/donor';
import matchesRoutes from './routes/matches';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000');
const HOST = process.env.HOST || '0.0.0.0';

// Initialize database with seed data
initDatabase(true);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ataa-core', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/households', householdsRoutes);
app.use('/api/needs', needsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/distributions', distributionsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/matches', matchesRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n[Ataa Core] Server running on http://${HOST}:${PORT}`);
  console.log(`[Ataa Core] Health: http://localhost:${PORT}/health`);
  console.log(`[Ataa Core] API: http://localhost:${PORT}/api\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default app;

// ===== Edge Hub - Dashboard Routes =====
import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// ملخص عام
router.get('/summary', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const stats = {
    totalHouseholds: (db.prepare('SELECT COUNT(*) as c FROM households').get() as any).c,
    totalMembers: (db.prepare('SELECT SUM(family_size) as c FROM households').get() as any).c || 0,
    totalNeeds: (db.prepare("SELECT COUNT(*) as c FROM needs WHERE status = 'open'").get() as any).c,
    criticalNeeds: (db.prepare("SELECT COUNT(*) as c FROM needs WHERE status = 'open' AND urgency = 'critical'").get() as any).c,
    totalDistributions: (db.prepare('SELECT COUNT(*) as c FROM distributions').get() as any).c,
    activeOffers: (db.prepare("SELECT COUNT(*) as c FROM offers WHERE status = 'open'").get() as any).c,
    activeRequests: (db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'open'").get() as any).c,
    pendingMatches: (db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'pending'").get() as any).c,
    pendingSync: (db.prepare("SELECT COUNT(*) as c FROM households WHERE sync_status = 'pending'").get() as any).c,
  };

  res.json({ success: true, data: stats });
});

// احتياجات حسب المنطقة
router.get('/needs-by-zone', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const data = db.prepare(`
    SELECT z.id as zone_id, z.name as zone_name,
           COUNT(DISTINCT h.id) as total_households,
           SUM(h.family_size) as total_members,
           n.category,
           COUNT(n.id) as need_count,
           n.urgency,
           COUNT(CASE WHEN n.status = 'met' THEN 1 END) as met_count
    FROM zones z
    LEFT JOIN households h ON h.zone_id = z.id
    LEFT JOIN needs n ON n.household_id = h.id AND n.status != 'cancelled'
    GROUP BY z.id, n.category, n.urgency
    ORDER BY z.name, n.category
  `).all();

  res.json({ success: true, data });
});

// ملخص المخزون
router.get('/inventory', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const data = db.prepare(`
    SELECT i.location_id, COALESCE(s.name, 'مستودع') as location_name,
           i.category, SUM(i.qty_available) as available, SUM(i.qty_reserved) as reserved
    FROM inventory i
    LEFT JOIN shelters s ON i.location_id = s.id
    GROUP BY i.location_id, i.category
    ORDER BY location_name, i.category
  `).all();

  res.json({ success: true, data });
});

// إحصائيات التوزيع
router.get('/distributions', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const recentDist = db.prepare(`
    SELECT d.*, h.token as household_token, h.head_of_household_name,
           u.full_name as distributed_by_name
    FROM distributions d
    JOIN households h ON d.household_id = h.id
    LEFT JOIN users u ON d.distributed_by = u.id
    ORDER BY d.created_at DESC
    LIMIT 50
  `).all();

  const stats = db.prepare(`
    SELECT COUNT(*) as total_distributions,
           COUNT(DISTINCT household_id) as households_served
    FROM distributions
    WHERE distributed_at >= datetime('now', '-30 days')
  `).get() as any;

  res.json({
    success: true,
    data: {
      recent: recentDist.map((d: any) => ({ ...d, items: JSON.parse(d.items || '[]') })),
      stats,
    },
  });
});

// المناطق
router.get('/zones', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
  res.json({ success: true, data: zones });
});

// المراكز
router.get('/shelters', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id } = req.query;

  let query = 'SELECT s.*, z.name as zone_name FROM shelters s LEFT JOIN zones z ON s.zone_id = z.id';
  const params: any[] = [];

  if (zone_id) {
    query += ' WHERE s.zone_id = ?';
    params.push(zone_id);
  }

  query += ' ORDER BY s.name';
  const shelters = db.prepare(query).all(...params);

  res.json({ success: true, data: shelters });
});

export default router;

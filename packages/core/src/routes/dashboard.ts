// ===== Core - Dashboard Routes =====
import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/summary', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const totalHouseholds = (db.prepare('SELECT COUNT(*) as c FROM households').get() as any).c;
  const totalMembers = (db.prepare('SELECT COUNT(*) as c FROM household_members').get() as any).c;
  const activeNeeds = (db.prepare("SELECT COUNT(*) as c FROM needs WHERE status != 'met'").get() as any).c;
  const completedDist = (db.prepare("SELECT COUNT(*) as c FROM distributions WHERE status = 'completed'").get() as any).c;

  const needsByCategory = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(quantity) as total_quantity
    FROM needs WHERE status = 'open' GROUP BY category ORDER BY count DESC
  `).all();

  const needsByUrgency = db.prepare(`
    SELECT urgency, COUNT(*) as count FROM needs WHERE status = 'open' GROUP BY urgency
  `).all();

  res.json({
    success: true,
    data: {
      total_households: totalHouseholds,
      total_members: totalMembers,
      active_needs: activeNeeds,
      completed_distributions: completedDist,
      needs_by_category: needsByCategory,
      needs_by_urgency: needsByUrgency,
    },
  });
});

router.get('/needs-by-zone', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const zoneNeeds = db.prepare(`
    SELECT z.id as zone_id, z.name as zone_name,
      COUNT(DISTINCT h.id) as total_households,
      COUNT(DISTINCT m.id) as total_members,
      n.category, SUM(n.quantity) as total_quantity,
      n.urgency, COUNT(n.id) as need_count
    FROM zones z
    LEFT JOIN households h ON z.id = h.zone_id
    LEFT JOIN household_members m ON h.id = m.household_id
    LEFT JOIN needs n ON h.id = n.household_id
    WHERE n.status = 'open' OR n.status IS NULL
    GROUP BY z.id, z.name, n.category, n.urgency
    ORDER BY z.name, n.urgency DESC, n.category
  `).all();

  res.json({ success: true, data: zoneNeeds });
});

router.get('/inventory', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const inventorySummary = db.prepare(`
    SELECT location_id, location_type, category,
      SUM(qty_available) as total_available,
      SUM(qty_reserved) as total_reserved,
      COUNT(*) as item_count
    FROM inventory
    GROUP BY location_id, location_type, category
    ORDER BY location_type, category
  `).all();

  res.json({ success: true, data: inventorySummary });
});

router.get('/distributions', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const period = req.query.period as string || 'month';

  let dateCondition = "created_at > datetime('now', '-30 days')";
  if (period === 'week') dateCondition = "created_at > datetime('now', '-7 days')";
  else if (period === 'day') dateCondition = "created_at > datetime('now', '-1 day')";

  const stats = db.prepare(`
    SELECT COUNT(*) as total_distributions, COUNT(DISTINCT household_id) as households_served, status
    FROM distributions WHERE ${dateCondition} GROUP BY status
  `).all();

  res.json({ success: true, data: { stats, period } });
});

router.get('/zones', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
  res.json({ success: true, data: zones });
});

router.get('/shelters', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zone_id = req.query.zone_id as string;

  if (zone_id) {
    const shelters = db.prepare('SELECT * FROM shelters WHERE zone_id = ? ORDER BY name').all(zone_id);
    res.json({ success: true, data: shelters });
  } else {
    const shelters = db.prepare('SELECT * FROM shelters ORDER BY name').all();
    res.json({ success: true, data: shelters });
  }
});

export default router;

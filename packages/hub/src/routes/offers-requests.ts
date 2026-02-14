// ===== Edge Hub - Offers & Requests Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authMiddleware);

// ===== العروض =====

// قائمة العروض
router.get('/offers', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id, category, status = 'open' } = req.query;

  let whereClause = 'o.status = ?';
  const params: any[] = [status];

  if (zone_id) { whereClause += ' AND o.zone_id = ?'; params.push(zone_id); }
  if (category) { whereClause += ' AND o.category = ?'; params.push(category); }

  // Constrain to user's zone
  if (req.user!.zone_id) {
    whereClause += ' AND o.zone_id = ?';
    params.push(req.user!.zone_id);
  }

  const offers = db.prepare(`
    SELECT o.*, z.name as zone_name, u.full_name as created_by_name
    FROM offers o
    LEFT JOIN zones z ON o.zone_id = z.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
  `).all(...params);

  res.json({ success: true, data: offers });
});

// إنشاء عرض
router.post('/offers', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id, category, description, quantity = 1, expiry, household_id } = req.body;

  const effectiveZone = zone_id || req.user!.zone_id;
  if (!effectiveZone || !category) {
    res.status(400).json({ success: false, error: 'المنطقة والفئة مطلوبتين' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO offers (id, zone_id, created_by, household_id, category, description, quantity, expiry, status, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 'pending')
  `).run(id, effectiveZone, req.user!.id, household_id || null, category, description || null, quantity, expiry || null);

  auditLog(req.user!.id, req.user!.role, 'create', 'offer', id);

  // Try auto-matching
  autoMatch(effectiveZone, category);

  res.status(201).json({ success: true, data: { id }, message: 'تم إنشاء العرض' });
});

// ===== الطلبات =====

// قائمة الطلبات
router.get('/requests', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id, category, status = 'open' } = req.query;

  let whereClause = 'r.status = ?';
  const params: any[] = [status];

  if (zone_id) { whereClause += ' AND r.zone_id = ?'; params.push(zone_id); }
  if (category) { whereClause += ' AND r.category = ?'; params.push(category); }

  if (req.user!.zone_id) {
    whereClause += ' AND r.zone_id = ?';
    params.push(req.user!.zone_id);
  }

  const requests = db.prepare(`
    SELECT r.*, z.name as zone_name
    FROM requests r
    LEFT JOIN zones z ON r.zone_id = z.id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
  `).all(...params);

  res.json({ success: true, data: requests });
});

// إنشاء طلب
router.post('/requests', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id, household_id, category, description, quantity = 1 } = req.body;

  const effectiveZone = zone_id || req.user!.zone_id;
  if (!effectiveZone || !category) {
    res.status(400).json({ success: false, error: 'المنطقة والفئة مطلوبتين' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO requests (id, household_id, zone_id, category, description, quantity, status, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, 'open', 'pending')
  `).run(id, household_id || null, effectiveZone, category, description || null, quantity);

  auditLog(req.user!.id, req.user!.role, 'create', 'request', id);

  autoMatch(effectiveZone, category);

  res.status(201).json({ success: true, data: { id }, message: 'تم إنشاء الطلب' });
});

// ===== المطابقات =====

router.get('/matches', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { status } = req.query;

  let whereClause = '1=1';
  const params: any[] = [];

  if (status) { whereClause += ' AND m.status = ?'; params.push(status); }

  const matches = db.prepare(`
    SELECT m.*,
           o.category, o.quantity as offer_qty, o.description as offer_desc,
           r.quantity as request_qty, r.description as request_desc,
           pp.name as pickup_point_name
    FROM matches m
    JOIN offers o ON m.offer_id = o.id
    JOIN requests r ON m.request_id = r.id
    LEFT JOIN pickup_points pp ON m.pickup_point_id = pp.id
    WHERE ${whereClause}
    ORDER BY m.created_at DESC
  `).all(...params);

  res.json({ success: true, data: matches });
});

// تحديث حالة مطابقة
router.patch('/matches/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { status } = req.body;

  const result = db.prepare(`
    UPDATE matches SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'المطابقة غير موجودة' });
    return;
  }

  if (status === 'completed') {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    if (match) {
      db.prepare("UPDATE offers SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(match.offer_id);
      db.prepare("UPDATE requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(match.request_id);
    }
  }

  auditLog(req.user!.id, req.user!.role, 'update_status', 'match', req.params.id, `status: ${status}`);

  res.json({ success: true, message: 'تم تحديث حالة المطابقة' });
});

// Auto-matching within same zone
function autoMatch(zoneId: string, category: string): void {
  const db = getDatabase();

  const openOffers = db.prepare(
    "SELECT * FROM offers WHERE zone_id = ? AND category = ? AND status = 'open' ORDER BY created_at"
  ).all(zoneId, category) as any[];

  const openRequests = db.prepare(
    "SELECT * FROM requests WHERE zone_id = ? AND category = ? AND status = 'open' ORDER BY created_at"
  ).all(zoneId, category) as any[];

  // Get a pickup point for this zone
  const pickupPoint = db.prepare(
    'SELECT id FROM pickup_points WHERE zone_id = ? LIMIT 1'
  ).get(zoneId) as any;

  for (const offer of openOffers) {
    for (const request of openRequests) {
      const existingMatch = db.prepare(
        'SELECT id FROM matches WHERE offer_id = ? OR request_id = ?'
      ).get(offer.id, request.id);

      if (!existingMatch) {
        db.prepare(`
          INSERT INTO matches (id, offer_id, request_id, status, pickup_point_id)
          VALUES (?, ?, ?, 'pending', ?)
        `).run(uuidv4(), offer.id, request.id, pickupPoint?.id || null);

        db.prepare("UPDATE offers SET status = 'matched', updated_at = datetime('now') WHERE id = ?").run(offer.id);
        db.prepare("UPDATE requests SET status = 'matched', updated_at = datetime('now') WHERE id = ?").run(request.id);
        break;
      }
    }
  }
}

export default router;

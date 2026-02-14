// ===== Edge Hub - Family Exchange Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { familyAuthMiddleware, FamilyAuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(familyAuthMiddleware);

// قائمة عروض الاسرة
router.get('/offers', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const offers = db.prepare(`
    SELECT o.*, z.name as zone_name
    FROM offers o
    LEFT JOIN zones z ON o.zone_id = z.id
    WHERE o.household_id = ?
    ORDER BY o.created_at DESC
  `).all(householdId);

  res.json({ success: true, data: offers });
});

// إنشاء عرض من الاسرة
router.post('/offers', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const { category, description, quantity = 1, expiry } = req.body;
  const householdId = req.family!.household_id;
  const zoneId = req.family!.zone_id;
  const createdBy = 'user-self-reg';

  if (!zoneId || !category) {
    res.status(400).json({ success: false, error: 'المنطقة والفئة مطلوبتين' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO offers (id, zone_id, created_by, household_id, category, description, quantity, expiry, status, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 'pending')
  `).run(id, zoneId, createdBy, householdId, category, description || null, quantity, expiry || null);

  auditLog(householdId, 'beneficiary', 'create', 'offer', id);

  autoMatch(zoneId, category);

  res.status(201).json({ success: true, data: { id }, message: 'تم إنشاء العرض' });
});

// قائمة طلبات الاسرة
router.get('/requests', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const requests = db.prepare(`
    SELECT r.*, z.name as zone_name
    FROM requests r
    LEFT JOIN zones z ON r.zone_id = z.id
    WHERE r.household_id = ?
    ORDER BY r.created_at DESC
  `).all(householdId);

  res.json({ success: true, data: requests });
});

// إنشاء طلب من الاسرة
router.post('/requests', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const { category, description, quantity = 1 } = req.body;
  const householdId = req.family!.household_id;
  const zoneId = req.family!.zone_id;

  if (!zoneId || !category) {
    res.status(400).json({ success: false, error: 'المنطقة والفئة مطلوبتين' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO requests (id, household_id, zone_id, category, description, quantity, status, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, 'open', 'pending')
  `).run(id, householdId, zoneId, category, description || null, quantity);

  auditLog(householdId, 'beneficiary', 'create', 'request', id);

  autoMatch(zoneId, category);

  res.status(201).json({ success: true, data: { id }, message: 'تم إنشاء الطلب' });
});

// مطابقت الاسرة
router.get('/matches', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const matches = db.prepare(`
    SELECT m.*,
           o.category as offer_category, o.quantity as offer_quantity, o.description as offer_description,
           r.category as request_category, r.quantity as request_quantity, r.description as request_description,
           pp.name as pickup_point_name
    FROM matches m
    JOIN offers o ON m.offer_id = o.id
    JOIN requests r ON m.request_id = r.id
    LEFT JOIN pickup_points pp ON m.pickup_point_id = pp.id
    WHERE o.household_id = ? OR r.household_id = ?
    ORDER BY m.created_at DESC
  `).all(householdId, householdId);

  res.json({ success: true, data: matches });
});

export default router;

// Auto-matching within same zone
function autoMatch(zoneId: string, category: string): void {
  const db = getDatabase();

  const openOffers = db.prepare(
    "SELECT * FROM offers WHERE zone_id = ? AND category = ? AND status = 'open' ORDER BY created_at"
  ).all(zoneId, category) as any[];

  const openRequests = db.prepare(
    "SELECT * FROM requests WHERE zone_id = ? AND category = ? AND status = 'open' ORDER BY created_at"
  ).all(zoneId, category) as any[];

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

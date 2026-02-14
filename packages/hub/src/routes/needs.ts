// ===== Edge Hub - Needs Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

router.use(authMiddleware);

// قائمة الاحتياجات
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { household_id, category, urgency, status, zone_id, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '1=1';
  const params: any[] = [];

  if (household_id) { whereClause += ' AND n.household_id = ?'; params.push(household_id); }
  if (category) { whereClause += ' AND n.category = ?'; params.push(category); }
  if (urgency) { whereClause += ' AND n.urgency = ?'; params.push(urgency); }
  if (status) { whereClause += ' AND n.status = ?'; params.push(status); }
  if (zone_id) { whereClause += ' AND h.zone_id = ?'; params.push(zone_id); }

  if (req.user!.role === UserRole.FIELD_WORKER && req.user!.zone_id) {
    whereClause += ' AND h.zone_id = ?';
    params.push(req.user!.zone_id);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM needs n JOIN households h ON n.household_id = h.id WHERE ${whereClause}`
  ).get(...params) as any;

  const needs = db.prepare(`
    SELECT n.*, h.token as household_token, h.head_of_household_name, h.zone_id, z.name as zone_name
    FROM needs n
    JOIN households h ON n.household_id = h.id
    LEFT JOIN zones z ON h.zone_id = z.id
    WHERE ${whereClause}
    ORDER BY
      CASE n.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  res.json({
    success: true,
    data: {
      items: needs,
      total: countRow.total,
      page: parseInt(page as string),
      page_size: parseInt(limit as string),
      total_pages: Math.ceil(countRow.total / parseInt(limit as string)),
    },
  });
});

// تسجيل احتياج
router.post('/', requireRole(UserRole.FIELD_WORKER, UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { household_id, category, description, quantity = 1, urgency = 'medium' } = req.body;

  if (!household_id || !category) {
    res.status(400).json({ success: false, error: 'الأسرة والفئة مطلوبتين' });
    return;
  }

  const household = db.prepare('SELECT id FROM households WHERE id = ?').get(household_id);
  if (!household) {
    res.status(404).json({ success: false, error: 'الأسرة غير موجودة' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO needs (id, household_id, category, description, quantity, urgency, status, created_by, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?, 'pending')
  `).run(id, household_id, category, description || null, quantity, urgency, req.user!.id);

  auditLog(req.user!.id, req.user!.role, 'create', 'need', id);

  res.status(201).json({ success: true, data: { id }, message: 'تم تسجيل الاحتياج بنجاح' });
});

// تحديث حالة احتياج
router.patch('/:id/status', requireRole(UserRole.FIELD_WORKER, UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ success: false, error: 'الحالة مطلوبة' });
    return;
  }

  const result = db.prepare(`
    UPDATE needs SET status = ?, updated_at = datetime('now'), sync_status = 'pending' WHERE id = ?
  `).run(status, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'الاحتياج غير موجود' });
    return;
  }

  auditLog(req.user!.id, req.user!.role, 'update_status', 'need', req.params.id, `status: ${status}`);

  res.json({ success: true, message: 'تم تحديث حالة الاحتياج' });
});

export default router;

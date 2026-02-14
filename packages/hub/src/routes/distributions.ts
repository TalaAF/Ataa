// ===== Edge Hub - Distribution Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

router.use(authMiddleware);

// قائمة التوزيعات
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { household_id, location_id, status, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '1=1';
  const params: any[] = [];

  if (household_id) { whereClause += ' AND d.household_id = ?'; params.push(household_id); }
  if (location_id) { whereClause += ' AND d.location_id = ?'; params.push(location_id); }
  if (status) { whereClause += ' AND d.status = ?'; params.push(status); }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM distributions d WHERE ${whereClause}`
  ).get(...params) as any;

  const distributions = db.prepare(`
    SELECT d.*, h.token as household_token, h.head_of_household_name,
           u.full_name as distributed_by_name
    FROM distributions d
    JOIN households h ON d.household_id = h.id
    LEFT JOIN users u ON d.distributed_by = u.id
    WHERE ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  res.json({
    success: true,
    data: {
      items: distributions.map((d: any) => ({ ...d, items: JSON.parse(d.items || '[]') })),
      total: countRow.total,
      page: parseInt(page as string),
      page_size: parseInt(limit as string),
      total_pages: Math.ceil(countRow.total / parseInt(limit as string)),
    },
  });
});

// تسجيل توزيع
router.post('/', requireRole(UserRole.FIELD_WORKER, UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { household_id, location_id, items } = req.body;

  if (!household_id || !location_id || !items || items.length === 0) {
    res.status(400).json({ success: false, error: 'الأسرة والموقع والمواد مطلوبين' });
    return;
  }

  const household = db.prepare('SELECT id, token FROM households WHERE id = ?').get(household_id) as any;
  if (!household) {
    res.status(404).json({ success: false, error: 'الأسرة غير موجودة' });
    return;
  }

  const id = uuidv4();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO distributions (id, household_id, location_id, status, items, distributed_by, distributed_at, sync_status)
      VALUES (?, ?, ?, 'completed', ?, ?, datetime('now'), 'pending')
    `).run(id, household_id, location_id, JSON.stringify(items), req.user!.id);

    // Update inventory
    for (const item of items) {
      db.prepare(`
        UPDATE inventory SET
          qty_available = MAX(0, qty_available - ?),
          updated_at = datetime('now')
        WHERE location_id = ? AND category = ? AND qty_available > 0
      `).run(item.quantity, location_id, item.category);
    }

    // Update related needs
    for (const item of items) {
      db.prepare(`
        UPDATE needs SET
          status = 'met',
          updated_at = datetime('now'),
          sync_status = 'pending'
        WHERE household_id = ? AND category = ? AND status = 'open'
      `).run(household_id, item.category);
    }
  })();

  auditLog(req.user!.id, req.user!.role, 'create', 'distribution', id,
    `household: ${household.token}, items: ${items.length}`);

  res.status(201).json({ success: true, data: { id }, message: 'تم تسجيل التوزيع بنجاح' });
});

export default router;

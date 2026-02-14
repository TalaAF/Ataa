// ===== Edge Hub - Inventory Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

router.use(authMiddleware);

// قائمة المخزون
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { location_id, category } = req.query;

  let whereClause = '1=1';
  const params: any[] = [];

  if (location_id) { whereClause += ' AND i.location_id = ?'; params.push(location_id); }
  if (category) { whereClause += ' AND i.category = ?'; params.push(category); }

  const items = db.prepare(`
    SELECT i.*, COALESCE(s.name, 'مستودع') as location_name
    FROM inventory i
    LEFT JOIN shelters s ON i.location_id = s.id
    WHERE ${whereClause}
    ORDER BY i.category, i.item_name
  `).all(...params);

  res.json({ success: true, data: items });
});

// إضافة صنف
router.post('/', requireRole(UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { location_id, location_type = 'shelter', category, item_name, qty_available, batch_info, expiry_date } = req.body;

  if (!location_id || !category || !item_name) {
    res.status(400).json({ success: false, error: 'الموقع والفئة واسم الصنف مطلوبين' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO inventory (id, location_id, location_type, category, item_name, qty_available, batch_info, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, location_id, location_type, category, item_name, qty_available || 0, batch_info || null, expiry_date || null);

  auditLog(req.user!.id, req.user!.role, 'create', 'inventory', id);

  res.status(201).json({ success: true, data: { id }, message: 'تم إضافة الصنف' });
});

// تحديث كمية
router.patch('/:id', requireRole(UserRole.ADMIN, UserRole.FIELD_WORKER), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { qty_available, qty_reserved } = req.body;

  const result = db.prepare(`
    UPDATE inventory SET
      qty_available = COALESCE(?, qty_available),
      qty_reserved = COALESCE(?, qty_reserved),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(qty_available ?? null, qty_reserved ?? null, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'الصنف غير موجود' });
    return;
  }

  auditLog(req.user!.id, req.user!.role, 'update', 'inventory', req.params.id);

  res.json({ success: true, message: 'تم تحديث المخزون' });
});

export default router;

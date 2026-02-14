// ===== Core - Inventory Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const location_id = req.query.location_id as string;
  const category = req.query.category as string;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (location_id) { where += ' AND location_id = ?'; params.push(location_id); }
  if (category) { where += ' AND category = ?'; params.push(category); }

  const inventory = db.prepare(`SELECT * FROM inventory ${where} ORDER BY category, item_name`).all(...params);
  res.json({ success: true, data: inventory });
});

router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.FIELD_WORKER),
  audit('CREATE', 'inventory'),
  (req: AuthRequest, res: Response) => {
    const { location_id, location_type, category, item_name, qty_available, batch_info, expiry_date } = req.body;

    if (!location_id || !category || !item_name || qty_available === undefined) {
      res.status(400).json({ success: false, error: 'location_id, category, item_name, and qty_available are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`INSERT INTO inventory (id, location_id, location_type, category, item_name, qty_available, batch_info, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, location_id, location_type || 'shelter', category, item_name, qty_available, batch_info || null, expiry_date || null);

    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: item });
  }
);

router.patch('/:id/quantity', authenticate, authorize(UserRole.ADMIN, UserRole.FIELD_WORKER),
  audit('UPDATE_QUANTITY', 'inventory'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { qty_available, qty_reserved } = req.body;

    const db = getDatabase();
    const updates: string[] = [];
    const params: any[] = [];

    if (qty_available !== undefined) { updates.push('qty_available = ?'); params.push(qty_available); }
    if (qty_reserved !== undefined) { updates.push('qty_reserved = ?'); params.push(qty_reserved); }

    if (updates.length === 0) { res.status(400).json({ success: false, error: 'No updates provided' }); return; }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    const result = db.prepare(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Inventory item not found' }); return; }

    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    res.json({ success: true, data: item });
  }
);

export default router;

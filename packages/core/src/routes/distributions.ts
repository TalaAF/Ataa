// ===== Core - Distributions Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole, DistributionStatus } from '@ataa/shared';

const router = Router();

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const household_id = req.query.household_id as string;
  const status = req.query.status as string;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (household_id) { where += ' AND d.household_id = ?'; params.push(household_id); }
  if (status) { where += ' AND d.status = ?'; params.push(status); }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM distributions d ${where}`).get(...params) as any).c;

  const distributions = db.prepare(`
    SELECT d.*, h.token as household_token, h.head_of_household_name, u.full_name as distributed_by_name
    FROM distributions d
    JOIN households h ON d.household_id = h.id
    LEFT JOIN users u ON d.distributed_by = u.id
    ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({
    success: true,
    data: { items: distributions, total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize) },
  });
});

router.post('/', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('CREATE', 'distribution'),
  (req: AuthRequest, res: Response) => {
    const { household_id, location_id, items, status } = req.body;

    if (!household_id || !location_id || !items || !Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'household_id, location_id, and items array are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();
    const distStatus = status || DistributionStatus.PLANNED;
    const distributedAt = distStatus === DistributionStatus.COMPLETED ? new Date().toISOString() : null;

    db.prepare(`INSERT INTO distributions (id, household_id, location_id, items, distributed_by, status, distributed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, household_id, location_id, JSON.stringify(items), req.user!.id, distStatus, distributedAt);

    if (distStatus === DistributionStatus.COMPLETED) {
      const updateInv = db.prepare(
        'UPDATE inventory SET qty_available = qty_available - ? WHERE location_id = ? AND category = ? AND item_name = ?'
      );
      for (const item of items) {
        updateInv.run(item.quantity, location_id, item.category, item.item_name);
      }
    }

    const dist = db.prepare('SELECT * FROM distributions WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: dist });
  }
);

router.patch('/:id/status', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('UPDATE_STATUS', 'distribution'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(DistributionStatus).includes(status)) {
      res.status(400).json({ success: false, error: 'Valid status required' });
      return;
    }

    const db = getDatabase();
    const distributedAt = status === DistributionStatus.COMPLETED ? new Date().toISOString() : null;

    const result = db.prepare(
      "UPDATE distributions SET status = ?, distributed_at = COALESCE(?, distributed_at), updated_at = datetime('now') WHERE id = ?"
    ).run(status, distributedAt, id);

    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Distribution not found' }); return; }

    const dist = db.prepare('SELECT * FROM distributions WHERE id = ?').get(id);
    res.json({ success: true, data: dist });
  }
);

export default router;

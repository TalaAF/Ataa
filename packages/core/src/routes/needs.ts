// ===== Core - Needs Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole, NeedStatus } from '@ataa/shared';

const router = Router();

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const category = req.query.category as string;
  const status = req.query.status as string;
  const urgency = req.query.urgency as string;
  const household_id = req.query.household_id as string;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (category) { where += ' AND n.category = ?'; params.push(category); }
  if (status) { where += ' AND n.status = ?'; params.push(status); }
  if (urgency) { where += ' AND n.urgency = ?'; params.push(urgency); }
  if (household_id) { where += ' AND n.household_id = ?'; params.push(household_id); }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM needs n ${where}`).get(...params) as any).c;

  const needs = db.prepare(`
    SELECT n.*, h.token as household_token, h.head_of_household_name, h.zone_id, z.name as zone_name
    FROM needs n
    JOIN households h ON n.household_id = h.id
    LEFT JOIN zones z ON h.zone_id = z.id
    ${where} ORDER BY
      CASE n.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({
    success: true,
    data: { items: needs, total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize) },
  });
});

router.post('/', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('CREATE', 'need'),
  (req: AuthRequest, res: Response) => {
    const { household_id, category, description, quantity, urgency } = req.body;

    if (!household_id || !category || !quantity) {
      res.status(400).json({ success: false, error: 'household_id, category, and quantity are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`INSERT INTO needs (id, household_id, category, description, quantity, urgency, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, household_id, category, description || null, quantity, urgency || 'medium', req.user!.id);

    const need = db.prepare('SELECT * FROM needs WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: need });
  }
);

router.patch('/:id/status', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('UPDATE_STATUS', 'need'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(NeedStatus).includes(status)) {
      res.status(400).json({ success: false, error: 'Valid status required' });
      return;
    }

    const db = getDatabase();
    const result = db.prepare("UPDATE needs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Need not found' }); return; }

    const need = db.prepare('SELECT * FROM needs WHERE id = ?').get(id);
    res.json({ success: true, data: need });
  }
);

export default router;

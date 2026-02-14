// ===== Core - Households Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

const VULNERABILITY_WEIGHTS: Record<string, number> = {
  pregnant: 3, disabled: 4, chronic_illness: 3, elderly_alone: 4,
  orphans: 5, female_headed: 2, large_family: 2,
};

function calculatePriorityScore(flags: string[], familySize: number): number {
  let score = 0;
  for (const flag of flags) score += VULNERABILITY_WEIGHTS[flag] || 1;
  if (familySize > 6) score += 3;
  else if (familySize > 4) score += 2;
  else if (familySize > 2) score += 1;
  return Math.min(score, 30);
}

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const zone_id = req.query.zone_id as string;
  const search = req.query.search as string;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (zone_id) { where += ' AND h.zone_id = ?'; params.push(zone_id); }
  if (req.user?.role === UserRole.FIELD_WORKER && req.user.zone_id) {
    where += ' AND h.zone_id = ?'; params.push(req.user.zone_id);
  }
  if (search) { where += ' AND (h.head_of_household_name LIKE ? OR h.token LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM households h ${where}`).get(...params) as any).c;

  const households = db.prepare(`
    SELECT h.*, z.name as zone_name, s.name as shelter_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    LEFT JOIN shelters s ON h.shelter_id = s.id
    ${where} ORDER BY h.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({
    success: true,
    data: { items: households, total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize) },
  });
});

router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const household = db.prepare(`
    SELECT h.*, z.name as zone_name, s.name as shelter_name
    FROM households h LEFT JOIN zones z ON h.zone_id = z.id LEFT JOIN shelters s ON h.shelter_id = s.id
    WHERE h.id = ?
  `).get(req.params.id) as any;

  if (!household) { res.status(404).json({ success: false, error: 'Household not found' }); return; }

  const members = db.prepare('SELECT * FROM household_members WHERE household_id = ?').all(req.params.id);
  const needs = db.prepare('SELECT * FROM needs WHERE household_id = ? ORDER BY created_at DESC').all(req.params.id);
  const distributions = db.prepare('SELECT * FROM distributions WHERE household_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.json({ success: true, data: { ...household, members, needs, distributions } });
});

router.post('/', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('CREATE', 'household'),
  (req: AuthRequest, res: Response) => {
    const { zone_id, shelter_id, head_of_household_name, family_size, displacement_status, vulnerability_flags, area_description, notes, members } = req.body;

    if (!zone_id || !family_size) {
      res.status(400).json({ success: false, error: 'zone_id and family_size are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();
    const token = 'ATT-' + uuidv4().substring(0, 8).toUpperCase();
    const flags = vulnerability_flags || [];
    const priority = calculatePriorityScore(flags, family_size);

    db.prepare(`INSERT INTO households (id, token, zone_id, shelter_id, head_of_household_name, family_size,
      displacement_status, vulnerability_flags, priority_score, area_description, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, token, zone_id, shelter_id || null, head_of_household_name || null, family_size,
      displacement_status || 'displaced', JSON.stringify(flags), priority, area_description || null, notes || null, req.user!.id);

    if (members && Array.isArray(members)) {
      const insertMember = db.prepare(
        'INSERT INTO household_members (id, household_id, age_band, sex, special_needs_flags) VALUES (?, ?, ?, ?, ?)'
      );
      for (const m of members) {
        insertMember.run(uuidv4(), id, m.age_band || '18-59', m.sex || null, JSON.stringify(m.special_needs_flags || []));
      }
    }

    const household = db.prepare('SELECT * FROM households WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: household });
  }
);

router.put('/:id', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('UPDATE', 'household'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { head_of_household_name, family_size, displacement_status, vulnerability_flags, area_description, notes } = req.body;

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as any;
    if (!existing) { res.status(404).json({ success: false, error: 'Household not found' }); return; }

    const flags = vulnerability_flags || JSON.parse(existing.vulnerability_flags);
    const size = family_size || existing.family_size;
    const priority = calculatePriorityScore(flags, size);

    db.prepare(`UPDATE households SET head_of_household_name = ?, family_size = ?, displacement_status = ?,
      vulnerability_flags = ?, priority_score = ?, area_description = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      head_of_household_name ?? existing.head_of_household_name,
      size, displacement_status || existing.displacement_status,
      JSON.stringify(flags), priority, area_description ?? existing.area_description, notes ?? existing.notes, id
    );

    const updated = db.prepare('SELECT * FROM households WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  }
);

export default router;

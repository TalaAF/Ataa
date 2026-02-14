// ===== Edge Hub - Households Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole, calculatePriorityScore } from '@ataa/shared';

const router = Router();

router.use(authMiddleware);

// قائمة الأسر
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id, shelter_id, search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '1=1';
  const params: any[] = [];

  if (zone_id) {
    whereClause += ' AND h.zone_id = ?';
    params.push(zone_id);
  }
  if (shelter_id) {
    whereClause += ' AND h.shelter_id = ?';
    params.push(shelter_id);
  }
  if (search) {
    whereClause += ' AND (h.head_of_household_name LIKE ? OR h.token LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Scope by user zone if field worker
  if (req.user!.role === UserRole.FIELD_WORKER && req.user!.zone_id) {
    whereClause += ' AND h.zone_id = ?';
    params.push(req.user!.zone_id);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM households h WHERE ${whereClause}`
  ).get(...params) as any;

  const households = db.prepare(`
    SELECT h.*, z.name as zone_name, s.name as shelter_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    LEFT JOIN shelters s ON h.shelter_id = s.id
    WHERE ${whereClause}
    ORDER BY h.priority_score DESC, h.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  res.json({
    success: true,
    data: {
      items: households.map((h: any) => ({
        ...h,
        vulnerability_flags: JSON.parse(h.vulnerability_flags || '[]'),
      })),
      total: countRow.total,
      page: parseInt(page as string),
      page_size: parseInt(limit as string),
      total_pages: Math.ceil(countRow.total / parseInt(limit as string)),
    },
  });
});

// تفاصيل أسرة
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const household = db.prepare(`
    SELECT h.*, z.name as zone_name, s.name as shelter_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    LEFT JOIN shelters s ON h.shelter_id = s.id
    WHERE h.id = ?
  `).get(req.params.id) as any;

  if (!household) {
    res.status(404).json({ success: false, error: 'الأسرة غير موجودة' });
    return;
  }

  const members = db.prepare(
    'SELECT * FROM household_members WHERE household_id = ?'
  ).all(req.params.id);

  const needs = db.prepare(
    'SELECT * FROM needs WHERE household_id = ? ORDER BY urgency DESC, created_at DESC'
  ).all(req.params.id);

  const distributions = db.prepare(
    'SELECT * FROM distributions WHERE household_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);

  res.json({
    success: true,
    data: {
      ...household,
      vulnerability_flags: JSON.parse(household.vulnerability_flags || '[]'),
      members: members.map((m: any) => ({
        ...m,
        special_needs_flags: JSON.parse(m.special_needs_flags || '[]'),
      })),
      needs,
      distributions: distributions.map((d: any) => ({
        ...d,
        items: JSON.parse(d.items || '[]'),
      })),
    },
  });
});

// البحث بالرمز
router.get('/token/:token', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const household = db.prepare(
    'SELECT * FROM households WHERE token = ?'
  ).get(req.params.token) as any;

  if (!household) {
    res.status(404).json({ success: false, error: 'رمز الأسرة غير موجود' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...household,
      vulnerability_flags: JSON.parse(household.vulnerability_flags || '[]'),
    },
  });
});

// تسجيل أسرة جديدة
router.post('/', requireRole(UserRole.FIELD_WORKER, UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const {
    zone_id,
    shelter_id,
    head_of_household_name,
    family_size,
    displacement_status,
    vulnerability_flags = [],
    area_description,
    notes,
    members = [],
  } = req.body;

  if (!zone_id || !family_size) {
    res.status(400).json({ success: false, error: 'المنطقة وعدد الأفراد مطلوبين' });
    return;
  }

  const id = uuidv4();
  const token = `ATQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const hasInfants = members.some((m: any) => m.age_band === '0-2');
  const hasElderly = members.some((m: any) => m.age_band === '60+');
  const priorityScore = calculatePriorityScore(vulnerability_flags, family_size, hasInfants, hasElderly, 0);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO households (id, token, zone_id, shelter_id, head_of_household_name, family_size,
        displacement_status, vulnerability_flags, priority_score, area_description, notes, created_by, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, token, zone_id, shelter_id || null, head_of_household_name || null,
      family_size, displacement_status || 'displaced', JSON.stringify(vulnerability_flags),
      priorityScore, area_description || null, notes || null, req.user!.id);

    for (const member of members) {
      db.prepare(`
        INSERT INTO household_members (id, household_id, age_band, sex, special_needs_flags, sync_status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(uuidv4(), id, member.age_band, member.sex || null,
        JSON.stringify(member.special_needs_flags || []));
    }
  })();

  auditLog(req.user!.id, req.user!.role, 'create', 'household', id);

  res.status(201).json({
    success: true,
    data: { id, token },
    message: 'تم تسجيل الأسرة بنجاح',
  });
});

// تحديث أسرة
router.put('/:id', requireRole(UserRole.FIELD_WORKER, UserRole.ADMIN), (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    zone_id,
    shelter_id,
    head_of_household_name,
    family_size,
    displacement_status,
    vulnerability_flags,
    area_description,
    notes,
  } = req.body;

  const existing = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, error: 'الأسرة غير موجودة' });
    return;
  }

  const members = db.prepare('SELECT * FROM household_members WHERE household_id = ?').all(id) as any[];
  const hasInfants = members.some((m: any) => m.age_band === '0-2');
  const hasElderly = members.some((m: any) => m.age_band === '60+');
  const flags = vulnerability_flags || JSON.parse(existing.vulnerability_flags || '[]');
  const size = family_size || existing.family_size;
  const priorityScore = calculatePriorityScore(flags, size, hasInfants, hasElderly, 0);

  db.prepare(`
    UPDATE households SET
      zone_id = COALESCE(?, zone_id),
      shelter_id = COALESCE(?, shelter_id),
      head_of_household_name = COALESCE(?, head_of_household_name),
      family_size = COALESCE(?, family_size),
      displacement_status = COALESCE(?, displacement_status),
      vulnerability_flags = COALESCE(?, vulnerability_flags),
      priority_score = ?,
      area_description = COALESCE(?, area_description),
      notes = COALESCE(?, notes),
      updated_at = datetime('now'),
      sync_status = 'pending'
    WHERE id = ?
  `).run(
    zone_id || null, shelter_id || null, head_of_household_name || null,
    family_size || null, displacement_status || null,
    vulnerability_flags ? JSON.stringify(vulnerability_flags) : null,
    priorityScore, area_description || null, notes || null, id
  );

  auditLog(req.user!.id, req.user!.role, 'update', 'household', id);

  res.json({ success: true, message: 'تم تحديث بيانات الأسرة' });
});

export default router;

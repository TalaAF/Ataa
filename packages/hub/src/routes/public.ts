// ===== Edge Hub - Public Routes (no auth required) =====
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { calculatePriorityScore } from '@ataa/shared';
import { auditLog } from '../middleware/audit';

const router = Router();

// Ensure self-registration system user exists
const db0 = getDatabase();
db0.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role)
  VALUES ('user-self-reg', 'self-register', 'nologin', 'تسجيل ذاتي', 'beneficiary')
`).run();
db0.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role)
  VALUES ('user-sms-reg', 'sms-register', 'nologin', 'تسجيل عبر الرسائل', 'beneficiary')
`).run();

// Public: list zones (for self-registration form)
router.get('/zones', (_req: Request, res: Response) => {
  const db = getDatabase();
  const zones = db.prepare('SELECT id, name, description FROM zones ORDER BY name').all();
  res.json({ success: true, data: zones });
});

// Public: list shelters for a zone
router.get('/shelters', (req: Request, res: Response) => {
  const db = getDatabase();
  const { zone_id } = req.query;

  let query = 'SELECT id, name, zone_id FROM shelters';
  const params: any[] = [];

  if (zone_id) {
    query += ' WHERE zone_id = ?';
    params.push(zone_id);
  }

  const shelters = db.prepare(query + ' ORDER BY name').all(...params);
  res.json({ success: true, data: shelters });
});

// Public: self-register a household
router.post('/register', (req: Request, res: Response) => {
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
    needs = [],
    phone,
  } = req.body;

  if (!zone_id || !family_size || !head_of_household_name) {
    res.status(400).json({
      success: false,
      error: 'الاسم والمنطقة وعدد الافراد مطلوبين',
    });
    return;
  }

  if (family_size < 1 || family_size > 30) {
    res.status(400).json({ success: false, error: 'عدد الافراد غير صحيح' });
    return;
  }

  // Verify zone exists
  const zone = db.prepare('SELECT id FROM zones WHERE id = ?').get(zone_id);
  if (!zone) {
    res.status(400).json({ success: false, error: 'المنطقة غير موجودة' });
    return;
  }

  const id = uuidv4();
  const token = `ATQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const hasInfants = members.some((m: any) => m.age_band === '0-2');
  const hasElderly = members.some((m: any) => m.age_band === '60+');
  const priorityScore = calculatePriorityScore(vulnerability_flags, family_size, hasInfants, hasElderly, 0);

  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO households (id, token, zone_id, shelter_id, head_of_household_name, family_size,
          displacement_status, vulnerability_flags, priority_score, area_description, notes, created_by, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user-self-reg', 'pending')
      `).run(id, token, zone_id, shelter_id || null, head_of_household_name,
        family_size, displacement_status || 'displaced', JSON.stringify(vulnerability_flags),
        priorityScore, area_description || null,
        notes ? `${notes}${phone ? ' | هاتف: ' + phone : ''}` : (phone ? 'هاتف: ' + phone : null));

      for (const member of members) {
        if (!member.age_band) continue;
        db.prepare(`
          INSERT INTO household_members (id, household_id, age_band, sex, special_needs_flags, sync_status)
          VALUES (?, ?, ?, ?, '[]', 'pending')
        `).run(uuidv4(), id, member.age_band, member.sex || null);
      }

      for (const need of needs) {
        if (!need.category) continue;
        db.prepare(`
          INSERT INTO needs (id, household_id, category, quantity, urgency, status, created_by, sync_status)
          VALUES (?, ?, ?, ?, ?, 'open', 'user-self-reg', 'pending')
        `).run(uuidv4(), id, need.category, need.quantity || 1, need.urgency || 'medium');
      }
    })();

    auditLog('user-self-reg', 'beneficiary', 'create', 'household', id);

    res.status(201).json({
      success: true,
      data: { id, token },
      message: `تم تسجيل اسرتك بنجاح. احتفظ برمز الاسرة: ${token}`,
    });
  } catch (error: any) {
    console.error('Self-registration error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ اثناء التسجيل' });
  }
});

// Public: SMS registration (minimal fields)
router.post('/sms/register', (req: Request, res: Response) => {
  const db = getDatabase();
  const { phone, zone_id, family_size, head_of_household_name, area_description } = req.body;

  if (!phone || !zone_id || !family_size) {
    res.status(400).json({ success: false, error: 'رقم الهاتف والمنطقة وعدد الافراد مطلوبين' });
    return;
  }

  if (family_size < 1 || family_size > 30) {
    res.status(400).json({ success: false, error: 'عدد الافراد غير صحيح' });
    return;
  }

  const zone = db.prepare('SELECT id FROM zones WHERE id = ?').get(zone_id);
  if (!zone) {
    res.status(400).json({ success: false, error: 'المنطقة غير موجودة' });
    return;
  }

  const id = uuidv4();
  const token = `ATQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const priorityScore = calculatePriorityScore([], family_size, false, false, 0);

  try {
    db.prepare(`
      INSERT INTO households (id, token, zone_id, head_of_household_name, family_size,
        displacement_status, vulnerability_flags, priority_score, area_description, notes, created_by, sync_status)
      VALUES (?, ?, ?, ?, ?, 'displaced', '[]', ?, ?, ?, 'user-sms-reg', 'pending')
    `).run(
      id,
      token,
      zone_id,
      head_of_household_name || null,
      family_size,
      priorityScore,
      area_description || null,
      `هاتف: ${phone}`
    );

    auditLog('user-sms-reg', 'beneficiary', 'create', 'household', id, `phone: ${phone}`);

    res.status(201).json({
      success: true,
      data: { id, token },
      message: `تم تسجيل اسرتك عبر الرسائل. رمز الاسرة: ${token}`,
    });
  } catch (error: any) {
    console.error('SMS registration error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ اثناء التسجيل' });
  }
});

// Public: check registration status by token
router.get('/status/:token', (req: Request, res: Response) => {
  const db = getDatabase();
  const household = db.prepare(`
    SELECT h.token, h.head_of_household_name, h.family_size, h.priority_score,
      h.created_at, z.name as zone_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    WHERE h.token = ?
  `).get(req.params.token) as any;

  if (!household) {
    res.status(404).json({ success: false, error: 'رمز الاسرة غير موجود' });
    return;
  }

  const openNeeds = db.prepare(`
    SELECT COUNT(*) as count FROM needs n
    JOIN households h ON n.household_id = h.id
    WHERE h.token = ? AND n.status = 'open'
  `).get(req.params.token) as any;

  const lastDist = db.prepare(`
    SELECT d.distributed_at FROM distributions d
    JOIN households h ON d.household_id = h.id
    WHERE h.token = ? AND d.status = 'completed'
    ORDER BY d.distributed_at DESC LIMIT 1
  `).get(req.params.token) as any;

  res.json({
    success: true,
    data: {
      token: household.token,
      name: household.head_of_household_name,
      family_size: household.family_size,
      zone: household.zone_name,
      registered_at: household.created_at,
      open_needs: openNeeds?.count || 0,
      last_distribution: lastDist?.distributed_at || null,
    },
  });
});

export default router;

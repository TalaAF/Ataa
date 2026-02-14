// ===== Edge Hub - Auth Routes =====
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database';
import { generateToken, generateFamilyToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

// تسجيل الدخول
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    return;
  }

  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as any;

  if (!user) {
    res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    return;
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    return;
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    zone_id: user.zone_id,
    shelter_id: user.shelter_id,
  });

  auditLog(user.id, user.role, 'login', 'user', user.id);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        zone_id: user.zone_id,
        shelter_id: user.shelter_id,
      },
    },
  });
});

// تسجيل الدخول برمز الأسرة
router.post('/family-login', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ success: false, error: 'يرجى إدخال رمز الأسرة' });
    return;
  }

  const db = getDatabase();
  const household = db.prepare(`
    SELECT h.id, h.token, h.zone_id, h.shelter_id, h.head_of_household_name, h.family_size,
           h.displacement_status, h.priority_score, h.area_description, h.notes,
           z.name as zone_name, s.name as shelter_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    LEFT JOIN shelters s ON h.shelter_id = s.id
    WHERE h.token = ?
  `).get(token) as any;

  if (!household) {
    res.status(401).json({ success: false, error: 'رمز الأسرة غير صحيح' });
    return;
  }

  const familyToken = generateFamilyToken({
    household_id: household.id,
    token: household.token,
    zone_id: household.zone_id,
    shelter_id: household.shelter_id,
  });

  auditLog(household.id, 'beneficiary', 'login', 'household', household.id);

  res.json({
    success: true,
    data: {
      token: familyToken,
      household: {
        id: household.id,
        token: household.token,
        zone_id: household.zone_id,
        shelter_id: household.shelter_id,
        head_of_household_name: household.head_of_household_name,
        family_size: household.family_size,
        displacement_status: household.displacement_status,
        priority_score: household.priority_score,
        area_description: household.area_description,
        notes: household.notes,
        zone_name: household.zone_name,
        shelter_name: household.shelter_name,
      },
    },
  });
});

// الملف الشخصي
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare(
    'SELECT id, username, full_name, role, zone_id, shelter_id FROM users WHERE id = ?'
  ).get(req.user!.id) as any;

  if (!user) {
    res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    return;
  }

  res.json({ success: true, data: user });
});

export default router;

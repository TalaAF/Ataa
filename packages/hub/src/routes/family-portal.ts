// ===== Edge Hub - Family Portal Routes =====
import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { familyAuthMiddleware, FamilyAuthRequest } from '../middleware/auth';

const router = Router();

router.use(familyAuthMiddleware);

// معلومات الاسرة
router.get('/me', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const household = db.prepare(`
    SELECT h.*, z.name as zone_name, s.name as shelter_name
    FROM households h
    LEFT JOIN zones z ON h.zone_id = z.id
    LEFT JOIN shelters s ON h.shelter_id = s.id
    WHERE h.id = ?
  `).get(householdId) as any;

  if (!household) {
    res.status(404).json({ success: false, error: 'الاسرة غير موجودة' });
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

// احتياجات الاسرة
router.get('/needs', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const needs = db.prepare(`
    SELECT * FROM needs
    WHERE household_id = ?
    ORDER BY urgency DESC, created_at DESC
  `).all(householdId);

  res.json({ success: true, data: needs });
});

// توزيعات الاسرة
router.get('/distributions', (req: FamilyAuthRequest, res: Response) => {
  const db = getDatabase();
  const householdId = req.family!.household_id;

  const distributions = db.prepare(`
    SELECT * FROM distributions
    WHERE household_id = ?
    ORDER BY created_at DESC
  `).all(householdId) as any[];

  res.json({
    success: true,
    data: distributions.map((d) => ({
      ...d,
      items: JSON.parse(d.items || '[]'),
    })),
  });
});

export default router;

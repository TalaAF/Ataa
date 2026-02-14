// ===== Core - Donor Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole } from '@ataa/shared';

const router = Router();

// Get aggregated needs (no personal data)
router.get('/aggregated-needs', authenticate, authorize(UserRole.DONOR, UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    const zone_id = req.query.zone_id as string;
    const db = getDatabase();

    let sql = `SELECT z.id as zone_id, z.name as zone_name, n.category, n.urgency,
      SUM(n.quantity) as total_quantity, COUNT(DISTINCT h.id) as household_count
      FROM needs n
      JOIN households h ON n.household_id = h.id
      JOIN zones z ON h.zone_id = z.id
      WHERE n.status = 'open'`;
    const params: any[] = [];

    if (zone_id) {
      sql += ' AND h.zone_id = ?';
      params.push(zone_id);
    }

    sql += ' GROUP BY z.id, z.name, n.category, n.urgency ORDER BY z.name, n.urgency DESC, n.category';

    const aggregated = db.prepare(sql).all(...params);
    res.json({ success: true, data: aggregated });
  }
);

// Get donor's pledges
router.get('/pledges', authenticate, authorize(UserRole.DONOR, UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    const db = getDatabase();
    const donor_id = req.user!.role === UserRole.DONOR ? req.user!.id : (req.query.donor_id as string);

    let sql = `SELECT p.*, z.name as zone_name FROM donor_pledges p
      LEFT JOIN zones z ON p.zone_id = z.id`;
    const params: any[] = [];

    if (donor_id) {
      sql += ' WHERE donor_id = ?';
      params.push(donor_id);
    }

    sql += ' ORDER BY p.created_at DESC';

    const pledges = db.prepare(sql).all(...params);
    res.json({ success: true, data: pledges });
  }
);

// Create pledge
router.post('/pledges', authenticate, authorize(UserRole.DONOR, UserRole.ADMIN),
  audit('CREATE', 'pledge'),
  (req: AuthRequest, res: Response) => {
    const { zone_id, category, quantity, description } = req.body;

    if (!category || !quantity) {
      res.status(400).json({ success: false, error: 'category and quantity are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`INSERT INTO donor_pledges (id, donor_id, zone_id, category, quantity, description)
      VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.id, zone_id || null, category, quantity, description || null);

    const pledge = db.prepare('SELECT * FROM donor_pledges WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: pledge });
  }
);

// Update pledge status
router.patch('/pledges/:id/status', authenticate, authorize(UserRole.DONOR, UserRole.ADMIN),
  audit('UPDATE_STATUS', 'pledge'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pledged', 'fulfilled', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Valid status required' });
      return;
    }

    const db = getDatabase();
    const result = db.prepare("UPDATE donor_pledges SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Pledge not found' });
      return;
    }

    const pledge = db.prepare('SELECT * FROM donor_pledges WHERE id = ?').get(id);
    res.json({ success: true, data: pledge });
  }
);

// Dashboard summary for donors
router.get('/dashboard', authenticate, authorize(UserRole.DONOR, UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    const db = getDatabase();

    const totalHouseholds = (db.prepare('SELECT COUNT(*) as c FROM households').get() as any).c;
    const totalMembers = (db.prepare('SELECT COUNT(*) as c FROM household_members').get() as any).c;
    const openNeeds = (db.prepare("SELECT COUNT(*) as c FROM needs WHERE status = 'open'").get() as any).c;
    const criticalNeeds = (db.prepare("SELECT COUNT(*) as c FROM needs WHERE status = 'open' AND urgency = 'critical'").get() as any).c;
    const completedDist = (db.prepare("SELECT COUNT(*) as c FROM distributions WHERE status = 'completed'").get() as any).c;

    const donor_id = req.user!.role === UserRole.DONOR ? req.user!.id : undefined;
    let pledgesSql = "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'pledged' THEN 1 ELSE 0 END) as active FROM donor_pledges";
    const pledgeParams: any[] = [];
    if (donor_id) {
      pledgesSql += ' WHERE donor_id = ?';
      pledgeParams.push(donor_id);
    }
    const pledgeStats = db.prepare(pledgesSql).get(...pledgeParams) as any;

    res.json({
      success: true,
      data: {
        total_households: totalHouseholds,
        total_members: totalMembers,
        open_needs: openNeeds,
        critical_needs: criticalNeeds,
        completed_distributions: completedDist,
        total_pledges: pledgeStats.total,
        active_pledges: pledgeStats.active,
      },
    });
  }
);

// Zones list
router.get('/zones', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
  res.json({ success: true, data: zones });
});

export default router;

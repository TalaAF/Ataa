// ===== Core - Matches & Offers/Requests Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { UserRole, OfferRequestStatus, MatchStatus } from '@ataa/shared';

const router = Router();

// Offers
router.get('/offers', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zone_id = req.query.zone_id as string;
  const status = req.query.status as string;

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (zone_id) { where += ' AND o.zone_id = ?'; params.push(zone_id); }
  if (status) { where += ' AND o.status = ?'; params.push(status); }

  const offers = db.prepare(`SELECT o.*, z.name as zone_name, u.full_name as created_by_name
    FROM offers o JOIN zones z ON o.zone_id = z.id LEFT JOIN users u ON o.created_by = u.id
    ${where} ORDER BY o.created_at DESC`).all(...params);

  res.json({ success: true, data: offers });
});

router.post('/offers', authenticate, audit('CREATE', 'offer'),
  (req: AuthRequest, res: Response) => {
    const { zone_id, category, description, quantity, expiry, household_id } = req.body;
    if (!zone_id || !category || !quantity) {
      res.status(400).json({ success: false, error: 'zone_id, category, and quantity are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();
    db.prepare('INSERT INTO offers (id, zone_id, created_by, household_id, category, description, quantity, expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, zone_id, req.user!.id, household_id || null, category, description || null, quantity, expiry || null);

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: offer });
  }
);

// Requests
router.get('/requests', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const zone_id = req.query.zone_id as string;
  const status = req.query.status as string;

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (zone_id) { where += ' AND r.zone_id = ?'; params.push(zone_id); }
  if (status) { where += ' AND r.status = ?'; params.push(status); }

  const requests = db.prepare(`SELECT r.*, z.name as zone_name
    FROM requests r JOIN zones z ON r.zone_id = z.id ${where} ORDER BY r.created_at DESC`).all(...params);

  res.json({ success: true, data: requests });
});

router.post('/requests', authenticate, audit('CREATE', 'request'),
  (req: AuthRequest, res: Response) => {
    const { household_id, zone_id, category, description, quantity } = req.body;
    if (!zone_id || !category || !quantity) {
      res.status(400).json({ success: false, error: 'zone_id, category, and quantity are required' });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();
    db.prepare('INSERT INTO requests (id, household_id, zone_id, category, description, quantity) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, household_id || null, zone_id, category, description || null, quantity);

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: request });
  }
);

// Matches
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const status = req.query.status as string;

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (status) { where += ' AND m.status = ?'; params.push(status); }

  const matches = db.prepare(`SELECT m.*, o.category as offer_category, o.quantity as offer_quantity,
    r.category as request_category, r.quantity as request_quantity, pp.name as pickup_point_name
    FROM matches m JOIN offers o ON m.offer_id = o.id JOIN requests r ON m.request_id = r.id
    LEFT JOIN pickup_points pp ON m.pickup_point_id = pp.id
    ${where} ORDER BY m.created_at DESC`).all(...params);

  res.json({ success: true, data: matches });
});

router.post('/', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('CREATE', 'match'),
  (req: AuthRequest, res: Response) => {
    const { offer_id, request_id, pickup_point_id } = req.body;
    if (!offer_id || !request_id) {
      res.status(400).json({ success: false, error: 'offer_id and request_id are required' });
      return;
    }

    const db = getDatabase();
    const offer = db.prepare('SELECT zone_id, status FROM offers WHERE id = ?').get(offer_id) as any;
    const request = db.prepare('SELECT zone_id, status FROM requests WHERE id = ?').get(request_id) as any;

    if (!offer || !request) { res.status(404).json({ success: false, error: 'Offer or request not found' }); return; }
    if (offer.zone_id !== request.zone_id) { res.status(400).json({ success: false, error: 'Must be in same zone' }); return; }
    if (offer.status !== OfferRequestStatus.OPEN || request.status !== OfferRequestStatus.OPEN) {
      res.status(400).json({ success: false, error: 'Both must be open' }); return;
    }

    const id = uuidv4();
    db.transaction(() => {
      db.prepare('INSERT INTO matches (id, offer_id, request_id, pickup_point_id, status) VALUES (?, ?, ?, ?, ?)')
        .run(id, offer_id, request_id, pickup_point_id || null, MatchStatus.PENDING);
      db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(OfferRequestStatus.MATCHED, offer_id);
      db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(OfferRequestStatus.MATCHED, request_id);
    })();

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: match });
  }
);

router.patch('/:id/status', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  audit('UPDATE_STATUS', 'match'),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(MatchStatus).includes(status)) {
      res.status(400).json({ success: false, error: 'Valid status required' });
      return;
    }

    const db = getDatabase();
    const result = db.prepare("UPDATE matches SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Match not found' }); return; }

    if (status === MatchStatus.COMPLETED) {
      const match = db.prepare('SELECT offer_id, request_id FROM matches WHERE id = ?').get(id) as any;
      db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(OfferRequestStatus.COMPLETED, match.offer_id);
      db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(OfferRequestStatus.COMPLETED, match.request_id);
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.json({ success: true, data: match });
  }
);

export default router;

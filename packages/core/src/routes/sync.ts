// ===== Core - Sync Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { UserRole, SyncPayload, SyncResponse } from '@ataa/shared';

const router = Router();

// Receive sync push from edge hub
router.post('/push', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    const payload: SyncPayload = req.body;

    if (!payload.hub_id || !payload.timestamp) {
      res.status(400).json({ success: false, error: 'hub_id and timestamp are required' });
      return;
    }

    const db = getDatabase();
    let recordsCount = 0;
    const conflicts: any[] = [];

    try {
      db.transaction(() => {
        const upsertHousehold = db.prepare(`
          INSERT OR REPLACE INTO households (id, token, zone_id, shelter_id, head_of_household_name,
            family_size, displacement_status, vulnerability_flags, priority_score, area_description, notes,
            created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const h of payload.households || []) {
          try {
            upsertHousehold.run(h.id, h.token, h.zone_id, h.shelter_id || null, h.head_of_household_name || null,
              h.family_size, h.displacement_status,
              typeof h.vulnerability_flags === 'string' ? h.vulnerability_flags : JSON.stringify(h.vulnerability_flags),
              h.priority_score, h.area_description || null, h.notes || null, h.created_by, h.created_at, h.updated_at);
            recordsCount++;
          } catch { conflicts.push({ entity_type: 'household', entity_id: h.id }); }
        }

        const upsertMember = db.prepare(`
          INSERT OR REPLACE INTO household_members (id, household_id, age_band, sex, special_needs_flags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of payload.members || []) {
          try {
            upsertMember.run(m.id, m.household_id, m.age_band, m.sex || null,
              typeof m.special_needs_flags === 'string' ? m.special_needs_flags : JSON.stringify(m.special_needs_flags),
              m.created_at, m.updated_at);
            recordsCount++;
          } catch { conflicts.push({ entity_type: 'member', entity_id: m.id }); }
        }

        const upsertNeed = db.prepare(`
          INSERT OR REPLACE INTO needs (id, household_id, category, description, quantity, urgency, status, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const n of payload.needs || []) {
          try {
            upsertNeed.run(n.id, n.household_id, n.category, n.description || null,
              n.quantity, n.urgency, n.status, n.created_by, n.created_at, n.updated_at);
            recordsCount++;
          } catch { conflicts.push({ entity_type: 'need', entity_id: n.id }); }
        }

        const upsertDist = db.prepare(`
          INSERT OR REPLACE INTO distributions (id, household_id, location_id, status, items, distributed_by, distributed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const d of payload.distributions || []) {
          try {
            upsertDist.run(d.id, d.household_id, d.location_id, d.status,
              typeof d.items === 'string' ? d.items : JSON.stringify(d.items),
              d.distributed_by, d.distributed_at || null, d.created_at, d.updated_at);
            recordsCount++;
          } catch { conflicts.push({ entity_type: 'distribution', entity_id: d.id }); }
        }

        db.prepare(`INSERT INTO sync_log (id, hub_id, direction, status, records_count, conflicts_count, timestamp)
          VALUES (?, ?, 'push', ?, ?, ?, datetime('now'))
        `).run(uuidv4(), payload.hub_id, conflicts.length > 0 ? 'partial' : 'ok', recordsCount, conflicts.length);
      })();

      res.json({
        success: true,
        data: {
          status: conflicts.length > 0 ? 'partial' : 'ok',
          conflicts,
          server_timestamp: new Date().toISOString(),
          records_accepted: recordsCount,
        } as any,
      });
    } catch (error: any) {
      console.error('Sync push error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Pull updates
router.post('/pull', authenticate, authorize(UserRole.FIELD_WORKER, UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    const { hub_id, since_timestamp, zone_id } = req.body;

    if (!hub_id || !zone_id) {
      res.status(400).json({ success: false, error: 'hub_id and zone_id are required' });
      return;
    }

    const db = getDatabase();
    const sinceTime = since_timestamp || '1970-01-01T00:00:00Z';

    const households = db.prepare('SELECT * FROM households WHERE zone_id = ? AND updated_at > ?').all(zone_id, sinceTime);
    const members = db.prepare(`SELECT m.* FROM household_members m JOIN households h ON m.household_id = h.id
      WHERE h.zone_id = ? AND m.updated_at > ?`).all(zone_id, sinceTime);
    const needs = db.prepare(`SELECT n.* FROM needs n JOIN households h ON n.household_id = h.id
      WHERE h.zone_id = ? AND n.updated_at > ?`).all(zone_id, sinceTime);

    const response: SyncResponse = {
      status: 'ok',
      conflicts: [],
      server_timestamp: new Date().toISOString(),
      updates: {
        hub_id, timestamp: new Date().toISOString(),
        households: households as any, members: members as any, needs: needs as any,
        offers: [], requests: [], distributions: [], audit_logs: [],
      },
    };

    res.json({ success: true, data: response });
  }
);

export default router;

// ===== Edge Hub - Sync Routes =====
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getDatabase } from '../db/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '@ataa/shared';

const CORE_URL = process.env.CORE_URL || 'http://localhost:4000';
const CORE_USERNAME = process.env.CORE_SYNC_USER || 'admin';
const CORE_PASSWORD = process.env.CORE_SYNC_PASS || 'admin123';

let cachedCoreToken: { token: string; expires: number } | null = null;

async function getCoreToken(): Promise<string> {
  // Reuse token if still valid (with 1-minute buffer)
  if (cachedCoreToken && cachedCoreToken.expires > Date.now() + 60000) {
    return cachedCoreToken.token;
  }

  const response = await axios.post(`${CORE_URL}/api/auth/login`, {
    username: CORE_USERNAME,
    password: CORE_PASSWORD,
  }, { timeout: 10000 });

  const token = response.data?.data?.token || response.data?.token;
  if (!token) throw new Error('Failed to authenticate with core server');

  // Cache token for 23 hours (JWT is typically 24h)
  cachedCoreToken = { token, expires: Date.now() + 23 * 3600 * 1000 };
  return token;
}

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

// حالة المزامنة
router.get('/status', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const pendingCounts = {
    households: (db.prepare("SELECT COUNT(*) as c FROM households WHERE sync_status = 'pending'").get() as any).c,
    needs: (db.prepare("SELECT COUNT(*) as c FROM needs WHERE sync_status = 'pending'").get() as any).c,
    distributions: (db.prepare("SELECT COUNT(*) as c FROM distributions WHERE sync_status = 'pending'").get() as any).c,
    offers: (db.prepare("SELECT COUNT(*) as c FROM offers WHERE sync_status = 'pending'").get() as any).c,
    requests: (db.prepare("SELECT COUNT(*) as c FROM requests WHERE sync_status = 'pending'").get() as any).c,
  };

  const lastSync = db.prepare(
    "SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 1"
  ).get();

  res.json({
    success: true,
    data: {
      pending: pendingCounts,
      total_pending: Object.values(pendingCounts).reduce((a, b) => a + b, 0),
      last_sync: lastSync,
    },
  });
});

// دفع البيانات للمركز
router.post('/push', async (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  // Collect all pending records
  const households = db.prepare("SELECT * FROM households WHERE sync_status = 'pending'").all();
  const members = db.prepare(`
    SELECT m.* FROM household_members m
    JOIN households h ON m.household_id = h.id
    WHERE m.sync_status = 'pending'
  `).all();
  const needs = db.prepare("SELECT * FROM needs WHERE sync_status = 'pending'").all();
  const distributions = db.prepare("SELECT * FROM distributions WHERE sync_status = 'pending'").all();
  const offers = db.prepare("SELECT * FROM offers WHERE sync_status = 'pending'").all();
  const requests = db.prepare("SELECT * FROM requests WHERE sync_status = 'pending'").all();
  const auditLogs = db.prepare(
    "SELECT * FROM audit_log WHERE timestamp > COALESCE((SELECT MAX(timestamp) FROM sync_log WHERE direction = 'push' AND status = 'ok'), '1970-01-01')"
  ).all();

  const payload = {
    hub_id: process.env.HUB_ID || 'hub-default',
    timestamp: new Date().toISOString(),
    households,
    members,
    needs,
    distributions: distributions.map((d: any) => ({ ...d, items: JSON.parse(d.items || '[]') })),
    offers,
    requests,
    audit_logs: auditLogs,
  };

  const syncId = uuidv4();
  const totalRecords = households.length + members.length + needs.length +
    distributions.length + offers.length + requests.length;

  if (totalRecords === 0) {
    res.json({
      success: true,
      data: { sync_id: syncId, records_pushed: 0 },
      message: 'لا توجد سجلات معلقة للمزامنة',
    });
    return;
  }

  try {
    // Authenticate with core server
    const coreToken = await getCoreToken();

    // POST payload to core's sync endpoint
    const coreResponse = await axios.post(`${CORE_URL}/api/sync/push`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,
      },
      timeout: 30000,
    });

    const coreData = coreResponse.data?.data;

    // Mark all as synced locally
    db.transaction(() => {
      db.prepare("UPDATE households SET sync_status = 'synced' WHERE sync_status = 'pending'").run();
      db.prepare("UPDATE household_members SET sync_status = 'synced' WHERE sync_status = 'pending'").run();
      db.prepare("UPDATE needs SET sync_status = 'synced' WHERE sync_status = 'pending'").run();
      db.prepare("UPDATE distributions SET sync_status = 'synced' WHERE sync_status = 'pending'").run();
      db.prepare("UPDATE offers SET sync_status = 'synced' WHERE sync_status = 'pending'").run();
      db.prepare("UPDATE requests SET sync_status = 'synced' WHERE sync_status = 'pending'").run();

      // Log successful sync
      db.prepare(`
        INSERT INTO sync_log (id, direction, status, records_pushed, timestamp)
        VALUES (?, 'push', ?, ?, datetime('now'))
      `).run(syncId, coreData?.status || 'ok', totalRecords);
    })();

    res.json({
      success: true,
      data: {
        sync_id: syncId,
        records_pushed: totalRecords,
        core_accepted: coreData?.records_accepted || totalRecords,
        core_conflicts: coreData?.conflicts || [],
        payload_preview: {
          households: households.length,
          members: members.length,
          needs: needs.length,
          distributions: distributions.length,
          offers: offers.length,
          requests: requests.length,
        },
      },
      message: `تمت مزامنة ${totalRecords} سجل بنجاح`,
    });
  } catch (error: any) {
    // Log failed sync attempt
    db.prepare(`
      INSERT INTO sync_log (id, direction, status, records_pushed, errors, timestamp)
      VALUES (?, 'push', 'error', ?, ?, datetime('now'))
    `).run(syncId, totalRecords, error.message || 'Connection failed');

    const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';

    res.status(isConnectionError ? 503 : 500).json({
      success: false,
      error: isConnectionError
        ? 'تعذر الاتصال بالخادم المركزي - تاكد من تشغيل Core Server'
        : `خطا في المزامنة: ${error.message}`,
      data: {
        sync_id: syncId,
        records_pending: totalRecords,
      },
    });
  }
});

// سحب البيانات من المركز
router.post('/pull', async (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { zone_id } = req.body;

  if (!zone_id) {
    res.status(400).json({ success: false, error: 'zone_id مطلوب' });
    return;
  }

  // Get last successful pull timestamp
  const lastPull = db.prepare(
    "SELECT MAX(timestamp) as ts FROM sync_log WHERE direction = 'pull' AND status = 'ok'"
  ).get() as any;

  const syncId = uuidv4();

  try {
    const coreToken = await getCoreToken();

    const coreResponse = await axios.post(`${CORE_URL}/api/sync/pull`, {
      hub_id: process.env.HUB_ID || 'hub-default',
      since_timestamp: lastPull?.ts || '1970-01-01T00:00:00Z',
      zone_id,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,
      },
      timeout: 30000,
    });

    const updates = coreResponse.data?.data?.updates;
    let recordsPulled = 0;

    if (updates) {
      db.transaction(() => {
        // Upsert households from core
        const upsertHousehold = db.prepare(`
          INSERT OR REPLACE INTO households (id, token, zone_id, shelter_id, head_of_household_name,
            family_size, displacement_status, vulnerability_flags, priority_score, area_description, notes,
            created_by, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `);
        for (const h of updates.households || []) {
          upsertHousehold.run(h.id, h.token, h.zone_id, h.shelter_id, h.head_of_household_name,
            h.family_size, h.displacement_status,
            typeof h.vulnerability_flags === 'string' ? h.vulnerability_flags : JSON.stringify(h.vulnerability_flags),
            h.priority_score, h.area_description || null, h.notes, h.created_by, h.created_at, h.updated_at);
          recordsPulled++;
        }

        // Upsert members
        const upsertMember = db.prepare(`
          INSERT OR REPLACE INTO household_members (id, household_id, age_band, sex, special_needs_flags, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
        `);
        for (const m of updates.members || []) {
          upsertMember.run(m.id, m.household_id, m.age_band, m.sex,
            typeof m.special_needs_flags === 'string' ? m.special_needs_flags : JSON.stringify(m.special_needs_flags),
            m.created_at, m.updated_at);
          recordsPulled++;
        }

        // Upsert needs
        const upsertNeed = db.prepare(`
          INSERT OR REPLACE INTO needs (id, household_id, category, description, quantity, urgency, status, created_by, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `);
        for (const n of updates.needs || []) {
          upsertNeed.run(n.id, n.household_id, n.category, n.description,
            n.quantity, n.urgency, n.status, n.created_by, n.created_at, n.updated_at);
          recordsPulled++;
        }

        // Log successful pull
        db.prepare(`
          INSERT INTO sync_log (id, direction, status, records_pulled, timestamp)
          VALUES (?, 'pull', 'ok', ?, datetime('now'))
        `).run(syncId, recordsPulled);
      })();
    }

    res.json({
      success: true,
      data: {
        sync_id: syncId,
        records_pulled: recordsPulled,
        server_timestamp: coreResponse.data?.data?.server_timestamp,
      },
      message: `تم سحب ${recordsPulled} سجل من المركز`,
    });
  } catch (error: any) {
    db.prepare(`
      INSERT INTO sync_log (id, direction, status, records_pulled, errors, timestamp)
      VALUES (?, 'pull', 'error', 0, ?, datetime('now'))
    `).run(syncId, error.message || 'Connection failed');

    const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';

    res.status(isConnectionError ? 503 : 500).json({
      success: false,
      error: isConnectionError
        ? 'تعذر الاتصال بالخادم المركزي - تاكد من تشغيل Core Server'
        : `خطا في السحب: ${error.message}`,
    });
  }
});

// سجل المزامنة
router.get('/log', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const logs = db.prepare('SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 50').all();
  res.json({ success: true, data: logs });
});

export default router;

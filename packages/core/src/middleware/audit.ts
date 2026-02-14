// ===== Core - Audit Middleware =====
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from './auth';
import { getDatabase } from '../db/database';

export function auditLog(
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), actorId, actorRole, action, entityType, entityId, details || null);
}

export function audit(action: string, entityType: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || body?.data?.id || 'unknown';
        auditLog(req.user.id, req.user.role, action, entityType, entityId);
      }
      return originalJson(body);
    };
    next();
  };
}

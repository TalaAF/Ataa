// ===== Edge Hub - Auth Middleware =====
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@ataa/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'ataa-hub-secret-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    zone_id?: string;
    shelter_id?: string;
  };
}

export interface FamilyAuthRequest extends Request {
  family?: {
    household_id: string;
    token: string;
    zone_id?: string;
    shelter_id?: string;
  };
}

export function generateToken(user: {
  id: string;
  username: string;
  role: UserRole;
  zone_id?: string;
  shelter_id?: string;
}): string {
  return jwt.sign({ ...user, kind: 'user' }, JWT_SECRET, { expiresIn: '24h' });
}

export function generateFamilyToken(family: {
  household_id: string;
  token: string;
  zone_id?: string;
  shelter_id?: string;
}): string {
  return jwt.sign({ ...family, kind: 'family' }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'غير مصرح - يرجى تسجيل الدخول' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'جلسة منتهية - يرجى إعادة تسجيل الدخول' });
  }
}

export function familyAuthMiddleware(req: FamilyAuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'غير مصرح - يرجى إدخال رمز الأسرة' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as any;
    if (decoded?.kind !== 'family' || !decoded?.household_id) {
      res.status(401).json({ success: false, error: 'رمز الأسرة غير صالح' });
      return;
    }
    req.family = {
      household_id: decoded.household_id,
      token: decoded.token,
      zone_id: decoded.zone_id,
      shelter_id: decoded.shelter_id,
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'جلسة الأسرة منتهية - يرجى إعادة تسجيل الدخول' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية للوصول' });
      return;
    }
    next();
  };
}

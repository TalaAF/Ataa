// ===== Core - Auth Routes =====
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { generateToken } from '../middleware/auth';
import { UserRole } from '@ataa/shared';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password required' });
    return;
  }

  const db = getDatabase();
  const user = db.prepare(
    'SELECT id, username, password_hash, full_name, role, zone_id, shelter_id, is_active FROM users WHERE username = ?'
  ).get(username) as any;

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ success: false, error: 'Account is inactive' });
    return;
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    zone_id: user.zone_id,
    shelter_id: user.shelter_id,
  });

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

router.post('/register', (req: Request, res: Response) => {
  const { username, password, full_name, role, zone_id, shelter_id } = req.body;

  if (!username || !password || !full_name) {
    res.status(400).json({ success: false, error: 'Username, password, and full name are required' });
    return;
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ success: false, error: 'Username already exists' });
    return;
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  db.prepare(
    'INSERT INTO users (id, username, password_hash, full_name, role, zone_id, shelter_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, password_hash, full_name, role || UserRole.FIELD_WORKER, zone_id || null, shelter_id || null);

  const newUser = db.prepare(
    'SELECT id, username, full_name, role, zone_id, shelter_id, created_at FROM users WHERE id = ?'
  ).get(id);

  res.status(201).json({ success: true, data: newUser });
});

export default router;

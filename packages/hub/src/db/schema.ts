// ===== Edge Hub - SQLite Schema =====

export const CREATE_TABLES_SQL = `
-- المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'field_worker',
  zone_id TEXT,
  shelter_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- المناطق
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_zone_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_zone_id) REFERENCES zones(id)
);

-- المراكز/المآوي
CREATE TABLE IF NOT EXISTS shelters (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER,
  current_occupancy INTEGER DEFAULT 0,
  location_coarse TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

-- نقاط الاستلام
CREATE TABLE IF NOT EXISTS pickup_points (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  shelter_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (shelter_id) REFERENCES shelters(id)
);

-- الأسر
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  zone_id TEXT NOT NULL,
  shelter_id TEXT,
  head_of_household_name TEXT,
  family_size INTEGER NOT NULL DEFAULT 1,
  displacement_status TEXT NOT NULL DEFAULT 'displaced',
  vulnerability_flags TEXT NOT NULL DEFAULT '[]',
  priority_score REAL NOT NULL DEFAULT 0,
  area_description TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (shelter_id) REFERENCES shelters(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- أفراد الأسر
CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  age_band TEXT NOT NULL,
  sex TEXT,
  special_needs_flags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

-- الاحتياجات
CREATE TABLE IF NOT EXISTS needs (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  urgency TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- العروض
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  household_id TEXT,
  category TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  expiry TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (household_id) REFERENCES households(id)
);

-- الطلبات
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  household_id TEXT,
  zone_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (household_id) REFERENCES households(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

-- المطابقات
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_point_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (offer_id) REFERENCES offers(id),
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id)
);

-- المخزون
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'shelter',
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty_available INTEGER NOT NULL DEFAULT 0,
  qty_reserved INTEGER NOT NULL DEFAULT 0,
  batch_info TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- التوزيعات
CREATE TABLE IF NOT EXISTS distributions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  items TEXT NOT NULL DEFAULT '[]',
  distributed_by TEXT NOT NULL,
  distributed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (household_id) REFERENCES households(id),
  FOREIGN KEY (distributed_by) REFERENCES users(id)
);

-- سجل المراجعة
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جدول المزامنة
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  records_pushed INTEGER DEFAULT 0,
  records_pulled INTEGER DEFAULT 0,
  errors TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_households_zone ON households(zone_id);
CREATE INDEX IF NOT EXISTS idx_households_shelter ON households(shelter_id);
CREATE INDEX IF NOT EXISTS idx_households_sync ON households(sync_status);
CREATE INDEX IF NOT EXISTS idx_households_token ON households(token);
CREATE INDEX IF NOT EXISTS idx_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_needs_household ON needs(household_id);
CREATE INDEX IF NOT EXISTS idx_needs_category ON needs(category);
CREATE INDEX IF NOT EXISTS idx_needs_status ON needs(status);
CREATE INDEX IF NOT EXISTS idx_needs_sync ON needs(sync_status);
CREATE INDEX IF NOT EXISTS idx_offers_zone ON offers(zone_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_requests_zone ON requests(zone_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_distributions_household ON distributions(household_id);
CREATE INDEX IF NOT EXISTS idx_distributions_sync ON distributions(sync_status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
`;

export const SEED_DATA_SQL = `
-- بيانات أولية للاختبار
INSERT OR IGNORE INTO zones (id, name, description) VALUES
  ('zone-1', 'المنطقة الشمالية', 'منطقة النزوح الشمالية'),
  ('zone-2', 'المنطقة الجنوبية', 'منطقة النزوح الجنوبية'),
  ('zone-3', 'المنطقة الوسطى', 'منطقة التجمع المركزية');

INSERT OR IGNORE INTO shelters (id, zone_id, name, capacity, current_occupancy) VALUES
  ('shelter-1', 'zone-1', 'مركز الأمل', 200, 150),
  ('shelter-2', 'zone-1', 'مدرسة النور', 300, 220),
  ('shelter-3', 'zone-2', 'مركز السلام', 250, 180),
  ('shelter-4', 'zone-3', 'مركز الرحمة', 400, 310);

INSERT OR IGNORE INTO pickup_points (id, zone_id, shelter_id, name, description) VALUES
  ('pp-1', 'zone-1', 'shelter-1', 'نقطة استلام مركز الأمل', 'البوابة الرئيسية'),
  ('pp-2', 'zone-1', 'shelter-2', 'نقطة استلام مدرسة النور', 'الساحة الخارجية'),
  ('pp-3', 'zone-2', 'shelter-3', 'نقطة استلام مركز السلام', 'المدخل الشرقي'),
  ('pp-4', 'zone-3', 'shelter-4', 'نقطة استلام مركز الرحمة', 'قاعة التوزيع');

INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, zone_id) VALUES
  ('user-admin', 'admin', '$2a$10$placeholder_admin_hash', 'مدير النظام', 'admin', NULL),
  ('user-field-1', 'field1', '$2a$10$placeholder_field_hash', 'أحمد الميداني', 'field_worker', 'zone-1'),
  ('user-field-2', 'field2', '$2a$10$placeholder_field_hash', 'فاطمة العاملة', 'field_worker', 'zone-2'),
  ('user-donor-1', 'donor1', '$2a$10$placeholder_donor_hash', 'منظمة الإغاثة', 'donor', NULL),
  ('user-self-reg', 'self-register', '$2a$10$placeholder_nologin', 'تسجيل ذاتي', 'beneficiary', NULL);
`;

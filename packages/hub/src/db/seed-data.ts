// ===== Hub - Comprehensive Seed Data =====
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';

const ZONES = ['zone-1', 'zone-2', 'zone-3'];
const SHELTERS = ['shelter-1', 'shelter-2', 'shelter-3', 'shelter-4'];
const FIELD_USERS = ['user-field-1', 'user-field-2'];

// Realistic Arabic names
const MALE_NAMES = [
  'محمد أحمد', 'علي حسين', 'عمر خالد', 'يوسف إبراهيم', 'حسن عبدالله',
  'إبراهيم سالم', 'خالد محمود', 'أحمد فؤاد', 'سعيد ناصر', 'عبدالرحمن طارق',
  'نور الدين', 'بلال سمير', 'طارق رشاد', 'ماجد فيصل', 'وليد حسام',
  'فادي زياد', 'رامي عادل', 'هشام كمال', 'سامر جمال', 'عماد صالح',
];

const FEMALE_NAMES = [
  'فاطمة محمد', 'عائشة علي', 'مريم حسن', 'نورة سالم', 'هدى إبراهيم',
  'سارة أحمد', 'ليلى خالد', 'رنا عمر', 'دينا يوسف', 'حنان عبدالله',
  'سمية طارق', 'أمل ناصر', 'خديجة فؤاد', 'زينب محمود', 'رقية سعيد',
];

const CATEGORIES = ['food', 'water', 'hygiene', 'medicine', 'shelter', 'clothing'];
const URGENCIES = ['low', 'medium', 'high', 'critical'];
const VULNERABILITY_FLAGS = ['pregnant', 'disabled', 'chronic_illness', 'elderly_alone', 'orphans', 'female_headed', 'large_family'];
const DISPLACEMENT_STATUSES = ['displaced', 'returnee', 'host'];

const FOOD_ITEMS = ['ارز', 'طحين', 'زيت طبخ', 'سكر', 'شاي', 'معلبات', 'تمر', 'حليب مجفف', 'عدس', 'معكرونة'];
const WATER_ITEMS = ['مياه شرب 1.5L', 'مياه شرب 5L', 'فلتر مياه'];
const HYGIENE_ITEMS = ['صابون', 'شامبو', 'معجون اسنان', 'فوط صحية', 'حفاضات اطفال', 'مناديل معقمة'];
const MEDICINE_ITEMS = ['باراسيتامول', 'مضاد حيوي', 'ضمادات', 'محلول ملحي', 'ادوية ضغط', 'انسولين'];
const SHELTER_ITEMS = ['خيمة عائلية', 'بطانية', 'فراش', 'مشمع بلاستيك', 'حبل'];
const CLOTHING_ITEMS = ['ملابس اطفال', 'ملابس نسائية', 'ملابس رجالية', 'احذية', 'جوارب'];

const ITEM_MAP: Record<string, string[]> = {
  food: FOOD_ITEMS, water: WATER_ITEMS, hygiene: HYGIENE_ITEMS,
  medicine: MEDICINE_ITEMS, shelter: SHELTER_ITEMS, clothing: CLOTHING_ITEMS,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export function seedExtendedData(): void {
  const db = getDatabase();

  // Check if extended seed data already exists
  const hhCount = (db.prepare('SELECT COUNT(*) as c FROM households').get() as any).c;
  if (hhCount > 5) {
    console.log('[SEED] Extended data already exists, skipping...');
    return;
  }

  console.log('[SEED] Generating extended seed data...');

  const householdIds: string[] = [];
  const needIds: string[] = [];
  const offerIds: string[] = [];
  const requestIds: string[] = [];

  db.transaction(() => {
    // ===== 50 Households =====
    const insertHH = db.prepare(`INSERT OR IGNORE INTO households
      (id, token, zone_id, shelter_id, head_of_household_name, family_size, displacement_status, vulnerability_flags, priority_score, notes, created_by, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);

    const insertMember = db.prepare(`INSERT OR IGNORE INTO household_members
      (id, household_id, age_band, sex, special_needs_flags, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, '[]', ?, ?, 'synced')`);

    for (let i = 0; i < 50; i++) {
      const hhId = uuidv4();
      householdIds.push(hhId);
      const token = `ATT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const zoneId = pick(ZONES);
      const shelterId = zoneId === 'zone-1' ? pick(['shelter-1', 'shelter-2']) :
                         zoneId === 'zone-2' ? 'shelter-3' : 'shelter-4';
      const isFemaleHeaded = Math.random() < 0.3;
      const headName = isFemaleHeaded ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
      const familySize = randInt(1, 10);
      const displacement = pick(DISPLACEMENT_STATUSES);

      const numFlags = randInt(0, 3);
      const flags = pickN(VULNERABILITY_FLAGS, numFlags);
      if (isFemaleHeaded && !flags.includes('female_headed')) flags.push('female_headed');

      let priority = 0;
      const weights: Record<string, number> = { pregnant: 3, disabled: 4, chronic_illness: 3, elderly_alone: 4, orphans: 5, female_headed: 2, large_family: 2 };
      for (const f of flags) priority += weights[f] || 1;
      if (familySize > 6) priority += 3; else if (familySize > 4) priority += 2; else if (familySize > 2) priority += 1;
      priority = Math.min(priority, 30);

      const createdAt = daysAgo(randInt(1, 60));
      const fieldUser = zoneId === 'zone-1' ? 'user-field-1' : 'user-field-2';

      insertHH.run(hhId, token, zoneId, shelterId, headName, familySize, displacement,
        JSON.stringify(flags), priority, null, fieldUser, createdAt, createdAt);

      // Add members
      const ageBands = ['0-2', '3-12', '13-17', '18-59', '60+'];
      const memberCount = Math.min(familySize, randInt(1, familySize));
      for (let j = 0; j < memberCount; j++) {
        insertMember.run(uuidv4(), hhId, pick(ageBands), pick(['male', 'female']), createdAt, createdAt);
      }
    }

    // ===== 200+ Needs =====
    const insertNeed = db.prepare(`INSERT OR IGNORE INTO needs
      (id, household_id, category, description, quantity, urgency, status, created_by, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);

    for (let i = 0; i < 200; i++) {
      const needId = uuidv4();
      needIds.push(needId);
      const hhId = pick(householdIds);
      const category = pick(CATEGORIES);
      const items = ITEM_MAP[category];
      const description = pick(items);
      const quantity = randInt(1, 20);

      // Weighted urgency: more medium/high, fewer critical/low
      const urgencyWeights = [0.15, 0.35, 0.30, 0.20];
      const r = Math.random();
      let urgency = 'medium';
      let cumulative = 0;
      for (let u = 0; u < URGENCIES.length; u++) {
        cumulative += urgencyWeights[u];
        if (r < cumulative) { urgency = URGENCIES[u]; break; }
      }

      // 70% open, 20% fulfilled, 10% cancelled
      const statusR = Math.random();
      const status = statusR < 0.7 ? 'open' : statusR < 0.9 ? 'fulfilled' : 'cancelled';

      const createdAt = daysAgo(randInt(0, 45));
      const fieldUser = pick(FIELD_USERS);

      insertNeed.run(needId, hhId, category, description, quantity, urgency, status, fieldUser, createdAt, createdAt);
    }

    // ===== 30 Inventory Items =====
    const insertInv = db.prepare(`INSERT OR IGNORE INTO inventory
      (id, location_id, location_type, category, item_name, qty_available, qty_reserved, batch_info, expiry_date, created_at, updated_at)
      VALUES (?, ?, 'shelter', ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const shelter of SHELTERS) {
      for (const category of CATEGORIES) {
        const items = ITEM_MAP[category];
        const itemName = pick(items);
        const qty = randInt(10, 500);
        const reserved = randInt(0, Math.floor(qty * 0.3));
        const batch = `BATCH-${randInt(1000, 9999)}`;
        const expiry = category === 'food' || category === 'medicine'
          ? new Date(Date.now() + randInt(30, 180) * 86400000).toISOString().substring(0, 10)
          : null;
        const createdAt = daysAgo(randInt(5, 30));
        insertInv.run(uuidv4(), shelter, category, itemName, qty, reserved, batch, expiry, createdAt, createdAt);
      }
    }

    // Additional inventory variety
    for (let i = 0; i < 10; i++) {
      const category = pick(CATEGORIES);
      const items = ITEM_MAP[category];
      const createdAt = daysAgo(randInt(1, 20));
      insertInv.run(uuidv4(), pick(SHELTERS), category, pick(items), randInt(5, 200), 0, `BATCH-${randInt(1000, 9999)}`, null, createdAt, createdAt);
    }

    // ===== 25 Distributions =====
    const insertDist = db.prepare(`INSERT OR IGNORE INTO distributions
      (id, household_id, location_id, status, items, distributed_by, distributed_at, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);

    for (let i = 0; i < 25; i++) {
      const hhId = pick(householdIds);
      const shelter = pick(SHELTERS);
      const status = Math.random() < 0.8 ? 'completed' : 'planned';
      const createdAt = daysAgo(randInt(0, 30));
      const distributedAt = status === 'completed' ? createdAt : null;

      const numItems = randInt(1, 4);
      const distItems = [];
      for (let j = 0; j < numItems; j++) {
        const cat = pick(CATEGORIES);
        distItems.push({
          category: cat,
          item_name: pick(ITEM_MAP[cat]),
          quantity: randInt(1, 10),
        });
      }

      insertDist.run(uuidv4(), hhId, shelter, status, JSON.stringify(distItems),
        pick(FIELD_USERS), distributedAt, createdAt, createdAt);
    }

    // ===== 10 Offers =====
    const insertOffer = db.prepare(`INSERT OR IGNORE INTO offers
      (id, zone_id, created_by, category, description, quantity, expiry, status, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);

    for (let i = 0; i < 10; i++) {
      const oId = uuidv4();
      offerIds.push(oId);
      const zone = pick(ZONES);
      const cat = pick(CATEGORIES);
      const status = i < 4 ? 'open' : i < 7 ? 'matched' : 'completed';
      const createdAt = daysAgo(randInt(0, 20));
      insertOffer.run(oId, zone, 'user-donor-1', cat, pick(ITEM_MAP[cat]), randInt(5, 100),
        new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10), status, createdAt, createdAt);
    }

    // ===== 10 Requests =====
    const insertRequest = db.prepare(`INSERT OR IGNORE INTO requests
      (id, household_id, zone_id, category, description, quantity, status, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);

    for (let i = 0; i < 10; i++) {
      const rId = uuidv4();
      requestIds.push(rId);
      const zone = pick(ZONES);
      const cat = pick(CATEGORIES);
      const status = i < 4 ? 'open' : i < 7 ? 'matched' : 'completed';
      const createdAt = daysAgo(randInt(0, 20));
      insertRequest.run(rId, pick(householdIds), zone, cat, pick(ITEM_MAP[cat]), randInt(1, 30),
        status, createdAt, createdAt);
    }

    // ===== 5 Matches =====
    const insertMatch = db.prepare(`INSERT OR IGNORE INTO matches
      (id, offer_id, request_id, status, pickup_point_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);

    // Match some paired offers/requests that share same zone
    const matchableOffers = offerIds.slice(4, 7); // matched status
    const matchableRequests = requestIds.slice(4, 7);
    const matchStatuses = ['pending', 'confirmed', 'completed'];
    const pickupPoints = ['pp-1', 'pp-2', 'pp-3', 'pp-4'];

    for (let i = 0; i < Math.min(matchableOffers.length, matchableRequests.length); i++) {
      const createdAt = daysAgo(randInt(0, 15));
      insertMatch.run(uuidv4(), matchableOffers[i], matchableRequests[i],
        matchStatuses[i % matchStatuses.length], pick(pickupPoints), createdAt, createdAt);
    }

    // ===== Donor pledges =====
    const insertPledge = db.prepare(`INSERT OR IGNORE INTO offers
      (id, zone_id, created_by, category, description, quantity, status, created_at, updated_at, sync_status)
      VALUES (?, ?, 'user-donor-1', ?, ?, ?, ?, ?, ?, 'synced')`);

    for (let i = 0; i < 8; i++) {
      const cat = pick(CATEGORIES);
      const status = i < 3 ? 'open' : i < 6 ? 'matched' : 'completed';
      const createdAt = daysAgo(randInt(0, 30));
      insertPledge.run(uuidv4(), pick(ZONES), cat, `تعهد: ${pick(ITEM_MAP[cat])}`, randInt(10, 200), status, createdAt, createdAt);
    }

    // ===== Audit Log Entries =====
    const insertAudit = db.prepare(`INSERT OR IGNORE INTO audit_log
      (id, actor_id, actor_role, action, entity_type, entity_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    const actions = ['CREATE', 'UPDATE', 'UPDATE_STATUS'];
    const entities = ['household', 'need', 'distribution', 'inventory'];
    for (let i = 0; i < 50; i++) {
      const actor = pick([...FIELD_USERS, 'user-admin']);
      const role = actor === 'user-admin' ? 'admin' : 'field_worker';
      const action = pick(actions);
      const entity = pick(entities);
      const ts = daysAgo(randInt(0, 45));
      insertAudit.run(uuidv4(), actor, role, action, entity, uuidv4(), null, ts);
    }

  })();

  const finalCount = (db.prepare('SELECT COUNT(*) as c FROM households').get() as any).c;
  const needCount = (db.prepare('SELECT COUNT(*) as c FROM needs').get() as any).c;
  const invCount = (db.prepare('SELECT COUNT(*) as c FROM inventory').get() as any).c;
  const distCount = (db.prepare('SELECT COUNT(*) as c FROM distributions').get() as any).c;

  console.log(`[SEED] Generated:`);
  console.log(`  - ${finalCount} households`);
  console.log(`  - ${needCount} needs`);
  console.log(`  - ${invCount} inventory items`);
  console.log(`  - ${distCount} distributions`);
  console.log(`  - offers, requests, matches, audit logs`);
}

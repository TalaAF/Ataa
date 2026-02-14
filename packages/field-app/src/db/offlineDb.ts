import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  Household, 
  HouseholdMember, 
  Need, 
  Distribution,
  Offer,
  Request,
  Match,
  SyncStatus 
} from '@ataa/shared';

interface FieldAppDB extends DBSchema {
  households: {
    key: string;
    value: Household;
    indexes: { 'by-sync-status': string; 'by-zone': string };
  };
  members: {
    key: string;
    value: HouseholdMember;
    indexes: { 'by-household': string; 'by-sync-status': string };
  };
  needs: {
    key: string;
    value: Need;
    indexes: { 'by-household': string; 'by-sync-status': string; 'by-status': string };
  };
  distributions: {
    key: string;
    value: Distribution;
    indexes: { 'by-household': string; 'by-sync-status': string };
  };
  family_offers: {
    key: string;
    value: Offer;
    indexes: { 'by-status': string };
  };
  family_requests: {
    key: string;
    value: Request;
    indexes: { 'by-status': string };
  };
  family_matches: {
    key: string;
    value: Match;
    indexes: { 'by-status': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      entity_type: string;
      entity_id: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: string;
    };
  };
}

let dbInstance: IDBPDatabase<FieldAppDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<FieldAppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FieldAppDB>('ataa-field-app', 2, {
    upgrade(db, oldVersion) {
      // Households
      if (!db.objectStoreNames.contains('households')) {
        const householdStore = db.createObjectStore('households', { keyPath: 'id' });
        householdStore.createIndex('by-sync-status', 'sync_status');
        householdStore.createIndex('by-zone', 'zone_id');
      }

      // Members
      if (!db.objectStoreNames.contains('members')) {
        const memberStore = db.createObjectStore('members', { keyPath: 'id' });
        memberStore.createIndex('by-household', 'household_id');
        memberStore.createIndex('by-sync-status', 'sync_status');
      }

      // Needs
      if (!db.objectStoreNames.contains('needs')) {
        const needStore = db.createObjectStore('needs', { keyPath: 'id' });
        needStore.createIndex('by-household', 'household_id');
        needStore.createIndex('by-sync-status', 'sync_status');
        needStore.createIndex('by-status', 'status');
      }

      // Distributions
      if (!db.objectStoreNames.contains('distributions')) {
        const distStore = db.createObjectStore('distributions', { keyPath: 'id' });
        distStore.createIndex('by-household', 'household_id');
        distStore.createIndex('by-sync-status', 'sync_status');
      }

      // Sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('family_offers')) {
          const offerStore = db.createObjectStore('family_offers', { keyPath: 'id' });
          offerStore.createIndex('by-status', 'status');
        }

        if (!db.objectStoreNames.contains('family_requests')) {
          const requestStore = db.createObjectStore('family_requests', { keyPath: 'id' });
          requestStore.createIndex('by-status', 'status');
        }

        if (!db.objectStoreNames.contains('family_matches')) {
          const matchStore = db.createObjectStore('family_matches', { keyPath: 'id' });
          matchStore.createIndex('by-status', 'status');
        }
      }
    },
  });

  return dbInstance;
}

export async function getDB(): Promise<IDBPDatabase<FieldAppDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// Household operations
export async function saveHousehold(household: Household): Promise<void> {
  const db = await getDB();
  await db.put('households', { ...household, sync_status: SyncStatus.PENDING });
  
  await addToSyncQueue('household', household.id, 'create', household);
}

export async function getHouseholds(zone_id?: string): Promise<Household[]> {
  const db = await getDB();
  
  if (zone_id) {
    return await db.getAllFromIndex('households', 'by-zone', zone_id);
  }
  
  return await db.getAll('households');
}

export async function getHouseholdById(id: string): Promise<Household | undefined> {
  const db = await getDB();
  return await db.get('households', id);
}

export async function getHouseholdByToken(token: string): Promise<Household | undefined> {
  const db = await getDB();
  const households = await db.getAll('households');
  return households.find(h => h.token === token);
}

// Member operations
export async function saveHouseholdMember(member: HouseholdMember): Promise<void> {
  const db = await getDB();
  await db.put('members', { ...member, sync_status: SyncStatus.PENDING });
  
  await addToSyncQueue('member', member.id, 'create', member);
}

export async function getMembersByHousehold(household_id: string): Promise<HouseholdMember[]> {
  const db = await getDB();
  return await db.getAllFromIndex('members', 'by-household', household_id);
}

// Need operations
export async function saveNeed(need: Need): Promise<void> {
  const db = await getDB();
  await db.put('needs', { ...need, sync_status: SyncStatus.PENDING });
  
  await addToSyncQueue('need', need.id, 'create', need);
}

export async function getNeedsByHousehold(household_id: string): Promise<Need[]> {
  const db = await getDB();
  return await db.getAllFromIndex('needs', 'by-household', household_id);
}

export async function getAllNeeds(): Promise<Need[]> {
  const db = await getDB();
  return await db.getAll('needs');
}

// Distribution operations
export async function saveDistribution(distribution: Distribution): Promise<void> {
  const db = await getDB();
  await db.put('distributions', { ...distribution, sync_status: SyncStatus.PENDING });
  
  await addToSyncQueue('distribution', distribution.id, 'create', distribution);
}

export async function getDistributions(): Promise<Distribution[]> {
  const db = await getDB();
  return await db.getAll('distributions');
}

// Sync queue operations
async function addToSyncQueue(
  entity_type: string,
  entity_id: string,
  action: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  const db = await getDB();
  const queueItem = {
    id: `${entity_type}_${entity_id}_${Date.now()}`,
    entity_type,
    entity_id,
    action,
    data,
    timestamp: new Date().toISOString(),
  };
  
  await db.put('sync_queue', queueItem);
}

export async function getSyncQueue(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll('sync_queue');
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function markAsSynced(_entity_type: string, entity_id: string): Promise<void> {
  const db = await getDB();
  
  const stores: Array<'households' | 'members' | 'needs' | 'distributions'> = [
    'households',
    'members',
    'needs',
    'distributions',
  ];
  
  for (const store of stores) {
    const item = await db.get(store, entity_id);
    if (item) {
      await db.put(store, { ...item, sync_status: SyncStatus.SYNCED } as any);
      break;
    }
  }
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  const queue = await db.getAll('sync_queue');
  return queue.length;
}

// Family exchange cache operations
export async function saveFamilyOffer(offer: Offer): Promise<void> {
  const db = await getDB();
  await db.put('family_offers', offer);
}

export async function saveFamilyRequest(request: Request): Promise<void> {
  const db = await getDB();
  await db.put('family_requests', request);
}

export async function saveFamilyMatch(match: Match): Promise<void> {
  const db = await getDB();
  await db.put('family_matches', match);
}

export async function getFamilyOffers(): Promise<Offer[]> {
  const db = await getDB();
  return await db.getAll('family_offers');
}

export async function getFamilyRequests(): Promise<Request[]> {
  const db = await getDB();
  return await db.getAll('family_requests');
}

export async function getFamilyMatches(): Promise<Match[]> {
  const db = await getDB();
  return await db.getAll('family_matches');
}

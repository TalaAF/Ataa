// ===== عطاء - Shared Types =====

// --- Enums ---
export enum UserRole {
  FIELD_WORKER = 'field_worker',
  ADMIN = 'admin',
  DONOR = 'donor',
  AUDITOR = 'auditor',
  BENEFICIARY = 'beneficiary',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  CONFLICT = 'conflict',
}

export enum NeedCategory {
  FOOD = 'food',
  WATER = 'water',
  HYGIENE = 'hygiene',
  BABY_ITEMS = 'baby_items',
  MEDICINE = 'medicine',
  SHELTER = 'shelter',
  CLOTHING = 'clothing',
  EDUCATION = 'education',
  OTHER = 'other',
}

export enum NeedCategoryLabel {
  food = 'طعام',
  water = 'مياه',
  hygiene = 'نظافة شخصية',
  baby_items = 'مستلزمات أطفال',
  medicine = 'أدوية',
  shelter = 'مأوى',
  clothing = 'ملابس',
  education = 'تعليم',
  other = 'أخرى',
}

export enum Urgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum UrgencyLabel {
  low = 'منخفضة',
  medium = 'متوسطة',
  high = 'عالية',
  critical = 'حرجة',
}

export enum NeedStatus {
  OPEN = 'open',
  PARTIALLY_MET = 'partially_met',
  MET = 'met',
  CANCELLED = 'cancelled',
}

export enum OfferRequestStatus {
  OPEN = 'open',
  MATCHED = 'matched',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum MatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DistributionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DisplacementStatus {
  DISPLACED = 'displaced',
  RETURNEE = 'returnee',
  HOST = 'host',
  OTHER = 'other',
}

export enum AgeBand {
  INFANT = '0-2',
  CHILD = '3-12',
  TEEN = '13-17',
  ADULT = '18-59',
  ELDERLY = '60+',
}

// --- Core Entities ---
export interface Household {
  id: string;
  token: string;
  zone_id: string;
  shelter_id?: string;
  head_of_household_name?: string;
  family_size: number;
  displacement_status: DisplacementStatus;
  vulnerability_flags: string[];
  priority_score: number;
  area_description?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  age_band: AgeBand;
  sex?: 'male' | 'female';
  special_needs_flags: string[];
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Need {
  id: string;
  household_id: string;
  category: NeedCategory;
  description?: string;
  quantity: number;
  urgency: Urgency;
  status: NeedStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Offer {
  id: string;
  zone_id: string;
  created_by: string;
  household_id?: string;
  category: NeedCategory;
  description?: string;
  quantity: number;
  expiry?: string;
  status: OfferRequestStatus;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Request {
  id: string;
  household_id?: string;
  zone_id: string;
  category: NeedCategory;
  description?: string;
  quantity: number;
  status: OfferRequestStatus;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Match {
  id: string;
  offer_id: string;
  request_id: string;
  status: MatchStatus;
  pickup_point_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  parent_zone_id?: string;
  created_at: string;
}

export interface Shelter {
  id: string;
  zone_id: string;
  name: string;
  capacity?: number;
  current_occupancy?: number;
  location_coarse?: string;
  created_at: string;
  updated_at: string;
}

export interface PickupPoint {
  id: string;
  zone_id: string;
  shelter_id?: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  location_id: string;
  location_type: 'warehouse' | 'shelter';
  category: NeedCategory;
  item_name: string;
  qty_available: number;
  qty_reserved: number;
  batch_info?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Distribution {
  id: string;
  household_id: string;
  location_id: string;
  status: DistributionStatus;
  items: DistributionItem[];
  distributed_by: string;
  distributed_at?: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface DistributionItem {
  category: NeedCategory;
  item_name: string;
  quantity: number;
}

export interface DonorPledge {
  id: string;
  donor_id: string;
  zone_id?: string;
  category: NeedCategory;
  quantity: number;
  description?: string;
  status: 'pledged' | 'fulfilled' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  zone_id?: string;
  shelter_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Sync Payloads ---
export interface SyncPayload {
  hub_id: string;
  timestamp: string;
  households: Household[];
  members: HouseholdMember[];
  needs: Need[];
  offers: Offer[];
  requests: Request[];
  distributions: Distribution[];
  audit_logs: AuditLog[];
}

export interface SyncResponse {
  status: 'ok' | 'partial' | 'error';
  conflicts: SyncConflict[];
  server_timestamp: string;
  updates: Partial<SyncPayload>;
}

export interface SyncConflict {
  entity_type: string;
  entity_id: string;
  local_version: string;
  server_version: string;
  resolution?: 'local_wins' | 'server_wins' | 'manual';
}

// --- API Response Types ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// --- Dashboard Aggregation ---
export interface ZoneNeedsSummary {
  zone_id: string;
  zone_name: string;
  total_households: number;
  total_members: number;
  needs_by_category: Record<NeedCategory, number>;
  urgency_breakdown: Record<Urgency, number>;
  fulfilled_percentage: number;
}

export interface InventorySummary {
  location_id: string;
  location_name: string;
  items_by_category: Record<NeedCategory, { available: number; reserved: number }>;
}

export interface DistributionStats {
  total_distributions: number;
  total_households_served: number;
  items_distributed_by_category: Record<NeedCategory, number>;
  period: string;
}

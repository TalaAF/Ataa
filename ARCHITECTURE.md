# Architecture - عطاء (Ataa)

## System Architecture

### Overview

Ataa is a **three-tier distributed system** designed for humanitarian aid distribution in low-connectivity environments:

1. **Frontend Layer** - Web/PWA applications
2. **Edge Layer** - Local hubs at shelters/distribution points
3. **Core Layer** - Central cloud/datacenter services

```
┌───────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATIONS                      │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Field App   │  │  Dashboard   │  │ Donor Portal │       │
│  │   (PWA)      │  │   (Admin)    │  │   (Public)   │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │ React +      │  │ React +      │  │ React +      │       │
│  │ IndexedDB    │  │ Vite         │  │ Vite         │       │
│  │ Service      │  │              │  │              │       │
│  │ Worker       │  │              │  │              │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │                │
└─────────┼─────────────────┼──────────────────┼────────────────┘
          │                 │                  │
          │ Local Wi-Fi     │ Internet         │ Internet
          │                 │                  │
┌─────────▼─────────────────┼──────────────────┼────────────────┐
│                    EDGE LAYER (LOCAL HUBS)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │             Edge Hub (Raspberry Pi)                     │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  - Express API (Node.js)                               │   │
│  │  - SQLite Database                                     │   │
│  │  - Sync Service                                        │   │
│  │  - Wi-Fi Hotspot (optional)                            │   │
│  └────────────────┬───────────────────────────────────────┘   │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    │ HTTPS (when connected)
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                       CORE LAYER (CLOUD)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Central Core API (Node.js)                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  RESTful API Endpoints:                                    │  │
│  │  - /auth         - Authentication & Authorization          │  │
│  │  - /households   - Household CRUD                          │  │
│  │  - /needs        - Needs management                        │  │
│  │  - /inventory    - Inventory tracking                      │  │
│  │  - /distributions- Distribution recording                  │  │
│  │  - /sync         - Hub synchronization                     │  │
│  │  - /donor        - Donor portal (aggregated data)          │  │
│  │  - /matches      - Offer/Request matching                  │  │
│  │  - /dashboard    - Analytics & reports                     │  │
│  └────────────────┬──────────────────────────────────────────┘  │
│                   │                                              │
│  ┌────────────────▼──────────────────────────────────────────┐  │
│  │            PostgreSQL Database                             │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Tables:                                                    │  │
│  │  - users, zones, shelters                                  │  │
│  │  - households, members                                     │  │
│  │  - needs, inventory_items                                  │  │
│  │  - distributions, donor_pledges                            │  │
│  │  - offers, requests, matches                               │  │
│  │  - audit_log, sync_log                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Household Registration (Offline-First)

```
┌─────────────┐
│ Field Worker│
│   Device    │
└──────┬──────┘
       │ 1. Register household
       │    (form input)
       ▼
┌──────────────────┐
│   Field App      │
│   (React)        │
└──────┬───────────┘
       │ 2. Save to IndexedDB
       │    (offline storage)
       ▼
┌──────────────────┐
│   IndexedDB      │
│   (Local DB)     │
└──────┬───────────┘
       │ 3. Add to sync_queue
       │    (when online detected)
       ▼
┌──────────────────┐  4. POST /api/households
│  Sync Service    │─────────┐
└──────────────────┘         │
                             ▼
                      ┌─────────────┐
                      │ Edge Hub API│
                      │  (Express)  │
                      └──────┬──────┘
                             │ 5. Store in SQLite
                             ▼
                      ┌─────────────┐
                      │   SQLite    │
                      │  (Hub DB)   │
                      └──────┬──────┘
                             │ 6. Batch sync (hourly)
                             │    POST /api/sync/push
                             ▼
                      ┌─────────────┐
                      │  Core API   │
                      └──────┬──────┘
                             │ 7. Store in PostgreSQL
                             ▼
                      ┌─────────────┐
                      │ PostgreSQL  │
                      │ (Central DB)│
                      └─────────────┘
```

### 2. Distribution Tracking

```
Field Worker                Field App              Hub                Core
     │                          │                   │                  │
     │ 1. Record distribution   │                   │                  │
     ├─────────────────────────>│                   │                  │
     │                          │                   │                  │
     │                          │ 2. Save offline   │                  │
     │                          │    (IndexedDB)    │                  │
     │                          │                   │                  │
     │                          │ 3. Sync when      │                  │
     │                          │    online         │                  │
     │                          ├──────────────────>│                  │
     │                          │                   │                  │
     │                          │                   │ 4. Update SQLite │
     │                          │                   │                  │
     │                          │                   │ 5. Batch sync    │
     │                          │                   ├─────────────────>│
     │                          │                   │                  │
     │                          │                   │ 6. Update        │
     │                          │                   │    PostgreSQL    │
     │                          │                   │                  │
     │                          │                   │ 7. Deduct from   │
     │                          │                   │    inventory     │
     │                          │                   │                  │
```

### 3. Donor Pledge Flow

```
Donor                    Donor Portal         Core API            PostgreSQL
  │                          │                   │                    │
  │ 1. View aggregated needs │                   │                    │
  ├─────────────────────────>│                   │                    │
  │                          │ GET /donor/       │                    │
  │                          │  aggregated-needs │                    │
  │                          ├──────────────────>│                    │
  │                          │                   │ Query aggregated   │
  │                          │                   │ needs (no PII)     │
  │                          │                   ├───────────────────>│
  │                          │                   │                    │
  │                          │<──────────────────┤                    │
  │                          │  { zone: "A",     │                    │
  │                          │    category: "food",                   │
  │                          │    quantity: 500 }│                    │
  │                          │                   │                    │
  │ 2. Create pledge         │                   │                    │
  ├─────────────────────────>│                   │                    │
  │                          │ POST /donor/      │                    │
  │                          │   pledges         │                    │
  │                          ├──────────────────>│                    │
  │                          │                   │ INSERT pledge      │
  │                          │                   ├───────────────────>│
  │                          │                   │                    │
  │                          │<──────────────────┤                    │
  │<─────────────────────────┤ { id, status }    │                    │
  │                          │                   │                    │
```

### 4. Sync Mechanism (Bidirectional)

```
┌─────────────┐                           ┌─────────────┐
│     Hub     │                           │    Core     │
│  (SQLite)   │                           │(PostgreSQL) │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │ ──── PUSH: Hub → Core ────────────────> │
       │                                         │
       │  POST /api/sync/push                    │
       │  {                                      │
       │    hub_id: "hub-1",                     │
       │    last_sync: "2024-01-20T10:00:00Z",   │
       │    data: {                              │
       │      households: [...],                 │
       │      distributions: [...],              │
       │      needs: [...]                       │
       │    }                                    │
       │  }                                      │
       │                                         │
       │                                         │ → Store in PostgreSQL
       │                                         │ → Check for conflicts
       │                                         │ → Update sync_log
       │                                         │
       │ <────────────────────────────────────── │
       │  {                                      │
       │    accepted: 150,                       │
       │    conflicts: []                        │
       │  }                                      │
       │                                         │
       │                                         │
       │ ──── PULL: Core → Hub ────────────────> │
       │                                         │
       │  POST /api/sync/pull                    │
       │  {                                      │
       │    hub_id: "hub-1",                     │
       │    last_sync: "2024-01-20T10:00:00Z",   │
       │    zone_ids: ["zone-1"]                 │
       │  }                                      │
       │                                         │
       │                                         │ → Query updated data
       │                                         │   since last_sync
       │                                         │ → Filter by zones
       │                                         │
       │ <────────────────────────────────────── │
       │  {                                      │
       │    households: [...],                   │
       │    inventory: [...],                    │
       │    pledges: [...],                      │
       │    sync_timestamp: "2024-01-20T11:00:00Z"
       │  }                                      │
       │                                         │
       │ → Merge into SQLite                     │
       │ → Update local sync_log                 │
       │                                         │
```

---

## Component Details

### Field App (PWA)

**Technology Stack:**
- React 18
- TypeScript
- Vite
- IndexedDB (via idb library)
- Workbox (Service Worker)

**Key Components:**
```
src/
├── components/
│   ├── HouseholdRegistration.tsx    # Multi-step form
│   ├── DistributionForm.tsx         # Record distributions
│   └── SyncStatus.tsx               # Online/offline indicator
├── db/
│   └── offlineDb.ts                 # IndexedDB wrapper
├── services/
│   └── syncService.ts               # Sync orchestrator
└── App.tsx                          # Main component
```

**Offline Strategy:**
- All data writes go to IndexedDB first
- Read from IndexedDB for display
- Background sync when online
- Service Worker caches app shell and assets
- Queue-based sync for reliability

### Edge Hub

**Technology Stack:**
- Node.js + Express
- SQLite3
- TypeScript

**Key Features:**
- Local API mirror of Core API
- Stores zone-specific data only
- Wi-Fi hotspot capability (optional)
- Scheduled sync with Core
- Fallback to Wi-Fi Direct for peer-peer

**Hardware:**
- Raspberry Pi 4 (2GB+ RAM)
- 32GB SD card
- Portable router or use Pi as hotspot

### Core API

**Technology Stack:**
- Node.js + Express
- PostgreSQL 14+
- TypeScript
- JWT authentication
- bcrypt password hashing

**Middleware:**
- `authenticate()` - JWT verification
- `authorize(roles)` - RBAC enforcement
- `auditLog()` - Automatic audit trail

**Database Schema Highlights:**
- UUID primary keys for distributed sync
- JSONB columns for flexible arrays
- Triggers for `updated_at` timestamps
- Indexes on foreign keys and filters

---

## Security Architecture

### Authentication Flow

```
Client                          Core API                     Database
  │                                │                            │
  │ 1. POST /auth/login            │                            │
  │    { username, password }      │                            │
  ├───────────────────────────────>│                            │
  │                                │ 2. Query user              │
  │                                ├───────────────────────────>│
  │                                │                            │
  │                                │<───────────────────────────┤
  │                                │   user record              │
  │                                │                            │
  │                                │ 3. bcrypt.compare()        │
  │                                │    (password verification) │
  │                                │                            │
  │                                │ 4. Generate JWT            │
  │                                │    (7-day expiry)          │
  │                                │                            │
  │<───────────────────────────────┤                            │
  │  { token, user }               │                            │
  │                                │                            │
  │ 5. Subsequent requests         │                            │
  │    Authorization: Bearer <JWT> │                            │
  ├───────────────────────────────>│                            │
  │                                │ 6. Verify JWT              │
  │                                │    Extract user & role     │
  │                                │                            │
  │                                │ 7. Check RBAC              │
  │                                │    authorize(['admin'])    │
  │                                │                            │
```

### Role-Based Access Control (RBAC)

| Role          | Permissions                                              |
|---------------|----------------------------------------------------------|
| `admin`       | Full access to all endpoints                             |
| `field_worker`| Create/read households, needs, distributions in own zone |
| `donor`       | Read aggregated needs, create/manage own pledges         |
| `auditor`     | Read-only access to audit logs                           |

**Implementation:**
```typescript
// Middleware usage
router.get('/households', 
  authenticate, 
  authorize(['admin', 'field_worker']), 
  getHouseholds
);
```

### Data Protection

**At Rest:**
- PostgreSQL: Encrypted filesystem (LUKS)
- SQLite: Encrypted database file (optional)
- IndexedDB: Browser encryption APIs

**In Transit:**
- TLS 1.3 for all HTTPS communication
- Certificate pinning (mobile apps)

**Privacy by Design:**
- Household tokens instead of names
- No exact ages (age bands: child/adult/elderly)
- Coarse locations (zone/shelter, no GPS)
- Aggregated data for donors (zero PII)

---

## Scaling Considerations

### Horizontal Scaling (Core API)

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └───────┬──────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │ Core API│       │ Core API│       │ Core API│
    │Instance 1│       │Instance 2│       │Instance 3│
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │  PostgreSQL   │
                   │ (Primary/     │
                   │  Replica)     │
                   └───────────────┘
```

**Strategies:**
- Stateless API servers
- JWT for auth (no session store)
- PostgreSQL read replicas
- Redis cache for aggregations
- Queue for async jobs (Bull/Agenda)

### Database Optimization

**Indexes:**
```sql
CREATE INDEX idx_households_zone ON households(zone_id);
CREATE INDEX idx_needs_status ON needs(status, urgency);
CREATE INDEX idx_distributions_date ON distributions(created_at);
```

**Partitioning:**
```sql
-- Partition audit_log by month
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**Connection Pooling:**
```typescript
const pool = new Pool({
  max: 20,           // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Monitoring & Observability

### Logging

**Levels:**
- `error` - Critical errors requiring immediate attention
- `warn` - Non-critical issues
- `info` - General informational messages
- `debug` - Detailed diagnostic information

**Structured Logging:**
```typescript
logger.info('Household created', {
  household_id: 'hh-uuid',
  zone_id: 'zone-1',
  created_by: 'user-uuid'
});
```

### Metrics

**Key Performance Indicators:**
- Request rate (req/sec)
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database query times
- Sync success/failure rates

**Tools:**
- Prometheus + Grafana
- OpenTelemetry
- Custom dashboard

### Health Checks

```http
GET /health

Response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## Deployment Architecture

### Production Deployment

```
┌──────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────────┬─────────────────────────────────┘
                         │
                ┌────────▼────────┐
                │   CloudFlare    │ ← DDoS protection, CDN
                │      CDN        │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │  Nginx Proxy    │ ← SSL termination, load balancing
                │ (Load Balancer) │
                └────────┬────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│ Core API   │    │ Core API   │    │ Core API   │
│ Container  │    │ Container  │    │ Container  │
│ (Docker)   │    │ (Docker)   │    │ (Docker)   │
└──────┬─────┘    └──────┬─────┘    └──────┬─────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL        │
              │   (Primary)         │
              └──────────┬──────────┘
                         │
                         │ Replication
                         ▼
              ┌──────────────────────┐
              │   PostgreSQL         │
              │   (Read Replica)     │
              └──────────────────────┘
```

### Docker Deployment

**Core API Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  core:
    build: ./packages/core
    ports:
      - "4000:4000"
    environment:
      - DB_HOST=postgres
      - NODE_ENV=production
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ataa_core
      - POSTGRES_PASSWORD=secure_password

volumes:
  pgdata:
```

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
```bash
# Daily automated backup
0 2 * * * pg_dump ataa_core | gzip > /backups/ataa_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days local, 90 days S3
```

**SQLite Backups (Hubs):**
```bash
# Backup before sync
sqlite3 ataa_hub.db ".backup /backups/hub_$(date +\%Y\%m\%d).db"
```

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 24 hours

### Failover Strategy

1. **Primary fails** → Promote read replica to primary
2. **All Core instances fail** → Hubs continue local operation
3. **Hub fails** → Field apps continue offline operation

---

## Future Enhancements

1. **Mobile Native Apps** - React Native versions for iOS/Android
2. **Offline Maps** - Embed OpenStreetMap tiles
3. **QR Codes** - Print household tokens as QR codes
4. **Photo Uploads** - Document verification photos
5. **SMS Gateway** - Notifications for beneficiaries
6. **Multi-language** - Full RTL support for Arabic + translations
7. **Analytics Dashboard** - Real-time Power BI integration
8. **Blockchain** - Immutable audit trail for transparency
9. **AI/ML** - Predict needs based on patterns
10. **Satellite Sync** - Sync via Starlink in remote areas

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintained by:** Ataa Development Team

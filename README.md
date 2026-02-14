# عطاء (Ataa) - Humanitarian Aid Distribution System

**نظام توزيع المساعدات الإنسانية**

A complete offline-first humanitarian aid distribution system designed for war-affected areas with limited connectivity.

## 📋 Overview

Ataa is a comprehensive system for managing humanitarian aid distribution with a focus on:
- **Offline-first** operation for field workers
- **Fair and trackable** distribution
- **Privacy and data protection** (minimal data collection)
- **Multi-tier architecture** (Field App → Edge Hub → Central Core)
- **Donor transparency** (aggregated needs, no personal data)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       CLIENTS                           │
├─────────────────────────────────────────────────────────┤
│  Field Worker App  │  Dashboard   │  Donor Portal      │
│  (Offline-first)   │  (Admin)     │  (Public)          │
└──────────┬─────────┴──────┬───────┴────────┬──────────┘
           │                │                │
           │ Local Wi-Fi    │ Internet       │ Internet
           │                │                │
┌──────────▼────────────────┴────────────────┴───────────┐
│                      EDGE LAYER                         │
├─────────────────────────────────────────────────────────┤
│         Edge Hub (Local Server + SQLite)                │
│         - Local Wi-Fi Router                            │
│         - Sync Service (when internet available)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Sync (when connected)
                       │
┌──────────────────────▼──────────────────────────────────┐
│                      CORE LAYER                         │
├─────────────────────────────────────────────────────────┤
│         Central Core API (Node.js + PostgreSQL)         │
│         - Aggregation Engine                            │
│         - Matching Service                              │
│         - Analytics & Reports                           │
│         - Audit Logging                                 │
└─────────────────────────────────────────────────────────┘
```

## 📦 Packages

This monorepo contains 5 packages:

### 1. **`@ataa/shared`**
Shared TypeScript types, constants, and utilities used across all packages.

### 2. **`@ataa/hub`**
Edge Hub running at shelters/distribution points:
- SQLite database for local storage
- Local API for field apps
- Sync service to/from central core
- Runs on local Wi-Fi without internet

### 3. **`@ataa/core`**
Central Core API (Cloud/DC):
- PostgreSQL database
- RESTful API
- Sync coordination
- Aggregation for donors
- Analytics and reports

### 4. **`@ataa/field-app`**
Offline-first Progressive Web App for field workers:
- Household registration
- Distribution tracking
- IndexedDB for offline storage
- Service Worker for offline capability
- Auto-sync when online

### 5. **`@ataa/donor`**
Donor portal showing aggregated needs:
- View needs by zone (no personal data)
- Create pledges
- Track pledge status

### 6. **`@ataa/dashboard`**
Admin dashboard for NGOs:
- View all households and needs
- Manage inventory
- Distribution tracking
- Reports and analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (for Core)
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Ataa

# Install dependencies for all packages
npm install

# Set up environment variables
cp packages/core/.env.example packages/core/.env
cp packages/hub/.env.example packages/hub/.env

# Edit .env files with your configuration
```

### Database Setup

#### PostgreSQL (Core)
```bash
# Create database
createdb ataa_core

# Database will be initialized automatically on first run
```

#### SQLite (Hub)
Database will be created automatically on first run.

### Running the System

```powershell
# Terminal 1: Run Core API
npm run dev:core

# Terminal 2: Run Hub (Edge)
npm run dev:hub

# Terminal 3: Run Dashboard
npm run dev:dashboard

# Terminal 4: Run Donor Portal
npm run dev:donor

# Terminal 5: Run Field App
npm run dev:field
```

Access points:
- **Core API**: http://localhost:4000
- **Hub API**: http://localhost:3000
- **Dashboard**: http://localhost:5173
- **Donor Portal**: http://localhost:5174
- **Field App**: http://localhost:5175

## 📱 Field App (Offline-First)

The field app is designed to work **completely offline**:

1. **Initial Setup**
   - Connect to Edge Hub's local Wi-Fi
   - Login once (credentials cached)

2. **Offline Operation**
   - Register households
   - Record distributions
   - All data stored in IndexedDB
   - Works without any internet

3. **Sync**
   - Auto-syncs when online (to hub or core)
   - Manual sync button
   - Shows pending sync count
   - Handles conflicts

4. **PWA Features**
   - Installable on mobile devices
   - Works like a native app
   - Service worker for offline assets

## 🔐 Security & Privacy

### Data Minimization
- Household tokens instead of names (when possible)
- Coarse location (zone/shelter) instead of GPS
- No unnecessary personal data
- Aggregated data for donors (zero personal info)

### Authentication & Authorization
- JWT-based authentication
- Role-Based Access Control (RBAC):
  - `field_worker` - Register households, distribute aid
  - `admin` - Full system access
  - `donor` - View aggregated needs only
  - `auditor` - Read-only audit logs

### Encryption
- TLS/HTTPS for all API communication
- Encrypted local storage in apps
- Password hashing with bcrypt

### Audit Logging
- All create/update/delete operations logged
- Actor, action, entity tracked
- Immutable audit trail

## 📊 Data Model

### Core Entities

**Households**
- Token (unique ID)
- Zone/Shelter
- Family size
- Displacement status
- Vulnerability flags
- Priority score

**Members**
- Age band (no exact age)
- Sex (optional)
- Special needs flags

**Needs**
- Category (food, water, hygiene, etc.)
- Quantity
- Urgency
- Status

**Distributions**
- Household
- Items distributed
- Timestamp
- Distributed by (user)

**Offers/Requests** (Community Exchange)
- Zone-constrained
- Category & quantity
- Matched via pickup points

**Donor Pledges**
- Category & quantity
- Zone (optional)
- Status (pledged/fulfilled/cancelled)

## 🔄 Sync Strategy

### Hub → Core Sync

```
1. Field app saves to IndexedDB (offline)
2. Field app syncs to Hub via local Wi-Fi
3. Hub stores in SQLite
4. When internet available, Hub syncs to Core
5. Core stores central copy in PostgreSQL
```

### Conflict Resolution
- Timestamp-based (last-write-wins)
- Conflicts logged for manual review
- Critical fields can be locked

### Sync Frequency
- Real-time: when both online
- Batched: every 5 minutes (configurable)
- Manual: sync button in apps

## 🎯 Key Features

### ✅ Implemented

- [x] Household registration with offline support
- [x] Need tracking by category/urgency
- [x] Inventory management
- [x] Distribution tracking
- [x] Offline-first field app with IndexedDB
- [x] Sync mechanism (hub ↔ core)
- [x] Donor portal with aggregated data
- [x] Offer/Request matching system
- [x] RBAC and authentication
- [x] Audit logging
- [x] Priority scoring

### 🚧 To Be Enhanced

- [ ] Advanced analytics dashboards
- [ ] PDF report generation
- [ ] QR code printing for household tokens
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] Photo uploads (low priority)
- [ ] Barcode scanning for inventory

## 📖 API Documentation

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "field1",
  "password": "password"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { ... }
  }
}
```

### Create Household
```http
POST /api/households
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "HH-12345",
  "zone_id": "zone-1",
  "family_size": 5,
  "displacement_status": "displaced",
  "vulnerability_flags": ["female_headed", "orphans"]
}
```

See full API documentation in `/docs/api.md`

## 🧪 Testing

```bash
# Run all tests
npm test --workspaces

# Test specific package
cd packages/core
npm test
```

## 📦 Deployment

### Core (Cloud)
```bash
# Build
npm run build

# Run production
NODE_ENV=production node dist/index.js
```

### Hub (Edge Device - Raspberry Pi recommended)
```bash
# Install on device
npm install --production

# Run as service (systemd)
sudo systemctl enable ataa-hub
sudo systemctl start ataa-hub
```

### Field App (PWA)
```bash
# Build
npm run build

# Deploy static files to CDN/server
# Or serve from Hub for local access
```

## 🛠️ Development

### Project Structure
```
Ataa/
├── packages/
│   ├── shared/          # Shared types & constants
│   ├── core/            # Central API (PostgreSQL)
│   ├── hub/             # Edge API (SQLite)
│   ├── field-app/       # Field worker PWA
│   ├── dashboard/       # Admin dashboard
│   └── donor/           # Donor portal
├── package.json         # Workspace root
└── README.md
```

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- RTL (Right-to-Left) UI for Arabic

## 🌍 Humanitarian Principles

This system follows humanitarian data responsibility:

1. **Do No Harm** - Minimal data collection
2. **Purpose** - Only collect what's needed
3. **Security** - Encrypted & access-controlled
4. **Privacy** - Aggregated data for external parties
5. **Accountability** - Full audit trail

References:
- IASC Data Responsibility Guidelines
- ICRC Handbook on Data Protection
- OCHA Data Responsibility Framework

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for humanitarian workers on the ground**

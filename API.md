# API Documentation - Ataa

Base URLs:
- **Core API**: `http://localhost:4000/api` (development)
- **Hub API**: `http://localhost:3000/api` (development)

All API requests require Authentication header (except login/register):
```
Authorization: Bearer <jwt_token>
```

## Table of Contents
1. [Authentication](#authentication)
2. [Households](#households)
3. [Needs](#needs)
4. [Inventory](#inventory)
5. [Distributions](#distributions)
6. [Donor](#donor)
7. [Offers & Requests](#offers--requests)
8. [Dashboard](#dashboard)
9. [Sync](#sync)

---

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "field1",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "username": "field1",
      "role": "field_worker",
      "zone_id": "zone-1"
    }
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "securePassword123",
  "role": "field_worker",
  "zone_id": "zone-1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { ... }
  }
}
```

---

## Households

### List Households
```http
GET /api/households?page=1&limit=20&zone_id=zone-1
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `zone_id` (optional): Filter by zone

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "households": [
      {
        "id": "hh-uuid",
        "token": "HH-123456",
        "zone_id": "zone-1",
        "shelter_id": "shelter-1",
        "family_size": 5,
        "displacement_status": "displaced",
        "vulnerability_flags": ["female_headed", "orphans"],
        "priority_score": 85,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Get Household by ID
```http
GET /api/households/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "hh-uuid",
    "token": "HH-123456",
    "zone_id": "zone-1",
    "shelter_id": "shelter-1",
    "family_size": 5,
    "displacement_status": "displaced",
    "vulnerability_flags": ["female_headed", "orphans"],
    "priority_score": 85,
    "members": [
      {
        "id": "member-uuid",
        "household_id": "hh-uuid",
        "age_band": "adult",
        "sex": "female",
        "special_needs": ["pregnant"]
      }
    ],
    "needs": [
      {
        "id": "need-uuid",
        "household_id": "hh-uuid",
        "category": "food",
        "quantity": 5,
        "unit": "food_parcel",
        "urgency": "high",
        "status": "open"
      }
    ]
  }
}
```

### Create Household
```http
POST /api/households
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "HH-987654",
  "zone_id": "zone-1",
  "shelter_id": "shelter-1",
  "family_size": 4,
  "displacement_status": "displaced",
  "vulnerability_flags": ["elderly"],
  "members": [
    {
      "age_band": "adult",
      "sex": "male",
      "special_needs": []
    },
    {
      "age_band": "child",
      "sex": "female",
      "special_needs": ["chronic_illness"]
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-hh-uuid",
    "token": "HH-987654",
    "priority_score": 75
  }
}
```

### Update Household
```http
PUT /api/households/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_size": 5,
  "vulnerability_flags": ["female_headed", "orphans"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "hh-uuid",
    "updated": true
  }
}
```

---

## Needs

### List Needs
```http
GET /api/needs?category=food&urgency=high&status=open
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (optional): food, water, hygiene, shelter, medical, clothing
- `urgency` (optional): low, medium, high
- `status` (optional): open, in_progress, met, cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "need-uuid",
      "household_id": "hh-uuid",
      "category": "food",
      "quantity": 5,
      "unit": "food_parcel",
      "urgency": "high",
      "status": "open",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Create Need
```http
POST /api/needs
Authorization: Bearer <token>
Content-Type: application/json

{
  "household_id": "hh-uuid",
  "category": "food",
  "quantity": 3,
  "unit": "food_parcel",
  "urgency": "high",
  "notes": "Family has no food for 2 days"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-need-uuid",
    "status": "open"
  }
}
```

### Update Need Status
```http
PATCH /api/needs/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "met"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "need-uuid",
    "status": "met"
  }
}
```

---

## Inventory

### List Inventory
```http
GET /api/inventory?category=food&location=warehouse-1
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (optional): Filter by category
- `location` (optional): Filter by location

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv-uuid",
      "category": "food",
      "item_name": "Rice Bags",
      "quantity": 500,
      "unit": "kg",
      "location": "warehouse-1",
      "expiry_date": "2024-12-31"
    }
  ]
}
```

### Add Inventory
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "food",
  "item_name": "Rice Bags",
  "quantity": 100,
  "unit": "kg",
  "location": "warehouse-1",
  "expiry_date": "2024-12-31",
  "donor_pledge_id": "pledge-uuid"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-inv-uuid"
  }
}
```

### Update Quantity
```http
PATCH /api/inventory/:id/quantity
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity_change": -50,
  "reason": "distribution"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "inv-uuid",
    "new_quantity": 450
  }
}
```

---

## Distributions

### List Distributions
```http
GET /api/distributions?page=1&limit=20&status=completed
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: planned, in_progress, completed, cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "id": "dist-uuid",
        "household_id": "hh-uuid",
        "distributed_by": "user-uuid",
        "items": [
          { "category": "food", "item": "Rice", "quantity": 25, "unit": "kg" }
        ],
        "status": "completed",
        "distributed_at": "2024-01-20T14:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### Create Distribution
```http
POST /api/distributions
Authorization: Bearer <token>
Content-Type: application/json

{
  "household_id": "hh-uuid",
  "items": [
    {
      "category": "food",
      "item_name": "Rice",
      "quantity": 25,
      "unit": "kg",
      "inventory_id": "inv-uuid"
    }
  ],
  "notes": "Regular monthly distribution"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-dist-uuid",
    "status": "completed"
  }
}
```

### Update Distribution Status
```http
PATCH /api/distributions/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "dist-uuid",
    "status": "completed"
  }
}
```

---

## Donor

### Get Aggregated Needs
```http
GET /api/donor/aggregated-needs?zone_id=zone-1
Authorization: Bearer <token>
```

**Query Parameters:**
- `zone_id` (optional): Filter by zone

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "zone_id": "zone-1",
      "zone_name": "Northern District",
      "category": "food",
      "total_quantity": 500,
      "unit": "food_parcel",
      "urgency_breakdown": {
        "high": 200,
        "medium": 200,
        "low": 100
      }
    }
  ]
}
```

### Create Pledge
```http
POST /api/donor/pledges
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "food",
  "quantity": 100,
  "unit": "food_parcel",
  "zone_id": "zone-1",
  "notes": "Monthly donation"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "pledge-uuid",
    "status": "pledged"
  }
}
```

### List My Pledges
```http
GET /api/donor/pledges
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pledge-uuid",
      "donor_id": "user-uuid",
      "category": "food",
      "quantity": 100,
      "unit": "food_parcel",
      "zone_id": "zone-1",
      "status": "fulfilled",
      "created_at": "2024-01-10T09:00:00Z"
    }
  ]
}
```

### Update Pledge Status
```http
PATCH /api/donor/pledges/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "fulfilled"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pledge-uuid",
    "status": "fulfilled"
  }
}
```

---

## Offers & Requests

### List Offers
```http
GET /api/matches/offers?zone_id=zone-1&status=available
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "offer-uuid",
      "household_id": "hh-uuid",
      "zone_id": "zone-1",
      "category": "clothing",
      "description": "Winter jackets, size M",
      "quantity": 3,
      "status": "available",
      "created_at": "2024-01-18T11:00:00Z"
    }
  ]
}
```

### Create Offer
```http
POST /api/matches/offers
Authorization: Bearer <token>
Content-Type: application/json

{
  "household_id": "hh-uuid",
  "category": "clothing",
  "description": "Winter jackets",
  "quantity": 3
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-offer-uuid",
    "status": "available"
  }
}
```

### List Requests
```http
GET /api/matches/requests?zone_id=zone-1&status=open
Authorization: Bearer <token>
```

**Response:** Similar to offers

### Create Request
```http
POST /api/matches/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "household_id": "hh-uuid",
  "category": "hygiene",
  "description": "Soap and shampoo",
  "quantity": 2
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-request-uuid",
    "status": "open"
  }
}
```

### List Matches
```http
GET /api/matches?zone_id=zone-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "match-uuid",
      "offer_id": "offer-uuid",
      "request_id": "request-uuid",
      "zone_id": "zone-1",
      "pickup_point": "Shelter 1 Office",
      "status": "pending_pickup",
      "matched_at": "2024-01-19T10:00:00Z"
    }
  ]
}
```

### Create Match
```http
POST /api/matches
Authorization: Bearer <token>
Content-Type: application/json

{
  "offer_id": "offer-uuid",
  "request_id": "request-uuid",
  "pickup_point": "Shelter 1 Office"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-match-uuid",
    "status": "pending_pickup"
  }
}
```

### Update Match Status
```http
PATCH /api/matches/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "match-uuid",
    "status": "completed"
  }
}
```

---

## Dashboard

### Get Summary Statistics
```http
GET /api/dashboard/summary
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_households": 1250,
    "total_beneficiaries": 6300,
    "open_needs": 450,
    "completed_distributions": 3200,
    "inventory_categories": 8,
    "active_pledges": 25
  }
}
```

### Get Needs by Zone
```http
GET /api/dashboard/needs-by-zone
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "zone_id": "zone-1",
      "zone_name": "Northern District",
      "category": "food",
      "open_count": 120,
      "in_progress_count": 30,
      "total_quantity": 500
    }
  ]
}
```

### Get Inventory Summary
```http
GET /api/dashboard/inventory
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "category": "food",
      "location": "warehouse-1",
      "total_items": 15,
      "total_quantity": 5000,
      "expiring_soon": 2
    }
  ]
}
```

### Get Distribution Stats
```http
GET /api/dashboard/distributions?days=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "count": 45,
      "households_served": 45,
      "items_distributed": 230
    }
  ]
}
```

---

## Sync

### Push Data (Hub → Core)
```http
POST /api/sync/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "hub_id": "hub-1",
  "last_sync": "2024-01-20T10:00:00Z",
  "data": {
    "households": [ ... ],
    "distributions": [ ... ],
    "needs": [ ... ]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accepted": 150,
    "conflicts": []
  }
}
```

### Pull Data (Core → Hub)
```http
POST /api/sync/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "hub_id": "hub-1",
  "last_sync": "2024-01-20T10:00:00Z",
  "zone_ids": ["zone-1"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "households": [ ... ],
    "inventory": [ ... ],
    "pledges": [ ... ],
    "sync_timestamp": "2024-01-20T11:00:00Z"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "family_size",
      "reason": "Must be a positive integer"
    }
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401): Missing or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input
- `CONFLICT` (409): Duplicate or conflict
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

- No rate limiting in development
- Production: 100 requests/minute per IP
- Sync endpoints: 10 requests/minute

## CORS

Allowed origins (configurable):
- `http://localhost:5173` (dashboard)
- `http://localhost:5174` (donor)
- `http://localhost:5175` (field-app)

## Versioning

Current version: `v1`  
All endpoints prefixed with `/api/`

Future versions will use `/api/v2/`, etc.

# Setup Guide - عطاء (Ataa)

Complete setup instructions for deploying the Ataa system.

## Table of Contents
1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Edge Hub Setup](#edge-hub-setup)
4. [Troubleshooting](#troubleshooting)

## Development Setup

### 1. Prerequisites

Install the following on your development machine:

- **Node.js** 18+ and npm 9+
  ```powershell
  # Download from https://nodejs.org/
  node --version  # Should be v18 or higher
  npm --version   # Should be v9 or higher
  ```

- **PostgreSQL** 14+
  ```powershell
  # Download from https://www.postgresql.org/download/windows/
  psql --version  # Should be 14 or higher
  ```

- **Git**
  ```powershell
  git --version
  ```

### 2. Clone and Install

```powershell
# Clone repository
git clone <repository-url>
cd Ataa

# Install all dependencies (for all packages)
npm install

# This will install dependencies for:
# - shared, core, hub, dashboard, donor, field-app
```

### 3. Database Setup

#### PostgreSQL (Core Database)

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ataa_core;

# Create user (optional)
CREATE USER ataa_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ataa_core TO ataa_user;

# Exit
\q
```

#### SQLite (Hub Database)

No setup needed - database file will be created automatically.

### 4. Environment Configuration

#### Core (.env)
```powershell
cd packages/core
cp .env.example .env
```

Edit `packages/core/.env`:
```env
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ataa_core
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-very-secure-random-secret-key-change-this
```

#### Hub (.env)
```powershell
cd packages/hub
cp .env.example .env
```

Edit `packages/hub/.env`:
```env
PORT=3000
NODE_ENV=development

# Database file path (SQLite)
DB_PATH=./data/ataa_hub.db

# Core API URL for sync
CORE_API_URL=http://localhost:4000/api

JWT_SECRET=same-secret-as-core
```

#### Field App (.env)
Create `packages/field-app/.env.local`:
```env
VITE_HUB_API_URL=http://localhost:3000/api
```

#### Donor Portal (.env)
Create `packages/donor/.env.local`:
```env
VITE_CORE_API_URL=http://localhost:4000/api
```

### 5. Run Development Servers

Open **5 terminal windows** and run:

```powershell
# Terminal 1 - Core API
npm run dev:core
# → http://localhost:4000

# Terminal 2 - Edge Hub
npm run dev:hub  
# → http://localhost:3000

# Terminal 3 - Dashboard
npm run dev:dashboard
# → http://localhost:5173

# Terminal 4 - Donor Portal
npm run dev:donor
# → http://localhost:5174

# Terminal 5 - Field App
npm run dev:field
# → http://localhost:5175
```

### 6. Initial Data & Users

The system creates default users on first run:

**Admin**
- Username: `admin`
- Password: (set in seed data or register new)

**Field Worker**
- Username: `field1`
- Password: (set in seed data or register new)

**Donor**
- Username: `donor1`
- Password: (set in seed data or register new)

---

## Production Deployment

### Core API (Cloud/VPS)

#### 1. Server Requirements
- Ubuntu 20.04+ or similar
- 2GB RAM minimum
- PostgreSQL 14+
- Node.js 18+
- Nginx (reverse proxy)

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx
```

#### 3. Setup Application

```bash
# Create app directory
sudo mkdir -p /opt/ataa/core
cd /opt/ataa/core

# Clone & install
git clone <repo> .
npm install --production

# Build TypeScript
npm run build

# Create .env file
sudo nano .env
# Add production settings
```

#### 4. Create systemd Service

Create `/etc/systemd/system/ataa-core.service`:

```ini
[Unit]
Description=Ataa Core API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ataa/core
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ataa-core
sudo systemctl start ataa-core
sudo systemctl status ataa-core
```

#### 5. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/ataa`:

```nginx
server {
    listen 80;
    server_name api.ataa.example.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/ataa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.ataa.example.com
```

---

## Edge Hub Setup (Raspberry Pi)

### Hardware Requirements
- Raspberry Pi 4 (2GB+ RAM)
- 32GB+ SD card
- Wi-Fi router (optional, can use Pi as hotspot)
- Power supply
- Case

### 1. OS Installation

```bash
# Flash Raspberry Pi OS Lite to SD card
# Boot Pi and connect via SSH

ssh pi@raspberrypi.local
# Default password: raspberry
```

### 2. Install Node.js

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### 3. Deploy Application

```bash
# Create directory
sudo mkdir -p /opt/ataa/hub
cd /opt/ataa/hub

# Clone repo
git clone <repo> .
cd packages/hub
npm install --production

# Build
npm run build
```

### 4. Create systemd Service

Create `/etc/systemd/system/ataa-hub.service`:

```ini
[Unit]
Description=Ataa Edge Hub
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/ataa/hub/packages/hub
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable ataa-hub
sudo systemctl start ataa-hub
```

### 5. Setup Wi-Fi Hotspot (Optional)

```bash
# Install hostapd & dnsmasq
sudo apt install hostapd dnsmasq

# Configure /etc/hostapd/hostapd.conf
sudo nano /etc/hostapd/hostapd.conf
```

Add:
```
interface=wlan0
driver=nl80211
ssid=Ataa-Hub-Shelter1
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=AtaaSecure123
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

Start services:
```bash
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl start hostapd
sudo systemctl start dnsmasq
```

---

## Troubleshooting

### Database Connection Errors

**Core (PostgreSQL)**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Test connection
psql -U postgres -d ataa_core -c "SELECT 1"

# Check logs
# Windows: C:\Program Files\PostgreSQL\14\data\log
# Linux: /var/log/postgresql/
```

**Hub (SQLite)**
```bash
# Check database file
ls -la packages/hub/data/ataa_hub.db

# Check permissions
chmod 755 packages/hub/data
```

### Port Already in Use

```powershell
# Windows - Find process using port 4000
netstat -ano | findstr :4000

# Kill process
taskkill /PID <process_id> /F

# Linux
lsof -t -i:4000 | xargs kill -9
```

### NPM Install Fails

```powershell
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Field App Not Working Offline

1. Check service worker registration in browser DevTools
2. Ensure HTTPS or localhost (PWA requirement)
3. Check IndexedDB in Application tab
4. Try clearing site data and reloading

### Sync Not Working

1. Check network connectivity
2. Verify Hub can reach Core API
3. Check sync logs in Hub
4. Verify authentication tokens
5. Check CORS settings

### Performance Issues

**Database**
```sql
-- PostgreSQL - Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes if needed
CREATE INDEX idx_custom ON table_name(column);
```

**Node.js**
```bash
# Increase memory limit if needed
NODE_OPTIONS=--max-old-space-size=4096 npm run dev:core
```

---

## Support

For additional help:
1. Check logs: `packages/*/logs/`
2. Enable debug mode: `DEBUG=* npm run dev:core`
3. Open GitHub issue with logs and error messages

---

**System is now ready! 🎉**

Next steps:
1. Create zones and shelters via Dashboard
2. Register field workers
3. Start registering households via Field App
4. Monitor distributions via Dashboard

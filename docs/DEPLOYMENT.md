# Deployment Guide

This guide covers deploying the Laxigam Blockchain ecosystem to production.

---

## Prerequisites

- Docker and Docker Compose
- Node.js v18+
- Python 3.9+
- PostgreSQL 14+
- Domain name with SSL certificate
- API keys for:
  - Payment gateways (Razorpay, Mercado Pago, etc.)
  - AI services (Gemini, Claude)
  - Telegram Bot
  - Blockchain explorers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         PRODUCTION                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Nginx     │    │  Frontend   │    │   Backend   │     │
│  │   (SSL)     │◄──►│   (React)   │◄──►│  (FastAPI)  │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│         │                                       │            │
│         │                              ┌────────┴──────┐     │
│         │                              │               │     │
│         │                         ┌────┴────┐    ┌─────┴──┐  │
│         │                         │PostgreSQL│    │ Redis  │  │
│         │                         └─────────┘    └────────┘  │
│         │                                                    │
│         └──────────────────────────────────────────────────► │
│                                                              │
│                    Polygon Blockchain                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Server Setup

### Recommended Specifications

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB SSD
- **OS**: Ubuntu 22.04 LTS

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 2: Database Setup

### PostgreSQL

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE laxigam;"
sudo -u postgres psql -c "CREATE USER laxigam WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE laxigam TO laxigam;"

# Enable extensions
sudo -u postgres psql -d laxigam -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Redis

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

---

## Step 3: SSL Certificate

```bash
# Obtain certificate
sudo certbot --nginx -d laxigam.com -d www.laxigam.com -d api.laxigam.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Step 4: Smart Contract Deployment

### 1. Configure Environment

```bash
cd contracts
cp .env.example .env

# Edit .env
nano .env
```

```env
# .env
DEPLOYER_PRIVATE_KEY=your_private_key
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGONSCAN_API_KEY=your_api_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Deploy to Polygon

```bash
# Testnet first
npx hardhat run scripts/deploy.js --network mumbai

# Then mainnet
npx hardhat run scripts/deploy.js --network polygon
```

### 5. Verify Contracts

```bash
# Get addresses from deployments/latest.json
npx hardhat verify --network polygon CONTRACT_ADDRESS CONSTRUCTOR_ARGS
```

---

## Step 5: Backend Deployment

### 1. Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

### 2. Build Docker Image

```bash
docker build -t laxigam-backend:latest .
```

### 3. Run with Docker Compose

```bash
cd ..
docker-compose up -d postgres redis backend
```

### 4. Run Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### 5. Health Check

```bash
curl https://api.laxigam.com/health
```

---

## Step 6: Frontend Deployment

### 1. Configure Environment

```bash
cd frontend
cp .env.example .env
nano .env
```

```env
VITE_API_URL=https://api.laxigam.com
VITE_LXG_TOKEN_ADDRESS=0x...
```

### 2. Build

```bash
npm install
npm run build
```

### 3. Deploy

```bash
# Copy to web server
sudo cp -r dist/* /var/www/laxigam.com/

# Or use Docker
docker build -t laxigam-frontend:latest .
```

---

## Step 7: Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/laxigam.com
```

```nginx
# Frontend
server {
    listen 80;
    server_name laxigam.com www.laxigam.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name laxigam.com www.laxigam.com;

    ssl_certificate /etc/letsencrypt/live/laxigam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/laxigam.com/privkey.pem;

    root /var/www/laxigam.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API
server {
    listen 443 ssl http2;
    server_name api.laxigam.com;

    ssl_certificate /etc/letsencrypt/live/laxigam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/laxigam.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/laxigam.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: Telegram Bot Setup

### 1. Create Bot

```bash
# Talk to @BotFather on Telegram
# Get bot token
```

### 2. Configure Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://api.laxigam.com/telegram/webhook" \
  -d "secret_token=your_webhook_secret"
```

### 3. Set Commands

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -d 'commands=[
    {"command":"start","description":"Start the bot"},
    {"command":"app","description":"Open Mini App"},
    {"command":"balance","description":"Check balance"},
    {"command":"deposit","description":"Deposit funds"},
    {"command":"withdraw","description":"Withdraw funds"},
    {"command":"help","description":"Get help"}
  ]'
```

---

## Step 9: Payment Gateway Setup

### Razorpay (India)

1. Create account at https://razorpay.com
2. Get API keys from Dashboard
3. Configure webhook URL: `https://api.laxigam.com/webhooks/razorpay`
4. Add keys to `.env`

### Mercado Pago (Brazil)

1. Create account at https://www.mercadopago.com
2. Get access token
3. Configure webhook
4. Add token to `.env`

### QIWI (Russia)

1. Register at https://qiwi.com/p2p-admin/transfers/api
2. Get secret key
3. Configure webhook
4. Add key to `.env`

### Alipay (China)

1. Apply for merchant account
2. Get app ID and keys
3. Configure webhook
4. Add credentials to `.env`

---

## Step 10: Monitoring

### Install Prometheus & Grafana

```bash
# Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Grafana
sudo apt install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

### Application Monitoring

Add to backend:

```python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency')
```

---

## Step 11: Backup Strategy

### Database Backup

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U laxigam laxigam > "$BACKUP_DIR/laxigam_$DATE.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### Contract State Backup

```bash
# Backup deployment info
cp deployments/latest.json backups/contracts_$(date +%Y%m%d).json
```

---

## Step 12: Security Checklist

- [ ] SSL certificates installed
- [ ] Firewall configured (ufw)
- [ ] Database password strong
- [ ] API keys rotated
- [ ] Webhook secrets set
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] Regular security updates
- [ ] DDoS protection enabled

### Firewall Setup

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec backend python -c "import asyncpg; print('OK')"
```

### Frontend Build Fails

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Contract Deployment Fails

```bash
# Check balance
npx hardhat balance --network polygon YOUR_ADDRESS

# Check gas price
npx hardhat gas
```

---

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Update backend
docker-compose build backend
docker-compose up -d backend

# Update frontend
npm run build
sudo cp -r dist/* /var/www/laxigam.com/
```

### Monitor Logs

```bash
# Backend logs
docker-compose logs -f backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Support

Need help with deployment?

- **Documentation**: https://docs.laxigam.com
- **Discord**: https://discord.gg/laxigam
- **Email**: devops@laxigam.com

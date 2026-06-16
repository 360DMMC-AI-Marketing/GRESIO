#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  GRESIO - Full VPS Deployment Script
#  Run as root on a fresh Ubuntu 22.04+ VPS
#  Usage: bash deploy-vps.sh yourdomain.com
# ─────────────────────────────────────────────

DOMAIN="${1:-}"
SUPER_DOMAIN="superadmin.${DOMAIN}"
REPO="https://github.com/360DMMC-AI-Marketing/GRESIO.git"
APP_DIR="/var/www/gresio"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash deploy-vps.sh yourdomain.com"
  echo "Example: bash deploy-vps.sh gresio.app"
  exit 1
fi

echo "======================================"
echo " Deploying GRESIO to $DOMAIN"
echo " Super admin: $SUPER_DOMAIN"
echo "======================================"

# ── 1. System updates + dependencies ──
echo "[1/8] Installing system dependencies..."
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx curl gnupg

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2

# MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl start mongod && systemctl enable mongod

# ── 2. Clone repo ──
echo "[2/8] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 3. Backend setup ──
echo "[3/8] Setting up backend..."
cd "$APP_DIR/backend"

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate secure random values
  JWT_SECRET=$(openssl rand -hex 32)
  ENCRYPTION_KEY=$(openssl rand -hex 16)
  SUPER_PASS=$(openssl rand -base64 12)

  sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
  sed -i "s/change-this-to-a-long-random-secret-key-32chars/$ENCRYPTION_KEY/" .env
  sed -i "s/Admin@360dmmc2026/$SUPER_PASS/" .env
  sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=https://$DOMAIN|" .env
  sed -i "s|SUPER_ADMIN_URL=|SUPER_ADMIN_URL=https://$SUPER_DOMAIN|" .env

  echo ""
  echo "  ┌──────────────────────────────────────────┐"
  echo "  │  SUPER ADMIN PASSWORD: $SUPER_PASS"
  echo "  │  Save this — shown only once!            │"
  echo "  └──────────────────────────────────────────┘"
  echo ""
fi

npm install --production

# ── 4. Frontend build ──
echo "[4/8] Building frontend..."
cd "$APP_DIR/frontend"
npm install
VITE_API_URL=/api npm run build

# ── 5. Super Admin build ──
echo "[5/8] Building super admin..."
cd "$APP_DIR/super-admin"
npm install
VITE_API_URL=/api VITE_MAIN_APP_URL="https://$DOMAIN" npm run build

# ── 6. Nginx config ──
echo "[6/8] Configuring Nginx..."

# Main app
cat > /etc/nginx/sites-available/gresio <<NGINX_MAIN
server {
    listen 80;
    server_name $DOMAIN;

    root $APP_DIR/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
}
NGINX_MAIN

# Super admin
cat > /etc/nginx/sites-available/superadmin <<NGINX_SUPER
server {
    listen 80;
    server_name $SUPER_DOMAIN;

    root $APP_DIR/super-admin/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    location /super-api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
}
NGINX_SUPER

ln -sf /etc/nginx/sites-available/gresio /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/superadmin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# ── 7. SSL with Let's Encrypt ──
echo "[7/8] Obtaining SSL certificates..."
certbot --nginx -d "$DOMAIN" -d "$SUPER_DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
  echo ""
  echo "  SSL setup skipped or failed."
  echo "  Run manually later: certbot --nginx -d $DOMAIN -d $SUPER_DOMAIN"
  echo ""
}

# ── 8. Start backend with PM2 ──
echo "[8/8] Starting backend with PM2..."
cd "$APP_DIR/backend"
pm2 delete gresio-backend 2>/dev/null || true
pm2 start src/app.js --name gresio-backend
pm2 save
pm2 startup 2>/dev/null | tail -1

echo ""
echo "======================================"
echo "  DEPLOYMENT COMPLETE!"
echo "======================================"
echo "  Main app:     https://$DOMAIN"
echo "  Super admin:  https://$SUPER_DOMAIN"
echo ""
echo "  Manage: pm2 status | pm2 logs"
echo "  Restart: pm2 restart gresio-backend"
echo "======================================"

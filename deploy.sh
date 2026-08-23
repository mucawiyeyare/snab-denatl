#!/bin/bash
set -e

echo "======================================"
echo " SNAB Dental MS — Server Setup"
echo "======================================"

# Step 1: Check Node.js
echo ""
echo "[1/8] Checking Node.js..."
if command -v node &> /dev/null; then
    echo "Node.js found: $(node --version)"
else
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "Node.js installed: $(node --version)"
fi

# Step 2: Install PM2 globally
echo ""
echo "[2/8] Installing PM2..."
if command -v pm2 &> /dev/null; then
    echo "PM2 already installed: $(pm2 --version)"
else
    sudo npm install -g pm2
    echo "PM2 installed"
fi

# Step 3: Install Git if needed
echo ""
echo "[3/8] Checking Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi
echo "Git: $(git --version)"

# Step 4: Clone or pull repo
echo ""
echo "[4/8] Getting latest code from GitHub..."
if [ -d "/home/snabdental/snab-dental/.git" ]; then
    cd /home/snabdental/snab-dental
    git pull origin main
    echo "Code updated from GitHub"
else
    cd /home/snabdental
    rm -rf snab-dental
    git clone https://github.com/mucawiyeyare/snab-denatl.git snab-dental
    echo "Code cloned from GitHub"
fi

# Step 5: Create backend .env
echo ""
echo "[5/8] Creating backend .env..."
cat > /home/snabdental/snab-dental/backend/.env << 'ENV'
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/snab_dental_ms
JWT_SECRET=snab_dental_super_secure_jwt_2026_XkP9mNqR7vL4wD
JWT_EXPIRE=7d
ENV
echo "backend/.env created"

# Step 6: Install backend dependencies
echo ""
echo "[6/8] Installing backend dependencies..."
cd /home/snabdental/snab-dental/backend
npm install --omit=dev
echo "Dependencies installed"

# Step 7: Build frontend
echo ""
echo "[7/8] Building frontend..."
cd /home/snabdental/snab-dental/frontend
npm install
npm run build
echo "Frontend built"

# Step 8: Start/restart backend with PM2
echo ""
echo "[8/8] Starting backend with PM2..."
cd /home/snabdental/snab-dental/backend
pm2 stop snab-dental-api 2>/dev/null || true
pm2 delete snab-dental-api 2>/dev/null || true
pm2 start server.js --name snab-dental-api
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "======================================"
echo " Backend running! Testing health..."
echo "======================================"
sleep 2
curl -s http://localhost:5000/api/health || echo "Health check failed - check logs with: pm2 logs snab-dental-api"

echo ""
echo "======================================"
echo " DONE! PM2 Status:"
echo "======================================"
pm2 status
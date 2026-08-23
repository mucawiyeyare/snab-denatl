#!/bin/bash
set -e

echo "======================================"
echo " Nginx Setup for snabdental.iftiinhub.com"
echo "======================================"

# Install Nginx
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi
echo "Nginx: $(nginx -v 2>&1)"

# Create site config
sudo tee /etc/nginx/sites-available/snab-dental > /dev/null << 'NGINX'
server {
    listen 80;
    server_name snabdental.iftiinhub.com 63.142.251.246;

    root /home/snabdental/snab-dental/frontend/dist;
    index index.html;

    # React SPA - all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node.js backend on port 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
NGINX

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable snab-dental site
sudo ln -sf /etc/nginx/sites-available/snab-dental /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "Nginx configured!"
echo "Testing..."
curl -s http://localhost/api/health || echo "API check: verify PM2 is running"
echo ""
echo "Site should be live at: http://snabdental.iftiinhub.com"
echo ""
sudo systemctl status nginx --no-pager
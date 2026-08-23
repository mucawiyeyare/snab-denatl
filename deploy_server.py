import paramiko
import time
import sys

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
PORT = 22

def run(ssh, cmd, timeout=120):
    print(f"\n>>> {cmd[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out = ""
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            chunk = stdout.channel.recv(4096).decode("utf-8", errors="replace")
            print(chunk, end="", flush=True)
            out += chunk
        time.sleep(0.3)
    # Drain remaining
    remaining = stdout.channel.recv(65535).decode("utf-8", errors="replace")
    if remaining:
        print(remaining, end="", flush=True)
        out += remaining
    exit_code = stdout.channel.recv_exit_status()
    print(f"\n[exit: {exit_code}]")
    return exit_code, out

print("="*60)
print(" SNAB Dental MS - Automated Deployment")
print(f" Server: {HOST}")
print("="*60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, PORT, USER, PASS, timeout=15)
    print(f"Connected to {HOST} as {USER}")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

# ---- STEP 1: Check/Install Node.js ----
print("\n[1/9] Checking Node.js...")
code, out = run(ssh, "node --version 2>/dev/null || echo NOT_INSTALLED")
if "NOT_INSTALLED" in out or code != 0:
    print("Installing Node.js 20...")
    run(ssh, "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -", timeout=120)
    run(ssh, "sudo apt-get install -y nodejs", timeout=120)

# ---- STEP 2: Install PM2 ----
print("\n[2/9] Checking PM2...")
code, _ = run(ssh, "pm2 --version 2>/dev/null || echo NOT_INSTALLED")
if code != 0:
    run(ssh, "sudo npm install -g pm2", timeout=60)

# ---- STEP 3: Install Git ----
print("\n[3/9] Checking Git...")
run(ssh, "git --version || (sudo apt-get install -y git)")

# ---- STEP 4: Clone or pull code ----
print("\n[4/9] Getting code from GitHub...")
code, out = run(ssh, "[ -d /home/snabdental/snab-dental/.git ] && echo EXISTS || echo NEW")
if "EXISTS" in out:
    run(ssh, "cd /home/snabdental/snab-dental && git pull origin main", timeout=60)
else:
    run(ssh, "cd /home/snabdental && rm -rf snab-dental && git clone https://github.com/mucawiyeyare/snab-denatl.git snab-dental", timeout=120)

# ---- STEP 5: Create backend .env ----
print("\n[5/9] Creating backend .env...")
env_content = """NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/snab_dental_ms
JWT_SECRET=snab_dental_super_secure_jwt_2026_XkP9mNqR7vL4wD
JWT_EXPIRE=7d"""
run(ssh, f"cat > /home/snabdental/snab-dental/backend/.env << 'ENV'\n{env_content}\nENV")

# ---- STEP 6: Install backend dependencies ----
print("\n[6/9] Installing backend npm packages...")
run(ssh, "cd /home/snabdental/snab-dental/backend && npm install --omit=dev", timeout=120)

# ---- STEP 7: Build frontend ----
print("\n[7/9] Building frontend...")
run(ssh, "cd /home/snabdental/snab-dental/frontend && npm install", timeout=120)
run(ssh, "cd /home/snabdental/snab-dental/frontend && npm run build", timeout=120)

# ---- STEP 8: Start/restart PM2 ----
print("\n[8/9] Starting backend with PM2...")
run(ssh, "pm2 delete snab-dental-api 2>/dev/null || true")
run(ssh, "cd /home/snabdental/snab-dental/backend && pm2 start server.js --name snab-dental-api")
run(ssh, "pm2 save")
time.sleep(3)

# ---- STEP 9: Setup Nginx ----
print("\n[9/9] Configuring Nginx...")
run(ssh, "sudo apt-get install -y nginx 2>&1 | tail -3")

nginx_config = """server {
    listen 80;
    server_name snabdental.iftiinhub.com 63.142.251.246;

    root /home/snabdental/snab-dental/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}"""

run(ssh, f"echo '{nginx_config}' | sudo tee /etc/nginx/sites-available/snab-dental")
run(ssh, "sudo rm -f /etc/nginx/sites-enabled/default")
run(ssh, "sudo ln -sf /etc/nginx/sites-available/snab-dental /etc/nginx/sites-enabled/")
run(ssh, "sudo nginx -t")
run(ssh, "sudo systemctl restart nginx && sudo systemctl enable nginx")

# ---- Final check ----
print("\n" + "="*60)
print(" DEPLOYMENT COMPLETE - Verifying...")
print("="*60)
time.sleep(3)
run(ssh, "curl -s http://localhost:5000/api/health")
run(ssh, "curl -s http://localhost/api/health")
run(ssh, "pm2 status")
run(ssh, "sudo systemctl status nginx --no-pager | head -10")

print("\n" + "="*60)
print(" LIVE AT: http://snabdental.iftiinhub.com")
print("="*60)

ssh.close()

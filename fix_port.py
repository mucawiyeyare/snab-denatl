import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

def clean(text):
    return re.sub(r"\x1b\[[0-9;]*[mGKHF]", "", text)

def run(ssh, cmd, timeout=60):
    print(f"\n>>> {cmd}")
    sys.stdout.flush()
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out = ""
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            chunk = clean(stdout.channel.recv(4096).decode("utf-8", errors="replace"))
            print(chunk, end="", flush=True)
            out += chunk
        time.sleep(0.2)
    rem = clean(stdout.channel.recv(65535).decode("utf-8", errors="replace"))
    if rem: print(rem, end="", flush=True); out += rem
    code = stdout.channel.recv_exit_status()
    print(f"[exit:{code}]", flush=True)
    return code, out

def sudo(ssh, cmd, timeout=60):
    return run(ssh, f'echo "{PASS}" | sudo -S bash -c \'{cmd}\'', timeout=timeout)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)
print(f"Connected to {HOST}")

print("\n=== 1. Update backend .env to PORT=5005 ===")
env_content = """NODE_ENV=production
PORT=5005
MONGO_URI=mongodb://127.0.0.1:27017/snab_dental_ms
JWT_SECRET=snab_dental_super_secure_jwt_2026_XkP9mNqR7vL4wD
JWT_EXPIRE=7d"""
run(ssh, f"cat > /home/snabdental/snab-dental/backend/.env << 'ENV'\n{env_content}\nENV")

print("\n=== 2. Restart SNAB Dental PM2 process on PORT 5005 ===")
run(ssh, "pm2 delete snab-dental-api 2>/dev/null || true")
run(ssh, "cd /home/snabdental/snab-dental/backend && pm2 start server.js --name snab-dental-api --update-env")
run(ssh, "pm2 save")
time.sleep(3)

print("\n=== 3. Test backend directly on port 5005 ===")
run(ssh, "curl -i http://localhost:5005/api/health")

print("\n=== 4. Update Nginx to proxy to port 5005 ===")
nginx_ssl = f"""# HTTP -> redirect to HTTPS
server {{
    listen 80;
    server_name {DOMAIN};
    return 301 https://$host$request_uri;
}}

# HTTPS main server
server {{
    listen 443 ssl;
    server_name {DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/{DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /home/snabdental/snab-dental/frontend/dist;
    index index.html;

    # React SPA
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # Proxy API to SNAB Dental Node.js backend (port 5005)
    location /api/ {{
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }}

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
}}"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/snab-ssl.nginx", "w") as f:
    f.write(nginx_ssl)
sftp.close()

sudo(ssh, "cp /tmp/snab-ssl.nginx /etc/nginx/sites-available/snab-dental")
sudo(ssh, "nginx -t 2>&1")
sudo(ssh, "systemctl reload nginx")

print("\n=== 5. Test Live HTTPS Login ===")
time.sleep(2)
run(ssh, f"curl -ik -X POST https://{DOMAIN}/api/auth/login -H 'Content-Type: application/json' -d '{{\"username\":\"admin\",\"password\":\"admin123\"}}'")

ssh.close()

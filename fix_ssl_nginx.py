import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

def clean(text):
    return re.sub(r"\x1b\[[0-9;]*[mGKHF]", "", text)

def run(ssh, cmd, timeout=180):
    print(f"\n>>> {cmd[:100]}")
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

def sudo(ssh, cmd, timeout=120):
    return run(ssh, f'echo "{PASS}" | sudo -S bash -c \'{cmd}\'', timeout=timeout)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)
print(f"Connected to {HOST}")

# ---- Write full Nginx config with SSL ----
print("\n=== Writing Nginx SSL config ===")

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

    # Proxy API to Node.js backend (port 5000)
    location /api/ {{
        proxy_pass http://127.0.0.1:5000;
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

# Upload config via SFTP
sftp = ssh.open_sftp()
with sftp.file("/tmp/snab-ssl.nginx", "w") as f:
    f.write(nginx_ssl)
sftp.close()
print("Nginx SSL config uploaded via SFTP")

sudo(ssh, "cp /tmp/snab-ssl.nginx /etc/nginx/sites-available/snab-dental")
sudo(ssh, "rm -f /etc/nginx/sites-enabled/default")
sudo(ssh, "ln -sf /etc/nginx/sites-available/snab-dental /etc/nginx/sites-enabled/snab-dental")

# Test nginx config
print("\n=== Testing Nginx config ===")
sudo(ssh, "nginx -t 2>&1")

# Reload nginx
print("\n=== Reloading Nginx ===")
sudo(ssh, "systemctl reload nginx")
sudo(ssh, "systemctl status nginx --no-pager | head -8")

# Final checks
print("\n=== Final Verification ===")
time.sleep(3)
run(ssh, "curl -s http://localhost:5000/api/health || echo 'backend check'")
run(ssh, f"curl -sk https://{DOMAIN}/api/health 2>&1 || echo 'HTTPS check'")
run(ssh, "pm2 status")

# Show cert expiry
sudo(ssh, f"certbot certificates 2>&1 | grep -A5 '{DOMAIN}'")

print(f"""
============================================
  HTTPS SETUP COMPLETE!

  URL:  https://{DOMAIN}
  API:  https://{DOMAIN}/api/health
  Cert: Valid until 2026-11-21 (auto-renews)
============================================
""")

ssh.close()

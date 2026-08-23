# -*- coding: utf-8 -*-
import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"

def clean(text):
    return re.sub(r'\x1b\[[0-9;]*[mGKHF]', "", text)

def run(ssh, cmd, timeout=300):
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

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)
print(f"Connected to {HOST}")

print("\n=== 1/4: Building Frontend ===")
run(ssh, "cd /home/snabdental/snab-dental/frontend && npm run build 2>&1")

print("\n=== 2/4: Starting PM2 ===")
run(ssh, "pm2 delete snab-dental-api 2>/dev/null; true")
run(ssh, "cd /home/snabdental/snab-dental/backend && pm2 start server.js --name snab-dental-api")
run(ssh, "pm2 save")
time.sleep(3)
run(ssh, "curl -s http://localhost:5000/api/health")

print("\n=== 3/4: Installing Nginx ===")
run(ssh, "sudo apt-get install -y nginx 2>&1 | tail -3")

nginx = """server {
    listen 80;
    server_name snabdental.iftiinhub.com 63.142.251.246;
    root /home/snabdental/snab-dental/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
    gzip on;
    gzip_types text/css application/javascript application/json;
}"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/snab.nginx", "w") as f: f.write(nginx)
sftp.close()

run(ssh, "sudo cp /tmp/snab.nginx /etc/nginx/sites-available/snab-dental")
run(ssh, "sudo rm -f /etc/nginx/sites-enabled/default")
run(ssh, "sudo ln -sf /etc/nginx/sites-available/snab-dental /etc/nginx/sites-enabled/snab-dental")
run(ssh, "sudo nginx -t 2>&1")
run(ssh, "sudo systemctl restart nginx && sudo systemctl enable nginx")

print("\n=== 4/4: Final Check ===")
time.sleep(2)
run(ssh, "curl -s http://localhost/api/health")
run(ssh, "pm2 status")
run(ssh, "sudo systemctl is-active nginx")
print("\nLIVE: http://snabdental.iftiinhub.com")
ssh.close()


import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

def clean(text):
    return re.sub(r"\x1b\[[0-9;]*[mGKHF]", "", text)

def run(ssh, cmd, timeout=180, input_data=None):
    print(f"\n>>> {cmd[:100]}")
    sys.stdout.flush()
    stdin, stdout, _ = ssh.exec_command(f"echo {PASS} | sudo -S {cmd}", timeout=timeout, get_pty=True)
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

def run_nosudo(ssh, cmd, timeout=180):
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

# ====== First verify app is running ======
print("\n=== Checking current state ===")
run_nosudo(ssh, "pm2 status")
run_nosudo(ssh, "curl -s http://localhost:5000/api/health || echo 'backend not responding'")
run(ssh, "systemctl status nginx --no-pager | head -6")

# If backend health failed, restart PM2
print("\n=== Ensuring backend is running ===")
run_nosudo(ssh, "pm2 restart snab-dental-api 2>/dev/null || (cd /home/snabdental/snab-dental/backend && pm2 start server.js --name snab-dental-api)")
time.sleep(4)
run_nosudo(ssh, "curl -s http://localhost:5000/api/health")

# ====== STEP 1: Update apt ======
print("\n=== STEP 1: Update package list ===")
run(ssh, "apt update -y 2>&1 | tail -5", timeout=120)

# ====== STEP 2: Install UFW ======
print("\n=== STEP 2: Install & Configure UFW Firewall ===")
run(ssh, "apt install ufw -y 2>&1 | tail -3", timeout=120)
run(ssh, "ufw --force reset")
run(ssh, "ufw default deny incoming")
run(ssh, "ufw default allow outgoing")
run(ssh, "ufw allow OpenSSH")
run(ssh, "ufw allow 'Nginx Full'")
run(ssh, "ufw --force enable")
run(ssh, "ufw status verbose")

# ====== STEP 3: Install Certbot ======
print("\n=== STEP 3: Install Certbot ===")
run(ssh, "apt install certbot python3-certbot-nginx -y 2>&1 | tail -5", timeout=180)

# ====== STEP 4: Get SSL Certificate ======
print(f"\n=== STEP 4: Getting SSL Certificate for {DOMAIN} ===")
code, out = run(ssh, 
    f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --email admin@{DOMAIN} --redirect 2>&1",
    timeout=180
)

if code != 0 or "error" in out.lower():
    print("\nTrying with --email flag using a different email...")
    run(ssh,
        f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --email snabdental@gmail.com --redirect 2>&1",
        timeout=180
    )

# ====== STEP 5: Enable auto-renewal ======
print("\n=== STEP 5: Enable Certificate Auto-Renewal ===")
run(ssh, "systemctl enable certbot.timer 2>/dev/null; true")
run(ssh, "systemctl start certbot.timer 2>/dev/null; true")
run_nosudo(ssh, "sudo certbot renew --dry-run 2>&1 | tail -10")

# ====== Final Status ======
print("\n=== FINAL STATUS ===")
run_nosudo(ssh, "pm2 status")
run(ssh, "systemctl status nginx --no-pager | head -8")
run_nosudo(ssh, f"curl -sk https://{DOMAIN}/api/health || echo 'HTTPS check - may need a moment'")

print(f"""
========================================
  DEPLOYMENT COMPLETE!
  Site: https://{DOMAIN}
  API:  https://{DOMAIN}/api/health
========================================
""")

ssh.close()

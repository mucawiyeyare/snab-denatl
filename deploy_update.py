import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456snabdenal34"
DOMAIN = "snabdental.iftiinhub.com"

def clean(t): return re.sub(r"\x1b\[[0-9;]*[mGKHF]","",t)

def run(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd[:100]}")
    sys.stdout.flush()
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out=""
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            chunk=clean(stdout.channel.recv(4096).decode("utf-8",errors="replace"))
            print(chunk,end="",flush=True); out+=chunk
        time.sleep(0.2)
    rem=clean(stdout.channel.recv(65535).decode("utf-8",errors="replace"))
    if rem: print(rem,end="",flush=True); out+=rem
    code=stdout.channel.recv_exit_status()
    print(f"[exit:{code}]",flush=True)
    return code, out

print("Connecting to server...")
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, 22, USER, PASS, timeout=15)
    print(f"Connected to {HOST} successfully!")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

print("\n=== 1. Git pull latest code from GitHub ===")
run(ssh, "cd /home/snabdental/snab-dental && git pull origin main", timeout=60)

print("\n=== 2. Build frontend ===")
run(ssh, "cd /home/snabdental/snab-dental/frontend && npm run build 2>&1", timeout=300)

print("\n=== 3. Restart backend API ===")
run(ssh, "pm2 restart snab-dental-api")
time.sleep(3)

print("\n=== 4. Test Health Check ===")
run(ssh, "curl -s http://localhost:5005/api/health")

print("\n=== 5. Test Live HTTPS API ===")
run(ssh, f"curl -s https://{DOMAIN}/api/health")

print(f"\n============================================")
print(f"  DEPLOYMENT COMPLETE!")
print(f"  Live: https://{DOMAIN}")
print(f"============================================")

ssh.close()

import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

def clean(t): return re.sub(r"\x1b\[[0-9;]*[mGKHF]","",t)
def run(ssh, cmd, timeout=180):
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

ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST,22,USER,PASS,timeout=15)
print(f"Connected to {HOST}")

print("\n=== 1. Pull latest code from GitHub ===")
run(ssh,"cd /home/snabdental/snab-dental && git pull origin main",timeout=60)

print("\n=== 2. Build frontend ===")
run(ssh,"cd /home/snabdental/snab-dental/frontend && npm run build 2>&1",timeout=300)

print("\n=== 3. Restart backend ===")
run(ssh,"pm2 restart snab-dental-api")
time.sleep(3)
run(ssh,"curl -s http://localhost:5005/api/health")

print("\n=== 4. Test registration API ===")
run(ssh,"""curl -s -X POST https://snabdental.iftiinhub.com/api/auth/register -H "Content-Type: application/json" -d '{"full_name":"Admin User","username":"newadmin","password":"admin123","role":"Admin"}'""")

print("\n=== 5. Test login after registration ===")
run(ssh,"""curl -s -X POST https://snabdental.iftiinhub.com/api/auth/login -H "Content-Type: application/json" -d '{"username":"newadmin","password":"admin123"}'""")

print(f"\n=== DONE - Live at https://{DOMAIN} ===")
ssh.close()

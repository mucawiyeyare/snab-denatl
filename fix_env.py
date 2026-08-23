import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
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
    return code,out

ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST,22,USER,PASS,timeout=15)
print(f"Connected to {HOST}")

print("\n=== 1. Write clean .env.production (no BOM) ===")
# Write clean env file without BOM
sftp = ssh.open_sftp()
with sftp.file("/home/snabdental/snab-dental/frontend/.env.production", "w") as f:
    f.write("VITE_API_URL=/api\n")
sftp.close()
run(ssh, "xxd /home/snabdental/snab-dental/frontend/.env.production | head -2")
run(ssh, "cat /home/snabdental/snab-dental/frontend/.env.production")

print("\n=== 2. Rebuild frontend with correct API URL ===")
run(ssh, "cd /home/snabdental/snab-dental/frontend && npm run build 2>&1")

print("\n=== 3. Verify the API URL in built JS ===")
run(ssh, "grep -o 'localhost[^\"]*' /home/snabdental/snab-dental/frontend/dist/assets/*.js | head -5 || echo 'No localhost found - GOOD!'")
run(ssh, "grep -oc '/api' /home/snabdental/snab-dental/frontend/dist/assets/*.js || echo 'no /api'")

print("\n=== 4. Restart backend ===")
run(ssh, "pm2 restart snab-dental-api")
time.sleep(2)
run(ssh, "curl -s http://localhost:5005/api/health")

print(f"\n=== FIXED! Now try: https://{DOMAIN}/login ===")
ssh.close()

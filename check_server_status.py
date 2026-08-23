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

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)
print(f"Connected to {HOST}")

print("\n=== 1. Check PM2 logs ===")
run(ssh, "pm2 logs snab-dental-api --lines 30 --nostream")

print("\n=== 2. Check if database is seeded or has users ===")
run(ssh, "cd /home/snabdental/snab-dental/backend && node utils/seedData.js || true")

print("\n=== 3. Restart PM2 ===")
run(ssh, "pm2 restart snab-dental-api")
time.sleep(3)

print("\n=== 4. Test endpoints ===")
run(ssh, "curl -i http://localhost:5000/api/auth/login")
run(ssh, f"curl -ik https://{DOMAIN}/")

ssh.close()

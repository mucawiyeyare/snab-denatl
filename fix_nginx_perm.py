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

print("\n=== 1. Check Nginx Error Log ===")
sudo(ssh, "tail -n 20 /var/log/nginx/error.log")

print("\n=== 2. Fix Directory Permissions for Nginx (www-data) ===")
sudo(ssh, "chmod +x /home/snabdental")
sudo(ssh, "chmod -R 755 /home/snabdental/snab-dental/frontend/dist")
sudo(ssh, "systemctl restart nginx")

print("\n=== 3. Test HTTP & HTTPS again ===")
time.sleep(2)
run(ssh, f"curl -ik https://{DOMAIN}/ | head -25")
run(ssh, f"curl -ik -X POST https://{DOMAIN}/api/auth/login -H 'Content-Type: application/json' -d '{{\"username\":\"admin\",\"password\":\"admin123\"}}'")

ssh.close()

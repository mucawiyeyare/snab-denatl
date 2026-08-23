import paramiko, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)

def run(cmd):
    print(f"\n>>> {cmd}")
    _, stdout, _ = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)

run(f"curl -s https://{DOMAIN}/ | grep -o '<title>.*</title>'")
run(f"curl -s https://{DOMAIN}/api/health")

ssh.close()

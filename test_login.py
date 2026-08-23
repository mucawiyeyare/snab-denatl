import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"

def run(ssh, cmd):
    print(f"\n>>> {cmd}")
    _, stdout, _ = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)
    return out

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)

run(ssh, """curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'""")

run(ssh, """curl -i -X POST https://snabdental.iftiinhub.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"drhassan","password":"doctor123"}'""")

ssh.close()

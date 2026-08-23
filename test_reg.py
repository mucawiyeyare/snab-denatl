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
    return out

print("=== 1. Test POST /api/auth/register ===")
run("""curl -i -X POST https://snabdental.iftiinhub.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Doctor","username":"testdoc1","email":"test@clinic.com","password":"password123","role":"Doctor"}'""")

print("\n=== 2. Check PM2 logs ===")
run("pm2 logs snab-dental-api --lines 30 --nostream")

ssh.close()

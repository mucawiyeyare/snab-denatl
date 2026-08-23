import paramiko, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"
DOMAIN = "snabdental.iftiinhub.com"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)

def run(title, cmd):
    print(f"\n--- {title} ---")
    _, stdout, _ = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)

run("1. Existing username (admin)", """curl -s -i -X POST https://snabdental.iftiinhub.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin 2","username":"admin","password":"password123","role":"Admin"}'""")

run("2. New Doctor Registration", """curl -s -i -X POST https://snabdental.iftiinhub.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Dr. Farah Ali","username":"drfarah","email":"farah@clinic.com","password":"doctor123","role":"Doctor"}'""")

run("3. New Admin Registration", """curl -s -i -X POST https://snabdental.iftiinhub.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Super Admin","username":"superadmin","email":"super@clinic.com","password":"admin123456","role":"Admin"}'""")

run("4. New Cashier Registration", """curl -s -i -X POST https://snabdental.iftiinhub.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Cashier Maryan","username":"maryan","email":"maryan@clinic.com","password":"cashier123","role":"Receptionist/Cashier"}'""")

ssh.close()

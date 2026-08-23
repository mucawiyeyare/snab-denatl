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
    print(f"\n=== {title} ===")
    _, stdout, _ = ssh.exec_command(cmd, timeout=30)
    print(stdout.read().decode("utf-8", errors="replace"))

# 1. Test CORS preflight like browser does
run("1. CORS preflight (OPTIONS)", f"""curl -s -i -X OPTIONS "https://{DOMAIN}/api/auth/login" \
  -H "Origin: https://{DOMAIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" | head -20""")

# 2. Test POST with Origin header like browser
run("2. POST with Origin header (browser simulation)", f"""curl -s -i -X POST "https://{DOMAIN}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://{DOMAIN}" \
  -d '{{"username":"admin","password":"admin123"}}' | head -30""")

# 3. Check what API URL the built frontend uses
run("3. Check VITE_API_URL in built JS", """grep -o 'localhost.*api\|/api' /home/snabdental/snab-dental/frontend/dist/assets/*.js | head -5""")

# 4. Check .env.production
run("4. Check .env.production", "cat /home/snabdental/snab-dental/frontend/.env.production 2>/dev/null || echo 'NOT FOUND'")

# 5. Check backend server.js CORS config
run("5. CORS config in server.js", "grep -A5 'cors' /home/snabdental/snab-dental/backend/server.js | head -15")

ssh.close()

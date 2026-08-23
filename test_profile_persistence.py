import paramiko, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456snabdenal34"
DOMAIN = "snabdental.iftiinhub.com"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)

def run(title, cmd):
    print(f"\n=== {title} ===")
    _, stdout, _ = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)
    return out

# 1. Login to get token
token_res = run("1. Login", f"""curl -s -X POST https://{DOMAIN}/api/auth/login -H "Content-Type: application/json" -d '{{"username":"admin","password":"admin123"}}'""")

import json
try:
    data = json.loads(token_res)
    token = data.get("token")
    print(f"Token obtained: {token[:20]}...")
    
    # 2. Update profile with sample test avatar
    sample_avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    up_res = run("2. Update Profile with Avatar", f"""curl -s -X PUT https://{DOMAIN}/api/auth/update-profile \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer {token}" \
      -d '{{"full_name":"System Administrator","profile_image":"{sample_avatar}"}}'""")
    
    # 3. Check getMe (simulating page refresh / re-login)
    me_res = run("3. Verify getMe returns saved avatar", f"""curl -s -X GET https://{DOMAIN}/api/auth/me \
      -H "Authorization: Bearer {token}" """)
    
    me_data = json.loads(me_res)
    has_img = bool(me_data.get("user", {}).get("profile_image"))
    print(f"\n--> AVATAR PERSISTED IN MONGODB: {has_img} ✅")
except Exception as e:
    print(f"Test error: {e}")

ssh.close()

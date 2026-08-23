import paramiko, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASS, timeout=15)

_, stdout, _ = ssh.exec_command("git -C /home/snabdental/snab-dental log -1 --oneline && head -n 40 /home/snabdental/snab-dental/backend/controllers/auth.controller.js")
print(stdout.read().decode())

ssh.close()

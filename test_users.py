import paramiko, time, sys, io, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "63.142.251.246"
USER = "snabdental"
PASS = "123456abdi"

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

print("\n=== Check Users in DB ===")
cmd = """cd /home/snabdental/snab-dental/backend && node -e "
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
await mongoose.connect('mongodb://127.0.0.1:27017/snab_dental_ms');
const users = await User.find({});
console.log('Users found:', users.map(u => ({ username: u.username, role: u.role, status: u.status, hash: u.password_hash?.substring(0, 15) })));
const admin = await User.findOne({ username: 'admin' });
if (admin) {
  console.log('admin pass match admin123:', await bcrypt.compare('admin123', admin.password_hash));
}
process.exit(0);
"
"""
run(ssh, cmd)

ssh.close()

#!/bin/bash
# Migrate VPS from Caddy to Cloudflare + Docker nginx (HTTP :80).
set -euo pipefail
cd ~/socialflow-ai

echo "==> Stop and disable Caddy (free ports 80/443)"
if systemctl is-active --quiet caddy 2>/dev/null; then
  sudo systemctl stop caddy
fi
if systemctl is-enabled --quiet caddy 2>/dev/null; then
  sudo systemctl disable caddy
fi
# Prevent accidental restart on apt upgrade
if dpkg -l caddy >/dev/null 2>&1; then
  sudo apt-mark hold caddy 2>/dev/null || true
fi

echo "==> Patch .env for Cloudflare + nginx on port 80"
python3 << 'PY'
import re
from pathlib import Path
p = Path(".env")
text = p.read_text(encoding="utf-8").replace("\r\n", "\n")
def setv(k, v):
    global text
    pat = re.compile(rf"^{re.escape(k)}=.*$", re.M)
    line = f"{k}={v}"
    text = pat.sub(line, text) if pat.search(text) else text + ("\n" if text.endswith("\n") else "\n") + line + "\n"
setv("NEXT_PUBLIC_APP_URL", "https://charansurebrec.qzz.io")
setv("HTTP_PORT", "80")
setv("MEDIA_INTERNAL_BASE_URL", "http://app:3000")
p.write_text(text, encoding="utf-8")
print("ENV_OK")
PY

echo "==> Ensure host firewall allows 80 (and 443 for later origin cert)"
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 5 -p tcp -m state --state NEW -m tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 6 -p tcp -m state --state NEW -m tcp --dport 443 -j ACCEPT
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi

echo "==> Origin self-signed cert (Cloudflare Full mode → origin :443)"
mkdir -p nginx/ssl
if [ ! -f nginx/ssl/origin.pem ]; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout nginx/ssl/origin.key \
    -out nginx/ssl/origin.pem \
    -subj "/CN=charansurebrec.qzz.io"
fi

echo "==> Recreate stack (nginx :80/:443, n8n internal only)"
sg docker -c 'docker compose pull nginx n8n 2>/dev/null || true'
sg docker -c 'docker compose up -d --build'

echo "==> Health checks"
sleep 5
curl -sf http://127.0.0.1/api/health | head -c 120
echo ""
sg docker -c 'docker compose ps'
echo "MIGRATE_OK"

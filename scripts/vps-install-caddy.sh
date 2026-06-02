#!/bin/bash
set -euo pipefail

DOMAIN="${1:-charansurebrec.qzz.io}"
UPSTREAM="${2:-localhost:8080}"

if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
fi

sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${DOMAIN} {
    reverse_proxy ${UPSTREAM}
}
EOF

sudo systemctl enable caddy
sudo systemctl reload caddy || sudo systemctl restart caddy
sudo systemctl --no-pager status caddy | head -15
echo "CADDY_OK domain=${DOMAIN} upstream=${UPSTREAM}"

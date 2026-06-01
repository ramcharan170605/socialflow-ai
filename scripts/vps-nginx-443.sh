#!/bin/bash
set -euo pipefail
cd ~/socialflow-ai
mkdir -p nginx/ssl
if [ ! -f nginx/ssl/origin.pem ]; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout nginx/ssl/origin.key \
    -out nginx/ssl/origin.pem \
    -subj "/CN=charansurebrec.qzz.io"
fi
sg docker -c 'docker compose up -d nginx'
sleep 3
curl -skf https://127.0.0.1/api/health
echo ""
echo NGINX_443_OK

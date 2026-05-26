#!/bin/sh
set -e

# Configure DNS before Next.js/Mongoose (outside webpack — safe for Docker/VPS)
node -e "require('node:dns').setServers(['1.1.1.1','8.8.8.8'])"

# Optional: wait for n8n before accepting traffic
if [ -n "${N8N_WAIT_URL:-}" ]; then
  echo "Waiting for n8n at ${N8N_WAIT_URL}..."
  tries=0
  max=60
  until wget -q -O- "${N8N_WAIT_URL}" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -ge "$max" ]; then
      echo "WARNING: n8n not ready after ${max} attempts — starting app anyway"
      break
    fi
    sleep 2
  done
  echo "n8n is reachable."
fi

exec "$@"

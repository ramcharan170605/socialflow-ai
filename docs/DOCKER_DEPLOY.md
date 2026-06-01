# Docker Deployment Guide — SocialFlow AI MVP

Single-server stack for ~100 users: **nginx** (public) → **Next.js app** (API + frontend) → **n8n** (internal) → **MongoDB Atlas** (external).

```
                    ┌─────────────────────────────────────┐
  Internet :80      │  nginx (only public port)            │
       ────────────►│    /      → app:3000 (Next.js)       │
                    │    /api/* → app:3000                 │
                    │  (optional /n8n → n8n:5678)          │
                    └──────────┬──────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         app:3000         n8n:5678      MongoDB Atlas
    (Clerk, OAuth,       (workflows,     (external)
     Firecrawl)           credentials)
```

---

## Quick start (local / VPS)

### 1. Prerequisites

- Docker 24+ and Docker Compose v2
- MongoDB Atlas cluster (connection string ready)
- Clerk application
- Firecrawl API key
- OAuth app credentials (per platform)

### 2. Configure environment

```bash
cp .env.docker.example .env
# Edit .env — fill all required values (see checklist below)
```

Generate secrets:

```bash
openssl rand -hex 32   # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32   # N8N_ENCRYPTION_KEY
openssl rand -hex 32   # N8N_USER_MANAGEMENT_JWT_SECRET
```

### 3. Build and run

```bash
# Full production stack
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

Open: **http://localhost** (nginx → app)

### 4. Optional: n8n admin UI at `/n8n`

```bash
# In .env:
NGINX_CONF=./nginx/nginx.with-n8n-admin.conf
N8N_EDITOR_BASE_URL=http://localhost/n8n

docker compose up -d --build
```

Access editor: http://localhost/n8n (create owner account on first visit)

> For production, protect `/n8n` with VPN, IP allowlist, or basic auth — do not leave it public.

---

## Commands reference

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Build & start stack |
| `npm run docker:down` | Stop stack |
| `npm run docker:logs` | Follow all logs |
| `npm run docker:ps` | Service status |
| `docker compose exec app sh` | Shell into app container |
| `docker compose exec n8n sh` | Shell into n8n container |

### Development workflow

```bash
# Run only n8n in Docker; Next.js on host (faster HMR)
docker compose up n8n -d
# .env: N8N_WEBHOOK_URL=http://localhost:5678/webhook/socialflow-generate
npm run dev
```

---

## Networking

| Service | Network | Public port |
|---------|---------|-------------|
| nginx | `socialflow_net` | **80** (configurable `HTTP_PORT`) |
| app | `socialflow_net` | none (internal) |
| n8n | `socialflow_net` | none (internal) |
| MongoDB | external | Atlas |

**Critical:** Set in `.env`:

```env
N8N_WEBHOOK_URL=http://n8n:5678/webhook/socialflow-generate
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

The browser never sees `N8N_WEBHOOK_URL` — only the backend uses it inside Docker.

---

## n8n persistence

Volume `socialflow_n8n_data` mounts to `/home/node/.n8n` and stores:

- Workflows
- Credentials (encrypted with `N8N_ENCRYPTION_KEY`)
- Execution history
- SQLite database

Backup:

```bash
docker run --rm -v socialflow_n8n_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/n8n-backup.tar.gz -C /data .
```

---

## Deploy on Render (MVP options)

Render **standard Web Services run one container**. For the full docker-compose stack, use one of:

### Option A — VPS (recommended for full stack)

See **[docs/ORACLE_CLOUD_VPS.md](./ORACLE_CLOUD_VPS.md)** for Oracle Cloud (OCI) step-by-step, including SSH login.

1. Provision Ubuntu 22.04 VM (2GB+ RAM)
2. Install Docker + Compose
3. Clone repo, configure `.env`, run `docker compose up -d --build`
4. Point domain A record to VM IP
5. Add TLS with Caddy or Certbot in front of nginx

### Option B — Render Web Service (app + nginx only)

Deploy **only** the app; use **n8n Cloud** or self-hosted n8n elsewhere:

- `N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/socialflow-generate`
- Use existing `Dockerfile` + set env vars in Render dashboard

### Option C — Render multiple services

- Service 1: `Dockerfile` (app) — internal port 3000
- Service 2: `n8nio/n8n` image with persistent disk
- Private networking between services
- Public service or edge proxy for HTTPS

---

## Production checklist

### Infrastructure

- [ ] MongoDB Atlas cluster created; IP allowlist includes server IP (`0.0.0.0/0` for MVP only if needed)
- [ ] Domain DNS points to server
- [ ] `.env` copied from `.env.docker.example` and filled
- [ ] `TOKEN_ENCRYPTION_KEY` set (64 hex chars)
- [ ] `N8N_ENCRYPTION_KEY` and `N8N_USER_MANAGEMENT_JWT_SECRET` set
- [ ] `NEXT_PUBLIC_APP_URL` = production HTTPS URL
- [ ] `N8N_WEBHOOK_URL=http://n8n:5678/webhook/socialflow-generate` (Docker internal)

### Clerk

- [ ] Production Clerk keys in `.env`
- [ ] Allowed origins: `https://your-domain.com`
- [ ] Google, GitHub, Email providers enabled

### Docker

- [ ] `docker compose up -d --build` succeeds
- [ ] `docker compose ps` shows all services healthy
- [ ] `curl http://localhost/health` returns `{"status":"ok"}`

### n8n setup

- [ ] Open n8n UI (internal port 5678 or `/n8n` if admin profile enabled)
- [ ] Create owner account
- [ ] **Import** `workflow.json` (Workflows → Import from File)
- [ ] Create an **OpenAI API** credential named `OpenAI account` (or re-select your credential on both model nodes after import)
- [ ] Confirm both **OpenAI Chat Model** sub-nodes use **Chat Completions** (`responsesApiEnabled` off) — required for Basic LLM Chain nodes
- [ ] **Activate** workflow
- [ ] Copy production webhook path: `socialflow-generate`
- [ ] Verify webhook: `docker compose exec app wget -qO- http://n8n:5678/healthz`

### OAuth platforms

For each platform, register redirect URI:

```
https://your-domain.com/api/platforms/callback/linkedin
https://your-domain.com/api/platforms/callback/facebook
https://your-domain.com/api/platforms/callback/instagram
https://your-domain.com/api/platforms/callback/threads
https://your-domain.com/api/platforms/callback/youtube
https://your-domain.com/api/platforms/callback/producthunt
... (see docs/MULTI_TENANT.md)
```

- [ ] LinkedIn app configured
- [ ] Meta app (Facebook Pages / Instagram Business / Threads)
- [ ] YouTube Community (text/image posts only — no upload scopes) & Product Hunt apps (placeholders — connect UI shows “Coming soon”)
- [ ] Client secrets in `.env`

### End-to-end tests

- [ ] Sign in via Clerk on production URL
- [ ] Dashboard → Connections → connect LinkedIn (or Dev.to API key)
- [ ] Generate content from a public URL
- [ ] Check workflow history in dashboard
- [ ] Optional: enable auto-publish with connected account
- [ ] Verify MongoDB has `connected_accounts`, `oauth_tokens`, `workflow_history` documents

### Security (before real users)

- [ ] Do not commit `.env`
- [ ] n8n UI not publicly exposed (or protected)
- [ ] Rate limits configured (`RATE_LIMIT_POINTS`)
- [ ] HTTPS enabled in front of nginx
- [ ] MongoDB Atlas IP restricted where possible

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App starts before n8n | Wait for n8n healthcheck; check `docker compose logs n8n` |
| `TOKEN_ENCRYPTION_KEY` error | Set 64-char hex in `.env` |
| OAuth redirect mismatch | `NEXT_PUBLIC_APP_URL` must match public URL exactly |
| n8n workflow 404 | Import + activate workflow; path must be `socialflow-generate` |
| Clerk invalid key | Rebuild app after changing `NEXT_PUBLIC_*` keys |
| Out of memory | Use 2GB+ RAM; n8n + Next.js need ~1.5GB combined |
| MongoDB `querySrv ECONNREFUSED` / DNS timeout | App uses Cloudflare/Google DNS (`1.1.1.1`, `8.8.8.8`) via `lib/server/dns-bootstrap.ts` before Mongoose connects |

---

## Files reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Next.js multi-stage production image |
| `Dockerfile.worker` | Optional BullMQ worker |
| `docker-compose.yml` | Full MVP stack |
| `docker-compose.dev.yml` | Dev overrides |
| `nginx/nginx.conf` | Public proxy (app only) |
| `nginx/nginx.with-n8n-admin.conf` | Proxy with `/n8n` admin |
| `.env.docker.example` | Environment template |
| `scripts/docker-entrypoint.sh` | Wait for n8n before app start |

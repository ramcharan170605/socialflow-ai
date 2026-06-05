# SocialFlow AI

**Turn any website URL into platform-ready social content.**

SocialFlow AI is a creator-focused SaaS MVP that crawls public pages, summarizes them with AI, and generates copy tailored to each social platform. Built for multi-tenant deployment with encrypted OAuth, Docker, and n8n orchestration.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Platform support](#platform-support)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start (local)](#quick-start-local)
- [Docker (full stack)](#docker-full-stack)
- [OAuth & connected accounts](#oauth--connected-accounts)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Security](#security)
- [Credits & usage](#credits--usage)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

SocialFlow AI helps creators and teams:

1. **Paste a URL** — Firecrawl extracts clean, AI-ready content from any public page.
2. **Describe the angle** — Add a prompt (e.g. “Write a LinkedIn post about this launch”).
3. **Pick a platform** — Content is optimized per channel (tone, length, format).
4. **Generate & preview** — Stream results in the UI; copy or optionally auto-publish.

The frontend **never** talks to n8n directly. All orchestration, token handling, and rate limiting happen server-side.

---

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────┐
│   Browser   │────▶│  Next.js 14 (App Router + API)       │────▶│ MongoDB │
│  React UI   │     │  Clerk auth · OAuth · token encryption │     │  Atlas  │
└─────────────┘     └──────────────┬───────────────────────┘     └─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Firecrawl      n8n webhook    Redis (optional)
              (crawl)        (LLM pipeline)  (cache / queue)
```

**Responsibility split**

| Layer | Role |
|-------|------|
| **Next.js** | Auth, OAuth, encrypted token storage, tenant isolation, rate limits, API |
| **MongoDB** | Users, connected accounts, OAuth tokens, workflow history, generated posts |
| **n8n** | Summarization, platform-specific generation, optional publish via injected tokens |
| **Firecrawl** | Website crawling and content extraction |

n8n does **not** store user credentials. Tokens are encrypted in MongoDB and injected per request.

See [docs/MULTI_TENANT.md](docs/MULTI_TENANT.md) for the full multi-tenant design.

---

## Platform support

Single source of truth: [`lib/platforms/catalog.ts`](lib/platforms/catalog.ts)

| Platform | Content generation | Connect & publish |
|----------|-------------------|-------------------|
| LinkedIn | ✅ | ✅ OAuth |
| Facebook Pages | ✅ | ✅ OAuth (Meta) |
| Instagram Business | ✅ | ✅ OAuth (Meta) |
| Threads | ✅ | ✅ OAuth (Meta) |
| Dev.to | ✅ | ✅ API key |
| YouTube Community | ✅ | 🔜 Coming soon (text/image posts only) |
| Product Hunt | ✅ | 🔜 Coming soon |

**YouTube scope:** Community tab posts only (LinkedIn/Threads-style). No video, Shorts, or upload pipelines.

Prompt templates live in the catalog and are mirrored in `workflow.json` for n8n.

---

## Tech stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14, React 18, Clerk |
| Backend | Next.js API Routes, Mongoose, Zod |
| Database | MongoDB Atlas |
| AI pipeline | n8n 2.x + OpenAI (or compatible LLM) |
| Crawling | Firecrawl |
| Infra | Docker, nginx, Render-ready |
| Optional | Redis, BullMQ worker |

---

## Project structure

```
├── app/                    # Pages + API routes (App Router)
├── components/             # React UI (dashboard, generate form, connections)
├── lib/
│   ├── oauth/              # Providers, token manager, profiles
│   ├── platforms/          # Platform catalog (single source of truth)
│   ├── server/             # Server-only utilities (DNS bootstrap)
│   └── workflow-service.ts # n8n trigger + token injection
├── models/                 # Mongoose schemas
├── docs/                   # Deployment & architecture guides
├── nginx/                  # Reverse proxy configs
├── scripts/                # Docker entrypoint, optional worker
├── workflow.json           # n8n workflow — import and activate
├── docker-compose.yml      # nginx + app + n8n
├── Dockerfile
└── .env.example            # Local dev template
```

---

## Quick start (local)

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster
- [Clerk](https://clerk.com) app (Google, GitHub, Email)
- [Firecrawl](https://firecrawl.dev) API key
- n8n instance (cloud or self-hosted)

### Setup

```bash
git clone https://github.com/ramcharan170605/socialflow-ai.git
cd socialflow-ai
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### n8n workflow

1. Import `workflow.json` in n8n
2. Attach **OpenAI** credentials to both LLM nodes
3. Activate the workflow
4. Copy the **Production Webhook URL** (`socialflow-generate`)
5. Set `N8N_WEBHOOK_URL` in `.env`

The workflow uses a webhook trigger and returns JSON (preview-first SaaS model). Auto-publish is optional and uses dynamically injected OAuth tokens.

### Clerk

1. Enable Google, GitHub, and Email providers
2. Add `http://localhost:3000` to allowed origins
3. Copy publishable + secret keys to `.env`

---

## Docker (full stack)

Runs **nginx** + **Next.js** + **n8n** on a single server. MongoDB stays external (Atlas).

```bash
cp .env.docker.example .env
# Edit .env with your keys
npm run docker:up
```

Open [http://localhost](http://localhost)

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Build and start stack |
| `npm run docker:logs` | Follow container logs |
| `npm run docker:down` | Stop stack |
| `npm run docker:ps` | Container status |

Full checklist: [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md)

---

## OAuth & connected accounts

Users connect platforms once from **Dashboard → Connections**. Tokens are encrypted at rest (`TOKEN_ENCRYPTION_KEY`) and scoped per Clerk user.

**OAuth callback pattern**

```
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/{platform}
```

Register this redirect URI in each provider's developer console. Required env vars are listed in [`.env.example`](.env.example).

**Flow**

```
User signs in (Clerk)
  → Connect platform (OAuth or API key)
  → Tokens stored encrypted in MongoDB
  → On generate: backend loads token → injects into n8n webhook
  → Optional auto-publish with Bearer token
```

---

## API reference

### Content

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/crawl` | POST | Yes | Preview crawl (Firecrawl) |
| `/api/generate` | POST | Yes | Full generation pipeline |
| `/api/stream` | POST | Yes | SSE streaming generation |
| `/api/history` | GET | Yes | Posts & prompt history |
| `/api/usage` | GET | Yes | Credits & analytics |

### Platforms & workflow

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/platforms/connect/:platform` | GET | Yes | Start OAuth redirect |
| `/api/platforms/callback/:platform` | GET | No | OAuth callback |
| `/api/platforms/connect/:platform/api-key` | POST | Yes | Dev.to API key |
| `/api/platforms/accounts` | GET | Yes | List connections |
| `/api/platforms/disconnect/:platform` | DELETE | Yes | Revoke & delete tokens |
| `/api/workflow/trigger` | POST | Yes | Generate (+ optional publish) |
| `/api/workflow/history` | GET | Yes | Execution logs |

---

## Environment variables

Copy [`.env.example`](.env.example) for local dev or [`.env.docker.example`](.env.docker.example) for Docker.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (OAuth redirects) |
| `TOKEN_ENCRYPTION_KEY` | Yes | AES-256-GCM key for OAuth tokens |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl API key |
| `N8N_WEBHOOK_URL` | Yes | Internal n8n production webhook |
| `LINKEDIN_CLIENT_ID` / `SECRET` | For LinkedIn OAuth | |
| `META_APP_ID` / `SECRET` | For Meta platforms | Facebook Pages, Instagram Business |
| `THREADS_APP_ID` / `SECRET` | For Threads | Separate Threads app (not shared with Meta app) |
| `YOUTUBE_CLIENT_ID` / `SECRET` | Placeholder | Community posts (coming soon) |
| `PRODUCTHUNT_CLIENT_ID` / `SECRET` | Placeholder | Coming soon |
| `REDIS_URL` | No | Cache + optional job queue |
| `USE_QUEUE` | No | Set `true` to enqueue heavy jobs |

Generate encryption key: `openssl rand -hex 32`

---

## Deployment

### Render

1. Push to GitHub
2. **New Blueprint** → connect repo → use `render.yaml`
3. Set secret env vars in the dashboard
4. Add Render URL to Clerk allowed origins

Manual web service: Docker runtime, `./Dockerfile`, health check `/api/health`.

See [DEPLOY-RENDER.md](DEPLOY-RENDER.md) for step-by-step instructions.

### Optional background worker

```bash
# .env
USE_QUEUE=true
REDIS_URL=redis://localhost:6379

npm run worker
```

---

## Security

- Clerk authentication on all generation and platform APIs
- OAuth tokens encrypted at rest (AES-256-GCM)
- OAuth `state` stored server-side with 10-minute TTL
- n8n webhook URL never exposed to the frontend
- Refresh tokens never sent to n8n (access tokens only)
- Input sanitization, Zod validation, per-user rate limiting
- nginx rate limiting in Docker proxy profile

---

## Credits & usage

New users receive `DEFAULT_USER_CREDITS` (default: **50**). Each generation costs 1 credit. View balance and history on `/dashboard`.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/MULTI_TENANT.md](docs/MULTI_TENANT.md) | OAuth architecture, data flow, security |
| [docs/ORACLE_CLOUD_VPS.md](docs/ORACLE_CLOUD_VPS.md) | Oracle Cloud VPS deploy (SSH, Docker, ports) |
| [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md) | Docker checklist, n8n import, production |
| [DEPLOY-RENDER.md](DEPLOY-RENDER.md) | Render deployment guide |

**Related:** Based on the original n8n workflow from [AI-Workflow-for-Social-Media-Content-Automation](https://github.com/ramcharan170605/AI-Workflow-for-Social-Media-Content-Automation).

---

## License

MIT

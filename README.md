# SocialFlow AI

Production-ready AI SaaS that turns any website URL into platform-optimized social media content. Built on **Next.js 14**, **Clerk**, **MongoDB Atlas**, **Firecrawl**, and **n8n**.

## Architecture

```
Browser (React) → Next.js API Routes → Firecrawl + MongoDB
                              ↓
                         n8n Webhook (internal)
                              ↓
                    LLM Summarize → Platform Post → JSON Response
```

The frontend **never** calls n8n directly. Webhook URLs stay server-side only.

## Features

- Modern AI SaaS UI (dark/light theme, responsive)
- Website URL + custom prompt + 10 platform targets
- Firecrawl-powered crawling and content extraction
- Streaming generation via Server-Sent Events
- Clerk auth (Google, GitHub, email/password)
- MongoDB: users, posts, prompts, executions, analytics, rate limits
- Content preview, copy-to-clipboard, history dashboard
- Credits system, quality scoring, optional Redis queue
- Docker + Render deployment ready

## Project structure

```
├── app/                 # Next.js App Router (pages + API)
├── components/          # React UI components
├── lib/                 # Firecrawl, n8n, auth, rate limit, queue
├── models/              # Mongoose schemas
├── scripts/worker.ts    # Optional BullMQ worker
├── workflow.json        # Refactored n8n workflow (import to n8n)
├── nginx/               # Reverse proxy config
├── Dockerfile
├── docker-compose.yml
└── render.yaml
```

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- MongoDB Atlas cluster
- [Clerk](https://clerk.com) application (enable Google, GitHub, Email)
- [Firecrawl](https://firecrawl.dev) API key
- n8n instance (cloud or self-hosted)

### 2. Install

```bash
cd Workflow_social
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
```

Open http://localhost:3000

### 3. Configure n8n workflow

1. In n8n, **Import from File** → select `workflow.json`
2. Attach your **OpenAI** (or compatible) credentials to both LLM nodes
3. **Activate** the workflow
4. Copy the **Production Webhook URL** (path: `socialflow-generate`)
5. Set `N8N_WEBHOOK_URL` in `.env` — never commit this URL publicly

The refactored workflow replaces Google Sheets trigger with a webhook and returns JSON instead of auto-posting (preview-first SaaS model). Original nodes (Article Summarizer, platform-specific prompts) are preserved and extended.

### 4. Clerk setup

1. Create a Clerk app
2. Enable **Google**, **GitHub**, and **Email** providers
3. Add `http://localhost:3000` to allowed origins
4. Copy publishable + secret keys to `.env`

## API endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/crawl` | POST | Yes | Preview crawl (Firecrawl) |
| `/api/generate` | POST | Yes | Full generation pipeline |
| `/api/stream` | POST | Yes | SSE streaming generation |
| `/api/history` | GET | Yes | Posts & prompt history |
| `/api/usage` | GET | Yes | Credits & analytics |

## Environment variables

See [.env.example](.env.example) for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl API key |
| `N8N_WEBHOOK_URL` | Yes | Internal n8n production webhook |
| `REDIS_URL` | No | Redis for cache + job queue |
| `USE_QUEUE` | No | Set `true` to enqueue heavy jobs |

## Docker (single-server MVP)

Full stack: **nginx** + **Next.js** + **n8n** (MongoDB Atlas external).

```bash
cp .env.docker.example .env
# Edit .env with your keys
npm run docker:up
```

Open http://localhost — see **[docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md)** for the complete checklist, Render options, and n8n import steps.

```bash
npm run docker:logs   # follow logs
npm run docker:down   # stop stack
```

## Deploy to Render

1. Push this repo to GitHub
2. In Render: **New Blueprint** → connect repo → use `render.yaml`
3. Set secret env vars in the dashboard:
   - `MONGODB_URI`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `FIRECRAWL_API_KEY`
   - `N8N_WEBHOOK_URL`
4. Deploy web service; optionally enable worker + Redis from blueprint
5. Add your Render URL to Clerk allowed origins

### Manual Render web service

- **Runtime:** Docker
- **Dockerfile path:** `./Dockerfile`
- **Health check:** `/api/health`

## Security

- All generation APIs require Clerk authentication
- n8n webhook URL is server-only
- Input sanitization (HTML strip, URL validation, length limits)
- Per-user rate limiting (MongoDB-backed)
- Zod request validation
- Nginx rate limiting when using proxy profile

## Platforms supported

LinkedIn, Facebook Pages, Instagram Business, Threads, Medium, Dev.to, YouTube Community (text/image Community tab posts only — no video uploads), and Product Hunt — each with optimized prompt templates in `lib/platforms/catalog.ts` and the n8n Code node.

## Credits & usage

New users receive `DEFAULT_USER_CREDITS` (default: 50). Each generation costs 1 credit. View balance and history on `/dashboard`.

## Optional: background queue

```bash
# .env
USE_QUEUE=true
REDIS_URL=redis://localhost:6379

npm run worker
```

## Related repository

Based on the n8n workflow from [AI-Workflow-for-Social-Media-Content-Automation](https://github.com/ramcharan170605/AI-Workflow-for-Social-Media-Content-Automation).

## License

MIT

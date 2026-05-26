# Deploy SocialFlow AI to Render (live test)

Render deploys from **Git**. Use a **private** repo for testing; make it public later if you want.

## Step 1 — Push code (one-time)

If you use GitHub Desktop or Git Bash:

```bash
cd c:\N8N\Workflow_social
git init
git add .
git commit -m "Initial SocialFlow AI SaaS"
git branch -M main
git remote add origin https://github.com/ramcharan170605/socialflow-ai.git
git push -u origin main
```

Or create the repo on GitHub and push via GitHub Desktop.

## Step 2 — Create Render service

1. Open [Render Dashboard](https://dashboard.render.com)
2. **New +** → **Blueprint** (or **Web Service**)
3. Connect GitHub → select repo `socialflow-ai`
4. Render reads `render.yaml` automatically

**Or manual Web Service:**

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check | `/api/health` |

## Step 3 — Environment variables (required)

Set these in Render → **Environment**:

| Variable | Where to get it |
|----------|-----------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) |
| `N8N_WEBHOOK_URL` | n8n → workflow active → Production Webhook URL |

Optional: `N8N_API_KEY` if your webhook uses header auth.

## Step 4 — Clerk allowed origins

After deploy, copy your Render URL (e.g. `https://socialflow-ai.onrender.com`).

In **Clerk** → Configure → **Domains** / **Allowed origins**, add:

- `https://socialflow-ai.onrender.com`
- `https://your-service-name.onrender.com`

## Step 5 — n8n workflow

1. Import `workflow.json` in n8n
2. Attach **OpenAI** credentials to both LLM nodes
3. **Activate** workflow
4. Copy **Production** webhook URL → `N8N_WEBHOOK_URL` on Render
5. Redeploy if you changed env vars

## Step 6 — Test

1. Open your Render URL
2. Sign in (Google / GitHub / email)
3. Enter a URL + prompt → **Generate**
4. Check `/dashboard` for history

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Clerk | Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set **before** build |
| 401 on generate | Sign in; check Clerk keys match Render URL |
| n8n timeout | Free Render spins down; first request may be slow |
| Firecrawl error | Verify `FIRECRAWL_API_KEY` and URL is public |

## Auto-posting OAuth (see README)

Current workflow **does not auto-post**. OAuth inside n8n is only needed if you add publish nodes back.

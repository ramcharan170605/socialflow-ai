# Multi-Tenant SaaS Architecture

## Responsibility split

| Layer | Responsibility |
|-------|----------------|
| **Next.js backend** | Auth (Clerk), OAuth, token storage, encryption, tenant isolation, rate limits |
| **MongoDB** | `users`, `connected_accounts`, `oauth_tokens`, `workflow_history`, `generated_posts` |
| **n8n** | AI summarization, content generation, optional publish HTTP calls using **injected tokens** |

n8n does **not** store user OAuth credentials or manage SaaS accounts.

## Data flow

```
User → Clerk auth → API route
  → Load encrypted tokens for userId + platform (MongoDB)
  → Refresh if expired
  → POST n8n webhook { platformTokens: { linkedin: { accessToken } }, publish }
  → n8n generates content (+ publishes with dynamic Bearer token)
  → Response saved to workflow_history + generated_posts
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/platforms/connect/:platform` | Start OAuth redirect |
| GET | `/api/platforms/callback/:platform` | OAuth callback (public) |
| POST | `/api/platforms/connect/:platform/api-key` | Dev.to API key |
| GET | `/api/platforms/accounts` | List user's connections |
| DELETE | `/api/platforms/disconnect/:platform` | Revoke & delete tokens |
| POST | `/api/workflow/trigger` | Generate (+ optional publish) |
| GET | `/api/workflow/history` | Execution logs |

## Security

- Tokens encrypted at rest with `TOKEN_ENCRYPTION_KEY` (AES-256-GCM)
- OAuth `state` stored server-side with 10-minute TTL
- All queries scoped by `userId` from Clerk
- Refresh tokens never sent to n8n (access tokens only)

## Platform OAuth setup

Register redirect URIs for each platform:

```
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/linkedin
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/facebook
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/instagram
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/threads
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/youtube
{NEXT_PUBLIC_APP_URL}/api/platforms/callback/producthunt
...
```

See `.env.example` for required client IDs/secrets.

**Meta vs Threads:** Facebook Pages and Instagram Business share `META_APP_ID` / `META_APP_SECRET` (Facebook Login + Graph API). Threads uses a **separate** Threads app with `THREADS_APP_ID` / `THREADS_APP_SECRET`, dedicated OAuth endpoints, and long-lived token refresh via `th_exchange_token` / `th_refresh_token` (handled in `lib/oauth/threads.ts`).

### YouTube (Community posts only)

YouTube integration is scoped to **Community tab** social posts (text, optional image) — the same lightweight model as LinkedIn or Threads. It does **not** include:

- Video or Shorts uploads
- Thumbnail or media processing pipelines
- Studio / resumable upload APIs

OAuth uses read-only YouTube scope plus Google `openid`/`profile` for channel identity. Auto-publish for YouTube is not enabled until the Community post API path ships (`comingSoon` in the catalog).

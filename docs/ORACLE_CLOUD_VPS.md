# Oracle Cloud VPS — SocialFlow AI Deployment

Step-by-step guide for deploying the full Docker stack (nginx + Next.js + n8n) on an **Oracle Cloud Infrastructure (OCI)** Ubuntu VM.

**Your instance (example):**

| Item | Value |
|------|--------|
| Public IP | `129.159.237.65` |
| SSH user | `ubuntu` (Ubuntu cloud images) |
| Private key | `ssh-key-2026-06-01.key` (from OCI console) |

Replace IP/key paths if your instance differs.

---

## Step 1 — SSH login (from your Windows PC)

### 1.1 Open Oracle Cloud ingress (required once)

In OCI: **Networking → Virtual cloud networks → your VCN → Security Lists → Ingress rules**

| Port | Protocol | Source | Purpose |
|------|----------|--------|-----------|
| 22 | TCP | Your home IP `/32` (recommended) or `0.0.0.0/0` | SSH |
| 80 | TCP | `0.0.0.0/0` | SocialFlow app (nginx) |
| 443 | TCP | `0.0.0.0/0` | HTTPS (after TLS) |
| 5678 | TCP | **127.0.0.1 only** (VPS loopback) | n8n editor — use SSH tunnel from your PC |

Also ensure the VM has a **public IPv4** assigned (Instance → Attached VNIC → Public IP).

### 1.2 Fix private key permissions (Windows, one-time)

Open **PowerShell** (not inside SSH):

```powershell
$key = "C:\Users\ramch\Downloads\ssh-key-2026-06-01.key"
icacls $key /inheritance:r
icacls $key /grant:r "$($env:USERNAME):(R)"
```

If SSH still complains the key is too open, move the key to `C:\Users\ramch\.ssh\oci-socialflow.key` and repeat `icacls`.

### 1.3 Connect to the VPS

```powershell
ssh -i "C:\Users\ramch\Downloads\ssh-key-2026-06-01.key" ubuntu@129.159.237.65
```

First connection: type `yes` when asked to trust the host fingerprint.

**Success looks like:**

```text
ubuntu@socialflow-vm:~$
```

You are now on the server — all following steps run **on the VPS** unless noted.

### 1.4 Optional: SSH config shortcut

Create or edit `C:\Users\ramch\.ssh\config`:

```sshconfig
Host socialflow-oci
  HostName 129.159.237.65
  User ubuntu
  IdentityFile C:/Users/ramch/Downloads/ssh-key-2026-06-01.key
```

Then connect with:

```powershell
ssh socialflow-oci
```

---

## Step 2 — Prepare the server (on VPS, after SSH)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

Log out and SSH in again so the `docker` group applies:

```powershell
exit
ssh -i "C:\Users\ramch\Downloads\ssh-key-2026-06-01.key" ubuntu@129.159.237.65
```

Verify:

```bash
docker --version
docker compose version
```

---

## Step 3 — Clone SocialFlow AI

```bash
cd ~
git clone https://github.com/ramcharan170605/socialflow-ai.git
cd socialflow-ai
cp .env.docker.example .env
nano .env   # fill MongoDB, Clerk, Firecrawl, OAuth, secrets — see DOCKER_DEPLOY.md checklist
```

**Production URL on VPS (before TLS):**

```bash
NEXT_PUBLIC_APP_URL=http://129.159.237.65
HTTP_PORT=80
MEDIA_INTERNAL_BASE_URL=http://app:3000
MEDIA_UPLOAD_DIR=/app/data/uploads
```

After you add a domain + HTTPS, change `NEXT_PUBLIC_APP_URL` to `https://your-domain.com` and rebuild the app container.

Generate secrets on the server:

```bash
openssl rand -hex 32   # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32   # N8N_ENCRYPTION_KEY
openssl rand -hex 32   # N8N_USER_MANAGEMENT_JWT_SECRET
```

---

## Step 4 — Start the stack

```bash
docker compose up -d --build
docker compose ps
curl -s http://localhost/api/health
```

From your browser (after port 80 is open in OCI):

- App: **http://129.159.237.65**
Import and activate `workflow.json` in n8n via SSH tunnel (n8n has no public host port) — see [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md#n8n-setup).

---

## Cloudflare (production)

| Setting | Value |
|---------|--------|
| Domain | `charansurebrec.qzz.io` (proxied / orange cloud) |
| SSL mode | **Full** (origin self-signed on nginx `:443`) → later **Full (strict)** with Cloudflare Origin Certificate |
| Origin | Docker **nginx** on ports **80** and **443** — **no Caddy** on the host |
| Public URL | `https://charansurebrec.qzz.io` |

**Clerk & OAuth** — use HTTPS domain only:

```text
https://charansurebrec.qzz.io
https://charansurebrec.qzz.io/api/platforms/callback/{platform}
```

---

## Ports on this deployment

| Service | Host port | Access |
|---------|-----------|--------|
| nginx → SocialFlow | **80**, **443** | Public via Cloudflare |
| Next.js app | 3000 | Internal only (Docker network) |
| n8n | **127.0.0.1:5678** | SSH tunnel only — not on `0.0.0.0` |

**n8n admin via SSH tunnel (Windows PowerShell):**

Dedicated tunnel (recommended — fails loudly if port 5678 is busy):

```powershell
ssh -i "C:\Users\ramch\Downloads\ssh-key-2026-06-01.key" -o ExitOnForwardFailure=yes -N -L 127.0.0.1:5678:127.0.0.1:5678 ubuntu@129.159.237.65
```

Interactive SSH + tunnel (keep this window open):

```powershell
ssh -i "C:\Users\ramch\Downloads\ssh-key-2026-06-01.key" -o ExitOnForwardFailure=yes -L 127.0.0.1:5678:127.0.0.1:5678 ubuntu@129.159.237.65
```

Then open **http://127.0.0.1:5678** (not only `localhost` if IPv6 causes issues).  
If local port 5678 is taken, use `-L 127.0.0.1:15678:127.0.0.1:5678` and browse **http://127.0.0.1:15678**.

**Cursor n8n MCP (with SSH tunnel active):** set MCP URL to `http://127.0.0.1:5678/mcp-server/http` and your n8n MCP access token in Cursor MCP settings (see `.cursor/mcp.json.example`).

While SSH is connected, verify the forward in a **second** PowerShell window:

```powershell
netstat -ano | findstr ":5678"
```

You should see `LISTENING` on `127.0.0.1:5678` owned by `ssh.exe`. If nothing is listening, the tunnel did not bind (usually a local port conflict).

---

## Troubleshooting SSH

| Issue | Fix |
|-------|-----|
| `Permission denied (publickey)` | Wrong key file, or key not injected in OCI instance launch |
| `Connection timed out` | OCI security list missing port 22; wrong public IP |
| `WARNING: UNPROTECTED PRIVATE KEY FILE` | Run `icacls` commands in §1.2 |
| `Host key verification failed` | `ssh-keygen -R 129.159.237.65` then reconnect |
| `ERR_CONNECTION_REFUSED` on `localhost:5678` | SSH login works but **port forward did not bind** — add `-o ExitOnForwardFailure=yes`, use explicit `-L 127.0.0.1:5678:127.0.0.1:5678`, check `netstat` for `ssh.exe` on 5678, free the port or use 15678 locally |

---

## Related docs

- [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) — full checklist, n8n import, troubleshooting
- [MULTI_TENANT.md](./MULTI_TENANT.md) — OAuth architecture

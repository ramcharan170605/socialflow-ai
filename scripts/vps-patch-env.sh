#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE=".env"

python3 << 'PY'
import os
import re
import secrets
from pathlib import Path

env_path = Path(".env")
text = env_path.read_text(encoding="utf-8", errors="replace")
# Strip Windows CRLF for consistent parsing
text = text.replace("\r\n", "\n")

def set_var(name: str, value: str) -> None:
    global text
    pattern = re.compile(rf"^{re.escape(name)}=.*$", re.MULTILINE)
    line = f"{name}={value}"
    if pattern.search(text):
        text = pattern.sub(line, text)
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += line + "\n"

def ensure_secret(name: str, min_len: int = 32) -> None:
    m = re.search(rf"^{re.escape(name)}=(.*)$", text, re.MULTILINE)
    val = (m.group(1).strip() if m else "")
    if len(val) < min_len:
        set_var(name, secrets.token_hex(32))
        print(f"GENERATED:{name}")

set_var("NEXT_PUBLIC_APP_URL", "https://charansurebrec.qzz.io")
set_var("HTTP_PORT", "80")
set_var("MEDIA_INTERNAL_BASE_URL", "http://app:3000")

ensure_secret("N8N_ENCRYPTION_KEY")
ensure_secret("N8N_USER_MANAGEMENT_JWT_SECRET")
ensure_secret("TOKEN_ENCRYPTION_KEY")

env_path.write_text(text, encoding="utf-8")

required = [
    "MONGODB_URI",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "FIRECRAWL_API_KEY",
]
missing = []
for name in required:
    m = re.search(rf"^{re.escape(name)}=(.*)$", text, re.MULTILINE)
    if not m or not m.group(1).strip():
        missing.append(name)

if missing:
    print("MISSING:" + ",".join(missing))
    raise SystemExit(1)

print("ENV_PATCH_OK")
print("NEXT_PUBLIC_APP_URL=set")
print("HTTP_PORT=8080")
PY

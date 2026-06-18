#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:-charansurebrec.qzz.io}"
python3 << PY
import re
from pathlib import Path
text = Path(".env").read_text(encoding="utf-8").replace("\r\n", "\n")
def setv(key, value):
    global text
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    text = pattern.sub(line, text) if pattern.search(text) else text.rstrip() + "\n" + line + "\n"
setv("NEXT_PUBLIC_APP_URL", "https://${DOMAIN}")
setv("N8N_PUBLIC_WEBHOOK_BASE", "https://${DOMAIN}")
setv("N8N_EDITOR_BASE_URL", "http://localhost:5678")
Path(".env").write_text(text, encoding="utf-8")
print("HTTPS_URL_SET")
PY

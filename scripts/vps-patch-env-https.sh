#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:-charansurebrec.qzz.io}"
python3 << PY
import re
from pathlib import Path
text = Path(".env").read_text(encoding="utf-8").replace("\r\n", "\n")
text = re.sub(r"^NEXT_PUBLIC_APP_URL=.*$", "NEXT_PUBLIC_APP_URL=https://${DOMAIN}", text, flags=re.M)
Path(".env").write_text(text, encoding="utf-8")
print("HTTPS_URL_SET")
PY

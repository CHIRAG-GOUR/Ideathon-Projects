#!/usr/bin/env bash
# Inserts the shared Safety Core rules into an app's firestore.rules template (at the @BASE@ line).
set -euo pipefail
CORE="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$1" "$CORE/firestore.base.rules" "$2" <<'PY'
import sys
tpl, base, out = sys.argv[1:]
open(out, 'w').write(open(tpl).read().replace('@BASE@', open(base).read().rstrip()))
PY

#!/usr/bin/env bash
# Runs the backend end-to-end test for each app inside its own emulators (demo-* project IDs: nothing touches real Firebase).
#   bash safety-core/tests/run-e2e.sh sheshield fortiva safety-warriors
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
status=0
FIREBASE="${FIREBASE:-npx -y firebase-tools}"
for app in "$@"; do
  dir="$ROOT/$app"
  id=$(grep '^APP_ID=' "$dir/functions/.env" | cut -d= -f2)
  secret=$(grep -o "defineSecret('[A-Z_]*')" "$dir/functions/src/index.ts" | cut -d"'" -f2)
  [ -f "$dir/functions/.secret.local" ] || echo "$secret=none" > "$dir/functions/.secret.local"
  (cd "$dir/functions" && npm run build >/dev/null) || { echo "functions build failed for $app"; status=1; continue; }
  out=$(cd "$dir" && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u JAVA_TOOL_OPTIONS \
    $FIREBASE emulators:exec --project "demo-$id" --only auth,firestore,functions,hosting \
    "APP_DIR=$dir PROJECT=demo-$id node $ROOT/safety-core/tests/e2e.mjs" 2>&1)
  echo "$out" | grep -E "^(PASS|FAIL|ALL|==|[0-9]+ CHECK)|Error"
  echo "$out" | grep -q "^ALL CHECKS PASSED" || status=1
done
exit $status

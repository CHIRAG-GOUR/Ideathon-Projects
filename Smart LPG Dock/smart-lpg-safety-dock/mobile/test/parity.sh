#!/usr/bin/env bash
# Java engine ≡ TypeScript engine: replays the shared fixtures (shared/fixtures/traces.json) through Engine.java.
set -euo pipefail
M="$(cd "$(dirname "$0")/.." && pwd)"
CP="$M/.tools/android.jar"; [ -f "$CP" ] || CP="${ANDROID_SDK_ROOT:-/opt/android-sdk-lite}/platforms/android-34/android.jar"
[ -f "$CP" ] || { echo "Run bash mobile/build.sh once first (it fetches android.jar)"; exit 1; }
O=$(mktemp -d)
javac -nowarn -encoding UTF-8 -cp "$CP" -d "$O" "$M/src/com/skillizee/lpgdock/engine/Engine.java" "$M/test/Parity.java"
java -cp "$O:$CP" Parity "$M/../shared/dock-config.json" "$M/../shared/fixtures/traces.json"

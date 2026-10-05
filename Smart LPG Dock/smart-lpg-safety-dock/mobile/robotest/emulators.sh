#!/usr/bin/env bash
# Android cloud code (Firebase REST) against the Auth + Firestore emulators with the project's real firestore.rules.
#   bash mobile/robotest/emulators.sh        (needs firebase-tools via npx, Java, Maven; see run.sh for TEST_JAVA)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
npx -y firebase-tools@latest emulators:exec --project demo-lpgdock --only auth,firestore \
  "bash mobile/robotest/run.sh -DfirestoreEmulator=127.0.0.1:8080 -DauthEmulator=127.0.0.1:9099"

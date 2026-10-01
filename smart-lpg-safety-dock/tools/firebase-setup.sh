#!/usr/bin/env bash
# One-time Firebase setup for the Smart LPG Safety Dock — a DEDICATED project (no data shared with other apps).
#   bash tools/firebase-setup.sh [project-id]       default: smart-lpg-safety-dock
set -uo pipefail
cd "$(dirname "$0")/.."
PROJECT=${1:-smart-lpg-safety-dock}
fb() { npx -y firebase-tools@latest "$@"; }
if [ "$PROJECT" != "smart-lpg-safety-dock" ]; then
  sed -i.bak "s/smart-lpg-safety-dock/$PROJECT/g" .firebaserc firebase.json && rm -f .firebaserc.bak firebase.json.bak
fi
echo "== Creating Firebase project $PROJECT"
fb projects:create "$PROJECT" --display-name "Smart LPG Safety Dock" || echo "!! Could not create $PROJECT (already yours, or the ID is taken). If taken: bash tools/firebase-setup.sh <another-id>"
fb apps:create web "Smart LPG Dock Web" --project "$PROJECT" || true
cat <<MSG

== In the Firebase console for $PROJECT:
   1. Build → Authentication → Get started → enable Email/Password (and Google, optional).
   2. Build → Firestore Database → Create database (production mode, region asia-south1).
   (The Spark/free plan is enough: no Cloud Functions are required.)
Press Enter when done…
MSG
read -r _
echo "== Deploy: npm run deploy  →  https://$PROJECT.web.app"

#!/usr/bin/env bash
# One-time Firebase setup for the Smart LPG Safety Dock — a DEDICATED project (no data shared with other apps).
#   bash tools/firebase-setup.sh [project-id]       default: smart-lpg-safety-dock
# Needs: Node 20+ and a Google account (`npx firebase-tools login` first).
set -uo pipefail
cd "$(dirname "$0")/.."
PROJECT=${1:-smart-lpg-safety-dock}
fb() { npx -y firebase-tools@latest "$@"; }
if [ "$PROJECT" != "smart-lpg-safety-dock" ]; then
  sed -i.bak "s/smart-lpg-safety-dock/$PROJECT/g" .firebaserc firebase.json && rm -f .firebaserc.bak firebase.json.bak
  echo "== Using project ID $PROJECT (updated .firebaserc and firebase.json)"
fi
echo "== Creating Firebase project $PROJECT"
fb projects:create "$PROJECT" --display-name "Smart LPG Safety Dock" \
  || echo "!! Could not create $PROJECT (already yours, or the ID is taken). If taken: bash tools/firebase-setup.sh <another-id>"
echo "== Registering the web app"
fb apps:create web "Smart LPG Dock Web" --project "$PROJECT" || echo "(web app may already exist)"
echo "== Creating the Firestore database (asia-south1)"
fb firestore:databases:create "(default)" --location asia-south1 --project "$PROJECT" \
  || echo "(database may already exist — or create it in the console: Build → Firestore Database)"
cat <<MSG

== One step the CLI cannot do — in the Firebase console for $PROJECT:
   Build → Authentication → Get started → Sign-in method → enable Email/Password (and Google, optional).
   For Google sign-in on your own domain, add it under Authentication → Settings → Authorized domains
   ($PROJECT.web.app and $PROJECT.firebaseapp.com are authorised automatically).
   The free Spark plan is enough: no Cloud Functions are used.
Press Enter when done…
MSG
read -r _
echo "== Deploy:   npm run deploy        (builds web/, deploys Hosting + Firestore rules/indexes)"
echo "== Then open the URL that the deploy command prints (normally https://$PROJECT.web.app)."
echo "== Android cloud sync (optional): FIREBASE_API_KEY=<apiKey below> FIREBASE_PROJECT_ID=$PROJECT bash mobile/build.sh"
fb apps:sdkconfig web --project "$PROJECT" 2>/dev/null | grep -E '"(apiKey|projectId)"' || true

#!/usr/bin/env bash
# One-time Firebase setup for Beyond Legacy — a DEDICATED project (nothing shared with other apps).
#   bash tools/firebase-setup.sh [project-id]       default: beyond-legacy-app
# Needs: Node 20+ and a Google account (`npx firebase-tools login` first).
set -uo pipefail
cd "$(dirname "$0")/.."
PROJECT=${1:-beyond-legacy-app}
fb() { npx -y firebase-tools@latest "$@"; }
if [ "$PROJECT" != "beyond-legacy-app" ]; then
  # The project ID is also the Hosting site and the origin the Android app serves its bundled build from.
  sed -i.bak "s/beyond-legacy-app/$PROJECT/g" .firebaserc firebase.json android/src/com/beyondlegacy/app/MainActivity.java \
    && rm -f .firebaserc.bak firebase.json.bak android/src/com/beyondlegacy/app/MainActivity.java.bak
  echo "== Using project ID $PROJECT (updated .firebaserc, firebase.json and the Android origin)"
fi
echo "== Creating Firebase project $PROJECT"
fb projects:create "$PROJECT" --display-name "Beyond Legacy" \
  || echo "!! Could not create $PROJECT (already yours, or the ID is taken). If taken: bash tools/firebase-setup.sh <another-id>"
echo "== Registering the web app"
fb apps:create web "Beyond Legacy Web" --project "$PROJECT" || echo "(web app may already exist)"
echo "== Creating the Firestore database (asia-south1)"
fb firestore:databases:create "(default)" --location asia-south1 --project "$PROJECT" \
  || echo "(database may already exist — or create it in the console: Build → Firestore Database)"
cat <<MSG

== One step the CLI cannot do — in the Firebase console for $PROJECT:
   Build → Authentication → Get started → Sign-in method → enable Email/Password (and Google, optional).
   Google sign-in works on the website; the Android app uses email + password.
   The free Spark plan is enough: no Cloud Functions are used.
Press Enter when done…
MSG
read -r _
echo "== Deploy:   npm run deploy        (builds web/, deploys Hosting + Firestore rules/indexes)"
echo "== Then open the URL that the deploy command prints (normally https://$PROJECT.web.app)."
echo "== Android: npm run build:android  (reads the config from the deployed site), or bundle it:"
echo "   FIREBASE_API_KEY=<apiKey> FIREBASE_PROJECT_ID=$PROJECT FIREBASE_APP_ID=<appId> bash android/build.sh"
fb apps:sdkconfig web --project "$PROJECT" 2>/dev/null | grep -E '"(apiKey|projectId|appId)"' || true

#!/usr/bin/env bash
# One-time Firebase setup for one app (its own project, so its data and sign-ins are isolated from the others).
#   bash firebase-setup.sh <project-id> "<App Name>" <database-id> <SMS_SECRET_NAME>
set -uo pipefail
PROJECT=$1; NAME=$2; DB=$3; SECRET=$4
fb() { npx -y firebase-tools@latest "$@"; }
echo "== Creating Firebase project $PROJECT"
fb projects:create "$PROJECT" --display-name "$NAME" || echo "!! Could not create $PROJECT (already yours, or the ID is taken). If taken, pick a new ID and replace '$PROJECT' everywhere in this app: .firebaserc, firebase.json (hosting.site), package.json, functions/.env (APP_ORIGIN), web/next.config.mjs (NEXT_PUBLIC_ORIGIN) and android/app.env (HOST) — then rebuild the APK."
fb apps:create web "$NAME Web" --project "$PROJECT" || true
cat <<MSG

== In the Firebase console for $PROJECT, please:
   1. Upgrade to the Blaze plan (Cloud Functions and scheduled checks need it).
   2. Authentication → Get started → enable Email/Password.
   3. Storage → Get started (She Shield's Evidence Vault uses it; other apps may skip).
Press Enter when done…
MSG
read -r _
fb firestore:databases:create "$DB" --location=asia-south1 --project "$PROJECT" || true
echo none | fb functions:secrets:set "$SECRET" --data-file=- --project "$PROJECT" || true
echo "== Done. Deploy with: npm run deploy"

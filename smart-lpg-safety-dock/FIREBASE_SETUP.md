# Firebase setup — a dedicated, isolated project

The Smart LPG Dock uses **its own Firebase project** (default ID `smart-lpg-safety-dock`). It shares nothing with any other
app: separate Auth users, separate Firestore, separate Hosting site. Firebase is **optional** — the simulation, 3D, compare,
presentation and local history all work without it.

## What is used

| Service | Used for | Required? |
|---|---|---|
| Hosting | the web app at `https://<project-id>.web.app` | for a public URL |
| Authentication | Email/password (web + Android), Google (web) | only for cloud history |
| Firestore | `users`, `simulationSessions`, `simulationEvents`, `devices`, `presentationSessions` | only for cloud history |
| Cloud Functions | **not used** — see `functions/README.md` | no |

The free **Spark** plan is enough.

## One-time setup

```bash
npx firebase-tools login
npm run firebase:setup                      # = bash tools/firebase-setup.sh [project-id]
```

The script creates the project, registers the web app, creates the Firestore database (asia-south1) and then asks you to
enable **Email/Password** (and optionally **Google**) under Authentication → Sign-in method — the one step the CLI cannot do.

If `smart-lpg-safety-dock` is already taken by someone else, pass another ID; the script rewrites `.firebaserc` and the
Hosting `site` in `firebase.json` to match:

```bash
bash tools/firebase-setup.sh smart-lpg-dock-<something-unique>
```

## Deploy

```bash
npm run deploy        # builds web/ and deploys Hosting + Firestore rules + indexes
```

The URL is the one the deploy command prints as **Hosting URL** (normally `https://<project-id>.web.app`). Open it and check:
Dashboard shows "● SYSTEM NORMAL"; Settings → Account offers sign-in (if it says "not configured", the page is not being
served by Firebase Hosting).

The web app has **no Firebase keys in its source or bundle**: on Hosting it loads `/__/firebase/init.json`, which Firebase
serves for the project the site belongs to.

## Firestore data model

All documents carry `ownerUid`; the rules (`firebase/firestore.rules`) allow a signed-in user to read and delete only their own
documents and validate every field on create:

| Collection | Document | Written by |
|---|---|---|
| `users/{uid}` | `displayName`, `email`, `updatedAt` | web, on sign-up / sign-in |
| `simulationSessions/{sessionId}` | scenario, mode, outcome, durationSec, peakGas, maxTemp, maxTilt, cylinderId, eventCount, startedAt, createdAt | web + Android, when a main simulation finishes (Settings → "Save finished runs") |
| `simulationEvents/{sessionId}_{NNN}` | t, kind, level, text, sessionId | web + Android, with the session, in one batch/commit |
| `presentationSessions/{auto}` | startedAt, endedAt, chaptersViewed | web + Android, when a presentation is finished |
| `devices/{deviceId}` | name, cylinderId, thresholds | reserved for the future hardware dock (rules ready, no UI yet) |

Index: `simulationSessions` by `ownerUid` + `startedAt desc` (`firebase/firestore.indexes.json`).

## Android cloud sync

The Android app talks to Firebase over the public REST APIs (no Google Play Services needed). It is enabled per build:

```bash
FIREBASE_API_KEY=<web apiKey> FIREBASE_PROJECT_ID=<project-id> bash mobile/build.sh
```

The web API key identifies the project; it is not a secret (access is controlled by Auth + the rules above), but it is still
kept out of git — it is written into the APK's assets at build time only. Google sign-in is offered in the web app; the
Android app uses email/password.

## Local emulators

```bash
npm run test:e2e                     # web UI + rules end-to-end on the Auth/Firestore/Hosting emulators
bash mobile/robotest/emulators.sh    # the Android app's REST code against the same emulators and rules
```

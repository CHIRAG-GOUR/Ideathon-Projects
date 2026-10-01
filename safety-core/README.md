# Safety Core — shared foundation for She Shield, Fortiva and Safety Warriors

Shevolution (`shevolution/`) was studied as the reference. It is **not modified**: same code, Firebase project
(`ideathon-projects`), database (`shevolution`), hosting site (`shevolution-ideathon`) and package
(`com.skillizee.shevolution`). Safety Core is a parametrised copy of its proven parts. Each new app has its
**own** Firebase project, database, functions, hosting site, Android package, signing key and data.

## Architecture map

| Layer | Shevolution (reference) | Safety Core (shared) | Per app |
|---|---|---|---|
| Data model | `shared/src/types.ts` | `shared/src/types.ts`: contacts with **roles** and **channels**, SOS with trigger (`sos`/`discreet`/`check`), safety-check plan and log | — |
| SOS state machine | `shared/src/sos.ts` | Same reducer: `IDLE → LOCATING → ALERTING → LIVE / ALERT_PARTIAL / LOCATION_UNAVAILABLE / OFFLINE → RESOLVING → SAFE/CANCELLED` | — |
| Check-in state machine | (trip timer) | `shared/src/checks.ts`: `OFF → WAITING → DUE → WARNING → ESCALATED`, derived only from timestamps, the same on phone, web and server | She Shield "Protection Check", Fortiva "Safety Check Network" |
| Messages | `/trip?p=lat,lng&n=name` links | `shared/src/message.ts`: templates with `{brand}`; **live links are opaque per-contact tokens** `/live/<token>` (no name or coordinates in URLs) | Brand name |
| Emergency numbers | `EmergencyNumberService` | Same, India-first (112, 181, 1091, 108, 101); no authority integration claimed | — |
| Backend | `functions/src/*` | `functions/src/*`: `createApi()` → `/sos/sync` (idempotent), `/live` (token), `/live/respond`, `/live/message`, `/sos/message`, `/contacts/remove` (revokes links), `/checks/*`, `/history/delete`, `/account/delete`, `/sms/status`; `processChecks()` server backup; `applyRetention()` | `functions/src/index.ts`: exports `<app>Api`, `<app>Checks`, `<app>Retention`, own SMS secret |
| Security rules | `firestore.rules` | `firestore.base.rules` (users, contacts, checks, SOS — owner only, validated) | `firestore.rules.tpl` → `firestore.rules` via `tools/compose-rules.sh` |
| Web | Next.js static export | `web/src/*` hooks: auth, data, `useSos` (native / browser / demo engines), readiness, places (OpenStreetMap), live view, map, hold-to-confirm, navigation | Own UI system, screens, art, fonts, palette |
| Android | Java safety layer + bundled UI | `android/src/*.java` stamped with each package; `build-app.sh` builds and signs without Gradle | `android/app.env`, `android/brand.mjs`, icons, sounds, keystore |

### How an SOS works (all three apps)
1. The user holds the SOS control for 3 s; releasing early cancels. Discreet/silent SOS has no siren.
2. **Android**: the native foreground service owns the SOS. It gets the best fix (waits up to 3 s for ±25 m), texts every SMS contact from the SIM, opens WhatsApp for the primary contact, plays the siren, queues everything offline and syncs with retry.
   **Browser**: browser GPS, cloud sync, server SMS if configured, otherwise "Not sent automatically from a browser — tap Text / WhatsApp below".
3. Each contact with "live link" gets a personal random token (stored hashed, 24 h, revoked on end/removal). They open `/live/<token>` with no account. After the end, the link shows only the outcome.
4. Every channel result is shown as it really is (sent / failed / queued / not configured). Nothing says "police notified".

### Isolation
- Firebase project, hosting site, named Firestore database, functions codebase and SMS secret are different per app (see each app's `firebase.json`, `.firebaserc`, `functions/.env`).
- Client config is loaded at run time from the app's own `/__/firebase/init.json` and cached. No keys are in the code.
- Only `NEXT_PUBLIC_APP_ID`, `NEXT_PUBLIC_DATABASE_ID` and `NEXT_PUBLIC_ORIGIN` are public build values.

## Commands
```bash
npm --prefix safety-core test                                   # unit tests (SOS + check state machines, messages, numbers)
bash safety-core/tests/run-e2e.sh sheshield fortiva safety-warriors   # backend E2E in the emulators (demo-* projects only)
bash safety-core/android/build-app.sh <app-dir>                 # APK (build the app's web first)
node safety-core/tools/icons.mjs <app-dir>                      # icons/splash from android/brand.mjs
python3 safety-core/tools/sounds.py <app-dir> twotone|sweep|pulse   # the app's own siren + chime
```
`build-app.sh` needs bash, a JDK 11+ and Python 3. It downloads `aapt2` (npm `aaptjs3`), `dx`, `apksig` and the Android
framework jar from Maven Central into `android/.tools`. On Windows, run it in Git Bash or WSL.

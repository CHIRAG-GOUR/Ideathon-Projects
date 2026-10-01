# She Shield — protective

**Personality:** protective, calm, ready. Pearl, deep violet, electric plum and muted rose; protective blue and mint for status; red only during an emergency. Manrope. Shield-shaped SOS control and shield/ring illustrations.

**USP — Shield Mode:** a proactive protection dashboard you switch on *before* you need it. It shows protection state, contact readiness (SMS / WhatsApp / live-link channels), location readiness (accuracy and age of the warm fix), GPS, network, battery, notifications, quick SOS, discreet alert, the protection check, nearby resources and recent activity — all from what the device actually reports.

## Implemented
- **Shield Mode** — Android: foreground service keeps GPS warm and offers SOS from the notification. Browser: keeps location ready while the page is open. Every on/off is logged.
- **Quick Shield** — one-tap SOS from inside Shield Mode (you already chose protection); hold-to-SOS everywhere else.
- **Discreet Alert** — hold 2 s, or (Android, app open) press volume-down 4× within 3 s if enabled in Settings. No siren or sound; contacts are told you may not be able to talk.
- **Protection Check** — "Are you safe?" every 15 min – 2 h, a reminder after the grace time, then your choice: text contacts or start a full SOS. Runs on the phone offline; the server escalates as backup if the phone goes silent.
- **Emergency Readiness** — score, each item explained, one-tap fixes (permissions, GPS settings, contacts).
- **Safety Evidence Vault** — notes, photos, audio; saved only when you add them, owner-only in Storage and Firestore, deletable item by item or all at once.
- Real SOS with live per-contact links, responders and messages; Nearby Help; History (alerts, checks, Shield Mode); Privacy (what is stored, who sees it, delete history/vault/account); Settings (siren, vibration, volume trigger, re-alert, retention, region, profile and medical details, demo mode).
- Screens: Onboarding → Auth → Home, Shield Mode, SOS (active), Contacts, Readiness, Nearby help, History, Evidence vault, Privacy, Settings; contact live view `/live/<token>`.

## Removed or reduced (vs. Shevolution)
Ride Safe / Safe Trip / journey timers (Shevolution's identity), the scooty ride view, landing page, `/trip` links with name and coordinates in the URL, contact linking/verification flow.

## Firebase
Project `she-shield-app` · Hosting `https://she-shield-app.web.app` · Firestore database `sheshield` (asia-south1) · Functions codebase `sheshield` (`sheshieldApi`, `sheshieldChecks`, `sheshieldRetention`) · Storage (vault) · secret `SHESHIELD_SMS`.

## Set up and deploy (one time, from your PC)
```bash
cd sheshield
npm --prefix web install && npm --prefix functions install
npm run firebase:setup      # creates project she-shield-app, web app, database "sheshield", secret SHESHIELD_SMS=none
npm run deploy              # web + functions + rules,storage → https://she-shield-app.web.app
```
`firebase:setup` pauses for the console steps: Blaze plan, Email/Password sign-in, Storage (Evidence Vault).
Optional server SMS (used only when the phone cannot text, e.g. browser SOS or a missed check-in with the phone off):
`npx firebase-tools functions:secrets:set SHESHIELD_SMS --project she-shield-app` with Twilio JSON
`{"provider":"twilio","accountSid":"…","authToken":"…","from":"+1…"}`, then deploy again.

## Android
`android/build/sheshield-1.0.0-sideload.apk` — package `com.skillizee.sheshield`, version 1.0.0 (code 1), minSdk 24, targetSdk 34, signed (APK signature v2).
Rebuild: `npm run build:apk` (bash: Git Bash or WSL on Windows). The signing key is in `android/keystore/` (not in git) — keep it; updates must use the same key.
Install: `adb install -r android/build/sheshield-1.0.0-sideload.apk`.

## Tests
`npm test` (shared unit tests) · `bash ../safety-core/tests/run-e2e.sh sheshield` (backend + rules in the emulators — passing).

## Known limitations
- **Not tested on a physical phone** — this build environment has no device or emulator. Please test SOS, SMS, the siren, notifications, the volume-button trigger and Shield Mode in the background on a real phone first.
- WhatsApp and email cannot be sent silently by any app: they open ready to send and you tap Send. SMS is automatic only in the Android app (with permission).
- No push notifications (FCM): Google's Android libraries can't be downloaded in this build environment. Contacts get SMS / WhatsApp / email and the live link.
- The app does not contact police or emergency services. It shows official numbers to call.
- Nearby places come from OpenStreetMap; coverage and phone numbers vary.
- Project ID `she-shield-app` was not checked for availability (no internet access to Firebase here). If it's taken, see `npm run firebase:setup`'s message.
- Demo mode is clearly labelled and sends nothing.

# Fortiva — connected

**Personality:** connected, reassuring. Warm white, cobalt, turquoise and soft lavender; coral only for emergencies. DM Sans, rounded cards, light glass, top navigation on desktop, floating SOS button on mobile. Network-ring illustrations.

**USP — Safety Check Network:** you choose how often Fortiva asks "Are you OK?" (15 min – 4 h). Checking in resets the timer. Ignore it and you get a reminder; keep ignoring and the people *you* chose are alerted (text) or a full SOS starts. It is an explicit state machine — `WAITING → DUE → WARNING → ESCALATED` — derived from timestamps, so phone, web and server always agree. It is not trip tracking: no destination, no route.

## Implemented
- **Safety Check Network** — presets (Working late, Home alone, Meeting someone new…) or a custom name; interval, time to answer, escalation policy and recipients; animated countdown ring and state stepper; full timeline. Android runs it offline with notification prompts; the server escalates as backup and records honestly whether texts went out. Browsers get a system notification when a check-in is due.
- **Trusted Circle** with roles — Primary (contacted first), Family, Friends, Emergency (neighbour, warden, security) — and per-person channels.
- **Check-in history** — checked in / missed / escalations counts and full log; **Emergencies** tab with every SOS.
- **Emergency Center** — real SOS and silent SOS, official numbers, share my location, call primary, nearby help, **Safety Readiness** including battery.
- **Incident Journal** — private dated entries (type, when, where, optional location); saved offline and synchronised later.
- Nearby Help, Privacy center, Settings, contact live view.
- Screens: Onboarding → Auth → Home (status, next check, quick actions), Check-ins, Trusted Circle, Emergency Center, Journal, Nearby, History, Privacy, Settings.

## Removed or reduced
Trip/journey/safe-arrival features (Shevolution's), Shield Mode, Evidence Vault (Fortiva keeps a text-only journal, no Storage), volume-button trigger, landing page.

## Firebase
Project `fortiva-safecheck` · Hosting `https://fortiva-safecheck.web.app` · Firestore database `fortiva` (asia-south1) · Functions codebase `fortiva` (`fortivaApi`, `fortivaChecks`, `fortivaRetention`) · secret `FORTIVA_SMS`. No Storage.

## Set up and deploy (one time, from your PC)
```bash
cd fortiva
npm --prefix web install && npm --prefix functions install
npm run firebase:setup      # creates project fortiva-safecheck, web app, database "fortiva", secret FORTIVA_SMS=none
npm run deploy              # web + functions + rules → https://fortiva-safecheck.web.app
```
`firebase:setup` pauses for the console steps: Blaze plan, Email/Password sign-in.
Optional server SMS (used only when the phone cannot text, e.g. browser SOS or a missed check-in with the phone off):
`npx firebase-tools functions:secrets:set FORTIVA_SMS --project fortiva-safecheck` with Twilio JSON
`{"provider":"twilio","accountSid":"…","authToken":"…","from":"+1…"}`, then deploy again.

## Android
`android/build/fortiva-1.0.0-sideload.apk` — package `com.skillizee.fortiva`, version 1.0.0 (code 1), minSdk 24, targetSdk 34, signed (APK signature v2).
Rebuild: `npm run build:apk` (bash: Git Bash or WSL on Windows). The signing key is in `android/keystore/` (not in git) — keep it; updates must use the same key.
Install: `adb install -r android/build/fortiva-1.0.0-sideload.apk`.

## Tests
`npm test` (shared unit tests) · `bash ../safety-core/tests/run-e2e.sh fortiva` (backend + rules in the emulators — passing).

## Known limitations
- **Not tested on a physical phone** — this build environment has no device or emulator. Please test SOS, SMS, the siren, notifications and check-in prompts with the screen off on a real phone first.
- WhatsApp and email cannot be sent silently by any app: they open ready to send and you tap Send. SMS is automatic only in the Android app (with permission).
- No push notifications (FCM): Google's Android libraries can't be downloaded in this build environment. Contacts get SMS / WhatsApp / email and the live link.
- The app does not contact police or emergency services. It shows official numbers to call.
- Nearby places come from OpenStreetMap; coverage and phone numbers vary.
- Project ID `fortiva-safecheck` was not checked for availability (no internet access to Firebase here). If it's taken, see `npm run firebase:setup`'s message.
- Demo mode is clearly labelled and sends nothing.

# Safety Warriors — prepared

**Personality:** prepared, energetic, not militaristic. Cream base, teal and emerald, deep indigo, soft orange highlights; emergency red only for real emergency actions. Sora headings + Inter. Hexagon-badge SOS, illustrated situation badges, geometric pattern, animated playbook and tip cards, indigo rail/tab bar.

**USP — Safety Toolkit + Emergency Playbooks:** eight step-by-step playbooks — someone is following me, harassment, stalking, unsafe public situation, medical emergency, domestic concern, lost or disoriented, general emergency. Every step is labelled **Good to know** (information), **You do this** (your action) or **Emergency action** (a real action the app performs: call a helpline, SOS — held 2 s, silent SOS, share location, call your trusted person, nearby help). No professional, legal or medical certainty is claimed; each page carries that disclaimer.

## Implemented
- **Toolkit** — personal, public spaces & transport, emergency basics, medical, digital, harassment, stalking: tips, related playbooks and helplines (India: 112, 181, 1091, 108, 1930 cyber crime; other regions fall back to the local emergency number).
- **Playbooks** with progress ticks and real action buttons.
- **Quick Actions** — SOS (opens the hold screen), call emergency, call your trusted person, share location, nearby help.
- **Safety Checklist** — phone charged, location on, trusted contact, alerts allowed (from the device), plus three personal items you tick (kept on the device).
- SOS and silent SOS, Trusted Contacts, Nearby Help, Emergency History, Privacy center, Settings, contact live view.
- Screens: Onboarding → Auth → Home "Your Safety Toolkit", Toolkit, Playbook detail, Quick Actions, SOS, Contacts, Nearby, History, Settings, Privacy.

## Removed or reduced
Trip/journey features, periodic safety checks (that is Fortiva's USP), Shield Mode, vault/journal, volume trigger, landing page. Playbooks and toolkit are bundled in the app (work offline); nothing about what you read is stored.

## Firebase
Project `safety-warriors-app` · Hosting `https://safety-warriors-app.web.app` · Firestore database `safetywarriors` (asia-south1) · Functions codebase `warriors` (`warriorsApi`, `warriorsRetention`) · secret `WARRIORS_SMS`. No Storage.

## Set up and deploy (one time, from your PC)
```bash
cd safety-warriors
npm --prefix web install && npm --prefix functions install
npm run firebase:setup      # creates project safety-warriors-app, web app, database "safetywarriors", secret WARRIORS_SMS=none
npm run deploy              # web + functions + rules → https://safety-warriors-app.web.app
```
`firebase:setup` pauses for the console steps: Blaze plan, Email/Password sign-in.
Optional server SMS (used only when the phone cannot text, e.g. browser SOS or a missed check-in with the phone off):
`npx firebase-tools functions:secrets:set WARRIORS_SMS --project safety-warriors-app` with Twilio JSON
`{"provider":"twilio","accountSid":"…","authToken":"…","from":"+1…"}`, then deploy again.

## Android
`android/build/safetywarriors-1.0.0-sideload.apk` — package `com.skillizee.safetywarriors`, version 1.0.0 (code 1), minSdk 24, targetSdk 34, signed (APK signature v2).
Rebuild: `npm run build:apk` (bash: Git Bash or WSL on Windows). The signing key is in `android/keystore/` (not in git) — keep it; updates must use the same key.
Install: `adb install -r android/build/safetywarriors-1.0.0-sideload.apk`.

## Tests
`npm test` (shared unit tests) · `bash ../safety-core/tests/run-e2e.sh safety-warriors` (backend + rules in the emulators — passing).

## Known limitations
- **Not tested on a physical phone** — this build environment has no device or emulator. Please test SOS, SMS, the siren, notifications on a real phone first.
- WhatsApp and email cannot be sent silently by any app: they open ready to send and you tap Send. SMS is automatic only in the Android app (with permission).
- No push notifications (FCM): Google's Android libraries can't be downloaded in this build environment. Contacts get SMS / WhatsApp / email and the live link.
- The app does not contact police or emergency services. It shows official numbers to call.
- Nearby places come from OpenStreetMap; coverage and phone numbers vary.
- Project ID `safety-warriors-app` was not checked for availability (no internet access to Firebase here). If it's taken, see `npm run firebase:setup`'s message.
- Demo mode is clearly labelled and sends nothing.

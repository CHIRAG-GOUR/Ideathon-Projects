# LifeLine Hub — futuristic emergency care

**LifeLine Hub** is an emergency-to-care platform: **INCIDENT → SOS → LOCATION → MEDICAL CONTEXT → GUIDANCE → EMERGENCY SERVICES → COMMUNITY HELP → HOSPITAL / CARE**. It is built on four pillars: **SOS Push**, **Health Vault**, **Geo-Radar** and **AI Guidance**. Its job is to get the right facts (where you are, who you are, what you need) to your family and to the official emergency numbers faster.

LifeLine Hub is a **new, independent app**. It reuses the shared Safety Core engine (auth, Firebase, SOS engine, location, contacts, live link) but has its own identity, screens, design system, Firebase project, database, functions codebase, SMS secret, Android package and signing key. **No other app in this repository was changed.**

## What is real and what is simulated
| Real (working) | Simulated / prototype (labelled in the app) |
|---|---|
| SOS Push: a deliberate 3-second hold with three stages (*Preparing emergency response… → Locating you… → SOS ACTIVE*) | The ambulance, its crew and every ETA shown during an SOS in demo mode (**SIMULATED ETA**) |
| GPS location attached to the alert, plus a private, expiring live-location link per contact | LifeLine Helpers on the radar (pilot registration is real; verified helpers do not exist yet) |
| SMS from the phone (Android app, with permission); WhatsApp and SMS open pre-filled everywhere else | Push transport: "Not configured" (no FCM in this build) |
| Health Vault: your own medical profile (Firestore, owner-only rules) | Wearable auto-trigger: **COMING SOON**. No device is connected or claimed |
| Responder access: server-created QR/link tokens that are **hashed, scoped, expiring (5–60 min), revocable and access-logged** | The film "Experience LifeLine": fictional people, places, vehicles and services |
| Geo-Radar: hospitals, police, fire stations and pharmacies from OpenStreetMap. ETA = road-adjusted distance at city speed, labelled *estimated* | Demo mode: Arjun Sharma, B+, Demo Mom / Demo Dad, a demo location. Nothing is sent |
| AI Guidance: a deterministic on-device protocol engine (accident, bleeding, unconscious, chest pain, breathing, burns, falls) with voice and a CPR metronome | The "AI" is a prototype engine, not a live model. The app says so |
| Configurable emergency numbers (ambulance, police, fire) on top of the region's official lines, e.g. 112 and 108 in India | — |

LifeLine Hub **never claims** that police were notified or that an ambulance was dispatched: no dispatch system is integrated. It shows the official numbers to call and tells your contacts where you are.

## Screens
- **Home (desktop)**: readiness on the left, your LifeLine network in the centre and your medical status on the right. Calm by default. Coral is used only in emergencies.
- **SOS Push**: the hold control, transports (WhatsApp, SMS, live link, offline-aware) and a practice mode that sends nothing.
- **Emergency command center**: shown full screen during an SOS, with navigation hidden. Shows location lock, contact delivery states with WhatsApp / Text / Call, radar, the Health Vault card, a timeline and the resolve flow.
- **Health Vault**: summary, full profile editor, responder QR (scope, expiry, revoke) and the access log. `/r/{token}` is the responder page.
- **Geo-Radar**: radar or map view, layer filters, safe zones and a detail sheet with directions and a call button.
- **AI Guidance**, **Emergency services**, **LifeLine Helpers**, **Connected devices** (coming soon), **Experience LifeLine**, plus contacts, settings, history and privacy.
- **Mobile**: bottom nav Home / SOS / Health / Radar / More.

## Experience LifeLine (the film)
A 2-minute, real-time **3D** film (three.js / React Three Fiber, lazy-loaded with its own chunk), followed by the product demo.

The story: Arjun rides home at dusk on a classic motorcycle. A car changes lanes into him and drives away. Bystanders' calls don't connect. **The film then stops and hands you the phone: *YOUR TURN — Activate LifeLine SOS*.** You hold the same 3-second SOSControl the app uses (inside the film it sends nothing). Then the film shows the six emergency statuses, the Health Vault responder card (**demonstration data**), Geo-Radar with a **SIMULATED ETA**, his parents receiving the **LIFE LINE ALERT**, the ambulance with traffic pulling aside, the rescue (kit, helmet removed, oxygen, stretcher), the hospital, the family, and *FROM INCIDENT TO CARE*.

- **Physics, not keyframes.** `web/src/cinematic/sim.ts` is a deterministic simulation, baked once at 120 Hz and sampled by time, so scrubbing is exact.
  - The car's lane change is a PD steering controller. Contact is found with an oriented-box (SAT) test.
  - The impact is a momentum-conserving impulse with restitution (masses: bike + rider 255 kg, car 1350 kg). It produces the bike's new velocity, its yaw spin (r × J) and its roll rate.
  - The bike capsizes as an inverted pendulum and then slides on its side with kinetic friction (μ 0.45).
  - The rider gets a partial momentum transfer, then ballistic flight, tip-over, and ground contact with restitution and friction (μ 0.6). The final resting position and pose are wherever the physics puts him. He then rolls onto his back himself, because he is conscious.
  - The car keeps its momentum and flees. Following traffic brakes with the deceleration needed to stop short.
  - The ambulance's start point is solved so that, braking at 3.8 m/s², it stops past him with its rear doors beside him. Cars yield with a lateral controller.
  - People move on acceleration-limited speed profiles, with step phase taken from distance (no foot sliding) and turning blended by speed. Debris is ballistic, then slides to rest.
- **Shots**: aerial city, road wide, motorcycle tracking, helmet close-up, hands, the rear-view mirror (seen *in* the mirror), POV, accident wide, ground level, bystanders, phone close-up, the interactive SOS, emergency UI, map, parents, ambulance (front, side, wheel), rescue (two angles), hospital, family, and the final product shot.
- **Controls**: Play / Pause, Restart, Skip to SOS, a scrubber with chapter marks, **Sound on/off**, **Music on/off**, volume, HD / Lite rendering (Lite is chosen automatically on small or slow devices) and Fullscreen. Keys: space, M, F.
- **Audio**: everything is synthesised with Web Audio (no audio files): city ambience, engine, wind, siren, crowd, hospital room, a four-part score, and cues for brake, impact, slide, ping, notify and door. Bystander lines use speech synthesis.
- **Content**: there are no brands, logos or real services. The accident is not glorified: there is no gore, only a small dark stain. The film is labelled *Dramatization · fictional people & services* throughout.

## Firebase (isolated)
| Item | Value |
|---|---|
| Project | `lifeline-hub-app` |
| Hosting | `https://lifeline-hub-app.web.app` |
| Firestore database | `lifelinehub` |
| Functions codebase | `lifeline` (`lifelineApi`, `lifelineRetention`) |
| Secret | `LIFELINE_SMS` |
| Storage | None |

The rules are strict and owner-only: the medical profile and prefs are validated, while access logs, vault tokens and helper records are read-only for the owner. Responder tokens are stored only as SHA-256 hashes, and nobody can read another user's medical data.

## Set up and deploy (one time, from your PC)
```bash
cd lifeline-hub
npm --prefix web install && npm --prefix functions install
npm run firebase:setup      # creates project lifeline-hub-app, web app, database "lifelinehub", secret LIFELINE_SMS=none
npm run deploy              # web + functions + rules → https://lifeline-hub-app.web.app
```
`firebase:setup` pauses for the console steps: Blaze plan, Email/Password sign-in.

Optional server SMS is used only when the phone cannot text, for example during a browser SOS. To set it up, run `npx firebase-tools functions:secrets:set LIFELINE_SMS --project lifeline-hub-app` with the Twilio JSON `{"provider":"twilio","accountSid":"…","authToken":"…","from":"+1…"}`, then deploy again.

## Android
`android/build/lifelinehub-1.0.0-sideload.apk` has package `com.skillizee.lifelinehub` and is version 1.0.0. To rebuild, run `npm run build:apk` (bash: Git Bash or WSL on Windows). The signing key is in `android/keystore/` and is not in git. Keep it, because updates must be signed with the same key.

## Tests
- `npm test`: the shared Safety Core unit tests.
- `npm run test:e2e`: everything in the emulators. It runs the shared Safety Core backend and rules checks, then LifeLine's own checks (`tests/e2e-lifeline.mjs`): medical-profile rules, responder links (hash-only storage, scope, 5–60 min expiry, revoke, expiry, access log, first name only), the LifeLine Helpers pilot (pending verification only, no self-verify) and account deletion. All pass.

## Known limitations
- **Not tested on a physical phone.** This build environment has no device or emulator, so test SOS, SMS, the siren and notifications on a real phone first.
- **No real dispatch.** Ambulance and helper positions, ETAs for responders, and the hospital are simulated and labelled.
- **The film was checked in a software renderer**, which ran at about 1–2 fps, so smoothness on real GPUs was not measured. The player falls back to Lite automatically if the frame rate drops.
- WhatsApp cannot be sent silently by any app: it opens ready to send and you tap Send. SMS is automatic only in the Android app, with permission.
- There are no push notifications (FCM), because Google's Android libraries can't be downloaded in this build environment.
- The project ID `lifeline-hub-app` was not checked for availability. If it is taken, follow the message from `npm run firebase:setup`.
- No pitch deck was supplied, so none is included.

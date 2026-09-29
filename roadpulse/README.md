# RoadPulse

Pothole detection and reporting. It has two sides:

- **Live Drive:** the vehicle camera detects potholes on the device in real time and uploads only confirmed events.
- **Report a Pothole:** a citizen takes a photo, confirms the location and sends it to the right authority.

It is a separate app on the `ideathon-projects` Firebase project:

- **Hosting site:** `roadpulse-ideathon` → **https://roadpulse-ideathon.web.app**
- **Firestore database:** `roadpulse` (named, not `(default)`)
- **Storage bucket:** `roadpulse-ideathon`

Other apps on the project are untouched.

## How it works

| Part | Where it runs |
|---|---|
| YOLOv8 pothole model (ONNX, `peterhdd/pothole-detection-yolov8`, Apache-2.0) | In the browser, in a Web Worker. Uses WebGPU, or multi-threaded WASM as a fallback. |
| Boxes: green / yellow / red | Drawn on every video frame. The colour is an **AI estimate from the pothole's apparent size**, not a measured depth. |
| Tracking | A pothole is confirmed after 3 hits with a confidence of at least 0.45, usually within 1–2 s. |
| GPS | Only after the user starts the drive or taps "use my location". With no recent fix (≤15 s, ≤100 m) the event is **not recorded**. |
| Upload | Only confirmed events: one crop plus the coordinates. Events are queued in IndexedDB while offline. |
| Server (Next.js on Cloud Functions, asia-south1) | Reverse geocoding (OpenStreetMap Nominatim), duplicate grouping (25 m / 60 days), authority routing, and adapters (email / API / portal / manual). |

**Honesty rules:**

- A report shows "Submitted" only after an authority's API returns success or its email is accepted by SMTP. Portal and manual authorities show "Pending manual submission".
- The authority directory starts **empty**. An admin adds verified authorities, and each one needs a source URL.
- DEMO simulations on the home page are labelled and never written to the database.

## Deploy (from this folder)

1. **Firebase console (one time)**
   - Project `ideathon-projects` must be on the **Blaze** plan.
   - Enable **Authentication → Anonymous** and **Email/Password** (optionally **Google**).
   - Storage → **Add bucket** → name it `roadpulse-ideathon`, location `asia-south1`.
2. **Create the database and hosting site** (one time):
   ```
   npm install
   npm run firebase:setup
   ```
3. **Web config**
   - Create `.env.production` from `.env.example`.
   - Fill it with the public web-app values: Project settings → Your apps → Web app.
   - Set `GEOCODER_CONTACT` to a real email address, as required by the Nominatim usage policy.
4. **Email adapter (optional)**
   ```
   npx firebase-tools functions:secrets:set SMTP_URL --project ideathon-projects
   ```
   Enter a value like `smtps://user:pass@smtp.host:465`. If you set this up, also add `"secrets": ["SMTP_URL"]` under `frameworksBackend` in `firebase.json`.
5. **Deploy**
   ```
   npm run deploy
   ```
   This downloads the model into `public/models/` and deploys only `hosting:roadpulse-ideathon`, `firestore:roadpulse` and `storage:roadpulse`.
6. **Admins:** in Firestore database `roadpulse`, create the document `config/admins` with the field `emails` (an array of admin email addresses). Admins sign in at `/admin` with a verified email.

## Android app

`RoadPulse.apk` wraps https://roadpulse-ideathon.web.app with the phone's camera and GPS. It keeps the screen on only during Live Drive.

- **Install:** copy the APK to the phone → open it → allow "Install unknown apps".
- **Rebuild:** run `cd android && ./build.sh`. It needs a JDK and downloads the build tools itself.
- **Signing key:** keep `android/keystore/` safe and private. It is needed to publish updates.

## Vehicle computer (optional)

`edge/roadpulse_edge.py` runs the same pipeline on a Jetson, a Raspberry Pi or a laptop:

- OpenCV camera → ultralytics YOLOv8 + ByteTrack → gpsd → SQLite queue → `/api/vehicle/events`.

To set it up:

1. Register the vehicle in Dashboard → Vehicles. The key is shown once.
2. Run:
   ```
   pip install -r edge/requirements.txt
   ```
3. Set `ROADPULSE_DEVICE_ID` and `ROADPULSE_DEVICE_KEY`.
4. Run `python edge/roadpulse_edge.py --model <weights.pt>`.

## Develop and test

- `npm run dev` runs on port 3002.
- `npm test` runs the unit tests.
- `npm run test:e2e` needs:
  - The Firebase emulators (`--project demo-roadpulse`).
  - `node tests/fake-services.mjs`.
  - Playwright.

  It uses a stand-in model, `tests/fixtures/test-model.onnx`, so the tests are deterministic.

## Limits to know

- **Model not tried on a real road:** the real model has not been tested on real roads in this build environment. Check its accuracy and speed on your phone before a demo. Real-time speed depends on the phone; WebGPU phones are fastest.
- **OSM usage policies:** OpenStreetMap tiles and Nominatim are rate-limited. For heavy use, set `NEXT_PUBLIC_MAP_TILE_URL` and `GEOCODER_URL` to your own providers.

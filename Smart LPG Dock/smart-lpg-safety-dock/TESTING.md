# Testing

What is verified automatically, what was checked by looking, and — just as important — what has **not** been tested.

## Automated

| Command | What it proves | Result (last run) |
|---|---|---|
| `npm test` | Engine (`shared/test/engine.test.ts`): baseline readings match the brief; without-dock runs leak → gas rising → danger → chef leaves → simulated incident → recovery; with-dock runs anomaly → warning → simulated shutoff → isolated → contained → whew with no incident; temperature, tilt and unusual-usage faults each trigger the dock; without the dock a tilt fault causes a leak and the incident; thresholds/headlines; determinism; fixtures up to date. | 8 / 8 pass |
| `npm run test:parity` | The Android Java engine replays the shared fixtures (5 runs, every step) and matches the TypeScript engine. | 4,864 checks, all match |
| `npm --prefix web run build` | Strict TypeScript typecheck + production build. | passes |
| `npm run test:e2e` | Firebase Auth/Firestore/Hosting **emulators** + headless Chromium against the built web app: sign up through the UI, run the with-dock demo to INCIDENT CONTAINED, session + events + profile saved to Firestore, Events screen shows the cloud save, rules deny another user reading/writing/listing, no page errors. | 11 / 11 pass |
| `npm run test:android` | Robolectric (JVM, Android 8.1 sandbox) builds the **real MainActivity** and every screen: dashboard text, with-dock run to CONTAINED + saved on device, without-dock shows the SIMULATED INCIDENT label, compare shows both outcomes, all four faults, all 10 presentation chapters, settings, rotation to a tablet-width side rail, a 320 dp phone, mute. Assertions were checked to fail when the expected text is wrong. | 7 / 7 pass |
| `bash mobile/robotest/emulators.sh` | The Android app's own Firebase REST code against the emulators and the real `firestore.rules`: sign up, save a finished run (session + events), presentation record, another user is denied read and a forged write, wrong password gives a readable message. | 2 / 2 pass |
| `node mobile/test/shaders.mjs` | The Android GLES 2.0 shaders compile and link as GLSL ES 1.00 (headless WebGL), and every uniform the Java code sets is active. | pass |
| `node mobile/test/render.mjs` | Runs the Android `KitchenRenderer`/`ProductRenderer` on the JVM against a recording GLES20 stub, replays the frames in WebGL and saves PNGs (`docs/img/android-*.png`). This found and fixed three real issues: a wall blocking the camera, the dock base hidden in the exploded view, and the chef hidden after leaving. | renders OK |
| `bash mobile/build.sh` | APK v2 signature verified (apksig), AAB signature verified (jarsigner), `bundletool build-apks --mode=universal` accepts the bundle, `aapt2 dump badging` shows the expected package/version/SDKs. Also compiled against the Android 7.0 (API 24) framework to find calls newer than minSdk (one found and fixed). | pass |

## Checked by looking (Playwright screenshots)

- Web at 320, 375, 768, 1024, 1440 px: no horizontal scrolling; sidebar on desktop, bottom nav on phones.
- The with-dock sequence (warning → shutoff → isolated → contained → whew) and the without-dock sequence (danger →
  incident in frame → frozen recovery) in the 3D kitchen; compare; Smart Dock product view with clickable parts;
  presentation chapters; telemetry cards.
- Android 3D scenes via the render harness above (kitchen cooking / warning / contained, without-dock incident, compare
  split, exploded dock).

## Not tested — please read

- **No physical Android device or emulator was available** in the build environment (no KVM). The APK has not been installed
  or launched on real hardware. Robolectric exercises the view code and lifecycle, but not GPU rendering, touch gestures,
  audio output, vibration or performance on a real phone. Please install the APK and walk through DEMO_SCRIPT.md once
  before showing it.
- **The web app has not been deployed to Firebase Hosting from here** (the build environment has no Firebase login). The
  Hosting config is exercised by the emulator e2e test, but no public URL exists until you run `npm run deploy` — use the URL
  that command prints.
- Google sign-in needs the provider enabled in the console; it is not covered by the emulator test.
- Screen readers were checked by structure (labels, live regions, headings), not with TalkBack/VoiceOver end to end.
- Everything is a **simulation**. There is no sensor, no valve and no hardware in this repository; nothing here says anything
  about real-world detection or shutoff performance.

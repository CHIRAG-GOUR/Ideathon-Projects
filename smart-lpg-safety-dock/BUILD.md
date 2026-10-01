# Build

## Web app (`web/`)

Requirements: Node 20+.

```bash
npm --prefix shared ci
npm --prefix web ci
npm --prefix web run dev        # development server on http://localhost:5173
npm --prefix web run build      # typecheck + production build → web/dist/
npm --prefix web run preview    # serve web/dist on http://localhost:4173
```

- Code-split: the 3D scenes (three.js, react-three-fiber) and Firebase load lazily, so the dashboard paints first.
- Firebase config is **not** in the bundle. On Firebase Hosting the app reads `/__/firebase/init.json` (served by Hosting
  for the project it is deployed to). Anywhere else, cloud features show "not configured" and everything else works.
- `?emulators` on `localhost` points the app at the local Auth/Firestore emulators (used by `tests/e2e-firebase.mjs`).

## Android app (`mobile/`)

Native Java + OpenGL ES 2.0. No WebView, no Gradle, no Android Studio needed:

```bash
bash mobile/build.sh
# → mobile/build/smart-lpg-dock-1.0.0.apk   (signed, APK Signature Scheme v2 — install directly)
# → mobile/build/smart-lpg-dock-1.0.0.aab   (signed App Bundle — for Google Play)
```

| | |
|---|---|
| Package | `com.skillizee.lpgdock` |
| Version | 1.0.0 (versionCode 1) |
| minSdk / targetSdk | 24 (Android 7.0) / 34 |
| Permissions | `INTERNET` (optional cloud history), `VIBRATE` |
| Requires | OpenGL ES 2.0 |

What the script does: `aapt2 compile/link` (resources, manifest, assets) → `javac --release 11` → **D8** (`--min-api 24`,
desugars lambdas) → zip + align → **apksig** v2 signing → for the AAB, `aapt2 link --proto-format` → base module →
**bundletool build-bundle** → `jarsigner`.

Tools: it uses an installed Android SDK (`ANDROID_SDK_ROOT`, build-tools 34 + platform 34) when present, otherwise it downloads
aapt2 (npm), android.jar / apksig (Maven Central), r8 and bundletool into `mobile/.tools/` (git-ignored). Needs JDK 11+ and Python 3.

Assets are assembled at build time, not duplicated in git: `shared/dock-config.json` (the same engine config as the web app)
and the concept renders from `web/public/img/`.

### Signing key

The first build creates `mobile/keystore/release.p12` and `mobile/keystore/password.txt` (alias `lpgdock`). Both are
git-ignored. **Keep them safe**: Android only installs updates signed with the same key, and Google Play needs the same
upload key for every release. Back them up outside the repository.

### Optional cloud sync in the Android build

```bash
export FIREBASE_API_KEY=...          # the *web* API key of the dedicated project (browser-safe, not a secret)
export FIREBASE_PROJECT_ID=smart-lpg-safety-dock
bash mobile/build.sh
```

The values are written into the APK's `assets/firebase.json` at build time; they are never committed. Without them the app
shows "Cloud sync is not configured in this build" in Settings and keeps history on the device. Get the key with
`npx firebase-tools apps:sdkconfig web --project <project-id>`. Restrict the key to the Identity Toolkit and Firestore APIs
in Google Cloud Console → Credentials if you publish the app.

## Both, in one go

```bash
npm test && npm run build:web && npm run build:android
```

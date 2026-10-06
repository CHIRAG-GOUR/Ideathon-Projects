# Build

## Web

```bash
npm --prefix web ci
npm run build:web          # type-check + production build → web/dist
npm --prefix web run preview   # http://localhost:4174
```

Chunks: `react`, `motion`, `firebase` and lazy-loaded screens. Fonts (Inter, Bricolage Grotesque) are self-hosted.

## Android (APK + AAB)

```bash
npm run build:android      # = bash android/build.sh   (pass --skip-web to reuse an existing web/dist)
```

Output in `android/build/`:

| File | Use |
|---|---|
| `beyond-legacy-1.0.0.apk` | install directly (signed, APK Signature Scheme v2) |
| `beyond-legacy-1.0.0.aab` | upload to Google Play (signed, validated with bundletool) |

Package `com.beyondlegacy.app` · minSdk 24 (Android 7.0) · targetSdk 34.

**How it works.** A small native Java shell (`android/src/com/beyondlegacy/app/`) hosts a WebView that serves the
bundled production build from `assets/www` at the app's real origin `https://beyond-legacy-app.web.app`. The UI therefore
opens instantly and offline, and Firebase Auth / Firestore (including the offline cache) behave exactly as on the
website. Native pieces: dark-green status bar, cream navigation bar, splash screen, adaptive icon, hardware back
button → in-app back, external links → system browser, and CSV export → Android share sheet (`ShareProvider`).

**Requirements.** JDK 11+, Python 3, Node 18+, and an Android SDK (`ANDROID_SDK_ROOT` with build-tools 34 and
platform 34). Without an SDK the script downloads aapt2, android.jar, D8, apksig and bundletool into `android/.tools`.
No Gradle or Android Studio is needed.

**Firebase config.** By default the app fetches it from the deployed site. To bundle it:
`FIREBASE_API_KEY=… FIREBASE_PROJECT_ID=beyond-legacy-app FIREBASE_APP_ID=… npm run build:android`.

**Signing.** The first build creates `android/keystore/release.p12` and `password.txt` (git-ignored). **Back them up** —
every update must be signed with the same key. For Google Play, enrol in Play App Signing and upload the AAB signed with
this key (it becomes your upload key).

**Icons.** `npm run icons` re-renders the launcher icons, splash mark and web PNG icons from `web/public/icon.svg`
(needs Playwright).

## Deploy

```bash
npm run deploy      # Hosting + Firestore rules/indexes to beyond-legacy-app
```

## On Windows

Use Git Bash or WSL for `android/build.sh`. Everything else runs from PowerShell.

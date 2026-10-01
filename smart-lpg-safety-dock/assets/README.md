# assets/

| What | Where | Made by |
|---|---|---|
| Brand mark (master) | `assets/brand/icon.svg` (copied to `web/public/icon.svg`) | hand-written SVG |
| Launcher icons (Android, adaptive + legacy), web PNG icons | `mobile/res/mipmap-*`, `web/public/icon-*.png` | `node mobile/tools/icons.mjs` (renders the SVG with Playwright) |
| Concept renders used in the apps | `web/public/img/*.jpg` (also packed into the APK at build time) | rendered from the web app's own 3D scenes (`/#/dock?shot=1`, kitchen views) |
| Android 3D renders for docs | `docs/img/android-*.png` | `node mobile/test/render.mjs docs/img` |

All imagery is generated from this project's own code — no stock photos and no third-party artwork. Renders are labelled
"Concept render" wherever they appear in the apps.

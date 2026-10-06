# Testing

| Suite | Command | Result (last run) |
|---|---|---|
| Unit tests (vitest): engine + Shelf Rush simulation | `npm test` | **12 / 12 pass** |
| End-to-end acceptance on Firebase emulators (Auth + Firestore + Hosting, real rules, Chromium) | `npm run test:e2e` | **23 / 23 checks pass** |
| Type-check | `npm run typecheck` | clean |
| Android build | `npm run build:android` | APK signature verified (v2), AAB `jarsigner -verify` + `bundletool validate` ok |

## What the e2e test proves (`tests/e2e.mjs`)

The 17-step flow: create account → create store with sample data → Overview “Today’s store” (health 62%, restock 5,
sell soon 6, slow 8) → Next Move is the top-priority action → open **Cold Coffee** (stock 18, demand 8/day, safety 10 → MEDIUM,
monitor) → change stock to 6 → **HIGH risk, RESTOCK 30 units**, with reasoning, forecast "stock-out in 0.8 days" →
mark ordered → Firestore holds stock 6, the ordered recommendation and the inventory event → **reload: everything
retained** → record a sale (6 → 4, one sales-log entry) → Next Moves shows it handled.

Security rules: another user cannot read products or change stock, cannot create a store owned by someone else, a sale
that does not lower stock is rejected, negative stock is rejected, the sales log is append-only. No page errors.

## Also checked (manually, with Playwright screenshots)

Overview hierarchy after the refinement pass (header → Next Move → health → attention → store → how it thinks) at
1440 px, 393 px and 320 px with no horizontal overflow; Shelf Rush played through both rounds to the comparison with no
page errors (numbers match `web/test/play.test.ts`).

Layouts at 320 / 393 / 768 / 1024 / 1440 px with no horizontal overflow and no console errors; reduced-motion mode;
the Android asset routing (bundled build served at `https://beyond-legacy-app.web.app` with no network: app loads,
deep links resolve, Google sign-in is hidden in the app, falls back to the on-device workspace when the Firebase
config is unreachable).

## Not tested — be aware

- **Not deployed to the real Firebase project** from this environment (no Firebase login here). Run
  `npm run firebase:setup` + `npm run deploy`; the live URL has not been verified.
- **The APK has not been run on a physical device or emulator** here. The native shell is small (WebView + share
  provider), but install it and walk the demo script once on a phone before presenting.
- No load testing; Firestore cost is ~1 read per product per session plus live updates.

# SmartShelf AI — by Beyond Legacy

*Don’t just inherit it. Improve it.*

**Know what to do next.** SmartShelf AI (project of team Beyond Legacy) is an inventory decision system for convenience stores and kiranas.
It reads four things a store already has — **stock, sales, expiry dates and product details** — predicts what
happens next, and turns that into one ordered list of actions: **RESTOCK**, **SELL SOON** or **HOLD**.

```
STOCK + SALES + EXPIRY + PRODUCT  →  PREDICTION + RISK  →  ACTION
```

It is a working product, not a mock-up: real accounts (Firebase Auth), real data (Firestore, per-store, rule-protected),
a deterministic engine whose every recommendation can be explained line by line, a responsive web app and a native
Android app (APK + AAB).

## What makes it different

| | |
|---|---|
| **NEXT MOVE** | The single most important thing to do now, then a ranked queue (NOW · TODAY · WATCH). One tap marks it ordered / prioritised / removed; it stays handled until the data says otherwise (e.g. a delivery arrives). |
| **Decision explanation** | Every recommendation answers **WHAT** to do, **WHY** (the numbers), **WHEN** and **IF IGNORED** — no black box, no fake AI. |
| **Inventory Health %** | The share of products that need nothing today, with the stock-out / expiry / slow breakdown behind it. |
| **Live analysis** | On a product, change the stock and watch Data → Analyse → Predict → Action update before saving. |

## Screens

Overview — a decision workspace, not a catalogue: greeting + AI status → **Next Move** hero → isometric store scene with
live risk markers → today's store (restock / sell soon / slow / health %) → top 5 decisions → why today looks like this →
how SmartShelf thinks (input → analyse → predict → act) ·
Inventory (shelf-label grid or list, category tiles, filters) · Next Moves board · Product detail (forecast, reasoning,
history) · Insights (summary, restock, expiry, slow "quiet shelf") · Store · Settings (CSV export, demo data) ·
Add product · Record sale · Sign in / create account / store setup / password reset.

## Presentation demo: Shelf Rush (Settings → Presentation tools)

A separate 3D simulation for pitches, kept out of the main navigation: play one festival week in a kirana store by
habit, then the same week (same seeded customers) with SmartShelf's engine suggesting each morning's moves, and compare
the money. With the built-in "auto-play" policies SmartShelf loses ₹882 to stock-outs + wastage vs ₹5,146 by habit
(₹4,264 saved). Unit-tested in `web/test/play.test.ts`. Figures are illustrative, not field data. Three.js loads only
when the demo is opened. Also includes **Beat the AI**, a 10-second decision quiz on the demo products.

## Repository layout

```
beyond-legacy/
├─ web/                 React + TypeScript + Vite + Tailwind + Framer Motion (the app)
│  ├─ src/engine/       deterministic recommendation engine (pure TS, unit-tested)
│  ├─ src/data/         Repository interface → Firestore (cloud.ts) or on-device (local.ts)
│  ├─ src/art/          hand-built SVG product + retail-scene illustrations, isometric store (IsoStore.tsx)
│  ├─ src/play/         Shelf Rush demo (simulation sim.ts + 3D scene + quiz)
│  ├─ src/screens/      pages;  src/ui/  design-system components;  src/charts/  SVG charts
│  └─ test/             engine unit tests (vitest)
├─ android/             native Android shell (Java, no Gradle) that bundles web/dist → APK + AAB
├─ firebase/            firestore.rules, firestore.indexes.json
├─ tests/e2e.mjs        end-to-end acceptance test on the Firebase emulators
├─ tools/               firebase-setup.sh
└─ docs/                ARCHITECTURE.md, RECOMMENDATION_ENGINE.md
```

## Quick start

```bash
npm --prefix web ci
npm run dev                  # http://localhost:5174 — without Firebase config it runs as an on-device workspace
npm test                     # engine unit tests
npm run test:e2e             # full flow on the Firebase emulators (needs Java 11+)
```

Production: `npm run firebase:setup` once, then `npm run deploy` → https://beyond-legacy-app.web.app.
Android: `npm run build:android` → `android/build/beyond-legacy-1.0.0.apk` and `.aab`.

| Doc | |
|---|---|
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | project, auth, environment variables, Firestore structure, rules, deploy |
| [BUILD.md](BUILD.md) | web + Android builds, signing, Play upload |
| [TESTING.md](TESTING.md) | what is tested, how, and what is not |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | a 4-minute walkthrough |
| [docs/RECOMMENDATION_ENGINE.md](docs/RECOMMENDATION_ENGINE.md) | every formula and threshold |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | data flow, sync, design system |

## Isolation

SmartShelf AI has its own Firebase project (`beyond-legacy-app`), Hosting site, Android package
(`com.beyondlegacy.app`), signing key and browser storage key. It shares no code, data or configuration with the other
projects in this repository.

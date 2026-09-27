# Nutri Scan

Point your phone at any food and learn what it is, how healthy it is and when to eat it.
Nutri Scan is a mobile-first web app (installable as a PWA) that uses Google Gemini to read
photos of food, then keeps track of what's in your kitchen so less of it gets thrown away.

> This app lives in its own folder and is fully separate from the Visionary X app at the root
> of the repository. It has its own `package.json`, its own Firebase database (`nutri-scan`)
> and its own `.web.app` site (nutri-scan-ideathon). Nothing here changes the other project.

## What it does

| Feature | How it works |
| --- | --- |
| **Website** | The home page is an interactive tour: a live "scan table" where a scanner locks onto 3D foods and tags them, a scroll-pinned story that plays a scan out on a phone, a scanner playground, and a fridge "time machine" slider that ages your food. All demo numbers come from the app's real validation and scoring code. |
| **Scan** | Live camera (back camera by default, switch to front), capture or upload a photo. The photo is shrunk on the device (≤1024 px, ≤300 KB JPEG) and sent to `/api/recognize`. |
| **Recognition** | The server calls Gemini with a strict JSON schema. The answer is validated again with zod on the server *and* the client; impossible numbers are dropped. |
| **Meals & dishes** | Parathas, thalis, dosa, biryani, pasta… Gemini lists every item on the plate (e.g. 2 aloo parathas, curd, pickle, butter) with its portion and nutrition. The app re-checks each item (calories must match 4·protein + 4·carbs + 9·fat, portions must be physically possible), adds up the plate itself, and shows a veg / non-veg mark and cuisine. Tap items you didn’t eat and pick ½×–2× portions; the score, nutrition and what you save all follow. |
| **Type instead** | Search a food or a whole meal by name — "2 aloo parathas with curd", "veg thali", "penne arrabbiata" — from the scan screen, the camera’s **Type** button, the home page, or `/scan?q=…`. Same validation as photos; a typed search never has an expiry date or "from label" values. |
| **Nutrition** | Calories and macros per 100 g/ml and per serving. Marked **"Read from label"** when Gemini read a nutrition table, or **"AI estimate"** otherwise. |
| **Nutri score** | A simplified Nutri-Score (A–E) calculated in the app from the nutrition values — not by the AI. |
| **Ingredients & allergens** | From the label when visible, otherwise typical ingredients, clearly marked as estimated. |
| **Expiry** | Only filled in when an expiry date is clearly printed in the photo. Otherwise the app says *"Expiry date not detected"* and asks you. It never guesses. |
| **Not food?** | Phones, pets, people and other objects get a friendly, pre-written joke. People are only ever called "Human" — no identity or personal traits are inferred. |
| **Unsure?** | Low-confidence results ask you to try again or type the food in yourself. Medium confidence asks you to confirm. |
| **My Food** | Everything you save, grouped as **Use First** (≤1 day), **Use Soon** (≤4 days), **Fresh**, **No date**, **Expired** — calculated live from today's date. Mark used, edit, delete as used/wasted. |
| **Insights** | Food saved vs. wasted, estimated money saved (only from prices you entered), a 6-week chart, rule-based "use it up" ideas and optional Gemini recipe ideas. |
| **Journey** | Badges and a scan streak earned from real activity. |
| **Smart Kitchen** | A mini game built from *your* food: tap items in the order they should be used and move them into the Use First tray. 1–3 stars. |
| **Offline** | Food list works offline (local-first). The service worker caches the app shell; scanning shows a clear "You're offline" message. |
| **Sync** | Optional. With Firebase configured, data syncs to Firestore under an anonymous account. Without it, everything stays on the device. |

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Framer Motion · Zustand
(local persistence) · zod · Firebase (Anonymous Auth + Firestore, loaded lazily) · Gemini REST API.

```
src/
  app/                  pages + API routes (/api/recognize, /api/recipes, /api/status)
  features/             scanner, recognition result, inventory (My Food), insights, simulation, home
  lib/
    gemini/             server-only Gemini client + prompts (import 'server-only')
    recognition/        response schema, validation, confidence rules, fun messages
    nutrition/score.ts  Nutri-Score calculation
    expiry/             expiry status + sorting
    firebase/           lazy Firestore sync
    image/, camera.ts   on-device photo prep + camera helpers
  components/           shell, UI primitives
tests/                  unit, Firestore rules, end-to-end (Playwright) + a fake Gemini server
```

## Security & privacy

- `GEMINI_API_KEY` is **server-only**. It is read at runtime inside API routes and is never put in a
  `NEXT_PUBLIC_` variable. A production build was checked: the key does not appear in `.next/static`.
- API routes validate input with zod, reject uploads over ~1.4 MB and are rate limited per client
  (recognize: 20/min, recipes: 6/min).
- Photos are **not stored** by default. A small thumbnail is kept only if you tick "Keep photo".
- Firestore rules only let a signed-in user read/write their own `users/{uid}/…` documents, with
  size and field limits. Everything else is closed.
- Firebase web config values are public by design; they are protected by the rules above.

## Run locally

Requirements: Node 20+.

```bash
cd nutri-scan
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev                  # http://localhost:3001
```

Get a Gemini key from Google AI Studio. Without a key the app still runs; scanning shows a
"not configured" message and you can add food by hand.

The camera needs **HTTPS** (or `localhost`). To try on a phone during development, use a tunnel
or deploy — plain `http://192.168…` addresses won't get camera access.

### Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | server | Required for scanning and AI recipes. Secret. |
| `GEMINI_MODEL` | server | Photo + meal recognition. Default `gemini-2.5-flash` — noticeably better than Flash-Lite at naming dishes and judging portions. |
| `GEMINI_RECIPE_MODEL` | server | Recipe ideas. Default `gemini-2.5-flash-lite`. |
| `GEMINI_TIMEOUT_MS` | server | Optional, default 20000. |
| `GEMINI_THINKING_BUDGET` | server | Optional override. Recognition uses 512 thinking tokens by default (helps with portion sizes); set `0` for the fastest answers. |
| `NEXT_PUBLIC_FIREBASE_*` | browser | Optional. Firebase web app config. Leave empty to keep data on the device only. |
| `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` | browser | `nutri-scan` — the app's own named database. |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | browser | `1` only for local tests. |

## Firebase setup (project `ideathon-projects`)

Nutri Scan is served at **https://nutri-scan-ideathon.web.app** — its own Firebase Hosting site in
the same project as Visionary X, with its **own Firestore database (`nutri-scan`)**, so it never touches
Visionary X or any other data. Unlike Visionary X it isn't a purely static site: a small server
(created automatically by Firebase's Next.js support) keeps the Gemini key secret. This needs the
project on the **Blaze** plan.

From this folder:

```bash
npm i -g firebase-tools && firebase login
npm run firebase:setup                                   # creates the nutri-scan database + the nutri-scan-ideathon site
firebase functions:secrets:set GEMINI_API_KEY --project ideathon-projects   # paste your Gemini key
npm run deploy                                           # builds and deploys to nutri-scan-ideathon.web.app
```

Then in the Firebase console: **Authentication → Sign-in method → enable Anonymous** (for sync).
If the site name `nutri-scan-ideathon` is taken, pick another and change it in `firebase.json` and
`package.json`. Optional sync: put the web app's `NEXT_PUBLIC_FIREBASE_*` values in a `.env.production`
file here before deploying (they're public by design); without them food is kept on the device.

**Android app (APK):** once the site is live, open https://www.pwabuilder.com, enter the site URL,
choose **Package for stores → Android**, and download the APK. To hide the browser bar inside the app,
copy the generated `assetlinks.json` to `public/.well-known/assetlinks.json` and deploy again.

## Tests

```bash
npm run typecheck
npm test                       # unit tests: expiry, Nutri-Score, validation, confidence rules
npm run test:rules             # Firestore rules against the emulator
```

End-to-end tests drive a real Chromium with a fake camera. They need the dev server with
emulator settings in `.env.local` (`GEMINI_API_BASE=http://127.0.0.1:4011`,
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1`), the fake Gemini server and the Firebase emulators:

```bash
node tests/fake-gemini.mjs &                                        # :4011
npx firebase-tools emulators:start --only auth,firestore --project demo-nutri-scan &
npm run dev &
npm run test:e2e -- <video.y4m> <photo.png> [screenshotDir]         # camera, capture, upload, all result types, errors
npm run test:experience -- <photo.png> [screenshotDir]              # My Food, sync, game, badges, insights, offline
npm run test:website                                                # landing page: scan table, scroll story, playground, time machine, reduced motion
npm run test:meals -- <photo.png> [screenshotDir]                   # plates item by item, portions, leave-out, typed search, saving a meal
```

`<video.y4m>` is any short clip for Chromium's fake camera (e.g. `ffmpeg -loop 1 -i photo.png -t 2 -pix_fmt yuv420p clip.y4m`).
The fake Gemini server can return food (label/estimate), a phone, a person, a dog, low/medium
confidence, bad numbers, a made-up expiry date, timeouts, 500s and malformed JSON — so every
branch of the recognition flow is exercised without a real key.

### Manual checklist (real phone)

- [ ] Camera opens on the back camera; switch to front and back works
- [ ] Denying camera permission shows the explainer with **Upload Photo**
- [ ] A packaged food with a nutrition label shows "Read from label" values
- [ ] Fresh produce shows "AI estimate"
- [ ] A pack with no visible date says "Expiry date not detected"
- [ ] A pack with a printed date fills it in; you can still edit it
- [ ] Scanning a person shows "Human" and the friendly message, nothing else
- [ ] Add to My Food → appears in the right group; Mark Used reduces quantity
- [ ] Airplane mode: My Food still works; scanning explains you're offline
- [ ] Add to Home Screen installs the app with its icon
- [ ] Home page: scroll story pins and steps through 4 chapters; time machine slider works with a finger
- [ ] Photo of a thali / parathas / pasta lists each item; totals look sensible; ½× and 2× and leaving items out update the numbers
- [ ] Typed search: "2 aloo parathas with curd", "rajma chawal", "chicken biryani", "penne arrabbiata"

## Credits

3D food artwork: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft (MIT License),
shipped as static images in `public/e3d` (see `public/e3d/LICENSE.txt`).

## Known limitations

- Recognition quality depends on Gemini and the photo. Nutrition from a photo without a label is
  an estimate, and the app says so. Not medical or dietary advice.
- Automated tests use a fake Gemini server; the real API should be checked once with a real key —
  try a few real plates (a thali, parathas, a pasta dish) and a few typed searches.
- Meal numbers are estimates from a photo or a description: portion size and cooking fat are the
  biggest unknowns, which is why the app shows its assumptions and lets you adjust the portion.
- Price-based savings are only as accurate as the prices you enter.
- Firestore sync uses anonymous accounts: clearing browser data starts a new account.

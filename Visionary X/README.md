# Visionary X — Know What to Sell First

> A smart inventory assistant for neighbourhood grocery shops, built for the Ideathon.
> **Scan your stock. Know what needs attention. Put it in the right place. Waste less.**

Grocery shops keep extra stock in storage. New deliveries get stacked in front, older products
get hidden, and some expire before anyone notices. Visionary X fixes the real problem — not
knowing what needs attention first:

**SCAN → IDENTIFY → CHECK EXPIRY → PRIORITIZE → ORGANIZE → SELL FIRST**

## What's inside

| Route | What it is |
| --- | --- |
| `/` | Product website: hero with an interactive shelf, What it is, The Problem, The Solution, How it works, a simulated scan, Why expiry matters, the real scanner, My Stock preview, a 3D warehouse preview, Use cases, Before/After story and a final call to action. |
| `/scanner` | **Real camera barcode scanner.** Opens the rear camera (`getUserMedia`, `facingMode: environment`), decodes frames continuously, pauses when a product is found and shows expiry, a shelf-life bar and the recommended shelf. Handles denied permission, no camera and non-HTTPS pages, and always offers manual entry. |
| `/demo` | Printable **demo barcodes**: six real Code 128 barcodes on one A4 page, a *Print All* button, per-card printing and a *Download Barcode Sheet* PNG. Also has the presenter guide. |
| `/dashboard` | Simple home for the app: greeting, big *Scan a Product* button, Scanned / Needs attention / Organized, Today's Tip. |
| `/stock` | My Stock: six product cards with quantity, days left, status and shelf location. |
| `/warehouse` | **3D warehouse game** (React Three Fiber). Walk as the shopkeeper, scan boxes, read the expiry and carry each box to Fresh, Sell Soon or Sell First. A *Simple shelves* mode offers the same game with taps only. |

Old links keep working (`/scan → /scanner`, `/barcodes → /demo`, `/simulation → /warehouse`) via redirects in `firebase.json`.

There are two navigation contexts: the **website** (Home · What It Is · How It Works · Use Cases · Scanner · Warehouse · Demo · Try It) and the **app** (Home · Scan · My Stock · Warehouse, with a bottom tab bar on phones).

## The six demo products (single source of truth: `src/lib/products.ts`)

| Barcode | Product | Units | Expires in | Shelf |
| --- | --- | --- | --- | --- |
| `890000000001` | Milk | 42 | 2 days | 🔴 Sell First |
| `890000000002` | Bread | 18 | 4 days | 🟡 Sell Soon |
| `890000000003` | Biscuits | 35 | 30 days | 🟢 Fresh |
| `890000000004` | Juice | 22 | 12 days | 🟢 Fresh |
| `890000000005` | Paneer | 16 | 1 day | 🔴 Sell First |
| `890000000006` | Rice | 50 | 180 days | 🟢 Fresh |

The shelf comes from one rule (`getZoneForDays`): **≤ 2 days → Sell First, 3–7 days → Sell Soon, > 7 days → Fresh.**

Scanner, My Stock, dashboard and the 3D game all share one Zustand store (`src/lib/store.ts`, saved in
`localStorage`). Scan Milk with the camera and it shows as scanned in the warehouse; place it
on a shelf and My Stock and the dashboard update. Each correct placement earns 100 points, so
all six earn 600 and prevent ₹1,250 of potential waste.

## Running a live demo

1. `npm install` then `npm run dev` and open <http://localhost:3000>.
2. Open **/demo** → **Print All Barcodes** (A4, 100% scale). Cut them out and tape them onto any objects.
3. Press **Demo Mode**. It resets the shop and shows a five-step guide: *Scan → See the product → Read expiry → Arrange it → Earn points*.
4. On a phone the camera only opens on **HTTPS** (or `localhost`). Deploy the site (for example to Vercel) or use an HTTPS tunnel, then open `/scanner` on the phone.

No camera? Tap a product under *No printout nearby?* on the scanner page, or type the number in *Enter Barcode Manually*.

## Deploy to Firebase Hosting (isolated site)

The site is a static export (`out/`) deployed to its **own** Hosting site, `visionary-x-ideathon`, inside the
`ideathon-projects` Firebase project. It deploys **only** that site (`--only hosting:visionary-x`): no Firestore,
Functions, Storage or rules, and no other Hosting sites in the project are touched. There is no backend.

One-time setup (on your machine):

```bash
npx firebase-tools login
npm run firebase:create-site   # creates https://visionary-x-ideathon.web.app
```

If that site ID is already taken, pick another (e.g. `visionary-x-app`), run
`npx firebase-tools hosting:sites:create <your-id> --project ideathon-projects`, and put the same ID in `.firebaserc`
under `targets → ideathon-projects → hosting → visionary-x`.

Deploy (every time):

```bash
npm run deploy
```

The camera works there because `*.web.app` is served over HTTPS.

## How the scanner works

- `src/lib/barcodeEngine.ts` picks the browser's built-in **BarcodeDetector** where available (Chrome on Android/macOS) and falls back to **ZXing** everywhere else (iOS Safari, Firefox, desktop).
- Supported formats: Code 128 (used on the demo sheet — it encodes the 12-digit numbers exactly), EAN-13, EAN-8, UPC-A and UPC-E.
- Frames alternate between the scanning-frame crop and the full frame, and some are run through an unsharp-mask sharpening pass. In testing this made blurry, far-away labels readable where they failed before.
- Scanning stops when a product is found. *Scan Another* resumes and briefly ignores the product you just scanned, so it isn't read twice.

### Tested

The flow was tested in Chromium with a fake webcam fed from video clips made from the `/demo` barcodes (tilted, keystoned, blurred and noisy):

- All six barcodes were recognised from the live camera feed, each in about one second including camera start-up.
- Each scan showed the right product, expiry and recommendation. *Arrange Product* handed it to the warehouse, a wrong shelf showed "Check the expiry date", the right shelf gave +100 points, and after six products the screen showed 6/6, ₹1,250 and 600 points, with the dashboard and My Stock updated.
- The downloaded PNG sheet and the A4 print render were decoded back to exactly `890000000001`–`890000000006`.

Real printers and phone cameras vary. Always do one test scan of your printout before presenting.

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Framer Motion · Zustand ·
Three.js + React Three Fiber · ZXing (`@zxing/library`) + BarcodeDetector · JsBarcode · canvas-confetti · Lucide icons.

## Illustrations

All artwork is hand-built SVG in one warm, flat style (`src/components/art/`), so it works offline, prints cleanly and can be animated. The shop scene in the Before/After section reorganises itself as you scroll. To use AI-generated shopkeeper images instead, see [`docs/IMAGE_PROMPTS.md`](docs/IMAGE_PROMPTS.md).

## Project structure

```
src/
  app/(site)/        website: / and /demo
  app/(app)/         app: /dashboard /scanner /stock /warehouse
  components/art/    SVG illustration system (products, shopkeeper, scenes, spots)
  components/home/   landing page sections
  components/scanner live camera scanner + product result
  components/warehouse 3D scene, game rules, HUD, simple mode
  lib/products.ts    the six products + the shelf rule
  lib/store.ts       shared shop state (scans, placements, points, demo mode)
  lib/barcodeEngine.ts camera + barcode decoding
```

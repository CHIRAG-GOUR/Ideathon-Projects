# Firebase setup

Beyond Legacy uses **Firebase Authentication**, **Cloud Firestore** and **Firebase Hosting** in a dedicated project.
No Cloud Functions — the free Spark plan is enough.

## 1. Create the project (once)

```bash
npx -y firebase-tools@latest login
npm run firebase:setup                 # or: bash tools/firebase-setup.sh my-other-id   (if the ID is taken)
```

The script creates project **`beyond-legacy-app`**, registers a web app and creates the Firestore database
(`asia-south1`). If you pass another ID it also updates `.firebaserc`, `firebase.json` and the Android app's origin.

Then, in the Firebase console → **Authentication → Sign-in method**, enable **Email/Password** (and optionally
**Google** — available on the website; the Android app uses email + password).

## 2. Deploy

```bash
npm run deploy        # builds web/, deploys Hosting + Firestore rules + indexes
```

Open `https://beyond-legacy-app.web.app`. Create an account → set up the store (tick "Start with sample products" for
a realistic 47-product store) → you are on Overview.

## Environment variables

None are needed in production: Firebase Hosting serves the project's web config at `/__/firebase/init.json` and the
app reads it at start-up. The config is never hard-coded in source.

| Where | Variable | Purpose |
|---|---|---|
| `web/.env.local` (dev only, optional) | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID` | Point `npm run dev` at a real project. Copy `web/.env.example`. |
| Android build (optional) | `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_AUTH_DOMAIN` | Bundle the config into the APK's assets. Without them the app fetches it from the deployed site. |

These are browser-safe identifiers, not secrets — access is enforced by the security rules. No service-account keys
exist anywhere in the project.

Resolution order in the app: `VITE_FIREBASE_*` → `/__/firebase/init.json` → **on-device workspace** (no account,
data in browser storage, clearly labelled "On this device"). Local emulators: open `http://localhost:5174/?emulators`.

## Firestore structure

```
users/{uid}                       { storeId, email, displayName, createdAt }
stores/{storeId}                  { ownerId, name, type, area, managerName, openTime, closeTime, deliveryDays, demo, createdAt }
  settings/engine                 { highRiskDays, reorderWindowDays, orderCoverageDays, slowCoverageDays, expiryWatchDays }
  products/{productId}            { name, category, stock, unitPrice, expiryDate|null, safetyStock, caseSize, supplier, notes,
                                    declaredDailySales, salesDaily{ 'YYYY-MM-DD': units }, trackingSince, createdAt, updatedAt, demo }
  sales/{saleId}                  { productId, units, date, at, by }                  append-only log
  inventoryEvents/{eventId}       { productId, productName, type, delta, stockAfter, note, at, by }   append-only log
  recommendations/{productId}     { productId, status: ordered|prioritized|removed|acknowledged, action, quantity,
                                    stockAtAction, expiryAtAction, note, at, by }     the manager's response to a recommendation
```

- `salesDaily` is a rolling 35-day map on the product so the engine reads one document per product; the full history
  stays in `sales`.
- Stock changes (sale, delivery, count, wastage) run in a **transaction** that updates the product and appends the log
  entry together.
- Recommendations are **computed on the device** from this data (deterministic, instant, offline-capable). Only the
  manager's decision on them is stored.

## Security rules (`firebase/firestore.rules`)

- A user can read/write only the store whose `ownerId` is their uid; `users/{uid}` can only point at a store they own.
- Every field is type- and range-checked (non-negative integer stock, valid dates, bounded strings and maps).
- A sale can be created only if the same write lowers the product's stock by exactly that many units.
- Sales and inventory events are append-only; stores cannot be deleted from the client.

The e2e test verifies these rules against the emulator (see TESTING.md).

## Demo data

"Start with sample products" (store setup) or Settings → Load demo data writes 47 products with 21 days of sales
through the same repository code as manual entry. Demo products are flagged `demo: true` and can be removed with
Settings → Remove demo data without touching your own products.

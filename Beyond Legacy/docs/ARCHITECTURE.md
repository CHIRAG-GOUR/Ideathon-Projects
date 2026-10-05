# Architecture

```
            ┌──────────── web/src ─────────────────────────────────────────────┐
 Firebase   │ data/firebase.ts  config: VITE env → /__/firebase/init.json → none│
 Auth  ◄────┤ data/cloud.ts     Repository on Firestore (transactions, onSnapshot)
 Firestore  │ data/local.ts     Repository on browser storage ("On this device")│
            │ state/session.tsx auth phases + live Workspace + memoised analysis │
            │ engine/*          pure: analyseStore(workspace, settings, today)  │
            │ screens/*  ui/*  art/*  charts/*                                   │
            └──────────────────────────────────────────────────────────────────┘
 android/   Java WebView shell serving the same web/dist at https://beyond-legacy-app.web.app
```

**Data flow.** The session subscribes to `users/{uid}` → `stores/{storeId}` and its products, settings and
recommendations (live, with Firestore's IndexedDB offline cache). Every change produces a new Workspace; the engine
re-analyses it (milliseconds for hundreds of products) and every screen re-renders from that one analysis. Writes go
through the Repository only — screens never touch Firestore directly — and stock changes are transactions that also
append to `sales` / `inventoryEvents`.

**Why compute recommendations on the device?** Instant feedback (the live stock slider), works offline, no server
cost, and the rules can stay simple. The stored part is the manager's decision, which is what must persist.

**Design system.** Tokens in `index.css` (`--smart-green`, `-dark`, `-red`, `-yellow`, `-orange`, `-cream`, …) mapped
into Tailwind. Retail language: shelf-label product cards, price-tag order quantities, receipt-style handled notes,
aisle tags. A hand-built SVG library (`art/`) draws ~30 product types and retail scenes (store aisle, cooler, sell-first
shelf, quiet shelf…). Motion (Framer Motion) is used for meaning — numbers counting, the forecast drawing in, the
Data → Predict → Action chain, *Mark ordered* → *✓ Ordered* — and is disabled under `prefers-reduced-motion`.

**Accessibility.** Semantic landmarks, labelled controls, focus rings, keyboard-operable sheets and menus, risk shown
with text + icon (never colour alone), 44 px touch targets on mobile.

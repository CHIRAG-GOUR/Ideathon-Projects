---
name: chirag-ui-maker
description: Chirag UI Maker — builds polished, product-quality web UIs, landing pages, smooth Framer Motion animations and light React Three Fiber web games (Next.js + Tailwind). Use when the user asks to create or improve a website, landing page, app UI, dashboard, interactive demo, 3D/web game, or wants "premium", "smooth animations", "real product feel", "fully responsive", or "no text cut". Also use for camera/barcode features and Firebase static hosting of such apps.
---

# Chirag UI Maker

Build UIs that feel like real, polished products: clear story, consistent illustrations, purposeful motion, playable 3D, fully responsive, and verified end to end.

The full playbook, with recipes and pitfalls, is in `references/playbook.md`. **Read it before starting any build.**

## Workflow

1. **Understand, don't rebuild.** If a project exists, inspect its routes, state, components and assets first, and improve it in place. Fix a broken build before adding features.
2. **Write the one-sentence promise** and the landing-page story order: Hero (interactive) → What it is → Problem → Solution flow → How it works → Interactive demo → Real feature → App/game preview → Use cases → Before/After → Final CTA.
3. **Architecture:**
   - Next.js route groups `(site)` and `(app)`, with separate navigations and a bottom tab bar on phones.
   - One data file plus one persisted Zustand store shared by site, app and game.
   - Business rules in single functions.
   - A Demo Mode that resets state and coaches step by step.
4. **Design system:** light, warm palette tokens named after real things (cream, leaf, mango, tomato, sky, soil, ink); a display serif plus a friendly sans; big radii; warm soft shadows; `.btn/.card/.chip` component classes. No dark or neon themes unless asked.
5. **Illustrations:** hand-built SVG components in one style (shared viewBox and baseline); characters with `mood` props; two-state scenes whose objects interpolate `from → to` poses from one MotionValue. One icon set only.
6. **Motion (Framer Motion):** reveals on scroll, `layoutId` moves, count-up numbers, fast springs, the `[0.16,1,0.3,1]` ease; `MotionConfig reducedMotion="user"`. Animate to explain, never loop decoration forever.
7. **Games (React Three Fiber):**
   - Lazy-load with `ssr:false`; primitives only, two lights, `dpr [1,1.75]`, canvas-texture labels.
   - Refs for input (keyboard, D-pad, click-to-walk), with a Controller in `useFrame`.
   - Lerp with `1-exp(-delta*k)`; a follow camera; friendly feedback and completion.
   - A tap-only 2D fallback mode.
8. **Device features:** real implementations (e.g. `getUserMedia` + BarcodeDetector/ZXing with sharpening and crop alternation), generation guards for async starts, and fallbacks (manual entry, tap-to-simulate).
9. **Responsive:**
   - Buttons `max-w-full text-center sm:whitespace-nowrap`; `min-w-0` on text-holding grid/flex children; `grid-cols-1`.
   - Headlines scaled for 320px; no `truncate` on meaningful text; edge tooltips open inwards.
   - `overflow-x: clip` (never `hidden` on both html and body).
10. **Verify before claiming done:**
    - `tsc --noEmit` and `next build`.
    - `node scripts/responsive-audit.mjs <baseUrl> <routes>` at 320–1440px, including interactive states.
    - Playwright end-to-end flows; for camera features, use `scripts/make-fake-camera.py` plus Chromium fake-device flags.
    - Report failures honestly.
11. **Deploy (Firebase static, isolated):** `output:'export'`, a `firebase.json` hosting target with its own site ID in `.firebaserc`, and `firebase deploy --only hosting:<target>`. This never touches other sites or databases.

## Pitfalls to avoid (details in the playbook)

- `overflow-x:hidden` on html and body breaks `useScroll`, `whileInView` and sticky elements. Use `clip`.
- Framer `x/y` overrides Tailwind translate classes. Use `style={{x:'-50%'}}`.
- `whileInView` on an element clipped by an `overflow-hidden` parent never fires. Trigger from the parent with variants.
- `AnimatePresence` with a reused key during exit can render nothing. Use unique keys.
- StrictMode double effects start the camera twice. Guard with a generation counter and per-loop IDs.
- Fixed coaches or toasts can cover buttons on phones. Use a compact pill and reserve space for it.

## Quality bar (answer yes to all)

Real product feel · problem and solution clear in 30 seconds · a child can demo it · real features work, with fallbacks · one shared data source · one visual style · purposeful motion with reduced-motion support · no overflow or clipped text from 320 to 1440px · build passes · README, demo and deploy steps written.

---
name: chirag-ui-maker
description: Chirag UI Maker — builds polished, product-quality web UIs, landing pages, smooth Framer Motion animations and light React Three Fiber web games (Next.js + Tailwind). Two house styles, Style A (warm grocery/illustrated) and Style B (light "juice bar" AI-scan app with Fluent Emoji 3D art, live scan-table hero, scroll-pinned phone story). Use when the user asks to create or improve a website, landing page, app UI, dashboard, interactive demo, 3D/web game, AI camera/scan app, or wants "premium", "smooth animations", "real product feel", "fully responsive", or "no text cut". Also use for camera features and Firebase hosting of such apps.
---

# Chirag UI Maker

Build UIs that feel like real, polished products: clear story, consistent illustrations, purposeful motion, playable 3D, fully responsive, and verified end to end.

The full playbook, with recipes and pitfalls, is in `references/playbook.md`. **Read it before starting any build.**

## Pick a house style first

- **Style A: warm illustrated** (Visionary X grocery app). Cream, leaf and mango palette; hand-built SVG illustrations; a 3D warehouse game. Recipes are in `references/playbook.md`.
- **Style B: light "juice bar" AI-scan app** (Nutri Scan). Cloud-white, aqua, lilac, lemon and coral palette; **Microsoft Fluent Emoji 3D** artwork; no dark surfaces.
  - Elements: a live scan-table hero with a locking reticle and result tags, a marquee, a scroll-pinned phone story, a playground, a "time machine" slider, and meal/result cards.
  - Recipes are in `references/scan-app-patterns.md`. Get the art with `scripts/get-fluent-3d.sh`; render it with `assets/Emoji3D.tsx`.

If the user doesn't say which, pick A for commerce/physical-world stories and B for AI/camera/health/utility apps. Never mix palettes.

## Workflow

1. **Understand, don't rebuild.** If a project exists, inspect its routes, state, components and assets first, and improve it in place. Fix a broken build before adding features.
2. **Write the one-sentence promise** and the landing-page story order: Hero (interactive) → What it is → Problem → Solution flow → How it works → Interactive demo → Real feature → App/game preview → Use cases → Before/After → Final CTA.
3. **Architecture:**
   - Next.js route groups `(site)` and `(app)`, with separate navigations and a bottom tab bar on phones.
   - One data file plus one persisted Zustand store shared by site, app and game.
   - Business rules in single functions.
   - A Demo Mode that resets state and coaches step by step.
4. **Design system:** light palette tokens named after real things (Style A: cream, leaf, mango, tomato, sky, soil, ink; Style B: cloud, aqua, lilac, lemon, coral, peach, ink); big radii; soft tinted shadows; `.btn/.card/.chip` component classes. Primary buttons in Style B are light gradients with deep text. No dark or neon themes unless asked.
5. **Illustrations:** one art family per product.
   - Style A: hand-built SVG components (shared viewBox and baseline; characters with `mood` props; two-state scenes interpolating `from → to` from one MotionValue).
   - Style B: Fluent Emoji 3D images via `<Emoji3D>`, with a name→artwork map for dynamic items.
   - Use one icon set only (lucide).
6. **Motion (Framer Motion):** reveals on scroll, `layoutId` moves, count-up numbers, fast springs, the `[0.16,1,0.3,1]` ease; `MotionConfig reducedMotion="user"`. Animate to explain, never loop decoration forever.
7. **Games (React Three Fiber):**
   - Lazy-load with `ssr:false`; primitives only, two lights, `dpr [1,1.75]`, canvas-texture labels.
   - Refs for input (keyboard, D-pad, click-to-walk), with a Controller in `useFrame`.
   - Lerp with `1-exp(-delta*k)`; a follow camera; friendly feedback and completion.
   - A tap-only 2D fallback mode.
8. **Device features & Camera:** real implementations (e.g. `getUserMedia` + BarcodeDetector/ZXing with sharpening and crop alternation, or Gemini Vision pipeline with client-side JPEG resizing ≤1024px, ≤300KB), generation guards for async starts, and fallbacks (manual entry, tap-to-simulate).
9. **Android App & TWA Integration:**
   - Standalone APK / TWA wrapper generation with full screen PWA support (`manifest.webmanifest`, theme colors, maskable icons).
   - Camera & Internet permission handling (`android.permission.CAMERA`, `android.permission.INTERNET`, `Permissions-Policy: camera=(self)`).
   - Direct ADB deployment and device verification (`adb -s <device> install -r <apk>`).
   - Zero-latency offline caching: Service Worker cache-first strategy for app shell and 3D assets (`/e3d/`).
10. **Responsive & No Text Cut:**
    - Buttons `max-w-full text-center sm:whitespace-nowrap`; `min-w-0` on text-holding grid/flex children; `grid-cols-1`.
    - Headlines scaled for 320px; no `truncate` on meaningful text; edge tooltips open inwards.
    - `overflow-x: clip` (never `hidden` on both html and body).
11. **Verify before claiming done:**
    - `tsc --noEmit` and `next build`.
    - `node scripts/responsive-audit.mjs <baseUrl> <routes>` at 320–1440px, including interactive states.
    - Playwright end-to-end flows; for camera features, use `scripts/make-fake-camera.py` plus Chromium fake-device flags.
    - Verify on connected Android device via ADB when requested.
    - Report failures honestly.
12. **Deploy (Firebase Hosting & Functions, isolated):** `output:'export'` (for static) or Next.js Web Frameworks with Cloud Functions backend (for secure server-side keys), dedicated database ID, and isolated hosting site. This never touches other projects or sites.

## Pitfalls to avoid (details in the playbook)

- `overflow-x:hidden` on html and body breaks `useScroll`, `whileInView` and sticky elements. Use `clip`.
- Framer `x/y` overrides Tailwind translate classes. Use `style={{x:'-50%'}}`.
- `whileInView` on an element clipped by an `overflow-hidden` parent never fires. Trigger from the parent with variants.
- `AnimatePresence` with a reused key during exit can render nothing. Use unique keys.
- StrictMode double effects start the camera twice. Guard with a generation counter and per-loop IDs.
- Fixed coaches or toasts can cover buttons on phones. Use a compact pill and reserve space for it.
- Branching markup on `useReducedMotion()` breaks hydration. Use a mounted-guarded hook (`useCalmMotion`).
- A desktop nav with 5 links overflows at `md`. Show it from `lg`, and keep the bottom tab bar on tablets.
- A floating result tag over a scene covers the art on phones. Render it below the scene there, and clamp it inside on desktop.

## Quality bar (answer yes to all)

Real product feel · problem and solution clear in 30 seconds · a child can demo it · real features work, with fallbacks · one shared data source · one visual style · purposeful motion with reduced-motion support · no overflow or clipped text from 320 to 1440px · Android TWA/APK installs cleanly · build passes · README, demo and deploy steps written.

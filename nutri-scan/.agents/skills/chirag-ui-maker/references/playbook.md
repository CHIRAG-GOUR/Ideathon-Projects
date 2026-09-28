# Playbook: Polished Product UIs, Smooth Animations & Web Games

What worked when building **Visionary X** (Next.js + Tailwind + Framer Motion + React Three Fiber). Drop this into a new project as `CLAUDE.md`, or paste it into your first prompt, so every build starts at this quality bar.

---

## 0. How to use this file

- **Starting a new project:** paste section 11 (Master prompt), fill in the blanks, and attach this file.
- **Improving an existing project:** add *"Follow UI-and-Games-Playbook.md. Inspect the existing code first and improve it, don't rebuild from scratch."*
- **Before calling anything finished:** run the QA checklist in section 9.

---

## 1. Product thinking comes before pixels

1. **Write the one-sentence promise first.** Visionary X: *"Scan your stock. Know what needs attention. Put it in the right place. Waste less."* Every section must serve that sentence.
2. **Tell a story on the landing page, in this order:** Hero → What it is → The problem → The solution → How it works → Interactive demo → Real feature → Preview of the app/game → Who it's for → Before/after → Final call to action.
3. **Keep the marketing site and the app separate.** They need two navigations (website links vs. Home / Scan / Stock / Play). Use Next.js route groups: `app/(site)/…` and `app/(app)/…`.
4. **Use one source of truth for data.** Put all core entities in one file (`lib/products.ts`) and all progress in one store (Zustand + `persist`). The website, the app and the game read the same data. Never duplicate definitions.
5. **Put business rules in one function** (for example `getZoneForDays(days)`). The UI, the game and the printout all call it.
6. **Build a Demo Mode for presentations:** one button that resets state and shows a step-by-step coach (Step 1…5) that advances on real events.

---

## 2. Design system (light, warm, premium)

- **Palette as tokens** in `tailwind.config.ts`, named after real things, not "primary/secondary":
  `cream` (paper background), `leaf` (brand green), `mango` (highlight), `tomato` (urgent), `sky`, `soil` (wood/cardboard), `ink` (text: DEFAULT/soft/muted/faint).
- **Status colors live in data** (`ZONES[zone].color/soft/ink`), so HTML, SVG, canvas and 3D all share them.
- **Type:** a characterful display serif for headlines (Fraunces, `opsz 144`, tracking `-0.02em`) plus a friendly sans for body text (Plus Jakarta Sans), plus a mono for codes and numbers.
- **Components as CSS classes** in `@layer components`: `.btn .btn-lg/md/sm .btn-primary/secondary/ghost/mango`, `.card`, `.chip`, `.eyebrow`, `.display-xl`, `.container-page`.
- **Shapes:** large radii (`rounded-4xl`/`5xl`), warm soft shadows (`rgba(74,56,30,…)`, never grey-black), 1px inset rings in cream instead of borders.
- **Don't overuse cards.** Mix full-width bands, split editorial layouts, big illustrations, interactive scenes and "shelves".
- **Light UI only unless asked otherwise:** no black backgrounds, no neon, no dark glass. Tint overlays over video or images with cream, not black.

---

## 3. Illustrations: make your own consistent set

When image generation isn't available (or styles clash), **hand-build SVG components** in one flat, warm style:

- Give every item the same `viewBox` (e.g. `0 0 120 120`), baseline (y≈108) and soft shadow ellipse, so items line up on shelves, cards, canvases and print.
- **Build characters from simple parts:** ellipse head, path hair, polyline arms (a thick stroke drawn twice for an outline), and `mood` props (`worried | happy`) that swap brows, eyes and mouth and add props (a sweat drop, a scanner).
- **Scenes with two states** (chaos ↔ tidy): each object has a `from` and a `to` pose `[x, y, rotate]`. A single `MotionValue` (0→1, driven by scroll) interpolates them with `useTransform`. The Before/After section literally reorganises itself.
- Use nested `<svg x y width height>` to place art inside bigger scenes.
- To reuse SVG art in canvas or 3D, use `renderToStaticMarkup(<Art/>)` → Blob → `Image` → `drawImage` / `CanvasTexture`.
- **Icons:** one set only (lucide-react), used to support meaning, not decorate.
- If generated images arrive later, add a config slot (`lib/assets.ts`) that swaps the SVG for an `<img>` with no refactor.

---

## 4. Motion that feels premium (Framer Motion)

**Rules**
- Use animation to **explain**, not decorate: a product moves to its shelf, a scan line sweeps, numbers count up.
- Use fast springs (`stiffness 260–420, damping 22–30`) for UI, and an ease-out curve `[0.16, 1, 0.3, 1]` over 0.4–0.6s for reveals.
- Stagger children at 0.06–0.12s. Don't animate every word, and don't keep things floating forever.
- Wrap the app in `<MotionConfig reducedMotion="user">` and add a CSS `prefers-reduced-motion` block. With `useReducedMotion()`, show the **final state** of scroll-driven scenes.

**Patterns that worked**
- **Reveal on scroll:** `initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true, margin:'-80px'}}`.
- **Shared layout moves:** give the same `layoutId` to a product on the shelf and in a bin, so it flies between them. Wrap in `<LayoutGroup>`.
- **Scroll-driven scene:** `useScroll({target, offset:['start 85%','center 45%']})` → `useSpring` → `useTransform`.
- **Count-up numbers:** `animate(from, to, {onUpdate})` writing to `textContent` when in view.
- **Sequenced demo:** a phase state machine (`idle → scanning → found`) with timed transitions and staggered result lines.
- **Auto-advancing stepper** (How it works): auto-advance every ~3.6s only while in view, pause on hover, and show a progress bar.
- **Micro-interactions:** a green check pop on success, a soft pulse on urgent badges, tasteful confetti on completion (`disableForReducedMotion: true`), and short Web Audio beeps.

**Pitfalls (each of these cost debugging time)**
- ⚠️ `overflow-x: hidden` on **both** `html` and `body` makes body a scroll container and breaks `useScroll`, `whileInView` and sticky elements. Use `overflow-x: clip`.
- ⚠️ A Framer `x/y` animation **overrides** Tailwind `-translate-x-1/2`. Use `style={{ x: '-50%' }}` or a wrapper div.
- ⚠️ `whileInView` on an element that **starts outside an `overflow-hidden` parent** never fires, because the IntersectionObserver sees 0%. Trigger from the parent with variants (`initial="hidden" whileInView="show"`).
- ⚠️ In `AnimatePresence mode="wait"`, re-adding a child with the **same key** while it exits can render nothing. Use a unique key per occurrence (`${id}-${count}`).
- ⚠️ Hover-only UI fails on touch. Make the first tap show the tooltip and the second tap act.

---

## 5. Web games with React Three Fiber (light and smooth)

- **Lazy-load** 3D with `next/dynamic({ ssr:false })`, and on landing pages mount only when near the viewport (`useInView(ref,{once:true, margin:'300px'})`).
- **Keep the scene light:** primitives and `RoundedBox`, one hemisphere light plus one shadow-casting directional light (1024 map), `dpr={[1,1.75]}`, and a fog matching the background.
- **Text in 3D:** paint it onto canvases (`CanvasTexture`), not remote-font `Text`, so it works offline and uses page fonts.
- **Architecture:**
  - Put game rules in a hook (`useWarehouseGame`) that writes to the shared store. The 3D view and a simple 2D fallback mode both use it.
  - A `Controller` component in `useFrame` handles movement, nearest-interactable detection, the action key and the follow camera.
  - Keep input in refs (`inputRef {x,z}`, `actionRef`), fed by the keyboard (WASD/arrows, E/Space/Enter), an on-screen D-pad (pointer capture) and click-to-walk (`moveTarget` + `pending` action on arrival).
  - Call `setState` from `useFrame` **only when the value changes** (e.g. the nearby target).
- **Smoothness:** frame-rate-independent lerp `k = 1 - Math.exp(-delta * speed)`, a camera that lerps its position and look-at target, walk bob and limb swing from `sin(t)`, and objects that lerp to their target slot (carried → in hands, placed → on shelf).
- **Game feel:** a clear prompt pill ("Press E to scan Milk"), a generous interaction radius, a toast with +points on success, a gentle "Check the expiry date" on a mistake with no penalty, sparkles at the target, and a completion modal with count-up stats.
- **Accessibility:** a tap-only "Simple mode" with the same rules and the same data.

---

## 6. Real device features (camera and barcodes)

- **Open the camera** with `getUserMedia({ video: { facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1080} } })`. Retry with `video:true` on `OverconstrainedError`. It needs **HTTPS or localhost**, so detect `isSecureContext` and explain.
- **Decode** with `BarcodeDetector` when available, otherwise ZXing (`@zxing/library` `MultiFormatOneDReader` with `TRY_HARDER` and `POSSIBLE_FORMATS`).
- **Reliability boosters:** alternate center crop and full frame; run an **unsharp-mask** pass on alternate frames (it took blurry, far-away labels from 0/6 to 5/6 decoded); grayscale on a reused canvas.
- **Flow:** stop the loop and freeze the frame on a match, then show the result. "Scan another" resumes with a **cooldown** for the same item.
- **Guard async camera starts** with a generation counter (React StrictMode or quick switching otherwise creates duplicate loops and leaked streams). Give each detection loop its own ID.
- **Always have fallbacks:** permission-denied UI with "Try again", manual entry, tap-to-simulate demo items.
- **Printable assets:** use Code 128 for arbitrary numeric IDs (EAN/UPC need check digits), black on pure white, quiet zone ≥10 modules, `viewBox` so the SVG scales, `@page { size: A4 }` print CSS, and a canvas-rendered PNG download.

---

## 7. Responsive and "no text cut" rules

- `.btn`: `max-w-full text-center sm:whitespace-nowrap`. Let buttons wrap on phones instead of overflowing.
- Add `min-w-0` on grid and flex children that hold text. Use `grid-cols-1` (which is `minmax(0,1fr)`) instead of an implicit `grid`.
- Scale headlines down for 320px (`text-[2.55rem] min-[380px]:text-[3.1rem] sm:text-7xl`), and add `overflow-wrap: break-word` on headings and paragraphs.
- **No `truncate` on meaningful text.** Wrap with `leading-tight` instead.
- Tooltips near edges open **inwards** (left column → `left-0`, right column → `right-0`).
- Keep fixed-width art `w-full max-w-[Npx]`. Mark decorative off-canvas blobs `aria-hidden` and `pointer-events-none`.
- App nav: a bottom tab bar up to `lg`, top links from `lg`. Leave space so fixed coaches or toasts never cover buttons (compact pill on phones).
- Test at **320, 360, 390, 430, 600, 768, 900, 1024, 1280 and 1440**.

---

## 8. Test like a user (Playwright)

Headless Chromium is at `/opt/pw-browsers` in cloud sessions. Useful scripts:

1. **Screenshots per section** (`locator('main section').nth(i).screenshot()`). Full-page captures of very tall pages can repeat content.
2. **Responsive audit:** for every text node, compare its client rects with the nearest `overflow != visible` ancestor and the viewport. Flag `scrollWidth > clientWidth` with `text-overflow: ellipsis`, and flag page `scrollWidth > innerWidth`. Run it on default **and interactive states** (tooltips open, modals, results, game HUD).
3. **Fake camera end to end:** screenshot the printable barcodes, build a `.y4m` clip with Pillow + NumPy (tilt, keystone, blur, noise), and launch Chromium with
   `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=clip.y4m`. Assert product, expiry, recommendation, points and completion.
4. **Decode the printouts** (PNG and print-media render) back to the exact values.
5. **WebGL in headless:** add `--use-gl=angle --use-angle=swiftshader`. Drive games with `keyboard.down/up`.
6. Wait for count-up animations to settle before asserting numbers.

---

## 9. QA checklist before "done"

- [ ] Does it look like a real product? Can a teacher understand it in 30 seconds? Can a child demo it?
- [ ] Does the landing page explain the problem, the solution and how it works without opening the app?
- [ ] Do real device features actually work (camera opens, codes decode), with fallbacks?
- [ ] Is the data shared everywhere (site, app, game) from one source?
- [ ] Is it light-themed, with one illustration style and one icon set?
- [ ] Are animations purposeful, respecting reduced motion, with nothing looping forever?
- [ ] Is there no horizontal scroll, and no clipped or truncated text at 320–1440px, including interactive states?
- [ ] Do `tsc --noEmit` and `next build` pass? Is there no console error?
- [ ] Are README, demo instructions and deploy steps written?

---

## 10. Stack and deploy recipe

- **Stack:** Next.js 14 App Router · TypeScript · Tailwind · Framer Motion · Zustand (`persist`, `skipHydration` + `rehydrate()` in a client provider) · React Three Fiber + drei · lucide-react · JsBarcode · ZXing · canvas-confetti.
- **Firebase static hosting (isolated site):**
  - In `next.config`: `output: 'export'`, `images.unoptimized`. Move redirects into `firebase.json`.
  - In `firebase.json`: `"target": "<app>"`, `"public": "out"`, `cleanUrls`, redirects, cache headers for `/_next/static/**`, `Permissions-Policy: camera=(self)`.
  - In `.firebaserc`: map the target to a dedicated site ID.
  - One time: `firebase hosting:sites:create <site-id>`.
  - Deploy: `next build && firebase deploy --only hosting:<app>`. This never touches other sites, databases or rules.

---

## 11. Master prompt (copy, fill and paste)

```
Build [PRODUCT NAME]: [one-sentence promise].
Audience: [who]. Must feel like a real, polished product — not a demo or admin dashboard.

Follow UI-and-Games-Playbook.md:
- Light, warm theme with named palette tokens; display serif + friendly sans; big radii, soft warm shadows.
- Landing page story: Hero (interactive) → What it is → Problem → Solution flow → How it works (stepper)
  → Interactive demo → Real feature → App/game preview → Use cases (hover mini-animations)
  → Before/After (scroll-driven scene) → Final CTA.
- Separate website nav and app nav (route groups); bottom tab bar on phones.
- One data file + one persisted store shared by site, app and game.
- Hand-built consistent SVG illustration set (characters with moods, two-state scenes).
- Framer Motion: purposeful reveals, layoutId moves, count-ups, springs; respect reduced motion.
- [If game] React Three Fiber, lazy-loaded; keyboard + D-pad + click-to-walk; canvas-texture labels;
  frame-rate-independent lerps; friendly feedback; simple 2D fallback mode.
- [If device feature] real implementation with graceful fallbacks; test with Playwright fake devices.
- Demo Mode: one button that resets and coaches the presenter step by step.
- Fully responsive 320–1440px, no clipped or truncated text; run an automated overflow audit.
- Verify end to end with Playwright before claiming anything works. tsc + next build must pass.

Core features: [list]
Data: [entities + exact demo values]
Deploy: [Firebase hosting site id / Vercel]
```

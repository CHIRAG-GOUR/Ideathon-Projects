# Style B — "Juice bar" AI scan app (from Nutri Scan)

Use this style for AI/camera apps (scan food, plants, products, documents…) and any light, playful,
modern product. It pairs a cool pastel palette with **3D emoji artwork** and "live demo" motion.

## 1. Palette — light, no dark surfaces

| Token | Use | Values (50 → 900) |
| --- | --- | --- |
| `cloud` | page + neutral surfaces | 50 `#FCFDFF` · 100 `#F5F8FE` · 200 `#ECF1FA` · 300 `#DEE5F2` · 400 `#C8D1E4` |
| `aqua` | primary | 100 `#D5F7F0` · 200 `#ABEFE2` · 300 `#7EE4D3` · 400 `#4FD3BF` · 500 `#26B9A5` · 700 `#137B6F` · 900 `#0C4841` |
| `lilac` | secondary / eyebrows | 50 `#F7F4FF` · 100 `#EFE9FF` · 200 `#DED3FF` · 300 `#C5B4FF` · 500 `#8769E8` |
| `lemon` | "soon" / warnings | 100 `#FFF6C9` · 300 `#FFDE5A` · 400 `#FACD2C` · 700 `#826405` |
| `coral` | urgent / errors | 100 `#FFE4E0` · 400 `#FF7E72` · 700 `#9C3029` |
| `peach` | warm wood / cards | 100 `#FFF0E6` · 200 `#FFDDC8` · 400 `#F7A67B` |
| `ink` | **text only** | `#2A3148` · soft `#4B5470` · muted `#737C97` · faint `#A8AFC4` |

Rules:
- **Primary button** = light gradient with deep text, never dark + white:
  `bg-gradient-to-r from-aqua-300 to-[#9CD8FF] text-aqua-900 ring-1 ring-inset ring-white/60 shadow-[0_12px_26px_-12px_rgba(38,185,165,.75)]`
- **Selected states** = pastel fill + deep text (`bg-aqua-200 text-aqua-900`), never `bg-ink text-white`.
- **Body background**: `#F5F8FE` + two fixed radial glows (lilac top-right, aqua left).
- **Shadows** tinted blue-grey `rgba(62,72,120,…)`, not black. Overlays `bg-[#8C94B8]/25` + blur.
- **Status chips**: soft background + deep ink of the same hue (e.g. coral-100 / coral-700).
- Score chips (A–E): light hue background, **deep letter colour** (`#0E5A33` on `#62D394`, etc.).

## 2. The artwork: Microsoft **Fluent Emoji 3D**

The glossy 3D food, phone and dog pictures are **Fluent Emoji 3D**, Microsoft's open-source
emoji set (MIT licence, https://github.com/microsoft/fluentui-emoji), rendered as 256 px images.
The same pictures show up on every device (iPhone, Android, Windows), unlike system emoji.

- Get them: `scripts/get-fluent-3d.sh "🍎🥛🍞🧀🍌📱🐶"`. It pulls them from npm (`@lobehub/fluent-emoji-3d`),
  copies only the ones you use into `public/e3d/<codepoint>.webp` (5–10 KB each) and writes the list.
- Render them: `assets/Emoji3D.tsx` → `<Emoji3D emoji="🍞" size={96} />`. It falls back to the system emoji
  when an image is missing, and `fill="68%"` sizes it inside a tile.
- Other members of the family: **Fluent Emoji Flat** / **Color** (SVG, via Iconify
  `@iconify-json/fluent-emoji-flat`); **Noto Animated Emoji** (Google, Lottie) for motion.
- Map **names → artwork** (`/paratha|roti|naan/ → 🫓`, `/biryani/ → 🍛`, `/paneer|cheese/ → 🧀`).
  Put specific dishes before ingredients, and never match 2–3-letter fragments ("pan" hits "Paneer").
- Shadow: `drop-shadow-[0_14px_14px_rgba(62,72,120,0.2)]`. Tile: `rounded-2xl bg-cloud-100` with the image at ~68 %.
- Service worker: cache `/e3d/` cache-first so art works offline.
- Credit it (`public/e3d/LICENSE.txt` + README line).

## 3. Signature elements (copy the pattern, change the data)

### 3.1 Live "scan table" hero
The hero's right side is a table cloth (`aspect-square sm:aspect-[5/4]`, gradient white→`#F1F7FF`→`#E9F8F4`,
dotted `radial-gradient(rgba(135,105,232,.12) 1px, transparent 1px) / 18px`) with 6 floating 3D items at
% positions. It has four moving parts:
- **Reticle**: a motion div with four L-shaped corners (`border-l-[3px] border-t-[3px] rounded-tl-2xl` etc.).
  Animate `left/top/width/height` to the active item with a spring (`stiffness 170, damping 22`) and
  `style={{x:'-50%', y:'-50%'}}`. Inside it, a beam: `h-1/2 animate-beam bg-gradient-to-b from-transparent via-lilac-300/40 to-transparent`.
- **Auto cycle** every 2.6 s. A tap selects the item and pauses cycling for 7 s. Pointer parallax: `useMotionValue` →
  `useSpring` → `useTransform(v => v * depth)` per item. Idle bob: `y: [0,-7,0]` with a different duration per item.
- **Result tag**: a card beside the item (name, kcal · serving, A–E chip, status chip). Clamp its position inside
  the stage with `clamp(8px, calc(x% + 60px), calc(100% - 228px))`. On phones, render it **below** the
  table instead, so it never covers the art. Crossfade tags with no `mode="wait"`, so there's never an empty gap.
- A "● LIVE DEMO" pill (white, coral text) and a "Tap an item · sample values" caption for honesty.
- The headline reveals word by word: each word in `overflow-hidden`, animating `y: '105%' → 0` with 80 ms stagger.

### 3.2 Scroll-pinned phone story
The section is `height: (chapters*90+60)svh`. Inside it, `sticky top-16 h-[calc(100svh-4rem)]`, and on phones
`h-[calc(100svh-4rem-76px)]` so it clears the bottom nav. Track progress with
`useScroll({target, offset:['start start','end end']})` and pick the chapter with
`floor(p*N*0.999)` in `useMotionValueEvent`.
- Desktop: list all chapters, active one at opacity 1, others at .32; the body text expands with `height:auto`.
- Phones: show one chapter (short copy) and a 4-segment progress rail.
- The phone is `bg-white p-2 ring-lilac-200` with a `bg-cloud-300` notch. On desktop use `aspect-[9/18.5]`
  height-bound; on phones use `h-full w-full max-w-[340px]` so it fills the space and stays readable.
- Screens swap with `AnimatePresence mode="popLayout"`: camera (brackets + sweep line) → recognised
  (confidence bar) → nutrition (score strip, count-up kcal, macro bars) → saved list (new row slides in).

### 3.3 "Time machine" slider (teaches a rule by playing with it)
A range input 0–10 days plus a ▶ play button (advances every 750 ms). Items regroup into shelves
(Use first / Use soon / Fresh / Wasted) with `LayoutGroup` + `layout` + `layoutId`, driven by the **real**
business function (`statusForDays(d - day)`). A live summary line reads e.g. "4 items would be wasted…".

### 3.4 Playground ("challenge the scanner")
A 4×2 grid of 3D items as radio buttons. On pick: a 0.9 s "Looking closely…" state (item in a
bracket frame with a sweep line), then the result card. Food shows a score strip and count-up macros;
non-food shows a bounce (`scale [.4,1.15,1]`, `rotate [-12,8,0]`), a "NOT FOOD" chip and a friendly line.
Sample data must go through the **same validation code** as real results.

### 3.5 Result screens
- A photo hero, or for typed searches a gradient hero with a big 3D emoji. Chip: "AI estimate" /
  "Read from label" / "From your search".
- Chips row: `MEAL` · cuisine (lilac) · diet mark (the Indian green-dot / brown-triangle symbol, "Likely vegetarian").
- **Meal card**: one row per plate item (3D art, name, portion, kcal, a share bar with gradient aqua→lilac, a check
  badge). Tap a row to leave that item out (strikethrough, 50 % opacity). Portion radio: ½× 1× 1½× 2×. The total uses
  CountUp. Add a "How we estimated" note.
- Score card on the grade's soft colour; nutrition panel with a per-serving / per-100 toggle.

### 3.6 Small things that make it feel alive
- A marquee strip of 3D items with FOOD / NOT FOOD chips. Use `animate-marquee` (translateX 0 → -50% over a duplicated
  list) and pause it on hover.
- A top scroll-progress bar, `fixed h-1 origin-left bg-gradient-to-r from-lilac-400 via-aqua-500 to-lemon-400`, with scaleX from `useScroll`.
- Count-ups start only when in view (`useInView` once).
- Sounds and haptics on scan (Web Audio blips + `navigator.vibrate`), with a mute toggle.
- A final CTA: pastel gradient block, sweep beam, four 3D items floating at the corners (hidden below md).

## 4. Hard-won fixes
- **Hydration**: never branch markup on `useReducedMotion()` during SSR. Use a `useCalmMotion()` that returns
  false until mounted, and let `MotionConfig reducedMotion="user"` handle transforms.
- On desktop, show a nav with ≥5 links only from `lg`; tablets keep the bottom tab bar (at `md` it overflows).
- Treat off-screen elements during a slide-in (`x:40`) as audit false positives; ignore marquee items too.
- Card exit animations make "element removed" tests flaky. Wait for `state:'detached'` instead of a fixed timeout.

## 5. Prompt snippet
"Use Chirag UI Maker, Style B (juice-bar palette + Fluent Emoji 3D). Build a light, playful [product]
site: a live scan-table hero, a marquee, a scroll-pinned phone story (4 chapters), a playground, a rule-teaching
slider, an honest AI section and a final CTA; no dark surfaces; responsive 320–1440; verify with the audit script."

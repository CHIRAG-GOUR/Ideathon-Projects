# Architecture

```
                 shared/dock-config.json  (every threshold, timing, position)
                           │
          ┌────────────────┴─────────────────┐
  shared/src/engine.ts  (TypeScript)    Engine.java (Android port)
          │       ▲ fixtures/traces.json ▲  parity test: 4,864 step checks
          ▼                                   ▼
  web/src/simulation/controller.ts      sim/SimController.java + Clock (Choreographer)
  (rAF clock, paused when hidden)       (paused with the activity)
          │                                   │
  TelemetryProvider ── cards, charts, timeline, state machines, narration
          │                                   │
  three/ (R3F kitchen, product,         gl/ (GLES 2.0: KitchenRenderer,
   AutoFrame, 2D fallback)               ProductRenderer, Models)
          │                                   │
  services/sessions.ts ── Firestore     services/Cloud.java ── Firestore REST
  (JS SDK, lazy-loaded)                  (no Play Services)
                    └──── firebase/firestore.rules (owner-only, validated) ────┘
```

- **One source of truth.** Screens render engine state and events; nothing is hand-animated on a timeline.
- **Safety controls never wait for animation.** Start/Pause/Restart/fault buttons act on the engine immediately; motion
  (Framer Motion on web) is decoration and respects reduced-motion.
- **Performance.** Web: route-level code splitting, 3D and Firebase lazy-loaded, quality presets (pixel ratio, shadows,
  particle counts), the render loop and simulation clock pause when the tab is hidden. Android: one GL program, shared
  meshes, low-quality preset on low-RAM devices, GL paused off-screen.
- **Failure modes.** No WebGL → 2D SVG fallback with the same state; 3D error boundary; Firebase missing → "not
  configured", local history only; network errors are shown with the real reason.

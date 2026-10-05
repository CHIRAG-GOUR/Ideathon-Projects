# The simulation

One deterministic engine drives everything you see — telemetry cards, the event timeline, the state machines, the chef,
the 3D scene and the compare view. It lives in **`shared/src/engine.ts`**; the Android app runs a line-for-line Java port
(`mobile/src/com/skillizee/lpgdock/engine/Engine.java`). Both read the same **`shared/dock-config.json`**.

## Layers (each fixed step of 0.05 s)

1. **Director** — scripted events (cooking starts at 0 s, the leak at 8 s in scripted mode) and fault injection.
2. **Physics (illustrative)** — leak: `excess += mult·k·((τ+dt)^p − τ^p)` with `k = 0.00847`, `p = 1.62`; once the source
   stops, the excess decays with `exp(−dt/3.5 s)` (exhaust). Heat, tilt and usage faults move their readings toward targets.
   These curves are chosen to tell the story clearly; they are not a physical model of LPG dispersion.
3. **Dock safety engine** (with dock only) — per-sensor level (normal / anomaly / warning / critical) from the thresholds;
   a warning held for 1 s (or any critical) triggers the simulated shutoff; the valve travels 1 s to ISOLATED; CONTAINED
   once every reading is back below its anomaly level for 2 s.
4. **Without dock** — nobody measures; the chef notices at 0.5 ppm (DANGER) after a 0.7 s reaction; a SIMULATED INCIDENT is
   triggered at 0.83 ppm (or by heat/tilt leaks), lasts 6 s, then RECOVERY.
5. **Chef** — cooking → alerted / noticing → walking or fleeing along the exit path → exited → relieved ("whew").

Every transition emits an event (`warning`, `shutoff`, `isolated`, `contained`, `danger`, `incident`, …) — the UI only
renders events and state; it never invents its own timings.

## Changing the model

Edit `shared/dock-config.json`, then:

```bash
npm test                    # engine tests (update expectations if you changed the story on purpose)
npm --prefix shared run fixtures   # regenerate shared/fixtures/traces.json
npm run test:parity         # the Java port must still match step for step
```

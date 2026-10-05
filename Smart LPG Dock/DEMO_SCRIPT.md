# Demo script — 4 minutes

Works the same on the web app (laptop + projector) and the Android app. Times below are simulation time at 1× speed; they
come from `shared/dock-config.json` and are identical on both platforms. Unmute the device before you start; every sound also
has on-screen text, so the demo still works muted.

**Before you start:** open the app on the Dashboard ("● SYSTEM NORMAL"). Speed 1×.

| Time | Do | Say |
|---|---|---|
| 0:00 | Dashboard | "LPG cooks food in homes, dhabas and restaurant kitchens every day. A leak gives no warning on its own. This is the Smart LPG Safety Dock — a concept: a dock under the cylinder that never stops watching. Everything you'll see is a **simulation**." |
| 0:20 | Tap **COMPARE BOTH** | "Same kitchen, same chef, same leak. Left / top: no dock. Right / bottom: with the Smart Dock. One clock drives both." |
| 0:30 | Watch to sim 00:08 | "The chef is cooking. At eight seconds we introduce a leak at the regulator — in both kitchens." |
| 0:40 | Sim 00:10–00:14 | "With the dock: anomaly at 10.6 s, **WARNING** at 12 s — the alarm sounds and the chef is alerted. The dock confirms for one second, then the **simulated automatic shutoff**: supply **ISOLATED** at 14 s." Point at the synchronised event table. |
| 1:05 | Sim 00:16–00:24 | "The chef turns off the burner and walks out calmly. The exhaust clears the gas… **INCIDENT CONTAINED** at 23 s — and the whew." |
| 1:25 | Sim 00:20–00:25 | "Without the dock, nobody is measuring. Gas keeps rising — 0.28, 0.51 — the chef only notices at **DANGER** at about 20 s and runs. At 24 s: a **simulated incident**. It is labelled for demonstration only — it's an educational visualisation, not a prediction." |
| 1:50 | Point at the gas chart | "Two lines, one leak. The difference is eight seconds of warning and a closed valve." |
| 2:05 | Go to **Smart Dock** | "What's in the dock: gas, temperature and tilt sensors, a status ring, a buzzer/beacon, the controller, and a shutoff actuator on the regulator." Tap **Gas detection**, then **Exploded view**. |
| 2:35 | Go to **Simulation**, Free play, **Start**; tap **Cylinder tilt** | "It isn't only leaks. Watch — someone knocks the cylinder. Tilt goes over 10° → warning → over 15° → critical → shutoff." (Optionally **Temperature rise**.) |
| 3:05 | **Presentation** → chapter 9 | "These numbers are computed by the engine right now from the same configuration — earlier detection buys about eight seconds and stops the supply before the gas builds up." |
| 3:30 | Chapter 10 | "Today: a working prototype — web and Android, one engine, honest labels. Next: real sensors plug in through the same TelemetryProvider interface — the app doesn't change. Then: bench testing, a tested actuator and certification before any real-world use." |
| 3:50 | Back to Dashboard | "Smart. Safe. Secure. Thank you." |

## If something goes wrong

- **3D is slow:** Settings → 3D quality → Low (web) or Battery saver (Android). On the web, the 3D falls back to a 2D diagram automatically if WebGL
  is unavailable; the state machine, telemetry and timeline still run.
- **Need it quieter:** the mute button is in the top bar. Every cue is also on screen.
- **Lost the thread:** Restart resets both runs to 00:00; 2× speed gets through a run in ~15 s.
- **Questions about "is it real?":** "It's a concept prototype. The sensing and shutoff are simulated; the point of the
  prototype is the system design, the user experience and the early-warning principle."

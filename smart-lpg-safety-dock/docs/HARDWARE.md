# From simulator to a real dock — the telemetry contract

The apps never read the engine directly for display; they read a **`TelemetryProvider`**:

- web: `web/src/telemetry/provider.ts` — `SimulationTelemetryProvider`, `FutureHardwareTelemetryProvider`
- Android: `mobile/src/com/skillizee/lpgdock/telemetry/TelemetryProvider.java` — `Simulation`, `FutureHardware`

Today only the simulation provider is connected. The hardware provider exists, reports **"not connected"**, and returns
no values — it never invents readings. The Telemetry screen lets you switch to it so the empty state is visible.

## Reading payload (what a dock would send)

```json
{
  "cylinderId": "LPG-2700",
  "at": 1767225600000,
  "gasPpm": 0.04,
  "tempC": 25.4,
  "tiltDeg": 0.4,
  "flowKgH": 0.45,
  "cylinderKg": 12.9,
  "supply": "OPEN",
  "fw": "0.1.0"
}
```

Units and meaning match the simulation (gas in the simulation's illustrative ppm scale, temperature near the cylinder,
tilt from vertical, LPG mass flow, remaining LPG mass from load cells, valve state `OPEN | CLOSING | ISOLATED`).
`usage` and `safety` are derived by the same safety engine the simulator uses, so a hardware provider can feed real readings
into the identical decision logic and UI.

## Suggested path

1. **Bench prototype** — gas sensor module, NTC/thermocouple, IMU, load cell + HX711, a normally-closed solenoid or motorised
   regulator valve, ESP32. Publish the payload above over Wi-Fi (HTTPS/WebSocket) or a BLE characteristic at 2–5 Hz.
2. **Implement `HardwareTelemetryProvider`** on both platforms (replace the placeholder), plus pairing UI; register devices in
   the `devices` collection (rules already exist).
3. **Calibrate** thresholds per sensor and move them from `dock-config.json` to per-device configuration.
4. **Safety engineering** — independent hardware interlock for shutoff (never software-only), fail-safe valve, testing
   against applicable LPG appliance and gas-detector standards, and certification **before any real-world use**.

Nothing in this repository is a substitute for step 4.

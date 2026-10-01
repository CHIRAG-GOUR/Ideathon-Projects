# functions/ — intentionally empty

The Smart LPG Dock needs **no Cloud Functions**, so none are deployed and the project runs on the free Spark plan.

- The simulation runs entirely on the device (browser or phone). Nothing is computed server-side.
- Saving history is a direct, authenticated client write. `firebase/firestore.rules` does what a backend would otherwise
  do: owner-only access and strict validation of every field (allowed keys, enum values, numeric ranges, string lengths).
- There are no secrets to protect (no third-party API keys, no payments, no admin actions).

When the physical dock exists, this folder is where device ingestion would go (e.g. an HTTPS function that verifies a
device token and writes readings for `FutureHardwareTelemetryProvider` — see `docs/HARDWARE.md`).

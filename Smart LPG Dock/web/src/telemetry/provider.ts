// Telemetry abstraction: the UI asks a provider for readings and never cares where they come from.
// Today: SimulationTelemetryProvider (the engine). Later: real dock hardware over Wi-Fi/BLE/serial.
import type { SimController } from '@/simulation/controller';
import type { SafetyState, Usage } from '@engine/engine';

export interface Telemetry {
  source: 'simulation' | 'hardware';
  connected: boolean;
  at: number; // wall-clock ms of the reading
  cylinderId: string;
  gasPpm: number | null;
  tempC: number | null;
  tiltDeg: number | null;
  flowKgH: number | null;
  cylinderKg: number | null;
  usage: Usage | null;
  safety: SafetyState | null;
  supply: 'OPEN' | 'CLOSING' | 'ISOLATED' | null;
}

export interface TelemetryProvider {
  readonly id: 'simulation' | 'hardware';
  readonly label: string;
  read(): Telemetry;
  subscribe(fn: () => void): () => void;
  status(): { connected: boolean; detail: string };
}

export class SimulationTelemetryProvider implements TelemetryProvider {
  readonly id = 'simulation';
  readonly label = 'Simulation (built-in engine)';
  constructor(private sim: SimController, private cylinderId: string) {}
  read(): Telemetry {
    const s = this.sim.state;
    return {
      source: 'simulation', connected: true, at: Date.now(), cylinderId: this.cylinderId,
      gasPpm: s.gas, tempC: s.temp, tiltDeg: s.tilt, flowKgH: s.flow, cylinderKg: s.cylinderKg, usage: s.usage,
      safety: s.safety, supply: s.supply,
    };
  }
  subscribe(fn: () => void) {
    return this.sim.subscribe(fn);
  }
  status() {
    return { connected: true, detail: 'Simulated telemetry from the Smart Dock engine' };
  }
}

/**
 * Placeholder for the physical dock. Expected payload (JSON over HTTP/WebSocket or BLE characteristic):
 * { cylinderId, gasPpm, tempC, tiltDeg, flowKgH, cylinderKg, supply } — see docs/HARDWARE.md.
 * Until a device is paired it reports "not connected" and returns no values (never invented ones).
 */
export class FutureHardwareTelemetryProvider implements TelemetryProvider {
  readonly id = 'hardware';
  readonly label = 'Smart Dock hardware (future)';
  read(): Telemetry {
    return { source: 'hardware', connected: false, at: Date.now(), cylinderId: '—', gasPpm: null, tempC: null, tiltDeg: null, flowKgH: null, cylinderKg: null, usage: null, safety: null, supply: null };
  }
  subscribe() {
    return () => undefined;
  }
  status() {
    return { connected: false, detail: 'No dock hardware paired. Readings appear here once a device is connected.' };
  }
}

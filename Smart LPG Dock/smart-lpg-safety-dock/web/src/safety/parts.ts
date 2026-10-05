import { CONFIG } from '@engine/engine';
import type { PartId } from '@/three/CylinderDock';

const th = CONFIG.thresholds;
export const PARTS: { id: PartId; name: string; text: string; spec: string }[] = [
  { id: 'gas', name: 'Gas detection', text: 'Monitors simulated gas concentration and triggers the safety workflow when configured thresholds are exceeded.', spec: `Simulated thresholds: anomaly ${th.gas.anomaly} · warning ${th.gas.warning} · critical ${th.gas.critical} ppm` },
  { id: 'temp', name: 'Temperature sensor', text: 'Watches the temperature beside the cylinder. Unusual heat near LPG is treated as an early warning sign.', spec: `Simulated thresholds: ${th.temp.anomaly} / ${th.temp.warning} / ${th.temp.critical} °C` },
  { id: 'tilt', name: 'Tilt sensor (IMU)', text: 'Measures how far the cylinder leans. A tipped cylinder can strain the regulator joint.', spec: `Simulated thresholds: ${th.tilt.anomaly}° / ${th.tilt.warning}° / ${th.tilt.critical}°` },
  { id: 'dock', name: 'Dock base · load cells', text: 'A weighing platform under the cylinder. Weight over time gives remaining LPG and the usage pattern — e.g. gas flowing with no cooking.', spec: `Simulated: abnormal above ${th.usage.abnormalFlow} kg/h for ${th.usage.abnormalSustainSec} s` },
  { id: 'status', name: 'Status & connection ring', text: 'Green = normal · amber = warning · red = critical · blue = supply isolated. The same state is reported to the app.', spec: 'Every state is also shown as text in the app — never colour alone' },
  { id: 'shutoff', name: 'Simulated shutoff mechanism', text: 'A clamp-on actuator that turns the regulator to OFF. In this prototype the shutoff is SIMULATED — no real valve is controlled by the app.', spec: `Simulated: closes ${CONFIG.dock.confirmSec} s after a confirmed warning (immediately on critical), ${CONFIG.dock.valveTravelSec} s travel` },
  { id: 'controller', name: 'Controller module', text: 'Runs the safety engine (the same logic as this simulator’s dock engine), drives the beacon and buzzer, and reports telemetry.', spec: 'Concept: microcontroller + Wi-Fi/BLE · see docs/HARDWARE.md' },
  { id: 'cylinder', name: `LPG cylinder · ${CONFIG.cylinderId}`, text: 'Commercial cylinder (blue) standing on the dock. The dock does not modify the cylinder.', spec: `Simulated contents ${CONFIG.baseline.cylinderKg} kg of ${CONFIG.baseline.cylinderCapacityKg} kg` },
  { id: 'regulator', name: 'Regulator & hose', text: 'The standard regulator and hose to the stove. The simulated actuator acts on the regulator’s supply knob.', spec: 'Unmodified standard parts (concept)' },
];

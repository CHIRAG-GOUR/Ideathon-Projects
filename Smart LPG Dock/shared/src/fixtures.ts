// Writes reference traces that the Android (Java) engine must reproduce — see mobile/test/Parity.java.
import { writeFileSync } from 'node:fs';
import { runScenario, createState, step, inject, clearFaults, CONFIG, type Fault, type Mode, type Scenario } from './engine';

export const RUNS: { name: string; scenario: Scenario; mode: Mode; seconds: number; inj: { at: number; fault: Fault | 'clear' }[] }[] = [
  { name: 'with-scripted', scenario: 'with', mode: 'scripted', seconds: 40, inj: [] },
  { name: 'without-scripted', scenario: 'without', mode: 'scripted', seconds: 40, inj: [] },
  { name: 'with-faults', scenario: 'with', mode: 'free', seconds: 45, inj: [{ at: 3, fault: 'heat' }, { at: 4, fault: 'usage' }, { at: 20, fault: 'clear' }] },
  { name: 'with-tilt', scenario: 'with', mode: 'free', seconds: 30, inj: [{ at: 2, fault: 'tilt' }, { at: 9, fault: 'clear' }] },
  { name: 'without-tilt-heat', scenario: 'without', mode: 'free', seconds: 45, inj: [{ at: 2, fault: 'tilt' }, { at: 5, fault: 'heat' }, { at: 6, fault: 'leak' }] },
];

export function trace(run: (typeof RUNS)[number]) {
  const s = createState(run.scenario, run.mode);
  const q = [...run.inj];
  const samples: unknown[] = [];
  const steps = Math.round(run.seconds / CONFIG.stepSec);
  for (let i = 0; i < steps; i++) {
    while (q.length && q[0].at <= s.t + 1e-9) {
      const x = q.shift()!;
      if (x.fault === 'clear') clearFaults(s);
      else inject(s, x.fault);
    }
    step(s);
    if ((i + 1) % 10 === 0) samples.push({ t: s.t, phase: s.phase, safety: s.safety, supply: s.supply, chef: s.chef.action, gas: s.gas, temp: s.temp, tilt: s.tilt, flow: s.flow, kg: s.cylinderKg, x: s.chef.x, z: s.chef.z });
  }
  return { ...run, samples, events: s.events.map((e) => ({ t: e.t, kind: e.kind, text: e.text })) };
}

if (process.argv[1]?.endsWith('fixtures.ts')) {
  writeFileSync(new URL('../fixtures/traces.json', import.meta.url), JSON.stringify(RUNS.map(trace)));
  console.log('fixtures written', RUNS.length, runScenario('with', 1).t);
}

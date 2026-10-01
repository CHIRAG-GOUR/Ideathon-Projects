import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenario, createState, step, levelOf, headline, CONFIG } from '../src/engine';
import { RUNS, trace } from '../src/fixtures';

const at = (s: ReturnType<typeof runScenario>, kind: string) => s.events.find((e) => e.kind === kind)?.t ?? NaN;

test('baseline readings match the product brief', () => {
  const s = createState('with');
  assert.equal(s.gas.toFixed(2), '0.04');
  assert.equal(s.temp.toFixed(1), '25.3');
  assert.equal(s.tilt.toFixed(1), '0.4');
  assert.equal(s.safety, 'NORMAL');
  assert.equal(createState('without').safety, 'UNMONITORED');
});

test('WITHOUT dock: leak → gas rising → danger → chef leaves → simulated incident → recovery', () => {
  const s = runScenario('without', 40);
  const g = (t: number) => s.history.find((h) => Math.abs(h.t - t) < 1e-6)!.gas;
  assert.deepEqual([8, 12, 16, 20, 24].map((t) => Number(g(t).toFixed(2))), [0.04, 0.12, 0.29, 0.52, 0.8]);
  assert.ok(at(s, 'leak_introduced') === 8);
  assert.ok(at(s, 'danger') < at(s, 'chef_fleeing') && at(s, 'chef_fleeing') < at(s, 'chef_exited') && at(s, 'chef_exited') < at(s, 'incident'));
  assert.ok(at(s, 'incident') > 24 && at(s, 'incident') < 25.5);
  assert.equal(s.outcome, 'ESCALATION');
  assert.equal(s.phase, 'RECOVERY');
  assert.ok(!s.events.some((e) => e.kind === 'warning' || e.kind === 'shutoff'), 'no early warning without the dock');
});

test('WITH dock: anomaly → warning → simulated shutoff → isolated → contained → whew, no incident', () => {
  const s = runScenario('with', 40);
  const order = ['anomaly', 'warning', 'shutoff', 'isolated', 'chef_exited', 'contained', 'relieved'].map((k) => at(s, k));
  order.forEach((t, i) => assert.ok(Number.isFinite(t) && (i === 0 || t >= order[i - 1]), `order at ${i}: ${order}`));
  assert.ok(at(s, 'warning') <= 12.5 && at(s, 'isolated') <= 15);
  assert.equal(s.outcome, 'CONTAINED');
  assert.equal(s.supply, 'ISOLATED');
  assert.equal(s.gas.toFixed(2), '0.04');
  assert.equal(s.temp.toFixed(1), '25.4');
  assert.equal(s.tilt.toFixed(1), '0.4');
  assert.equal(s.safety, 'SAFE');
  assert.ok(!s.events.some((e) => e.kind === 'incident'));
  assert.ok(Math.max(...s.history.map((h) => h.gas)) < CONFIG.thresholds.gas.critical, 'contained before critical');
});

test('same inputs → same outputs (deterministic)', () => {
  assert.deepEqual(JSON.stringify(runScenario('with', 30).events), JSON.stringify(runScenario('with', 30).events));
});

test('fault injection: temperature, tilt and unusual usage each trigger the dock', () => {
  const heat = runScenario('with', 30, [{ at: 2, fault: 'heat' }], 'free');
  assert.ok(heat.events.some((e) => e.text.startsWith('TEMPERATURE ANOMALY')) && heat.supply === 'ISOLATED');
  const tilt = runScenario('with', 20, [{ at: 2, fault: 'tilt' }], 'free');
  assert.ok(tilt.events.some((e) => e.text.startsWith('TILT ANOMALY')) && tilt.supply === 'ISOLATED');
  assert.equal(tilt.outcome, 'NONE', 'not contained while the cylinder is still tilted');
  const usage = runScenario('with', 20, [{ at: 2, fault: 'usage' }], 'free');
  assert.ok(usage.events.some((e) => e.kind === 'warning') && usage.supply === 'ISOLATED');
  const cleared = runScenario('with', 40, [{ at: 2, fault: 'tilt' }, { at: 9, fault: 'clear' }], 'free');
  assert.equal(cleared.outcome, 'CONTAINED');
});

test('without the dock, a tilt fault silently causes a leak and the incident follows', () => {
  const s = runScenario('without', 45, [{ at: 2, fault: 'tilt' }], 'free');
  assert.ok(s.events.some((e) => e.text.includes('tilt strains')));
  assert.equal(s.outcome, 'ESCALATION');
});

test('thresholds and headline text', () => {
  assert.equal(levelOf('gas', 0.04), 0);
  assert.equal(levelOf('gas', 0.12), 2);
  assert.equal(levelOf('temp', 56), 3);
  const s = createState('with');
  for (let i = 0; i < 260; i++) step(s);
  assert.match(headline(s), /SHUTOFF|ISOLATED|WARNING/);
});

test('fixtures are up to date (Android parity reference)', () => {
  const saved = readFileSync(new URL('../fixtures/traces.json', import.meta.url), 'utf8');
  assert.equal(saved, JSON.stringify(RUNS.map(trace)), 'run: npm run fixtures');
});

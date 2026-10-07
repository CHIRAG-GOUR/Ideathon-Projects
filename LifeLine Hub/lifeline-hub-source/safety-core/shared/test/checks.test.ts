import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkState, confirmPlan, nextTransition, startPlan, stopPlan } from '../src/checks';

const T0 = Date.parse('2026-10-01T10:00:00Z');
const min = 60_000;
const plan = () => startPlan({ label: 'Working late', intervalMin: 30, graceMin: 5, policy: 'notify', contactIds: ['a'] }, T0);

test('check state machine: WAITING → DUE → WARNING → ESCALATED on the timestamps', () => {
  const p = plan();
  assert.equal(checkState(p, T0), 'WAITING');
  assert.equal(checkState(p, T0 + 29 * min), 'WAITING');
  assert.equal(checkState(p, T0 + 30 * min), 'DUE');
  assert.equal(checkState(p, T0 + 35 * min), 'WARNING');
  assert.equal(checkState(p, T0 + 39 * min), 'WARNING');
  assert.equal(checkState(p, T0 + 40 * min), 'ESCALATED');
});

test('confirming resets the timer from the moment of confirmation', () => {
  const c = confirmPlan(plan(), T0 + 33 * min);
  assert.equal(checkState(c, T0 + 33 * min), 'WAITING');
  assert.equal(c.nextDueAt, new Date(T0 + 63 * min).toISOString());
  assert.equal(c.escalatedAt, null);
});

test('escalated stays escalated until confirmed; stopped is OFF', () => {
  const e = { ...plan(), escalatedAt: new Date(T0 + 40 * min).toISOString(), escalatedBy: 'device' as const };
  assert.equal(checkState(e, T0 + 41 * min), 'ESCALATED');
  assert.equal(checkState(confirmPlan(e, T0 + 45 * min), T0 + 45 * min), 'WAITING');
  assert.equal(checkState(stopPlan(plan(), T0), T0 + 31 * min), 'OFF');
  assert.equal(checkState(null), 'OFF');
});

test('next transition times for countdowns', () => {
  const p = plan();
  assert.deepEqual(nextTransition(p, T0), { state: 'DUE', at: T0 + 30 * min });
  assert.deepEqual(nextTransition(p, T0 + 31 * min), { state: 'WARNING', at: T0 + 35 * min });
  assert.deepEqual(nextTransition(p, T0 + 36 * min), { state: 'ESCALATED', at: T0 + 40 * min });
  assert.equal(nextTransition(p, T0 + 41 * min), null);
});

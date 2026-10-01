import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialSos, isEmergency, sosReducer, type SosAction, type SosMachine } from '../src/sos';

const run = (acts: SosAction[], s: SosMachine = initialSos) => acts.reduce(sosReducer, s);
const loc = { latitude: 28.6, longitude: 77.2, accuracy: 10, altitude: null, speed: null, heading: null, timestamp: '2026-10-01T10:00:00Z' };
const start: SosAction = { type: 'ACTIVATED', sosId: 'abcdefghijklmnop', startedAt: '2026-10-01T10:00:00Z', contacts: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };

test('releasing early never activates', () => {
  const s = run([{ type: 'PRESS' }, { type: 'RELEASE' }]);
  assert.equal(s.phase, 'IDLE');
  assert.equal(s.holdCancelled, true);
});

test('only confirmed results move the SOS to LIVE', () => {
  let s = run([start]);
  assert.equal(s.phase, 'LOCATING');
  s = run([{ type: 'LOCATION', location: loc }], s);
  assert.equal(s.phase, 'ALERTING');
  s = run([{ type: 'CONTACT', id: 'a', state: 'ok', detail: 'SMS sent' }], s);
  assert.equal(s.phase, 'ALERTING');
  s = run([{ type: 'CONTACT', id: 'b', state: 'ok', detail: 'SMS sent' }], s);
  assert.equal(s.phase, 'LIVE');
});

test('a failed contact is shown as a partial alert, never as success', () => {
  const s = run([start, { type: 'LOCATION', location: loc }, { type: 'CONTACT', id: 'a', state: 'ok', detail: '' }, { type: 'CONTACT', id: 'b', state: 'failed', detail: 'Unable to notify this contact.' }]);
  assert.equal(s.phase, 'ALERT_PARTIAL');
});

test('location unavailable and offline are explicit states', () => {
  assert.equal(run([start, { type: 'LOCATION_FAILED' }]).phase, 'LOCATION_UNAVAILABLE');
  const s = run([start, { type: 'LOCATION', location: loc }, { type: 'CONTACT', id: 'a', state: 'ok', detail: '' }, { type: 'CONTACT', id: 'b', state: 'queued', detail: '' }, { type: 'NETWORK', network: 'offline' }]);
  assert.equal(s.phase, 'OFFLINE');
});

test('activation is idempotent and ending needs confirmation', () => {
  let s = run([start, { type: 'LOCATION', location: loc }]);
  const again = sosReducer(s, { ...start, sosId: 'zzzzzzzzzzzzzzzz' } as SosAction);
  assert.equal(again.sosId, 'abcdefghijklmnop');
  s = run([{ type: 'END_REQUEST' }], s);
  assert.equal(s.phase, 'RESOLVING');
  assert.ok(isEmergency(s.phase));
  s = run([{ type: 'KEEP_ACTIVE' }], s);
  assert.notEqual(s.phase, 'RESOLVING');
  assert.equal(run([{ type: 'RESOLVED', outcome: 'safe' }], s).phase, 'SAFE');
});

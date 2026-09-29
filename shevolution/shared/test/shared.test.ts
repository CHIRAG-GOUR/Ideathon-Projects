import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialSos, sosReducer, type SosAction, type SosMachine } from '../src/sos';
import { SMS_TEMPLATES, fillSms } from '../src/message';
import { EmergencyNumberService } from '../src/emergency';
import { accuracyLabel } from '../src/geo';
import type { EmergencyLocation } from '../src/types';

const run = (acts: SosAction[], s: SosMachine = initialSos) => acts.reduce(sosReducer, s);
const loc = (extra: Partial<EmergencyLocation> = {}): EmergencyLocation => ({ latitude: 28.6315, longitude: 77.2167, accuracy: 12, altitude: null, speed: null, heading: null, timestamp: '2026-09-29T10:00:00.000Z', ...extra });
const act: SosAction = { type: 'ACTIVATED', sosId: 'abc', startedAt: '2026-09-29T10:00:00.000Z', contacts: [{ id: 'm', name: 'Mom' }, { id: 'b', name: 'Bro' }] };

test('releasing before 3 s cancels without triggering', () => {
  const s = run([{ type: 'PRESS' }, { type: 'RELEASE' }]);
  assert.equal(s.phase, 'IDLE');
  assert.equal(s.holdCancelled, true);
  assert.equal(s.sosId, null);
});

test('activation is idempotent: a second activation keeps the same SOS', () => {
  const s = run([{ type: 'PRESS' }, act, { ...act, sosId: 'other' }]);
  assert.equal(s.sosId, 'abc');
  assert.equal(s.phase, 'LOCATING');
});

test('phases follow confirmed results only', () => {
  let s = run([act, { type: 'LOCATION', location: loc() }]);
  assert.equal(s.phase, 'ALERTING');
  s = run([{ type: 'CONTACT', id: 'm', state: 'ok', detail: 'sent' }], s);
  assert.equal(s.phase, 'ALERTING'); // Bro still pending
  s = run([{ type: 'CONTACT', id: 'b', state: 'failed', detail: 'no signal' }], s);
  assert.equal(s.phase, 'ALERT_PARTIAL');
  s = run([{ type: 'CONTACT', id: 'b', state: 'ok', detail: 'sent' }], s);
  assert.equal(s.phase, 'LIVE');
  s = run([{ type: 'NETWORK', network: 'offline' }], s);
  assert.equal(s.phase, 'OFFLINE');
});

test('location failure does not stop the SOS', () => {
  const s = run([act, { type: 'LOCATION_FAILED' }]);
  assert.equal(s.phase, 'LOCATION_UNAVAILABLE');
});

test('ending requires resolving; keep-active returns to the live phase', () => {
  let s = run([act, { type: 'LOCATION', location: loc() }, { type: 'CONTACT', id: 'm', state: 'ok', detail: '' }, { type: 'CONTACT', id: 'b', state: 'ok', detail: '' }, { type: 'END_REQUEST' }]);
  assert.equal(s.phase, 'RESOLVING');
  s = run([{ type: 'KEEP_ACTIVE' }], s);
  assert.equal(s.phase, 'LIVE');
  s = run([{ type: 'END_REQUEST' }, { type: 'RESOLVED', outcome: 'safe' }], s);
  assert.equal(s.phase, 'SAFE');
});

test('SOS SMS: compact, honest, plain ASCII, live link only when given', () => {
  const body = fillSms(SMS_TEMPLATES.sos, { name: 'Aanya', location: loc(), time: '29 Sept, 3:30 pm IST', emergency: '112', liveUrl: 'https://shevolution-ideathon.web.app/e/TOKEN1234567890abcd' });
  assert.equal(
    body,
    'SOS ALERT\nAanya may be in danger and needs help.\nLocation: https://maps.google.com/?q=28.63150,77.21670\nLat 28.63150 Lng 77.21670 (±12 m)\nTime: 29 Sept, 3:30 pm IST\nLive location: https://shevolution-ideathon.web.app/e/TOKEN1234567890abcd\nPlease call Aanya and call 112 if needed.\n- Shevolution',
  );
  assert.ok(!/police (were|have been) notified/i.test(body));
  const noLive = fillSms(SMS_TEMPLATES.sos, { name: 'Aanya', location: loc({ lastKnown: true }), time: 't', emergency: '112' });
  assert.ok(noLive.includes('Last known location: '));
  assert.ok(!noLive.includes('Live location'));
  const none = fillSms(SMS_TEMPLATES.sos, { name: 'Aanya', location: null, time: 't', emergency: '112' });
  assert.ok(none.includes('Location: not available yet'));
});

test('emergency numbers by region, India first, no blanket 112 assumption', () => {
  assert.equal(EmergencyNumberService.forRegion('IN').primary.number, '112');
  assert.equal(EmergencyNumberService.forRegion('us').primary.number, '911');
  assert.equal(EmergencyNumberService.forRegion('GB').primary.number, '999');
  assert.equal(EmergencyNumberService.forRegion('ZZ').region, 'XX');
  assert.equal(EmergencyNumberService.forRegion('IN').authorityIntegration, null);
  assert.ok(EmergencyNumberService.isEmergencyNumber('112'));
  assert.ok(!EmergencyNumberService.isEmergencyNumber('+919876543210'));
});

test('accuracy labels never present last-known as current', () => {
  assert.equal(accuracyLabel(loc({ lastKnown: true })), 'last_known');
  assert.equal(accuracyLabel(loc({ accuracy: 450 })), 'limited');
  assert.equal(accuracyLabel(loc()), 'good');
  assert.equal(accuracyLabel(null), 'none');
});

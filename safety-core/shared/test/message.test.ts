import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, fillMessage, liveUrl } from '../src/message';
import { EmergencyNumberService } from '../src/emergency';

const loc = { latitude: 28.631531, longitude: 77.216712, accuracy: 12, altitude: null, speed: null, heading: null, timestamp: '2026-10-01T10:00:00Z' };

test('SOS text carries name, location, coordinates, accuracy, area, live link and brand', () => {
  const t = fillMessage(TEMPLATES.sos, { brand: 'She Shield', name: 'Priya', location: loc, area: 'Connaught Place', time: '3:30 pm', emergency: '112', liveUrl: liveUrl('https://she-shield-app.web.app', 'tok_abcdefghijklmnop') });
  for (const part of ['I NEED HELP', 'Priya', 'maps', '28.63153', '77.21671', '±12 m', 'Connaught Place', '/live/tok_abcdefghijklmnop', '112', '- She Shield SOS']) assert.ok(t.includes(part), `missing ${part}\n${t}`);
});

test('live links carry only an opaque token — no name or coordinates', () => {
  const u = liveUrl('https://fortiva-safecheck.web.app', 'Xy_123456789abcdefgh');
  assert.equal(u, 'https://fortiva-safecheck.web.app/live/Xy_123456789abcdefgh');
  assert.ok(!/[?&](p|n|lat|lng)=/.test(u));
});

test('missing location is said plainly, last-known is labelled', () => {
  assert.ok(fillMessage(TEMPLATES.sos, { brand: 'X', name: 'A', location: null, time: '', emergency: '112', liveUrl: null }).includes('not available yet'));
  assert.ok(fillMessage(TEMPLATES.sos, { brand: 'X', name: 'A', location: { ...loc, lastKnown: true }, time: '', emergency: '112', liveUrl: null }).includes('Last known location'));
});

test('messages never claim the police were notified', () => {
  for (const [k, tpl] of Object.entries(TEMPLATES)) {
    const t = fillMessage(tpl, { brand: 'X', name: 'A', location: loc, time: '', emergency: '112', liveUrl: null, label: 'L', due: 'D' });
    assert.ok(!/police (have been|were|was) (notified|alerted|informed)/i.test(t), k);
  }
});

test('India-first emergency numbers, with a GSM fallback', () => {
  const ind = EmergencyNumberService.forRegion('IN');
  assert.equal(ind.primary.number, '112');
  assert.deepEqual(ind.others.map((o) => o.number), ['181', '1091', '108', '101']);
  assert.equal(ind.authorityIntegration, null);
  assert.equal(EmergencyNumberService.forRegion('ZZ').primary.number, '112');
});

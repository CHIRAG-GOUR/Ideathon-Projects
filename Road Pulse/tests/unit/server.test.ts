import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAuthority } from '../../src/server/authority/router';
import { parseNominatim } from '../../src/server/geocode';
import { formatId } from '../../src/server/ids';
import { reportText } from '../../src/server/authority/adapters/types';
import type { Address, RoadAuthority, RoadHazard } from '../../src/types';

const addr = (o: Partial<Address> = {}): Address => ({ road: 'Delhi Road', locality: 'Shastri Nagar', city: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh', country: 'India', countryCode: 'IN', postcode: '250004', displayName: 'Delhi Road, Meerut', provider: 'test', ...o });
const auth = (o: Partial<RoadAuthority>): RoadAuthority => ({ id: 'x', name: 'X', jurisdiction: 'X', submissionMethod: 'manual', enabled: true, ...o });

test('authority routing picks the most specific matching area', () => {
  const list = [
    auth({ id: 'state', state: 'Uttar Pradesh', country: 'India' }),
    auth({ id: 'city', city: 'Meerut', state: 'Uttar Pradesh' }),
    auth({ id: 'other-city', city: 'Lucknow', state: 'Uttar Pradesh' }),
  ];
  assert.equal(matchAuthority(addr(), list)?.id, 'city');
  assert.equal(matchAuthority(addr({ city: 'Ghaziabad' }), list)?.id, 'state');
  assert.equal(matchAuthority(addr({ state: 'Bihar', city: 'Patna' }), list), null, 'no match → no authority (never guessed)');
  assert.equal(matchAuthority(null, list), null, 'no address → no routing');
  assert.equal(matchAuthority(addr(), [auth({ id: 'off', city: 'Meerut', enabled: false })]), null, 'disabled authorities are ignored');
  assert.equal(matchAuthority(addr({ city: 'Meerut Municipal Corporation' }), list)?.id, 'city', 'tolerates common suffixes');
});

test('Nominatim reverse-geocode parsing (and failure → null, never an invented address)', () => {
  const a = parseNominatim({ display_name: 'Delhi Road, Meerut, UP, India', address: { road: 'Delhi Road', suburb: 'Shastri Nagar', city: 'Meerut', state_district: 'Meerut', state: 'Uttar Pradesh', country: 'India', country_code: 'in', postcode: '250004' } });
  assert.equal(a?.city, 'Meerut');
  assert.equal(a?.countryCode, 'IN');
  assert.equal(a?.locality, 'Shastri Nagar');
  assert.equal(parseNominatim({ error: 'Unable to geocode' }), null);
  assert.equal(parseNominatim(null), null);
});

test('report IDs look like RP-2026-001842', () => {
  assert.equal(formatId('RP', 2026, 1842), 'RP-2026-001842');
  assert.equal(formatId('VD', 2026, 17), 'VD-2026-000017');
});

test('authority message states facts and labels AI estimates', () => {
  const r = { id: 'RP-2026-000001', source: 'citizen', latitude: 28.9845, longitude: 77.7064, locationAccuracy: 8.4, locationAdjusted: false, address: addr(), street: null, createdAt: '2026-09-28T10:00:00.000Z', aiConfirmed: true, confidence: 0.93, severity: 'high', severityEstimated: true, notes: 'Near the intersection', groupSize: 1 } as unknown as RoadHazard;
  const t = reportText(r, 'https://roadpulse-ideathon.web.app');
  assert.match(t, /RP-2026-000001/);
  assert.match(t, /28\.984500, 77\.706400 \(±8 m\)/);
  assert.match(t, /confidence 93%/);
  assert.match(t, /AI-estimated/);
  const manual = reportText({ ...r, aiConfirmed: false, confidence: null, severity: 'unknown', severityEstimated: false } as RoadHazard, 'x');
  assert.match(manual, /not confirmed — reporter's own observation/);
});

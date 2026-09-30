// End-to-end: API + security rules + SMS fallback + live-link access, against the emulators.
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { account, api, check, done, fake, fsGet, fsList, fsSet, wipe, HOST } from './helpers.mjs';

const rid = (n = 16) => randomBytes(n).toString('base64url');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();
const fix = (i = 0) => ({ latitude: 28.6315 + i * 0.0002, longitude: 77.2167 + i * 0.0001, accuracy: 12, altitude: null, speed: 1.1, heading: 40, timestamp: new Date(Date.now() - (5 - i) * 10_000).toISOString(), provider: 'gps' });

await wipe();
const owner = await account('aanya@shev.test');
const mom = await account('mom@shev.test');
const stranger = await account('stranger@shev.test');

// --- Profile and Safety Circle through the client SDK path (security rules apply) ---
const profile = { name: 'Aanya', phone: '+919800000001', email: 'aanya@shev.test', profile: { shareMedical: true, bloodGroup: 'B+' }, settings: { sound: true, vibration: true, retentionDays: 30, region: 'IN', escalateAfterMin: 5, trackingIntervalSec: 10, autoCallContactId: null, discreet: false }, createdAt: now() };
check('owner can write own profile', (await fsSet(`users/${owner.uid}`, profile, owner.token)) === 200);
check('another user cannot read the profile', (await fsGet(`users/${owner.uid}`, stranger.token)).status === 403);
const contact = (name, phone, email, priority) => ({ name, phone, email, relationship: priority === 1 ? 'Mother' : 'Sibling', priority, channels: { sms: true, live: true, call: false }, verified: false, linkedUid: null, createdAt: now() });
check('owner adds contacts', (await fsSet(`users/${owner.uid}/contacts/mom`, contact('Mom', '+919800000002', 'mom@shev.test', 1), owner.token)) === 200 && (await fsSet(`users/${owner.uid}/contacts/bro`, contact('Brother', '+919800000003', null, 2), owner.token)) === 200);
check('client cannot mark a contact verified', (await fsSet(`users/${owner.uid}/contacts/bro`, { ...contact('Brother', '+919800000003', null, 2), verified: true }, owner.token)) === 403);

// --- Contact verification: only the matching, verified identity can accept ---
const inv = await api('/contacts/invite', { contactId: 'mom' }, { token: owner.token });
const invToken = inv.body.url?.split('/join/')[1];
check('invite link is opaque', inv.status === 200 && /^[A-Za-z0-9_-]{20,}$/.test(invToken ?? '') && !inv.body.url.includes(owner.uid));
const info = await api(`/invite?token=${invToken}`);
check('invite shows masked contact details only', info.body.ownerName === 'Aanya' && info.body.phoneHint?.endsWith('002') && !info.body.phoneHint.includes('98000'));
check('a different person cannot accept', (await api('/invite/accept', { token: invToken }, { token: stranger.token })).status === 403);
check('the real contact (verified email) accepts', (await api('/invite/accept', { token: invToken }, { token: mom.token })).status === 200);
const momDoc = (await fsGet(`users/${owner.uid}/contacts/mom`)).data;
check('contact is verified and linked by the server', momDoc.verified === true && momDoc.linkedUid === mom.uid);

// --- Device registration (key stored hashed) ---
const reg = await api('/device/register', { label: 'Android' }, { token: owner.token });
const device = reg.body;
const devDoc = (await fsGet(`devices/${device.deviceId}`)).data;
check('device key is stored only as a hash', devDoc.keyHash === sha(device.deviceKey) && !JSON.stringify(devDoc).includes(device.deviceKey));
check('unknown device is rejected', (await api('/sos/sync', {}, { device: { deviceId: rid(), deviceKey: rid(32) } })).status === 401);

// --- SOS sync: phone texted Mom itself; its text to Brother failed -> provider sends it, once ---
const sosId = rid();
const momToken = rid(18), broToken = rid(18);
const startedAt = new Date(Date.now() - 60_000).toISOString();
const fixes = [fix(0), fix(1)]; // the phone re-sends the same fixes until acknowledged
const payload = (over = {}) => ({
  sosId, startedAt, status: 'active', endedAt: null,
  locations: fixes,
  shareTokens: [{ contactId: 'mom', tokenHash: sha(momToken) }, { contactId: 'bro', tokenHash: sha(broToken) }],
  deviceSms: [{ contactId: 'mom', status: 'submitted', at: now(), via: 'device' }, { contactId: 'bro', status: 'failed', at: null, via: 'device' }],
  battery: 64, network: 'online', region: 'IN', ...over,
});
const s1 = await api('/sos/sync', payload(), { device });
check('SOS created', s1.status === 200 && s1.body.status === 'active', JSON.stringify(s1.body).slice(0, 200));
check('Mom: alerted by the phone', s1.body.alerts?.mom?.sms.status === 'submitted' && s1.body.alerts.mom.sms.via === 'device' && s1.body.alerts.mom.live === 'shared');
check('Brother: server SMS fallback, recorded as submitted (not delivered)', s1.body.alerts?.bro?.sms.via === 'provider' && s1.body.alerts.bro.sms.status === 'submitted');
check('Brother is unverified: no live location', s1.body.alerts?.bro?.live === 'not_verified');
let log = await fake();
check('provider SMS text has location, no live link for unverified contact', log.sms.length === 1 && log.sms[0].to === '+919800000003' && log.sms[0].body.includes('maps.google.com') && !log.sms[0].body.includes('/e/'));
const s2 = await api('/sos/sync', payload(), { device });
log = await fake();
const locs = await fsList(`sosEvents/${sosId}/locations`);
check('re-sync is idempotent: no second alert, no duplicate fixes', s2.status === 200 && log.sms.length === 1 && locs.docs.length === 2, `sync ${s2.status}, sms ${log.sms.length}, fixes ${locs.docs.length}`);
check('medical info shared only because it was switched on', (await fsGet(`sosEvents/${sosId}`)).data.profile?.bloodGroup === 'B+');

// --- Twilio delivery receipt (signed) ---
const url = `${HOST}/api/sms/status`, params = { MessageSid: log.sms[0].sid, MessageStatus: 'delivered' };
const sig = createHmac('sha1', 'test-token').update(url + Object.keys(params).sort().map((k) => k + params[k]).join('')).digest('base64');
const cb = (s) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': s }, body: new URLSearchParams(params) });
check('unsigned delivery receipt is rejected', (await cb('bad')).status === 403);
await cb(sig);
check('signed receipt marks Brother "delivered"', (await fsGet(`sosEvents/${sosId}`)).data.alerts.bro.sms.status === 'delivered');

// --- Live-location access ---
const viewer = await account(null, { anonymous: true });
const nosy = await account(null, { anonymous: true });
check('SOS is not publicly readable', (await fsGet(`sosEvents/${sosId}`, nosy.token)).status === 403);
check('unverified contact’s token never works', (await api('/track/join', { token: broToken }, { token: nosy.token })).status === 410);
check('random token rejected', (await api('/track/join', { token: rid(18) }, { token: nosy.token })).status === 410);
const join = await api('/track/join', { token: momToken }, { token: viewer.token });
check('Mom’s link opens the SOS', join.status === 200 && join.body.sosId === sosId);
const vEvent = await fsGet(`sosEvents/${sosId}`, viewer.token), vTrail = await fsList(`sosEvents/${sosId}/locations`, viewer.token);
check('link holder can read event and trail', vEvent.status === 200 && vTrail.docs.length === 2, `event ${vEvent.status}, trail ${vTrail.status}/${vTrail.docs.length}`);
check('linked contact can read via Safety Circle', (await fsGet(`sosEvents/${sosId}`, mom.token)).status === 200);
check('stranger still cannot read', (await fsGet(`sosEvents/${sosId}`, stranger.token)).status === 403);

// --- Responding and chat ---
const r1 = await api('/sos/respond', { sosId, responding: true, shareLocation: true, location: fix(3) }, { token: viewer.token });
check('contact responds with location', r1.status === 200);
check('stranger cannot respond', (await api('/sos/respond', { sosId, responding: true, shareLocation: false, location: null }, { token: stranger.token })).status === 403);
const s3 = await api('/sos/sync', payload(), { device });
check('phone learns "Mom is responding"', s3.body.status === 'responding' && s3.body.responders.includes('Mom'));
await api('/sos/message', { sosId, text: "I'm coming." }, { token: viewer.token });
await api('/sos/message', { sosId, text: 'Please hurry' }, { token: owner.token });
const msgs = (await fsList(`sosEvents/${sosId}/messages`, owner.token)).docs;
check('emergency chat works both ways with real names', msgs.length === 2 && msgs.some((m) => m.name === 'Mom') && msgs.some((m) => m.name === 'Aanya'));

// --- Removing a contact cuts access immediately ---
check('owner cannot delete a contact directly (must go through API)', (await fetch(`http://127.0.0.1:8080/v1/projects/demo-shevolution/databases/shevolution/documents/users/${owner.uid}/contacts/mom`, { method: 'DELETE', headers: { Authorization: `Bearer ${owner.token}` } })).status === 403);
await api('/contacts/remove', { contactId: 'mom' }, { token: owner.token });
check('removed contact loses link access', (await fsGet(`sosEvents/${sosId}`, viewer.token)).status === 403 && (await api('/track/join', { token: momToken }, { token: viewer.token })).status === 410);
check('removed contact loses Safety Circle access', (await fsGet(`sosEvents/${sosId}`, mom.token)).status === 403);

// --- Ending the SOS ---
const end = await api('/sos/sync', payload({ status: 'safe', endedAt: now() }), { device });
log = await fake();
check('SOS ends as SAFE', end.body.status === 'safe');
check('provider-texted contact is told the outcome', log.sms.some((m) => m.to === '+919800000003' && m.body.includes('SAFE')));
check('ended SOS is readable by its owner only', (await fsGet(`sosEvents/${sosId}`, owner.token)).status === 200 && (await fsGet(`sosEvents/${sosId}`, viewer.token)).status === 403);

// --- Trips via the device key ---
const tripId = rid();
const t = await api('/trips/start', { id: tripId, kind: 'trip', label: 'Going home', destination: { name: 'Home', latitude: 28.64, longitude: 77.22 }, minutes: 30, autoEscalate: true, contactIds: ['bro'] }, { device });
check('phone starts a Safe Trip', t.status === 200 && t.body.status === 'active');
await api('/trips/location', { tripId, location: fix(4) }, { device });
check('trip location stored for its contacts', (await fsGet(`users/${owner.uid}/safetyTrips/${tripId}`)).data.lastLocation?.latitude > 28);

// --- Delete account removes everything ---
check('delete account', (await api('/account/delete', {}, { token: owner.token })).status === 200);
check('all SOS data gone', (await fsList('sosEvents')).docs.filter((d) => d.ownerUid === owner.uid).length === 0 && (await fsGet(`devices/${device.deviceId}`)).status === 404);
check('device key no longer works', (await api('/sos/sync', payload(), { device })).status === 401);

export const artifacts = { sosId };
done('BACKEND');

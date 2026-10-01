// Backend end-to-end test for one app, against the Firebase emulators (auth, firestore, functions, hosting).
//   APP_DIR=sheshield node safety-core/tests/e2e.mjs        (started by run-e2e.sh — test data only ever lives in the emulators)
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const appDir = path.resolve(process.env.APP_DIR);
const fb = JSON.parse(readFileSync(path.join(appDir, 'firebase.json'), 'utf8'));
const env = Object.fromEntries(readFileSync(path.join(appDir, 'functions/.env'), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const PROJECT = process.env.PROJECT;
const DBID = fb.firestore[0].database;
const HOST = `http://127.0.0.1:${fb.emulators.hosting.port}`;
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/${DBID}/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const CHECKS = /checks: true/.test(readFileSync(path.join(appDir, 'functions/src/index.ts'), 'utf8'));

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra && !ok ? ' — ' + extra : ''}`);
  if (!ok) failures++;
};
const toV = (v) => v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(toV) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toV(x)])) } };
const fields = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toV(v)])) });
const hdr = (token) => (token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : ADMIN);
const fsGet = async (p, token) => (await fetch(`${DB}/${p}`, { headers: hdr(token) })).status;
const fsSet = async (p, data, token) => (await fetch(`${DB}/${p}`, { method: 'PATCH', headers: hdr(token), body: JSON.stringify(fields(data)) })).status;
const fsDel = async (p, token) => (await fetch(`${DB}/${p}`, { method: 'DELETE', headers: hdr(token) })).status;
const fsList = async (p, token) => ((await (await fetch(`${DB}/${p}`, { headers: hdr(token) })).json()).documents ?? []);
const post = (p, b) => fetch(`${AUTH}/${p}?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
async function account(email) {
  const up = await post('accounts:signUp', { email, password: 'test-pass-123', returnSecureToken: true });
  await fetch(`${AUTH}/accounts:update?key=demo-key`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ localId: up.localId, emailVerified: true }) });
  const s = await post('accounts:signInWithPassword', { email, password: 'test-pass-123', returnSecureToken: true });
  return { token: s.idToken, uid: s.localId };
}
async function api(p, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(`${HOST}/api${p}`, { method: body === undefined ? 'GET' : 'POST', headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const opaque = () => randomBytes(18).toString('base64url');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();
const loc = (i = 0) => ({ latitude: 28.6315 + i * 1e-4, longitude: 77.2167, accuracy: 9, altitude: null, speed: null, heading: null, timestamp: new Date(Date.now() - (5 - i) * 1000).toISOString(), provider: 'gps' });

await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/${DBID}/documents`, { method: 'DELETE' });
await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
console.log(`\n== ${env.APP_NAME} (${PROJECT}, database "${DBID}") ==`);

const health = await api('/health');
check('API is this app’s own backend', health.status === 200 && health.body.app === env.APP_ID, JSON.stringify(health.body));

const owner = await account('owner@example.com');
const other = await account('other@example.com');
const profile = { name: 'Priya', phone: '+919800000000', email: 'owner@example.com', profile: { shareMedical: false }, settings: { sound: true, vibration: true, escalateAfterMin: 5, retentionDays: 30, trackingIntervalSec: 10, region: 'IN' }, createdAt: now() };
check('rules: owner can save a valid profile', (await fsSet(`users/${owner.uid}`, profile, owner.token)) === 200);
check('rules: invalid profile rejected', (await fsSet(`users/${owner.uid}`, { ...profile, admin: true }, owner.token)) === 403);
check('rules: another user cannot read the profile', (await fsGet(`users/${owner.uid}`, other.token)) === 403);
check('rules: another user cannot write the profile', (await fsSet(`users/${owner.uid}`, profile, other.token)) === 403);
const contact = { name: 'Asha', phone: '+919811111111', email: null, role: 'primary', relationship: 'Sister', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: now() };
check('rules: owner adds a contact', (await fsSet(`users/${owner.uid}/contacts/c1`, contact, owner.token)) === 200);
check('rules: invalid contact rejected', (await fsSet(`users/${owner.uid}/contacts/c2`, { ...contact, phone: '98110' }, owner.token)) === 403);
check('rules: contacts are private', (await fsGet(`users/${owner.uid}/contacts/c1`, other.token)) === 403);
check('rules: contacts are removed only through the API (revokes links)', (await fsDel(`users/${owner.uid}/contacts/c1`, owner.token)) === 403);
check('rules: nobody writes SOS events directly', (await fsSet('sosEvents/x', { ownerUid: owner.uid }, owner.token)) === 403);

// ---- SOS ----
check('API: SOS sync requires sign-in', (await api('/sos/sync', {})).status === 401);
const sosId = opaque(), token = opaque();
const sync = (extra = {}) => api('/sos/sync', { sosId, trigger: 'sos', startedAt: now(), status: 'active', endedAt: null, locations: [loc(0), loc(1)], area: 'Connaught Place', shareTokens: [{ contactId: 'c1', tokenHash: sha(token) }], deviceSms: [], battery: 64, network: 'online', region: 'IN', source: 'web', ...extra }, owner.token);
const s1 = await sync();
check('SOS: persisted and contact alert recorded', s1.status === 200 && !!s1.body.alerts?.c1, JSON.stringify(s1.body));
check('SOS: server SMS reported honestly as not configured', s1.body.alerts?.c1?.sms?.status === 'not_configured', JSON.stringify(s1.body.alerts?.c1));
check('SOS: personal live link shared', s1.body.alerts?.c1?.live === 'shared');
await sync();
check('SOS: re-sync is idempotent (one event)', (await fsList('sosEvents')).length === 1);
check('rules: owner can read their SOS', (await fsGet(`sosEvents/${sosId}`, owner.token)) === 200);
check('rules: others cannot read the SOS', (await fsGet(`sosEvents/${sosId}`, other.token)) === 403);

const live = await api(`/live?t=${token}`);
check('live: contact sees name, location and area with only the token', live.status === 200 && live.body.ownerName === 'Priya' && live.body.lastLocation?.latitude > 28 && live.body.area === 'Connaught Place', JSON.stringify(live.body).slice(0, 200));
check('live: unknown token rejected', (await api(`/live?t=${opaque()}`)).status === 404);
check('live: malformed token rejected', (await api('/live?t=abc')).status >= 400);
check('live: contact can respond', (await api('/live/respond', { token, responding: true, location: loc(3) })).status === 200);
check('live: contact can message', (await api('/live/message', { token, text: 'On my way' })).status === 200);
const live2 = await api(`/live?t=${token}`);
check('live: responder and message visible', live2.body.responders?.some((r) => r.responding) && live2.body.messages?.some((m) => m.text === 'On my way'));
check('owner can reply to contacts', (await api('/sos/message', { sosId, text: 'Near gate 3' }, owner.token)).status === 200);
check('others cannot message into the SOS', (await api('/sos/message', { sosId, text: 'x' }, other.token)).status >= 400);

const end = await sync({ status: 'safe', endedAt: now() });
check('SOS: resolved as safe', end.status === 200);
const after = await api(`/live?t=${token}`);
check('live: after the SOS ends, the link shows only the outcome — no location, trail or phone', after.status === 200 && after.body.status === 'safe' && after.body.lastLocation === null && after.body.trail.length === 0 && after.body.ownerPhone === null, JSON.stringify(after.body).slice(0, 200));
check('live: responding after the end is refused', (await api('/live/respond', { token, responding: true, location: null })).status === 410);

// Removing a contact revokes their link at once.
const sos2 = opaque(), tok2 = opaque();
await api('/sos/sync', { sosId: sos2, trigger: 'discreet', startedAt: now(), status: 'active', endedAt: null, locations: [loc(0)], area: null, shareTokens: [{ contactId: 'c1', tokenHash: sha(tok2) }], deviceSms: [{ contactId: 'c1', status: 'submitted', at: now(), via: 'device' }], battery: null, network: 'online', region: 'IN', source: 'android' }, owner.token);
check('discreet SOS: live link works', (await api(`/live?t=${tok2}`)).body.trigger === 'discreet');
check('contact removal through the API', (await api('/contacts/remove', { contactId: 'c1' }, owner.token)).status === 200);
check('contact removal revokes their live link', (await api(`/live?t=${tok2}`)).status >= 400);

// ---- Periodic checks (She Shield, Fortiva) ----
if (CHECKS) {
  await fsSet(`users/${owner.uid}/contacts/c3`, { ...contact, name: 'Ravi' }, owner.token);
  const st = await api('/checks/start', { plan: { label: 'Working late', intervalMin: 30, graceMin: 5, policy: 'notify', contactIds: ['c3'] }, location: loc(0) }, owner.token);
  check('checks: start', st.status === 200 && st.body.active === true && !!st.body.nextDueAt, JSON.stringify(st.body));
  check('rules: owner reads the plan, others cannot', (await fsGet(`users/${owner.uid}/checks/plan`, owner.token)) === 200 && (await fsGet(`users/${owner.uid}/checks/plan`, other.token)) === 403);
  const cf = await api('/checks/confirm', { location: loc(1) }, owner.token);
  check('checks: confirm resets the timer', cf.status === 200 && Date.parse(cf.body.nextDueAt) > Date.now() + 29 * 60_000);
  check('checks: event from the phone is recorded', (await api('/checks/event', { type: 'warning', at: now(), location: null }, owner.token)).status < 500);
  check('checks: stop', (await api('/checks/stop', {}, owner.token)).status === 200);
  const logTypes = (await fsList(`users/${owner.uid}/checkLog`, owner.token)).map((d) => d.fields.type.stringValue);
  check('checks: history logged', ['started', 'confirmed', 'stopped'].every((t) => logTypes.includes(t)), logTypes.join(','));
  check('rules: plan cannot be written from the client', (await fsSet(`users/${owner.uid}/checks/plan`, { active: false }, owner.token)) === 403);
} else {
  check('no check endpoints in this app', (await api('/checks/start', {}, owner.token)).status === 404);
}

// ---- App-specific data ----
if (env.APP_ID === 'sheshield') {
  check('shield log: valid entry', (await fsSet(`users/${owner.uid}/shieldLog/a`, { type: 'on', at: now() }, owner.token)) === 200);
  check('shield log: invalid entry rejected', (await fsSet(`users/${owner.uid}/shieldLog/b`, { type: 'hack', at: now() }, owner.token)) === 403);
  check('vault: owner saves a note', (await fsSet(`users/${owner.uid}/vault/n1`, { kind: 'note', title: 'Note', text: 'x', path: null, contentType: null, size: null, at: now(), location: null }, owner.token)) === 200);
  check('vault: file path must be inside the owner’s folder', (await fsSet(`users/${owner.uid}/vault/n2`, { kind: 'photo', title: 'P', text: null, path: `users/${other.uid}/vault/x/file`, contentType: 'image/png', size: 1, at: now(), location: null }, owner.token)) === 403);
  check('vault: private to the owner', (await fsGet(`users/${owner.uid}/vault/n1`, other.token)) === 403);
}
if (env.APP_ID === 'fortiva') {
  const inc = { title: 'Followed from bus stop', text: 'Details', category: 'following', happenedAt: now(), place: 'MG Road', location: null, createdAt: now() };
  check('journal: owner saves an entry', (await fsSet(`users/${owner.uid}/incidents/i1`, inc, owner.token)) === 200);
  check('journal: invalid category rejected', (await fsSet(`users/${owner.uid}/incidents/i2`, { ...inc, category: 'x' }, owner.token)) === 403);
  check('journal: private to the owner', (await fsGet(`users/${owner.uid}/incidents/i1`, other.token)) === 403);
}
check('rules: unknown collections are closed', (await fsSet(`users/${owner.uid}/anything/x`, { a: 1 }, owner.token)) === 403 && (await fsSet('public/x', { a: 1 }, owner.token)) === 403);

// ---- Privacy controls ----
check('history delete', (await api('/history/delete', {}, owner.token)).status === 200);
check('history delete removes ended SOS events', (await fsList('sosEvents')).every((d) => ['active', 'responding'].includes(d.fields.status.stringValue)));
check('account delete', (await api('/account/delete', {}, owner.token)).status === 200);
check('account delete removes the profile and contacts', (await fsList(`users/${owner.uid}/contacts`)).length === 0 && (await fsGet(`users/${owner.uid}`)) === 404);
const relog = await post('accounts:signInWithPassword', { email: 'owner@example.com', password: 'test-pass-123', returnSecureToken: true });
check('account delete removes the sign-in', !relog.idToken);

console.log(failures ? `\n${failures} CHECK(S) FAILED for ${env.APP_NAME}` : `\nALL CHECKS PASSED for ${env.APP_NAME}`);
process.exit(failures ? 1 : 0);

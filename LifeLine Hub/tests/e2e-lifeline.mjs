// LifeLine Hub backend checks (Health Vault responder access, helpers, rules), against the Firebase emulators.
//   npm run test:e2e          (wraps: firebase emulators:exec --project demo-lifelinehub "node tests/e2e-lifeline.mjs")
// Test data only ever lives in the emulators.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fb = JSON.parse(readFileSync(path.join(appDir, 'firebase.json'), 'utf8'));
const PROJECT = process.env.PROJECT || 'demo-lifelinehub';
const DBID = fb.firestore[0].database;
const HOST = `http://127.0.0.1:${fb.emulators.hosting.port}`;
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/${DBID}/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra && !ok ? ' — ' + extra : ''}`); if (!ok) failures++; };
const toV = (v) => v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(toV) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toV(x)])) } };
const fields = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toV(v)])) });
const hdr = (token) => (token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : ADMIN);
const fsGet = async (p, token) => (await fetch(`${DB}/${p}`, { headers: hdr(token) })).status;
const fsSet = async (p, data, token) => (await fetch(`${DB}/${p}`, { method: 'PATCH', headers: hdr(token), body: JSON.stringify(fields(data)) })).status;
const fsList = async (p, token) => { const r = await fetch(`${DB}/${p}`, { headers: hdr(token) }); return { status: r.status, docs: (await r.json().catch(() => ({}))).documents ?? [] }; };
const post = (p, b) => fetch(`${AUTH}/${p}?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
async function account(email) {
  const up = await post('accounts:signUp', { email, password: 'test-pass-123', returnSecureToken: true });
  await fetch(`${AUTH}/accounts:update?key=demo-key`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ localId: up.localId, emailVerified: true }) });
  const s = await post('accounts:signInWithPassword', { email, password: 'test-pass-123', returnSecureToken: true });
  return { token: s.idToken, uid: s.localId };
}
async function api(p, body, token, method) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(`${HOST}/api${p}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/${DBID}/documents`, { method: 'DELETE' });
await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
console.log(`\n== LifeLine Hub — Health Vault & helpers (${PROJECT}, database "${DBID}") ==`);

const owner = await account('owner@lifeline.test');
const other = await account('other@lifeline.test');
await fsSet(`users/${owner.uid}`, { name: 'Arjun Sharma' });

// ---- medical profile: owner-only, validated
const med = { bloodGroup: 'B+', allergies: ['Penicillin'], medications: [{ name: 'Salbutamol inhaler', dose: '2 puffs' }], conditions: ['Mild asthma'], emergencyNotes: 'Carries an inhaler', emergencyContact: { name: 'Demo Dad', relationship: 'Father', phone: '+919800000001' }, doctor: { name: 'Dr. Rao', phone: '+919800000002' }, updatedAt: new Date().toISOString() };
check('owner can save their medical profile', (await fsSet(`users/${owner.uid}/medicalProfile/main`, med, owner.token)) === 200);
check('another user cannot read it', (await fsGet(`users/${owner.uid}/medicalProfile/main`, other.token)) === 403);
check('another user cannot write it', (await fsSet(`users/${owner.uid}/medicalProfile/main`, med, other.token)) === 403);
check('unknown fields are rejected', (await fsSet(`users/${owner.uid}/medicalProfile/main`, { ...med, ssn: '123' }, owner.token)) === 403);
check('only the "main" document is allowed', (await fsSet(`users/${owner.uid}/medicalProfile/extra`, med, owner.token)) === 403);

// ---- responder tokens
check('creating a link needs sign-in', (await api('/vault/token', { scope: ['bloodGroup'], minutes: 15 })).status === 401);
check('scope must be from the list', (await api('/vault/token', { scope: ['passwords'], minutes: 15 }, owner.token)).status === 400);
check('expiry is bounded (5–60 min)', (await api('/vault/token', { scope: ['bloodGroup'], minutes: 600 }, owner.token)).status === 400);
const made = await api('/vault/token', { scope: ['bloodGroup', 'allergies', 'emergencyContact'], minutes: 15 }, owner.token);
check('owner creates a scoped, expiring responder link', made.status === 200 && /^[A-Za-z0-9_-]{24,64}$/.test(made.body.token ?? '') && !!made.body.expiresAt, JSON.stringify(made));
const { token, id } = made.body;
const raw = await fsList('responderTokens');
check('the server stores only a hash of the token', raw.docs.length === 1 && !raw.docs[0].name.endsWith(token) && !JSON.stringify(raw.docs[0]).includes(token));
check('clients cannot read the token store', (await fsList('responderTokens', owner.token)).status === 403);
check('owner sees their link list', (await fsGet(`users/${owner.uid}/vaultTokens/${id}`, owner.token)) === 200);
check('another user cannot see it', (await fsGet(`users/${owner.uid}/vaultTokens/${id}`, other.token)) === 403);
check('clients cannot forge a link record', (await fsSet(`users/${owner.uid}/vaultTokens/fake`, { revoked: false }, owner.token)) === 403);

const view = await api(`/responder?t=${token}`);
check('responder sees the scoped fields', view.status === 200 && view.body.bloodGroup === 'B+' && view.body.allergies?.[0] === 'Penicillin' && view.body.emergencyContact?.relationship === 'Father', JSON.stringify(view.body));
check('…and nothing outside the scope', view.body.medications === undefined && view.body.conditions === undefined && view.body.doctor === undefined && view.body.emergencyNotes === undefined);
check('…and only a first name', view.body.firstName === 'Arjun' && !JSON.stringify(view.body).includes('Sharma'));
const logs = await fsList(`users/${owner.uid}/healthAccessLogs`, owner.token);
check('every view is logged for the owner', logs.docs.some((d) => d.fields?.kind?.stringValue === 'responder_view'));
check('clients cannot write the access log', (await fsSet(`users/${owner.uid}/healthAccessLogs/x`, { kind: 'fake' }, owner.token)) === 403);
check('a wrong token is not valid', (await api(`/responder?t=${'x'.repeat(32)}`)).status === 404);

check('another user cannot revoke the link', (await api('/vault/token/revoke', { id }, other.token)).status === 404);
check('owner revokes the link', (await api('/vault/token/revoke', { id }, owner.token)).status === 200);
check('a revoked link stops working', (await api(`/responder?t=${token}`)).status === 410);

// expiry: age a fresh link past its expiry in the store
const second = await api('/vault/token', { scope: ['bloodGroup'], minutes: 5 }, owner.token);
const store = await fsList('responderTokens');
const doc = store.docs.find((d) => d.fields?.id?.stringValue === second.body.id);
await fetch(`http://127.0.0.1:8080/v1/${doc.name}?updateMask.fieldPaths=expiresAt`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify(fields({ expiresAt: new Date(Date.now() - 60_000).toISOString() })) });
check('an expired link stops working', (await api(`/responder?t=${second.body.token}`)).status === 410);

// ---- helpers pilot
check('helper registration needs sign-in', (await api('/helpers/register', { city: 'Delhi', skills: ['first_aid'] })).status === 401);
check('register interest as a LifeLine Helper', (await api('/helpers/register', { city: 'Delhi', skills: ['first_aid', 'cpr'] }, owner.token)).status === 200);
const h = await fetch(`${DB}/lifelineHelpers/${owner.uid}`, { headers: hdr(owner.token) }).then((r) => r.json());
check('…recorded as pending verification (never auto-verified)', h.fields?.status?.stringValue === 'pending_verification');
check('…not visible to other users', (await fsGet(`lifelineHelpers/${owner.uid}`, other.token)) === 403);
check('…and cannot self-verify', (await fsSet(`lifelineHelpers/${owner.uid}`, { status: 'verified' }, owner.token)) === 403);

// ---- account deletion removes LifeLine's top-level records too
check('account deletion', (await api('/account/delete', {}, owner.token)).status === 200);
check('…removes responder tokens', (await fsList('responderTokens')).docs.length === 0);
check('…and the helper record', (await fsGet(`lifelineHelpers/${owner.uid}`)) === 404);

console.log(failures ? `${failures} CHECK(S) FAILED` : 'ALL LIFELINE CHECKS PASSED');
process.exit(failures ? 1 : 0);

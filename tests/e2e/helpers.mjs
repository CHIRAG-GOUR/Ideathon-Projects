// Emulator helpers. All test data lives only in the local emulators (project demo-shevolution).
export const PROJECT = 'demo-shevolution';
export const HOST = 'http://127.0.0.1:5055';
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/shevolution/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

let failures = 0;
export function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}
export const done = (label) => {
  console.log(failures ? `\n${failures} ${label} CHECK(S) FAILED` : `\nALL ${label} CHECKS PASSED`);
  process.exit(failures ? 1 : 0);
};

const toV = (v) =>
  v === null ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(toV) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toV(x)])) } };
const fromV = (v) =>
  'nullValue' in v ? null
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue
  : 'stringValue' in v ? v.stringValue
  : 'timestampValue' in v ? v.timestampValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(fromV)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromV(x)]))
  : undefined;
const fields = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toV(v)])) });
const unpack = (d) => Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, fromV(v)]));

/** Firestore as a signed-in client (security rules apply) or as admin (token = null). */
export async function fsGet(path, token = null) {
  const r = await fetch(`${DB}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : ADMIN });
  return { status: r.status, data: r.ok ? unpack(await r.json()) : null };
}
export async function fsList(path, token = null) {
  const r = await fetch(`${DB}/${path}?pageSize=500`, { headers: token ? { Authorization: `Bearer ${token}` } : ADMIN });
  const j = await r.json();
  return { status: r.status, docs: (j.documents ?? []).map((d) => ({ id: d.name.split('/').pop(), ...unpack(d) })) };
}
export async function fsSet(path, data, token = null) {
  const r = await fetch(`${DB}/${path}`, { method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : ADMIN, body: JSON.stringify(fields(data)) });
  return r.status;
}
export async function wipe() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/shevolution/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch('http://127.0.0.1:4013/__reset');
}

export async function account(email, { verified = true, anonymous = false } = {}) {
  const post = (p, b) => fetch(`${AUTH}/${p}?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  if (anonymous) return (({ idToken, localId }) => ({ token: idToken, uid: localId }))(await post('accounts:signUp', { returnSecureToken: true }));
  const up = await post('accounts:signUp', { email, password: 'test-pass-123', returnSecureToken: true });
  if (verified) await fetch(`${AUTH}/accounts:update?key=demo-key`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ localId: up.localId, emailVerified: true }) });
  const s = await post('accounts:signInWithPassword', { email, password: 'test-pass-123', returnSecureToken: true });
  return { token: s.idToken, uid: s.localId, email };
}

export async function api(path, body, { token, device } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (device) Object.assign(h, { 'X-Device-Id': device.deviceId, 'X-Device-Key': device.deviceKey });
  const r = await fetch(`${HOST}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export const fake = () => fetch('http://127.0.0.1:4013/__log').then((r) => r.json());

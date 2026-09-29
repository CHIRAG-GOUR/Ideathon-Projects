// Test helpers: emulator seeding/reading and generated test images. Test data lives only in the emulators.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PROJECT = 'demo-roadpulse';
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/roadpulse/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

function toValue(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}
function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromValue(x)]));
  return undefined;
}

export async function put(path, data) {
  const res = await fetch(`${DB}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }) });
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`);
}
export async function fs(path) {
  const res = await fetch(`${DB}/${path}`, { headers: OWNER });
  if (!res.ok) return null;
  const j = await res.json();
  return Object.fromEntries(Object.entries(j.fields ?? {}).map(([k, v]) => [k, fromValue(v)]));
}
export async function list(coll) {
  const res = await fetch(`${DB}/${coll}?pageSize=500`, { headers: OWNER });
  const j = await res.json();
  return (j.documents ?? []).map((d) => Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, fromValue(v)])));
}

/** Fresh emulator state + one clearly-labelled TEST authority and the admin allow-list. */
export async function seed() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/roadpulse/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await put('config/admins', { emails: ['admin@roadpulse.test'] });
  await put('authorities/meerut-test', {
    id: 'meerut-test',
    name: 'RoadPulse Test Authority (Meerut)',
    jurisdiction: 'Meerut (test)',
    country: 'India',
    state: 'Uttar Pradesh',
    city: 'Meerut',
    submissionMethod: 'api',
    endpoint: 'http://127.0.0.1:4012/authority/api',
    category: 'Pothole',
    sourceUrl: 'http://127.0.0.1:4012/ (test fixture — not a real authority)',
    enabled: true,
  });
}

/** Test photos: a bright road with a pothole, a dim road, a black frame, and a camera clip. */
export async function gen() {
  const dir = '/tmp/roadpulse-e2e';
  mkdirSync(dir, { recursive: true });
  const out = { bright: `${dir}/road-bright.png`, dim: `${dir}/road-dim.png`, dark: `${dir}/dark.png`, y4m: `${dir}/road-bright.y4m` };
  if (!existsSync(out.y4m)) {
    const py = process.env.PYTHON || 'python3';
    writeFileSync(`${dir}/gen.py`, `
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W,H=1280,720
rng=np.random.default_rng(1)
def road(base):
    a=np.clip(base+rng.normal(0,18,(H,W)),0,255).astype(np.uint8)
    img=Image.fromarray(np.stack([a,a,a],-1),'RGB'); d=ImageDraw.Draw(img)
    for y in range(0,H,90): d.rectangle([W//2-6,y,W//2+6,y+45],fill=(250,235,120))
    d.ellipse([420,470,800,640],fill=(70,62,55)); d.ellipse([460,490,760,620],fill=(45,40,36))
    return img.filter(ImageFilter.GaussianBlur(0.6))
road(175).save('${out.bright}'); road(88).save('${out.dim}')
Image.new('RGB',(800,600),(8,8,8)).save('${out.dark}')
im=Image.open('${out.bright}').convert('YCbCr'); y,cb,cr=[np.array(c) for c in im.split()]
cb=cb.reshape(H//2,2,W//2,2).mean((1,3)).astype(np.uint8); cr=cr.reshape(H//2,2,W//2,2).mean((1,3)).astype(np.uint8)
with open('${out.y4m}','wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\\n'.encode())
    for _ in range(30): f.write(b'FRAME\\n'); f.write(y.tobytes()); f.write(cb.tobytes()); f.write(cr.tobytes())
`);
    execFileSync(py, [`${dir}/gen.py`]);
  }
  return out;
}

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

/** An admin account in the Auth emulator (verified email on the config/admins list). Returns an ID token. */
export async function adminToken(email = 'admin@roadpulse.test', password = 'admin-pass-123', verified = true) {
  let r = await (await fetch(`${AUTH}/accounts:signUp?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) })).json();
  if (r.error) r = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) })).json();
  if (verified) await fetch(`${AUTH}/accounts:update?key=demo-key`, { method: 'POST', headers: OWNER, body: JSON.stringify({ localId: r.localId, emailVerified: true }) });
  const s = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) })).json();
  return s.idToken;
}

export async function anonToken() {
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
  return r.idToken;
}

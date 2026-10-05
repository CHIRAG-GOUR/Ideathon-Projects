// End-to-end against the Firebase emulators (demo project — nothing touches a real Firebase project):
// sign up in the UI → run the safety demo → session + events saved to Firestore → security rules hold.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const PROJECT = process.env.PROJECT || 'demo-lpgdock';
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
let fail = 0;
const check = (n, ok, x = '') => (console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${!ok && x ? ' — ' + x : ''}`), ok || fail++);
const admin = { Authorization: 'Bearer owner' };

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5062/?emulators#/settings', { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.setItem('lpgdock.settings.v1', JSON.stringify({ speed: 2, muted: true, autoSave: true })));
await p.reload({ waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Create an account' }).click();
await p.getByLabel('Name').fill('Demo Judge');
await p.getByLabel('Email').fill('judge@example.com');
await p.getByLabel('Password').fill('secret123');
await p.getByRole('button', { name: 'Create account' }).click();
await p.getByText('Account created.').waitFor({ timeout: 15000 });
check('sign up through the UI', true);
await p.goto('http://localhost:5062/?emulators#/simulation?scenario=with&autostart=1', { waitUntil: 'networkidle' });
await p.getByText('NO SIMULATED BLAST OCCURRED', { exact: true }).first().waitFor({ timeout: 60000 });
check('with-dock demo reaches INCIDENT CONTAINED in the UI', true);
await p.waitForTimeout(3000);

const list = async (c, token) => (await (await fetch(`${DB}/${c}?pageSize=300`, { headers: token ? { Authorization: `Bearer ${token}` } : admin })).json()).documents ?? [];
const sessions = await list('simulationSessions');
check('session saved to Firestore', sessions.length === 1, JSON.stringify(sessions).slice(0, 200));
const s = sessions[0]?.fields ?? {};
check('session outcome CONTAINED', s.outcome?.stringValue === 'CONTAINED');
const events = await list('simulationEvents');
check('events saved to Firestore', events.length >= 8 && events.length === Number(s.eventCount?.integerValue), `${events.length} vs ${s.eventCount?.integerValue}`);
check('user profile saved', (await list('users')).length === 1);

await p.goto('http://localhost:5062/?emulators#/events', { waitUntil: 'networkidle' });
await p.getByText('Saved to account').first().waitFor({ timeout: 10000 }).then(() => check('Events screen shows the cloud save', true), () => check('Events screen shows the cloud save', false));

// Rules: another user cannot read or forge.
const post = (path, body) => fetch(`${AUTH}/${path}?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
const other = await post('accounts:signUp', { email: 'other@example.com', password: 'secret123', returnSecureToken: true });
const sid = sessions[0].name.split('/').pop();
const r1 = await fetch(`${DB}/simulationSessions/${sid}`, { headers: { Authorization: `Bearer ${other.idToken}` } });
check('rules: another user cannot read the session', r1.status === 403, String(r1.status));
const forge = await fetch(`${DB}/simulationSessions?documentId=x1`, { method: 'POST', headers: { Authorization: `Bearer ${other.idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { ownerUid: { stringValue: 'someone-else' }, scenario: { stringValue: 'with' } } }) });
check('rules: cannot write a session for someone else', forge.status === 403, String(forge.status));
const r2 = await fetch(`${DB}/simulationEvents`, { headers: { Authorization: `Bearer ${other.idToken}` } });
check('rules: cannot list other users’ events', r2.status === 403, String(r2.status));
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} CHECK(S) FAILED` : '\nALL FIREBASE E2E CHECKS PASSED');
process.exit(fail ? 1 : 0);

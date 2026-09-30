// Browser tests against the Hosting emulator: the contact's live view, and the phone UI driven through a
// mock of the Android bridge (the real bridge is Java; this checks the UI honours its contract).
import { createHash, randomBytes } from 'node:crypto';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { account, api, check, done, fsSet, wipe, HOST } from './helpers.mjs';

const SHOTS = process.env.SHOTS ?? '/tmp';
const rid = (n = 16) => randomBytes(n).toString('base64url');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();

// ---- Seed an active SOS with a verified contact ----
await wipe();
const owner = await account('aanya@shev.test');
const mom = await account('mom@shev.test');
await fsSet(`users/${owner.uid}`, { name: 'Aanya', phone: '+919800000001', email: null, profile: { shareMedical: false }, settings: { sound: true, vibration: true, retentionDays: 30, region: 'IN' }, createdAt: now() }, owner.token);
await fsSet(`users/${owner.uid}/contacts/mom`, { name: 'Mom', phone: '+919800000002', email: 'mom@shev.test', relationship: 'Mother', priority: 1, channels: { sms: true, live: true, call: false }, verified: false, linkedUid: null, createdAt: now() }, owner.token);
const inv = await api('/contacts/invite', { contactId: 'mom' }, { token: owner.token });
await api('/invite/accept', { token: inv.body.url.split('/join/')[1] }, { token: mom.token });
const device = (await api('/device/register', { label: 'Android' }, { token: owner.token })).body;
const token = rid(18);
const fixes = [0, 1, 2].map((i) => ({ latitude: 28.63153 + i * 0.0003, longitude: 77.21671 + i * 0.0002, accuracy: 12, altitude: null, speed: 1.2, heading: 35, timestamp: new Date(Date.now() - (2 - i) * 15_000).toISOString(), provider: 'gps' }));
await api('/sos/sync', { sosId: rid(), startedAt: new Date(Date.now() - 90_000).toISOString(), status: 'active', endedAt: null, locations: fixes, shareTokens: [{ contactId: 'mom', tokenHash: sha(token) }], deviceSms: [{ contactId: 'mom', status: 'submitted', at: now(), via: 'device' }], battery: 58, network: 'online', region: 'IN' }, { device });

const browser = await chromium.launch();
const errors = [];
const page = async (w = 390, h = 844) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => errors.push(e.message));
  return p;
};

// ---- Contact opens the live-location link ----
const p1 = await page();
await p1.goto(`${HOST}/e/${token}`);
await p1.waitForSelector('text=Aanya needs help', { timeout: 20_000 });
await p1.waitForSelector('text=Recent movement', { timeout: 10_000 }).catch(() => undefined);
const t1 = await p1.textContent('body');
check('live view: who, status and live badge', t1.includes('SOS ALERT') && t1.includes('LIVE'));
check('live view: real coordinates and accuracy', t1.includes('28.63213') && t1.includes('77.21711') && t1.includes('±12 m'));
check('live view: movement trail and battery shown', t1.includes('Recent movement') && t1.includes('Battery 58%'));
check('live view: honest about police', t1.includes('It has not contacted the police'));
check('live view: action buttons', t1.includes('Call Aanya') && t1.includes('Directions') && t1.includes('Call 112') && t1.includes('going to help'));
await p1.click('text=going to help');
await p1.click('text=Respond without location');
await p1.waitForSelector('text=You are responding', { timeout: 10_000 });
check('contact can respond', true);
await p1.screenshot({ path: `${SHOTS}/live-view.png`, fullPage: true });
await p1.close();

const p2 = await page();
await p2.goto(`${HOST}/e/${rid(18)}`);
await p2.waitForSelector('text=expired or was turned off', { timeout: 15_000 });
check('invalid link shows a clear message and 112', (await p2.textContent('body')).includes('Call 112'));
await p2.close();

// ---- Phone UI with a mocked Android bridge ----
const mockBridge = ({ offline }) => {
  const calls = [];
  window.__calls = calls;
  const emit = (e) => setTimeout(() => window.__shevNative && window.__shevNative(JSON.stringify(e)), 0);
  const fix = { latitude: 28.63153, longitude: 77.21671, accuracy: 9, altitude: null, speed: null, heading: null, timestamp: new Date().toISOString(), provider: 'gps' };
  window.ShevolutionNative = {
    invoke(method, args) {
      calls.push([method, JSON.parse(args)]);
      const ok = (o = {}) => JSON.stringify({ ok: true, ...o });
      switch (method) {
        case 'info':
          return ok({ version: 'test', sdk: 34, region: 'IN', directSms: true, permissions: { location: true, notifications: true, sms: true, phone: false, receiveSms: false }, device: { registered: false }, network: offline ? 'offline' : 'online', battery: 80, locationEnabled: true });
        case 'sosState':
          return ok({ active: false });
        case 'sosActivate':
          setTimeout(() => {
            emit({ type: 'sos_location', location: fix });
            emit({ type: 'sos_contact', id: 'c1', state: offline ? 'ok' : 'ok', detail: 'Alerted · SMS sent' });
            emit({ type: 'sos_contact', id: 'c2', state: offline ? 'queued' : 'ok', detail: offline ? 'Waiting for signal' : 'Alerted · SMS delivered' });
            emit({ type: 'sos_live', state: offline ? 'queued' : 'ok', detail: '' });
            emit({ type: 'sos_cloud', state: offline ? 'queued' : 'ok' });
            if (offline) emit({ type: 'network', state: 'offline' });
          }, 300);
          return ok({ sosId: 'SOS123', startedAt: new Date().toISOString(), contacts: [{ id: 'c1', name: 'Mom' }, { id: 'c2', name: 'Brother' }], alreadyActive: false });
        default:
          return ok();
      }
    },
  };
};

async function hold(p, selector, ms) {
  const l = p.locator(selector).first();
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(ms);
  await p.mouse.up();
}
const calls = (p, m) => p.evaluate((m) => window.__calls.filter((c) => c[0] === m), m);

for (const offline of [false, true]) {
  const p = await page();
  await p.addInitScript(mockBridge, { offline });
  await p.goto(`${HOST}/app`);
  await p.waitForSelector('text=Use SOS without an account', { timeout: 20_000 });
  await p.click('text=Use SOS without an account');
  await p.waitForSelector('text=not alone', { timeout: 10_000 });
  const sos = 'button[aria-label^="SOS. Press and hold"]';
  if (!offline) {
    await hold(p, sos, 1200);
    await p.waitForSelector('text=SOS cancelled', { timeout: 3000 });
    check('releasing early shows "SOS cancelled" and sends nothing', (await calls(p, 'sosActivate')).length === 0);
  }
  const t0 = Date.now();
  await hold(p, sos, 3300);
  await p.waitForSelector('text=SOS ACTIVE', { timeout: 5000 });
  check(`${offline ? 'offline: ' : ''}3-second hold enters SOS immediately`, Date.now() - t0 < 4500);
  check(`${offline ? 'offline: ' : ''}native SOS started exactly once`, (await calls(p, 'sosActivate')).length === 1);
  await p.waitForTimeout(800);
  const body = await p.textContent('body');
  if (!offline) {
    check('status list shows confirmed results only', body.includes('LOCKED ±9 m') && body.includes('ALERTED · SMS SENT') && body.includes('SHARING') && body.includes('SIMULATION') && body.includes('Also send on WhatsApp') && body.includes('SYNCED'));
    check('"Help has been alerted." once a contact is confirmed', body.includes('Help has been alerted.'));
    check('coordinates shown', body.includes('28.63153') && body.includes('77.21671'));
    await p.screenshot({ path: `${SHOTS}/app-sos.png`, fullPage: true });
    await hold(p, 'button[aria-label^="End SOS"]', 3300);
    await p.waitForSelector('text=Are you safe?', { timeout: 3000 });
    await p.click("text=I'm safe");
    await p.waitForSelector("text=You're safe", { timeout: 3000 });
    const end = await calls(p, 'sosEnd');
    check('ending needs a hold, then "Are you safe?", then native end', end.length === 1 && end[0][1].outcome === 'safe');
  } else {
    check('offline: honest statuses', body.includes('WAITING FOR SIGNAL') && body.includes('WAITING FOR NETWORK') && body.includes('OFFLINE · QUEUED') && body.includes('OFFLINE'));
    check('offline: no false "Help has been alerted." headline', !body.includes('Help has been alerted.'));
    await p.screenshot({ path: `${SHOTS}/app-sos-offline.png`, fullPage: true });
  }
  await p.close();
}

// ---- Landing ----
const p3 = await page(1280, 900);
await p3.goto(`${HOST}/`);
await p3.waitForSelector('text=Safety should be', { timeout: 15_000 });
check('landing has hero, CTA and 112 section', (await p3.textContent('body')).includes('Get Shevolution') && (await p3.textContent('body')).includes('112 is always one tap away'));
await p3.close();

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
done('UI');

// End-to-end: Live Drive — pairing, real-time detection, server-confirmed events, offline queue, no-GPS honesty.
import { createRequire } from 'module';
import { seed, fs as fsGet, list, gen, adminToken, anonToken } from './helpers.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3002';
const [, , shots] = process.argv;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const api = (path, token, body, method = 'POST') => fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

const img = await gen();
await seed();
const admin = await adminToken();
const nonAdmin = await anonToken();
check((await api('/api/admin/vehicles', nonAdmin, { name: 'Sneaky' })).status === 403, 'only admins can register vehicles');
const reg = await (await api('/api/admin/vehicles', admin, { name: 'Municipal van 07' })).json();
check(reg.ok && reg.data.id.startsWith('veh_') && reg.data.key.length >= 30, 'admin registers a vehicle → device ID + one-time key');
const v0 = await fsGet(`vehicles/${reg.data.id}`);
check(v0 && !JSON.stringify(v0).includes(reg.data.key) && v0.keyHash.length === 64, 'the key is stored only as a hash');
const bad = await fetch(`${BASE}/api/vehicle/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': reg.data.id, 'X-Device-Key': 'x'.repeat(32) }, body: '{}' });
check(bad.status === 401, 'wrong device key is rejected');

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${img.y4m}`] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['camera', 'geolocation'], geolocation: { latitude: 28.99, longitude: 77.71, accuracy: 6 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/live`, { waitUntil: 'load' });
check(await page.evaluate(() => crossOriginIsolated), 'Live Drive is cross-origin isolated (multi-threaded AI)');

// Pair (wrong key first).
await page.click('[data-testid="pair-open"]');
await page.fill('[data-testid="pair-id"]', reg.data.id);
await page.fill('[data-testid="pair-key"]', 'wrong-key-wrong-key-wrong-key');
await page.click('[data-testid="pair-submit"]');
await page.waitForSelector('text=Device key is not valid');
check(true, 'pairing with a wrong key shows the server’s error');
await page.fill('[data-testid="pair-key"]', reg.data.key);
await page.click('[data-testid="pair-submit"]');
await page.waitForSelector('[data-testid="paired"]');
check((await page.textContent('[data-testid="paired"]')).includes('Municipal van 07'), 'paired with the vehicle');

// Drive.
const t0 = Date.now();
await page.click('[data-testid="live-start"]');
await page.waitForFunction(() => Number(document.querySelector('[data-testid="live-overlay"]')?.dataset.count) > 0, null, { timeout: 60000 });
const tBox = Date.now() - t0;
await page.waitForSelector('[data-testid="live-event"][data-state="recorded"]', { timeout: 30000 });
const tRec = Date.now() - t0;
check(true, `boxes after ${tBox} ms, server-confirmed event after ${tRec} ms`);
const evText = (await page.textContent('[data-testid="live-event"]')).replace(/\s+/g, ' ');
const vid = /VD-\d{4}-\d{6}/.exec(evText)?.[0];
check(Boolean(vid) && evText.includes('Report recorded'), `“Report recorded” only with the server’s ID (${vid})`);
check((await page.getAttribute('[data-testid="st-camera"]', 'data-tone')) === 'ok' && (await page.getAttribute('[data-testid="st-gps"]', 'data-tone')) === 'ok' && (await page.getAttribute('[data-testid="st-ai"]', 'data-tone')) === 'ok', 'Camera CONNECTED · GPS LOCKED · AI RUNNING');
check((await page.textContent('[data-testid="system-status"]')).includes('SYSTEM ACTIVE'), 'SYSTEM ACTIVE');
if (shots) await page.screenshot({ path: `${shots}/rp-live-recorded.png` });
const h = vid ? await fsGet(`roadHazards/${vid}`) : null;
check(h?.source === 'vehicle' && h?.deviceId === reg.data.id && h?.imagePath?.startsWith(`vehicle/${reg.data.id}/`) && h?.confidence > 0.5, 'event stored: source vehicle, device ID, confidence, cropped photo');
check(Math.abs(h?.latitude - 28.99) < 1e-6 && h?.locationAccuracy === 6, 'event carries the real GPS fix');
await page.waitForTimeout(1500);
const v1 = await fsGet(`vehicles/${reg.data.id}`);
check(v1?.detections === 1 && v1?.lastSeenAt, 'vehicle detections + last seen updated');
check((await page.locator('[data-testid="live-event"]').count()) === 1, 'a pothole that stays in view is recorded once (tracking)');

// Offline stretch: new position, no network → queued → auto-upload when back online.
await page.click('[data-testid="live-stop"]');
await ctx.setGeolocation({ latitude: 28.995, longitude: 77.715, accuracy: 7 });
await ctx.setOffline(true);
await page.click('[data-testid="live-start"]');
await page.waitForSelector('[data-testid="live-event"][data-state="queued"]', { timeout: 30000 });
check((await page.getAttribute('[data-testid="st-net"]', 'data-tone')) === 'warn', 'offline → event queued on the device');
await ctx.setOffline(false);
await page.waitForFunction(() => document.querySelectorAll('[data-testid="live-event"][data-state="recorded"]').length === 2, null, { timeout: 30000 });
check(true, 'back online → queued event uploaded and confirmed');
const vehicleEvents = (await list('roadHazards')).filter((x) => x.source === 'vehicle');
check(vehicleEvents.length === 2, `2 vehicle events in the database (${vehicleEvents.length})`);
await page.click('[data-testid="live-stop"]');

// No GPS → the pothole is shown but NOT recorded.
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['camera'] });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push(e.message));
await p2.goto(`${BASE}/live`, { waitUntil: 'load' });
await p2.click('[data-testid="live-start"]');
await p2.waitForSelector('[data-testid="live-event"]', { timeout: 60000 });
check((await p2.getAttribute('[data-testid="live-event"]', 'data-state')) === 'no_gps', 'no GPS lock → “not recorded” (coordinates are never invented)');
await ctx2.close();

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL LIVE CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

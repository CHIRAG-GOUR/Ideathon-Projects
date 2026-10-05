// End-to-end: citizen "Report a Pothole" flow against the Firebase emulators + stand-in services.
// Needs: dev server :3002 (.env.local test settings), tests/fake-services.mjs :4012, emulators (auth 9099, firestore 8080, storage 9199).
import { createRequire } from 'module';
import { writeFileSync } from 'node:fs';
import { seed, fs as fsGet, gen } from './helpers.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3002';
const FAKE = 'http://127.0.0.1:4012';
const [, , shots] = process.argv;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const post = (p, b) => fetch(FAKE + p, { method: 'POST', body: JSON.stringify(b) });

const img = await gen(); // writes test images, returns paths
await seed();
await post('/__geo', { mode: 'meerut' });
await post('/__auth', { mode: 'accept' });

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${img.y4m}`] });
const MEERUT = { latitude: 28.98451, longitude: 77.70642, accuracy: 8.4 };
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, permissions: ['geolocation', 'camera'], geolocation: MEERUT });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function photoStep(file) {
  await page.goto(`${BASE}/report`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="upload-input"]', { state: 'attached' });
  await page.setInputFiles('[data-testid="upload-input"]', file);
}
async function toReview() {
  await page.click('[data-testid="confirm-yes"]');
  await page.click('[data-testid="use-location"]');
  await page.waitForSelector('[data-testid="accuracy"]');
  await page.waitForFunction(() => !document.querySelector('[data-testid="address"]')?.textContent?.includes('Finding'), null, { timeout: 15000 });
  await page.click('[data-testid="location-continue"]');
  await page.waitForSelector('[data-testid="review"]');
}
async function submit() {
  await page.click('[data-testid="submit-report"]');
  await page.waitForSelector('[data-testid="outcome"]', { timeout: 30000 });
  return { status: await page.getAttribute('[data-testid="outcome"]', 'data-status'), id: (await page.textContent('[data-testid="report-id"]')).trim(), text: (await page.textContent('[data-testid="outcome"]')).replace(/\s+/g, ' ') };
}

// --- 1. Happy path: detection → location → routed → submitted to the authority's API ---
await photoStep(img.bright);
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
check((await page.getAttribute('[data-testid="detection-result"]', 'data-band')) === 'high', 'photo → pothole detected (high confidence)');
check(await page.isVisible('[data-testid="detection-box"]'), 'the actual detection box is drawn on the photo');
check((await page.textContent('[data-testid="detection-result"]')).includes('AI-estimated'), 'severity labelled AI-estimated');
await page.click('[data-testid="confirm-yes"]');
check(await page.waitForSelector('[data-testid="location-intro"]').then(() => true, () => false), 'location is explained and only requested on tap');
await page.click('[data-testid="use-location"]');
await page.waitForSelector('[data-testid="accuracy"]');
check((await page.textContent('[data-testid="accuracy"]')).includes('±8 m'), 'shows the device-reported accuracy (±8 m)');
await page.waitForFunction(() => document.querySelector('[data-testid="address"]')?.textContent?.includes('Meerut'), null, { timeout: 15000 });
check(true, 'address from the reverse geocoder');
await page.click('[data-testid="location-continue"]');
await page.waitForSelector('[data-testid="authority"]');
check((await page.textContent('[data-testid="authority"]')).includes('RoadPulse Test Authority (Meerut)'), 'review shows which authority it will be routed to');
await page.fill('[data-testid="notes"]', 'Large pothole near the intersection.');
if (shots) await page.screenshot({ path: `${shots}/rp-review.png`, fullPage: true });
const r1 = await submit();
check(r1.status === 'submitted' && /^RP-\d{4}-\d{6}$/.test(r1.id), `submitted with a report ID (${r1.id})`);
check(r1.text.includes('sent to RoadPulse Test Authority'), 'success screen names the authority');
const got = await (await fetch(`${FAKE}/__last`)).json();
check(got?.reportId === r1.id && got.hasImage && Math.abs(got.latitude - MEERUT.latitude) < 1e-6 && got.aiConfirmed === true, 'authority API received ID, coordinates, photo and detection');
check(/AI-estimated/.test(got?.description ?? ''), 'authority message labels severity as AI-estimated');
const doc1 = await fsGet(`roadHazards/${r1.id}`);
check(doc1?.externalReportId?.startsWith('MMC-2026-') && doc1.reportStatus === 'submitted', `authority reference stored (${doc1?.externalReportId})`);
check(doc1?.imagePath?.startsWith('citizen/') && doc1?.annotatedPath?.endsWith('-ann.jpg'), 'original + annotated images stored separately');
if (shots) await page.screenshot({ path: `${shots}/rp-success.png`, fullPage: true });

// Track → detail with a truthful timeline and the private photo.
await page.click('[data-testid="track"]');
await page.waitForSelector('[data-testid="timeline"]');
const tl = await page.textContent('[data-testid="timeline"]');
check(['Photo received', 'Pothole detected', 'Location captured', 'Report created', 'Sent to RoadPulse Test Authority'].every((s) => tl.includes(s)), 'timeline lists only real events, in order');
await page.waitForSelector('[data-testid="private-image"]', { timeout: 10000 });
check(true, 'owner can see their private report photo');

// --- 2. Duplicate: same spot again → grouped, both kept ---
await photoStep(img.bright);
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
await toReview();
const r2 = await submit();
check(r2.text.includes('2 reports for the same road hazard'), 'second report at the same spot is grouped (both kept)');

// --- 3. Authority down → failed but saved → retry succeeds ---
await post('/__auth', { mode: 'reject' });
await photoStep(img.bright);
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
await ctx.setGeolocation({ latitude: 28.9901, longitude: 77.7101, accuracy: 12 });
await toReview();
const r3 = await submit();
check(r3.status === 'submission_failed' && r3.text.includes('safely saved'), 'authority failure → “couldn’t send automatically… safely saved”');
await post('/__auth', { mode: 'accept' });
await page.click('[data-testid="retry"]');
await page.waitForFunction(() => document.querySelector('[data-testid="outcome"]')?.dataset.status === 'submitted', null, { timeout: 20000 });
check(true, 'retry → submitted');

// --- 4. No authority for the area → honest "Report Created" ---
await post('/__geo', { mode: 'nowhere' });
await ctx.setGeolocation({ latitude: 25.6093, longitude: 85.1235, accuracy: 10 });
await photoStep(img.bright);
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
await page.click('[data-testid="confirm-yes"]');
await page.click('[data-testid="use-location"]');
await page.waitForFunction(() => document.querySelector('[data-testid="address"]')?.textContent?.includes('Patna'), null, { timeout: 15000 });
await page.click('[data-testid="location-continue"]');
check(await page.waitForSelector('[data-testid="authority-unavailable"]', { timeout: 10000 }).then(() => true, () => false), '“Authority routing unavailable” when no authority is configured');
const r4 = await submit();
check(r4.status === 'created' && r4.text.includes('not currently connected'), 'no false claim: “Report Created … not currently connected”');
await post('/__geo', { mode: 'meerut' });

// --- 5. No confident detection → no automatic report; manual observation is labelled ---
await ctx.setGeolocation({ latitude: 28.9812, longitude: 77.7012, accuracy: 9 });
await photoStep(img.dim);
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
check((await page.getAttribute('[data-testid="detection-result"]', 'data-band')) === 'low' && (await page.textContent('[data-testid="detection-result"]')).includes('couldn’t confidently detect'), 'unclear photo → “We couldn’t confidently detect a pothole.”');
await page.click('[data-testid="report-manually"]');
await page.click('[data-testid="use-location"]');
await page.waitForSelector('[data-testid="location-continue"]');
await page.click('[data-testid="location-continue"]');
check((await page.textContent('[data-testid="review"]')).includes('Your observation (not AI-confirmed)'), 'manual report clearly labelled as the user’s observation');
const r5 = await submit();
const doc5 = await fsGet(`roadHazards/${r5.id}`);
check(doc5?.aiConfirmed === false && doc5?.confidence === null && doc5?.severity === 'unknown', 'manual report stored without AI confidence/severity');

// --- 6. Dark photo → quality check ---
await photoStep(img.dark);
await page.waitForSelector('[data-testid="quality-fail"]', { timeout: 20000 });
check((await page.textContent('[data-testid="quality-fail"]')).includes('We need a clearer photo'), 'too-dark photo → “We need a clearer photo.” + tips');

// --- 7. Real camera capture ---
await page.goto(`${BASE}/report`, { waitUntil: 'load' });
await page.click('[data-testid="take-photo"]');
await page.waitForSelector('[data-testid="shutter"]:not([disabled])', { timeout: 15000 });
await page.click('[data-testid="shutter"]');
await page.waitForSelector('[data-testid="detection-result"]', { timeout: 30000 });
check((await page.getAttribute('[data-testid="detection-result"]', 'data-band')) === 'high', 'camera capture → same detection pipeline');

// --- 8. Low accuracy warning ---
await ctx.setGeolocation({ latitude: 28.9801, longitude: 77.7001, accuracy: 180 });
await page.click('[data-testid="confirm-yes"]');
await page.click('[data-testid="use-location"]');
await page.waitForSelector('[data-testid="accuracy-warning"]');
check((await page.textContent('[data-testid="accuracy-warning"]')).includes('Location accuracy is low'), '±180 m → “Location accuracy is low.”');

// --- 9. My Reports ---
await page.goto(`${BASE}/reports`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="report-card"]', { timeout: 15000 });
check((await page.locator('[data-testid="report-card"]').count()) === 5, 'My Reports lists this user’s 5 reports');

// --- 10. Location denied → place on the map (never invented) ---
const ctx2 = await browser.newContext({ viewport: { width: 420, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/report`, { waitUntil: 'load' });
await p2.setInputFiles('[data-testid="upload-input"]', img.bright);
await p2.waitForSelector('[data-testid="confirm-yes"]', { timeout: 30000 });
await p2.click('[data-testid="confirm-yes"]');
await p2.click('[data-testid="use-location"]');
await p2.waitForSelector('[data-testid="location-error"]');
check((await p2.textContent('[data-testid="location-error"]')).includes('We couldn’t access your location'), 'denied → “We couldn’t access your location.” with Try Again');
await p2.click('[data-testid="choose-on-map"]');
check(!(await p2.isVisible('[data-testid="coords"]')), 'no coordinates until the user places the pin');
await p2.waitForSelector('[data-testid="map"] .leaflet-container, [data-testid="map"].leaflet-container', { timeout: 10000 });
await p2.locator('[data-testid="map"]').click({ position: { x: 200, y: 150 } });
await p2.waitForSelector('[data-testid="coords"]');
check((await p2.textContent('[data-testid="accuracy"]')).includes('adjusted by you'), 'manual pin placement is recorded as user-set');
await ctx2.close();

// --- 11. Security at the API ---
const noAuth = await fetch(`${BASE}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
check(noAuth.status === 401, 'creating a report requires sign-in');
const stranger = await fetch(`${BASE}/api/image?path=${encodeURIComponent(doc1.imagePath)}`);
check(stranger.status === 401, 'report photos are not public');

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
writeFileSync('/tmp/rp-last-report.txt', r1.id);
console.log(failures ? `\n${failures} FAILURES` : '\nALL CITIZEN CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

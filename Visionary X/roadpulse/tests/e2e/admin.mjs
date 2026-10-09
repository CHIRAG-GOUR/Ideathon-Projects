// End-to-end: admin / road-authority dashboard (run after citizen + live, which leave real test data in the emulator).
import { createRequire } from 'module';
import { fs as fsGet, list, adminToken } from './helpers.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3002';
const [, , shots] = process.argv;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };

const token = await adminToken(); // the admin account (verified email on the allow-list)
// A registered vehicle that is currently driving (heartbeat just now).
const reg = (await (await fetch(`${BASE}/api/admin/vehicles`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'Municipal van 07' }) })).json()).data;
await fetch(`${BASE}/api/vehicle/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': reg.id, 'X-Device-Key': reg.key }, body: JSON.stringify({ latitude: 28.99, longitude: 77.71 }) });
await adminToken('someone@else.test', 'other-pass-123'); // verified, but not on the list
const hazards = await list('roadHazards');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function signIn(email, pw) {
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="admin-signin"]');
  await page.fill('[data-testid="admin-email"]', email);
  await page.fill('[data-testid="admin-password"]', pw);
  await page.click('[data-testid="admin-signin-btn"]');
}

await signIn('someone@else.test', 'other-pass-123');
await page.waitForSelector('[data-testid="not-admin"]', { timeout: 15000 });
check(true, 'a signed-in account not on the admin list is refused');
await page.click('text=Sign out');

await signIn('admin@roadpulse.test', 'admin-pass-123');
await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
await page.waitForFunction((n) => document.querySelector('[data-testid="overview-total"]')?.textContent?.includes(String(n)), hazards.length, { timeout: 15000 });
check(true, `Overview “Potholes reported” = ${hazards.length} (from the database)`);
const high = hazards.filter((h) => h.severity === 'high').length;
check((await page.textContent('[data-testid="overview-high"]')).includes(String(high)), `High severity = ${high}`);
const activeN = (await list('vehicles')).filter((v) => v.lastSeenAt && Date.now() - Date.parse(v.lastSeenAt) < 600000).length;
await page.waitForFunction((n) => document.querySelector('[data-testid="overview-vehicles"]')?.textContent?.includes(String(n)), activeN, { timeout: 10000 }).catch(() => undefined);
check((await page.textContent('[data-testid="overview-vehicles"]')).includes(String(activeN)) && activeN >= 1, `Vehicles active = ${activeN} (recent heartbeat)`);
if (shots) await page.screenshot({ path: `${shots}/rp-admin-overview.png`, fullPage: true });

await page.click('[data-testid="tab-reports"]');
await page.waitForSelector('[data-testid="admin-report-row"]');
check((await page.locator('[data-testid="admin-report-row"]').count()) === hazards.length, 'all reports listed (vehicle + citizen)');
const target = hazards.find((h) => h.source === 'citizen' && h.reportStatus === 'submitted');
await page.click(`[data-testid="admin-report-row"]:has-text("${target.id}")`);
await page.waitForSelector('[data-testid="review-panel"]');
await page.waitForSelector('[data-testid="private-image"]', { timeout: 15000 });
check(true, 'admin sees the report photo (private to owner + admins)');
await page.click('[data-testid="set-under_review"]');
await page.waitForSelector('[data-testid="review-msg"]');
const after = await fsGet(`roadHazards/${target.id}`);
check(after.reportStatus === 'under_review' && after.timeline.at(-1).label.includes('Under Review') && after.timeline.at(-1).label.includes('admin@roadpulse.test'), 'status → Under Review, recorded in the timeline with who changed it');
if (shots) await page.screenshot({ path: `${shots}/rp-admin-report.png`, fullPage: true });

await page.locator('button', { hasText: 'All reports' }).click();
await page.click('[data-testid="tab-vehicles"]');
await page.waitForSelector('[data-testid="vehicle-row"]');
check((await page.textContent('[data-testid="vehicles"]')).includes('Municipal van 07'), 'Vehicles tab lists the registered vehicle');

await page.click('[data-testid="tab-authorities"]');
await page.waitForSelector('[data-testid="authority-form"]');
await page.fill('[data-testid="auth-name"]', 'Test Portal Authority');
await page.fill('[data-testid="auth-jurisdiction"]', 'Test City');
await page.fill('[data-testid="auth-city"]', 'Testville');
await page.fill('[data-testid="auth-endpoint"]', 'https://example.org/complaints');
await page.click('[data-testid="auth-save"]');
await page.waitForSelector('text=Add the official page you verified');
check(true, 'an authority can’t be saved without a verified official source');
await page.fill('[data-testid="auth-sourceUrl"]', 'https://example.org/official-page');
await page.click('[data-testid="auth-save"]');
await page.waitForFunction(() => document.querySelector('[data-testid="authorities"]')?.textContent?.includes('Test Portal Authority'), null, { timeout: 10000 });
let a = null;
for (let i = 0; i < 20 && !a; i++) { a = await fsGet('authorities/test-portal-authority'); if (!a) await new Promise((r) => setTimeout(r, 250)); }
check(a?.submissionMethod === 'portal' && a?.city === 'Testville', 'authority saved to the directory (admin-only write)');

await page.click('[data-testid="tab-map"]');
await page.waitForSelector('.leaflet-interactive, .marker-cluster', { timeout: 15000 });
check(true, 'map shows the hazards');

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL ADMIN CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

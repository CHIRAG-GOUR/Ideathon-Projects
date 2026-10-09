// End-to-end: welcome, My Food, persistence, Firestore sync (emulator), Smart Kitchen game,
// badges, Insights + AI recipes, offline. Needs: dev server :3001 (with .env.local emulator config),
// tests/fake-gemini.mjs :4011, Firebase emulators (auth :9099, firestore :8080).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [, , photo, shots] = process.argv;
const BASE = 'http://localhost:3001';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// --- First-run welcome ---
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="welcome"]', { timeout: 15000 });
check(true, 'first visit shows the welcome');
if (shots) await page.screenshot({ path: `${shots}/xp-welcome.png` });
await page.click('[data-testid="welcome-next"]');
await page.click('[data-testid="welcome-next"]');
check(await page.isVisible('[data-testid="welcome-start"]'), 'welcome has 3 steps ending in "Start scanning"');
await page.getByRole('button', { name: 'Explore first' }).click();
await page.reload({ waitUntil: 'load' });
await wait(1500);
check(!(await page.isVisible('[data-testid="welcome"]')), 'welcome is only shown once');

// --- My Food ---
await page.goto(`${BASE}/food`, { waitUntil: 'load' });
await page.click('[data-testid="load-sample"]');
await page.waitForSelector('[data-testid="food-Milk"]');
const groups = await page.locator('main h2').allTextContents();
check(groups[0]?.includes('Use First'), `food grouped by urgency (first group: ${groups[0]?.trim()})`);
await page.click('[data-testid="food-Milk"]');
await page.click('[data-testid="detail-use"]');
await page.fill('#use-amt', '0.25');
check((await page.textContent('[data-testid="use-remaining"]')).includes('0.75'), 'mark used 250 ml of 1 L → remaining 0.75 litres');
await page.click('[data-testid="use-submit"]');
await page.waitForSelector('[data-testid="detail-qty"]');
check((await page.textContent('[data-testid="detail-qty"]')).includes('0.75'), 'quantity updated in the inventory');
await page.click('[data-testid="detail-edit"]');
await page.fill('#ff-name', 'Toned Milk');
await page.getByRole('button', { name: '+1 month' }).click();
await page.click('[data-testid="food-form-submit"]');
await page.keyboard.press('Escape');
await page.waitForSelector('[data-testid="food-Toned Milk"]');
check((await page.textContent('[data-testid="food-Toned Milk"]')).includes('Fresh'), 'edit name + expiry → status recalculated to Fresh');
await page.click('[data-testid="food-Yogurt"]');
await page.click('[data-testid="detail-delete"]');
await page.click('[data-testid="delete-wasted"]');
// The card animates out, so allow for the exit animation before checking.
const gone = await page.waitForSelector('[data-testid="food-Yogurt"]', { state: 'detached', timeout: 3000 }).then(() => true).catch(() => false);
check(gone, 'delete as wasted removes it');
await page.click('[data-testid="food-Paneer"]');
await page.click('[data-testid="detail-delete"]');
await page.getByRole('button', { name: /We ate \/ used it/ }).click();
await wait(400);
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('[data-testid="food-Toned Milk"]');
check(!(await page.isVisible('[data-testid="food-Paneer"]')), 'changes persist after reload (local-first)');

// --- Firestore sync (emulator) ---
await page.waitForSelector('[data-testid="sync-badge"][data-state="synced"]', { timeout: 20000 }).catch(() => undefined);
const syncState = await page.getAttribute('[data-testid="sync-badge"]', 'data-state');
check(syncState === 'synced', `sync badge reports "${syncState}"`);
const api = 'http://127.0.0.1:8080/v1/projects/demo-nutri-scan/databases/nutri-scan/documents';
const users = await fetch(`${api}/users?pageSize=500`, { headers: { Authorization: 'Bearer owner' } }).then((r) => r.json());
// Other test runs leave anonymous users behind: use the one this browser signed in as most recently.
const userDoc = (users.documents ?? []).sort((a, b) => b.updateTime.localeCompare(a.updateTime))[0]?.name;
const foodsRes = userDoc ? await fetch(`http://127.0.0.1:8080/v1/${userDoc}/foods?pageSize=50`, { headers: { Authorization: 'Bearer owner' } }).then((r) => r.json()) : {};
const names = (foodsRes.documents ?? []).map((d) => d.fields?.name?.stringValue);
check(names.includes('Toned Milk') && names.length >= 7, `foods synced to Firestore under users/{uid}/foods (${names.length} docs)`);
const wasteRes = userDoc ? await fetch(`http://127.0.0.1:8080/v1/${userDoc}/waste`, { headers: { Authorization: 'Bearer owner' } }).then((r) => r.json()) : {};
check((wasteRes.documents ?? []).length >= 3, 'usage / waste history synced');

// --- Smart Kitchen game ---
await page.goto(`${BASE}/kitchen`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="kitchen-mission"]');
await page.click('[data-testid="kitchen-start"]');
await page.click('[data-testid="sim-Rice"]');
check((await page.textContent('[data-testid="kitchen-feedback"]')).includes('Not quite'), 'wrong pick → "Not quite" with the reason');
const order = ['Bread', 'Bananas', 'Orange Juice', 'Toned Milk', 'Rice'];
for (const n of order) {
  if (await page.isVisible('[data-testid="kitchen-done"]')) break;
  await page.click(`[data-testid="sim-${n}"]`);
  await wait(450);
}
await page.waitForSelector('[data-testid="kitchen-done"]', { timeout: 5000 });
check((await page.getAttribute('[data-testid="kitchen-stars"]', 'data-stars')) === '2', 'one mistake → 2 stars');
if (shots) await page.screenshot({ path: `${shots}/xp-kitchen-done.png` });
await page.getByRole('button', { name: /Play again/ }).click();
for (const n of order) {
  if (await page.isVisible('[data-testid="kitchen-done"]')) break;
  await page.click(`[data-testid="sim-${n}"]`);
  await wait(450);
}
await page.waitForSelector('[data-testid="kitchen-done"]', { timeout: 5000 });
check((await page.getAttribute('[data-testid="kitchen-stars"]', 'data-stars')) === '3', 'perfect run → 3 stars');
const toast = await page.waitForSelector('text=Badge unlocked: Kitchen Master', { timeout: 5000 }).then(() => true).catch(() => false);
check(toast, 'Kitchen Master badge unlocked with a toast');

// --- Insights ---
await fetch('http://127.0.0.1:4011/__mode', { method: 'POST', body: JSON.stringify({ mode: 'recipes' }) });
await page.goto(`${BASE}/insights`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="food-saved"]');
const saved = await page.textContent('[data-testid="food-saved"]');
check(/Food Saved\s*[1-9]/.test(saved.replace(/\s+/g, ' ')), 'Insights counts food used before expiry');
check(saved.includes('₹'), 'estimated value shown from entered prices');
check((await page.getAttribute('[data-badge="kitchen_master"]', 'data-earned')) === 'true' && (await page.getAttribute('[data-badge="food_saver"]', 'data-earned')) === 'true', 'badges earned from real activity');
await page.click('[data-testid="ai-recipes"]');
await page.waitForSelector('[data-testid="ai-recipe-list"]', { timeout: 10000 });
check((await page.locator('[data-testid="ai-recipe-list"] > div').count()) === 3, 'Gemini recipe ideas: 3 validated suggestions');
if (shots) await page.screenshot({ path: `${shots}/xp-insights.png`, fullPage: true });

// --- Offline ---
// Dev mode has no service worker, so load pages first, then drop the network.
await page.goto(`${BASE}/food`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="food-Toned Milk"]');
await ctx.setOffline(true);
await page.locator('[data-testid="food-Toned Milk"]').click();
await page.waitForSelector('text=Mark Used', { timeout: 5000 });
check(true, 'offline: My Food still works');
await page.keyboard.press('Escape');
await page.waitForSelector('[data-testid="sync-badge"][data-state="offline"]', { timeout: 5000 }).catch(() => undefined);
check((await page.getAttribute('[data-testid="sync-badge"]', 'data-state')) === 'offline', 'offline: sync badge says offline');
await ctx.setOffline(false);
await page.goto(`${BASE}/scan`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="upload-input"]', { state: 'attached' });
await ctx.setOffline(true);
await page.setInputFiles('[data-testid="upload-input"]', photo);
await page.waitForSelector('[data-testid="scan-error"]', { timeout: 10000 });
check((await page.textContent('[data-testid="scan-error"]')).includes('offline'), 'offline scan → friendly "You’re offline" message');
await ctx.setOffline(false);

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL EXPERIENCE CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

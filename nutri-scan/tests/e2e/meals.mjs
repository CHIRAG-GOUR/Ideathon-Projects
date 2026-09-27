// End-to-end: whole meals. A plate photo → item-by-item breakdown, portion + leave-out controls,
// typed searches (scan screen, camera "Type" button, home hero, /scan?q=), saving a meal.
// Needs: dev server :3001 (.env.local pointing Gemini at tests/fake-gemini.mjs :4011).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [, , photo, shots] = process.argv;
const BASE = process.env.BASE_URL || 'http://localhost:3001';
const GEM = 'http://127.0.0.1:4011';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const mode = (m) => fetch(`${GEM}/__mode`, { method: 'POST', body: JSON.stringify({ mode: m }) });
const last = () => fetch(`${GEM}/__last`).then((r) => r.json());
const total = async (page) => Number(await page.getAttribute('[data-testid="meal-total"]', 'data-value'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// --- Photo of a plate ---
await mode('meal_paratha');
await page.goto(`${BASE}/scan`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="upload-input"]', { state: 'attached' });
await page.setInputFiles('[data-testid="upload-input"]', photo);
await page.waitForSelector('[data-testid="meal-card"]', { timeout: 15000 });
check((await page.textContent('[data-testid="result-name"]')).includes('Aloo Paratha'), 'plate photo → "Aloo Paratha"');
check((await page.locator('[data-testid^="meal-item-"]').count()) === 4, 'each item on the plate is listed (paratha, curd, pickle, butter)');
await page.waitForTimeout(1200);
check((await total(page)) === 814, `plate total = sum of items with the pickle corrected (${await total(page)} kcal)`);
check((await page.textContent('[data-testid="meal-assumptions"]')).includes('recalculated'), 'explains that a figure was recalculated');
check((await page.textContent('[data-testid="meal-item-2"]')).includes('32'), 'pickle shows 32 kcal, not the AI’s 300');
check((await page.getAttribute('[data-testid="diet-mark"]', 'data-diet')) === 'vegetarian', 'veg mark shown');
check((await page.textContent('[data-testid="result-food"]')).includes('North Indian'), 'cuisine shown');
check((await page.textContent('[data-testid="result-expiry"]')).includes('not detected'), 'no invented expiry for a cooked meal');
check(await page.isVisible('[data-testid="nutri-score"]'), 'Nutri score computed for the plate');

// Leave out pickle + butter, then double the portion.
await page.click('[data-testid="meal-item-2"]');
await page.click('[data-testid="meal-item-3"]');
await page.waitForTimeout(1200);
check((await total(page)) === 710, `leaving out pickle and butter → ${await total(page)} kcal`);
check((await page.getAttribute('[data-testid="calories"]', 'data-value')) === '710', 'nutrition panel follows what you ate');
await page.click('[data-testid="portion-2"]');
await page.waitForTimeout(1200);
check((await total(page)) === 1420, `2× portion → ${await total(page)} kcal`);
await page.click('[data-testid="meal-item-2"]');
await page.click('[data-testid="portion-1"]');
await page.waitForTimeout(1200);
check((await total(page)) === 742, `add the pickle back at 1× → ${await total(page)} kcal`);
if (shots) await page.screenshot({ path: `${shots}/meal-photo.png`, fullPage: true });

// Save what you ate.
await page.click('[data-testid="add-to-food"]');
await page.waitForSelector('[data-testid="add-sheet"]');
await page.click('[data-testid="food-form-submit"]');
await page.waitForSelector('[data-testid="added-state"]');
const saved = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nutri-scan-kitchen-v1')).state;
  const f = s.foods.find((x) => x.name === 'Aloo Paratha');
  return f && { kcal: f.nutrition?.perServing?.calories, items: f.nutrition?.meal?.components?.length, expiry: f.expiryDate };
});
check(saved && saved.kcal === 742 && saved.items === 3 && saved.expiry === null, `saved meal keeps what you ate (${JSON.stringify(saved)})`);

// --- Typed search from the scan screen ---
await mode('meal_thali');
await page.click('[data-testid="scan-again"]').catch(() => undefined);
await page.goto(`${BASE}/scan`, { waitUntil: 'load' });
const intro = await page.waitForSelector('[data-testid="search-input"]', { timeout: 5000 }).then(() => true).catch(() => false);
if (!intro) await page.click('[data-testid="type-instead"]');
await page.fill('[data-testid="search-input"]', 'veg thali with 2 rotis');
await page.click('[data-testid="search-submit"]');
await page.waitForSelector('[data-testid="meal-card"]', { timeout: 15000 });
const q = await last();
check(q.query?.includes('<query>veg thali with 2 rotis</query>') && q.imageBytes === 0, 'typed search is sent as text (no image)');
check(q.thinking?.thinkingBudget === 512 && q.maxTokens === 4096, 'meal-sized output budget and a little thinking');
check((await page.locator('[data-testid^="meal-item-"]').count()) === 7, 'thali: 7 items listed');
await page.waitForTimeout(1200);
check((await total(page)) === 1049, `thali total ${await total(page)} kcal`);
check((await page.textContent('[data-testid="result-food"]')).includes('From your search'), 'marked as from your search');
if (shots) await page.screenshot({ path: `${shots}/meal-search.png`, fullPage: true });

// Suggestion chip.
await page.click('[data-testid="scan-again"]');
await page.waitForSelector('[data-testid="search-box"]', { timeout: 5000 });
await page.click('[data-testid="idea-Rajma chawal"]');
await page.waitForSelector('[data-testid="meal-card"]', { timeout: 15000 });
check((await last()).query?.includes('Rajma chawal'), 'suggestion chip runs a search');

// --- From the home page hero ---
await page.goto(BASE, { waitUntil: 'load' });
await page.click('[data-testid="welcome-skip"]', { timeout: 15000 }).catch(() => undefined);
await page.fill('[data-testid="hero-search"]', 'penne arrabbiata');
await page.keyboard.press('Enter');
await page.waitForURL(/\/scan\?q=penne/);
await page.waitForSelector('[data-testid="meal-card"]', { timeout: 15000 });
check((await last()).query?.includes('penne arrabbiata'), 'home search → /scan?q= runs the lookup');

// --- Validation & errors for text ---
const bad = await fetch(`${BASE}/api/recognize`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'x' }) });
check(bad.status === 400, 'one-letter search is rejected');
await mode('error500');
await page.goto(`${BASE}/scan?q=${encodeURIComponent('chole bhature')}`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="scan-error"]', { timeout: 15000 });
check((await page.textContent('[data-testid="scan-error"]')).includes('Couldn’t look that up'), 'failed search → friendly message');
await mode('food_label');

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL MEAL CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

// End-to-end scanner tests against a running dev server (port 3001) + tests/fake-gemini.mjs (port 4011).
// Usage: node tests/e2e/scanner.mjs <fake-camera.y4m> <photo.png> [screenshotDir]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [, , y4m, photo, shots] = process.argv;
const BASE = 'http://localhost:3001';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const setMode = (mode) => fetch('http://127.0.0.1:4011/__mode', { method: 'POST', body: JSON.stringify({ mode }) });
const last = () => fetch('http://127.0.0.1:4011/__last').then((r) => r.json());

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'], isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function openScanner() {
  await page.goto(`${BASE}/scan`, { waitUntil: 'load' });
  // Firebase keeps a live connection open, so wait for the camera (auto-opens once permission is granted).
  for (let i = 0; i < 40; i++) {
    if (await page.locator('[data-testid="camera-video"][data-live="true"]').count()) return;
    if (i > 4 && (await page.locator('[data-testid="open-camera"]').isVisible().catch(() => false))) await page.click('[data-testid="open-camera"]').catch(() => undefined);
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('[data-testid="camera-video"][data-live="true"]', { timeout: 5000 });
}
async function captureWith(mode) {
  await setMode(mode);
  await page.click('[data-testid="capture"]');
  await page.waitForSelector('[data-testid^="result-"], [data-testid="scan-error"]', { timeout: 20000 });
}

// Camera: rear by default, switch to front and back without reloading
await openScanner();
check((await page.getAttribute('[data-testid="camera-video"]', 'data-facing')) === 'environment', 'camera opens with the rear camera');
const navId = await page.evaluate(() => (window.__navId = Math.random()));
await page.click('[data-testid="switch-camera"]');
await page.waitForSelector('[data-testid="camera-video"][data-facing="user"][data-live="true"]', { timeout: 10000 });
check(true, 'switch camera → front camera live');
await page.click('[data-testid="switch-camera"]');
await page.waitForSelector('[data-testid="camera-video"][data-facing="environment"][data-live="true"]', { timeout: 10000 });
check((await page.evaluate(() => window.__navId)) === navId, 'switched back to rear camera without a page reload');

// Food with nutrition label + printed expiry
await captureWith('food_label');
check(await page.isVisible('[data-testid="result-food"]'), 'food result shown');
check((await page.textContent('[data-testid="result-name"]')).includes('Milk'), 'food name: Milk');
check((await page.getAttribute('[data-testid="nutrition-panel"]', 'data-source')) === 'label', 'nutrition marked as read from label');
check((await page.getAttribute('[data-testid="calories"]', 'data-value')) === '155', 'calories per serving 250 ml = 155 kcal');
check((await page.getAttribute('[data-testid="nutri-score"]', 'data-grade')) === 'B', `milk nutri score is B (got ${await page.getAttribute('[data-testid="nutri-score"]', 'data-grade')})`);
check((await page.textContent('[data-testid="result-expiry"]')).includes('read from the label'), 'expiry read from label is shown');
const req = await last();
check(req.key === 'present' && req.hasSchema && req.mime === 'image/jpeg', 'server called Gemini with key header + JSON schema + JPEG');
check(req.imageBytes > 5000 && req.imageBytes <= 320000, `image resized/compressed before upload (${req.imageBytes} bytes)`);
if (shots) await page.screenshot({ path: `${shots}/ns-food.png`, fullPage: true });

// Add to My Food with the label expiry prefilled
await page.click('[data-testid="add-to-food"]');
await page.waitForSelector('[data-testid="food-form"]');
check((await page.inputValue('#ff-exp')) === '2099-01-15', 'expiry pre-filled only because it was on the label');
await page.click('[data-testid="food-form-submit"]');
await page.waitForSelector('[data-testid="added-state"]');
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nutri-scan-kitchen-v1')).state.foods[0]);
check(stored.name === 'Milk' && stored.expiryDate === '2099-01-15' && stored.nutrition?.per100?.calories === 62, 'saved to My Food with expiry + nutrition');

// Estimated nutrition, no expiry → never invented
await page.getByRole('button', { name: /Scan Again/ }).click();
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await captureWith('food_estimate');
check((await page.getAttribute('[data-testid="nutrition-panel"]', 'data-source')) === 'estimate', 'dosa: nutrition labelled as AI estimate');
check((await page.textContent('[data-testid="result-expiry"]')).includes('Expiry date not detected'), 'no expiry → "Expiry date not detected"');
check((await page.textContent('[data-testid="ingredients"]')).includes('Typical ingredients'), 'ingredients marked as typical (estimate)');
if (shots) await page.screenshot({ path: `${shots}/ns-dosa.png`, fullPage: true });

// Model claims a date it says isn't visible → dropped
await page.click('[data-testid="scan-again"]');
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await captureWith('hallucinated_expiry');
check((await page.textContent('[data-testid="result-expiry"]')).includes('Expiry date not detected'), 'expiry the model did not read from a label is discarded');

// Medium confidence → confirmation
await page.click('[data-testid="scan-again"]');
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await captureWith('medium');
check(await page.isVisible('[data-testid="result-confirm"]'), 'medium confidence asks "Is this right? Looks like Biscuits"');
await page.click('[data-testid="confirm-yes"]');
check(await page.isVisible('[data-testid="result-food"]'), 'confirming shows the full result');

// Non-food, human, pet, unknown/low, errors
const nonFood = async (mode, expectName, expectText) => {
  await openScanner();
  await captureWith(mode);
  const name = (await page.textContent('[data-testid="result-name"]').catch(() => '')) ?? '';
  const body = await page.textContent('main');
  check(name.includes(expectName) && body.includes(expectText), `${mode} → "${expectName}" + "${expectText}"`);
  return body;
};
await nonFood('phone', 'Mobile Phone', 'zero calories');
if (shots) await page.screenshot({ path: `${shots}/ns-phone.png`, fullPage: true });
const personBody = await nonFood('person', 'Human', 'humans are not on today’s menu');
check(!personBody.includes('Young woman') && !personBody.includes('long hair'), 'person: no identity or attributes shown');
if (shots) await page.screenshot({ path: `${shots}/ns-human.png`, fullPage: true });
await nonFood('dog', 'Dog', '0/10 food');

for (const [mode, sel, label] of [
  ['unknown', '[data-testid="result-unknown"]', 'unknown → "Hmm… I’m not sure" with Try Again / Enter Manually'],
  ['low', '[data-testid="result-unknown"]', 'low confidence → ask to retake (no fake answer)'],
  ['malformed', '[data-testid="scan-error"]', 'malformed model output → friendly error'],
  ['error500', '[data-testid="scan-error"]', 'Gemini API failure → friendly error'],
  ['timeout', '[data-testid="scan-error"]', 'Gemini timeout → "Couldn’t analyze that image. Try again."'],
]) {
  await openScanner();
  await captureWith(mode);
  const ok = await page.isVisible(sel);
  const txt = await page.textContent('main');
  check(ok && !/Error:|stack|undefined|TypeError/.test(txt), label);
}

// Bad nutrition numbers are rejected, food still shown
await page.goto(`${BASE}/scan`);
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await captureWith('bad_numbers');
check(!(await page.isVisible('[data-testid="nutrition-panel"]')) && (await page.textContent('main')).includes('Nutrition couldn’t be estimated'), 'impossible nutrition values are discarded');

// Upload fallback uses the same pipeline
await setMode('food_estimate');
await page.goto(`${BASE}/scan`);
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await page.setInputFiles('[data-testid="upload-input"]', photo);
await page.waitForSelector('[data-testid="result-food"]', { timeout: 20000 });
check(true, 'upload from gallery → same recognition pipeline');

// Close releases the camera
await page.goto(`${BASE}/scan`);
await page.waitForSelector('[data-testid="camera-video"][data-live="true"]');
await page.click('[data-testid="close-scanner"]');
await page.waitForTimeout(800);
check(await page.evaluate(() => !document.querySelector('[data-testid="camera-video"]')), 'close scanner removes the camera view');

// Permission denied
const denyBrowser = await chromium.launch(); // no fake-UI flag → the permission prompt is refused
const denyCtx = await denyBrowser.newContext({ viewport: { width: 390, height: 844 } });
const denyPage = await denyCtx.newPage();
await denyPage.goto(`${BASE}/scan`);
check(await denyPage.isVisible('[data-testid="scan-intro"]'), 'camera is not requested before the explainer');
await denyPage.click('[data-testid="open-camera"]');
await denyPage.waitForSelector('[data-testid="camera-error"]', { timeout: 15000 });
const denyText = await denyPage.textContent('[data-testid="camera-error"]');
check(denyText.includes('Camera isn’t available') && denyText.includes('Upload Photo'), 'permission denied → helpful fallback with Upload Photo');
if (shots) await denyPage.screenshot({ path: `${shots}/ns-denied.png` });

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL SCANNER CHECKS PASSED');
await denyBrowser.close();
await browser.close();
process.exit(failures ? 1 : 0);

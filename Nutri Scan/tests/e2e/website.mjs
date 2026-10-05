// End-to-end: the landing-page experience — live scan table, scroll story, scanner playground,
// fridge time machine, 3D artwork, reduced motion. Needs the dev server on :3001.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3001';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };

const browser = await chromium.launch();
const errors = [];

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.click('[data-testid="welcome-skip"]', { timeout: 20000 });
  return { ctx, page };
}

// --- Desktop ---
{
  const { ctx, page } = await open({ width: 1440, height: 900 });

  // Hero scan table: auto-cycles, and tapping an item locks onto it.
  await page.waitForSelector('[data-testid="scan-tag"]:visible', { timeout: 8000 });
  const first = await page.getAttribute('[data-testid="scan-tag"]:visible', 'data-item');
  await page.waitForFunction((f) => [...document.querySelectorAll('[data-testid="scan-tag"]')].some((e) => e.offsetParent && e.dataset.item !== f), first, { timeout: 6000 });
  check(true, `hero table cycles by itself (${first} → next)`);
  await page.click('button[aria-label="Scan the banana"]');
  await page.waitForSelector('[data-testid="scan-tag"][data-item="banana"]:visible', { timeout: 4000 });
  const tag = page.locator('[data-testid="scan-tag"][data-item="banana"]:visible');
  const tagText = (await tag.textContent()).replace(/\s+/g, ' ');
  const grade = await tag.locator('[title^="Nutri score"]').getAttribute('title');
  check(tagText.includes('Banana') && tagText.includes('105 kcal') && grade === 'Nutri score A', `tap an item → real sample result (Banana · 105 kcal · ${grade})`);
  await page.waitForTimeout(3000);
  check((await page.getAttribute('[data-testid="scan-tag"]:visible', 'data-item')) === 'banana', 'a tapped item stays selected (auto-cycle pauses)');

  const imgs = await page.evaluate(() => [...document.querySelectorAll('img[src^="/e3d/"]')].filter((i) => i.complete && i.naturalWidth > 0).length);
  check(imgs >= 6, `3D food artwork loads (${imgs} images)`);

  // Scroll story: chapters advance with scroll.
  const story = await page.evaluate(() => { const el = document.getElementById('story'); return { top: el.offsetTop, h: el.offsetHeight }; });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), story.top + (story.h - 900) * ((i + 0.5) / 4));
    await page.waitForTimeout(700);
    seen.push(await page.evaluate(() => [...document.querySelectorAll('#story ol li')].findIndex((li) => Number(getComputedStyle(li).opacity) > 0.9)));
  }
  check(seen.join(',') === '0,1,2,3', `scroll story steps through all 4 chapters (${seen.join(',')})`);

  // Playground.
  await page.locator('#scan-anything').scrollIntoViewIfNeeded();
  await page.click('[data-testid="sample-dog"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sample-result"]').textContent.includes('Dog'), null, { timeout: 4000 });
  check((await page.textContent('[data-testid="sample-result"]')).includes('NOT FOOD'), 'playground: dog → NOT FOOD with a playful line');
  await page.click('[data-testid="sample-bread"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sample-result"]').textContent.includes('Whole Wheat Bread'), null, { timeout: 4000 });
  check((await page.textContent('[data-testid="sample-result"]')).includes('gluten'), 'playground: bread → nutrition + allergens');

  // Time machine.
  await page.locator('[data-testid="time-machine"]').scrollIntoViewIfNeeded();
  const count = (s) => page.locator(`[data-testid="time-machine"] [data-shelf="${s}"] [data-item]`).count();
  check((await count('expired')) === 0 && (await count('fresh')) > 0, 'time machine: today nothing is wasted');
  await page.locator('[data-testid="tm-slider"]').fill('6');
  await page.waitForTimeout(600);
  check((await count('expired')) === 4, `day 6 → milk, paneer, bread, bananas expired (${await count('expired')})`);
  check((await page.textContent('[data-testid="tm-summary"]')).includes('4 items would be wasted'), 'summary explains what would be wasted');
  await page.locator('[data-testid="tm-slider"]').fill('0');
  await page.click('[data-testid="tm-play"]');
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="tm-day"]').dataset.day) >= 3, null, { timeout: 6000 });
  check(true, 'play button fast-forwards the days');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, 'desktop: no horizontal scroll');
  await ctx.close();
}

// --- Phone ---
{
  const { ctx, page } = await open({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await page.locator('[data-testid="scan-table"]').scrollIntoViewIfNeeded();
  await page.tap('button[aria-label="Scan the apple"]');
  await page.waitForSelector('[data-testid="scan-tag"][data-item="apple"]:visible', { timeout: 4000 });
  const box = await page.locator('[data-testid="scan-tag"]:visible').boundingBox();
  const table = await page.locator('[data-testid="scan-table"]').boundingBox();
  check(box.y >= table.y + table.height - 2, 'phone: result card sits below the table (never covers food)');
  const story = await page.evaluate(() => { const el = document.getElementById('story'); return el.offsetTop + el.offsetHeight / 2; });
  await page.evaluate((y) => window.scrollTo(0, y), story);
  await page.waitForTimeout(800);
  const phone = await page.evaluate(() => { const el = document.querySelector('#story .rounded-\\[36px\\]'); const r = el.getBoundingClientRect(); return { w: r.width, bottom: r.bottom, vh: innerHeight }; });
  check(phone.w >= 280 && phone.bottom <= phone.vh - 70, `phone: story screen is readable and clears the nav bar (${Math.round(phone.w)}px wide)`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, 'phone: no horizontal scroll');
  await ctx.close();
}

// --- Reduced motion ---
{
  const { ctx, page } = await open({ width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  const a = await page.getAttribute('[data-testid="scan-tag"]:visible', 'data-item');
  await page.waitForTimeout(3500);
  check((await page.getAttribute('[data-testid="scan-tag"]:visible', 'data-item')) === a, 'reduced motion: hero does not auto-animate');
  await ctx.close();
}

check(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL WEBSITE CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);

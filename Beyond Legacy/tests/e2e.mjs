// Critical acceptance test on the Firebase emulators (Auth + Firestore + Hosting serving web/dist) with the real rules.
//   npm run test:e2e
// Follows the 17-step flow: sign in → store → products → inventory → sales → engine → Overview → Next Move →
// product → change stock → forecast / risk / recommendation update → mark action done → Firebase persists → refresh keeps it.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');

const APP = 'http://127.0.0.1:5063', AUTH = 'http://127.0.0.1:9099', FS = 'http://127.0.0.1:8080', PROJECT = 'demo-beyond-legacy';
const DOCS = `${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;
let failed = 0;
const check = (ok, name, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failed++;
};
const val = (v) => v?.stringValue ?? (v?.integerValue !== undefined ? Number(v.integerValue) : v?.doubleValue ?? v?.booleanValue ?? null);
async function admin(path) { // emulator admin access (bypasses rules) — used only to verify what the app wrote
  const r = await fetch(`${DOCS}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  return r.json();
}
async function signUp(email) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }) });
  return r.json();
}
async function asUser(token, method, path, body) {
  const r = await fetch(`${DOCS}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.status;
}

const browser = await chromium.launch();

const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
const email = `manager${Date.now()}@example.com`;
await page.goto(`${APP}/?emulators`);
// 1. Sign up / sign in
await page.getByRole('button', { name: 'Create an account' }).click();
await page.getByLabel('Your name').fill('Asha Rao');
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill('secret123');
await page.getByRole('button', { name: 'Create account' }).click();
// 2. Store is created
await page.getByRole('heading', { name: 'Create your store' }).waitFor({ timeout: 20000 });
await page.getByLabel('Store name').fill('Corner Express — MG Road');
await page.getByLabel('Location / area').fill('Indiranagar, Bengaluru');
await page.getByRole('button', { name: 'Create store' }).click();
// 3–8. Products load, engine runs, Overview shows real values and the highest-priority Next Move
await page.getByText('What should I do next?').waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
check(await page.getByText('Good morning, Asha').or(page.getByText('Good afternoon, Asha')).or(page.getByText('Good evening, Asha')).first().isVisible(), 'signed in, store created, greeting shown');
const health = (await page.locator('section[aria-label="Today’s store health"]').innerText()).replace(/\s+/g, ' ');
check(/62%/.test(health) && /5 RESTOCK RISK/i.test(health) && /6 EXPIRY RISK/i.test(health), 'Overview store health computed from the stored products', health.slice(0, 160));
const hero = await page.locator('article').first().innerText();
check(/RESTOCK/i.test(hero) && /Samosa/.test(hero), 'Next Move shows the highest-priority action', hero.split('\n').slice(0, 4).join(' / '));

const userDocs = await admin('users');
const me = userDocs.documents?.find((d) => val(d.fields.email) === email);
const storeId = me && val(me.fields.storeId);
check(!!storeId, 'users/{uid} points at the new store');
const products = await admin(`stores/${storeId}/products?pageSize=100`);
check(products.documents?.length === 47, 'demo products stored in Firestore under this store', `${products.documents?.length} products`);

// 9–14. Open Cold Coffee, change stock 18 → 6: forecast, risk and recommendation update immediately
await page.getByRole('link', { name: 'Inventory' }).first().click();
await page.getByRole('link', { name: /Cold Coffee 250ml/ }).first().click();
await page.getByText('Live analysis').first().waitFor();
const before = await page.locator('main').innerText();
check(/Monitor — reorder point approaching/.test(before) && /Stock-out risk is MEDIUM/.test(before), 'initial: stock 18, demand 8/day, safety 10 → medium risk, monitor (HOLD)');
await page.getByLabel('Current stock', { exact: true }).fill('6');
await page.waitForTimeout(600);
const after = await page.locator('main').innerText();
check(/Restock 30 units/.test(after), 'stock 6 → recommendation RESTOCK 30 units');
check(/Stock-out risk is HIGH/.test(after) && /Current stock \(6\) is at or below the safety level \(10\)/.test(after), 'risk HIGH, with the reasoning');
check(/Stock-out in 0\.8 days/.test(after), 'forecast updates to a stock-out in 0.8 days');
await page.getByRole('button', { name: 'Save as stock count' }).click({ timeout: 8000 });
await page.waitForTimeout(1500);
// 15. Mark the action done
await page.getByRole('button', { name: 'Mark ordered' }).first().click();
await page.getByLabel('Quantity ordered').fill('30');
await page.getByRole('dialog').getByRole('button', { name: 'Mark ordered' }).click();
await page.getByText(/Ordered · 30 units/).first().waitFor({ timeout: 10000 });
check(true, 'action marked as ordered (30 units) with timestamp');
// 16. Firebase persisted it
const coffee = (await admin(`stores/${storeId}/products?pageSize=100`)).documents.find((d) => val(d.fields.name) === 'Cold Coffee 250ml');
const coffeeId = coffee.name.split('/').pop();
check(val(coffee.fields.stock) === 6, 'Firestore: stock saved as 6');
const rec = await admin(`stores/${storeId}/recommendations/${coffeeId}`);
check(val(rec.fields?.status) === 'ordered' && val(rec.fields?.quantity) === 30, 'Firestore: recommendation state ordered · 30');
const events = await admin(`stores/${storeId}/inventoryEvents?pageSize=50`);
check(events.documents?.some((d) => val(d.fields.type) === 'count' && val(d.fields.delta) === -12), 'Firestore: stock count logged as an inventory event (−12)');
// 17. Refresh keeps the state
await page.reload();
await page.getByText('Live analysis').first().waitFor({ timeout: 20000 });
const reloaded = await page.locator('main').innerText();
check(/Ordered · 30 units/.test(reloaded) && (await page.locator('#live-stock').inputValue()) === '6', 'after refresh: stock 6 and “Ordered · 30 units” retained');

// Record a sale through the UI: stock and demand update, sale log + rule-checked stock decrement
await page.locator('main').getByRole('button', { name: 'Record sale' }).first().click();
await page.getByLabel('Units sold', { exact: true }).fill('2');
await page.getByRole('dialog').getByRole('button', { name: 'Record sale' }).click();
await page.waitForTimeout(1500);
const coffee2 = await admin(`stores/${storeId}/products/${coffeeId}`);
const sales = await admin(`stores/${storeId}/sales`);
check(val(coffee2.fields.stock) === 4 && sales.documents?.length === 1, 'sale recorded: stock 6 → 4 and one sales-log entry');

// Next Moves page lists the handled action
await page.getByRole('link', { name: /Next Moves/ }).first().click();
await page.getByRole('heading', { name: 'Handled' }).waitFor();
check(await page.getByText('Ordered · 30 units').first().isVisible(), 'Next Moves shows the handled action');

// Security rules: another account cannot read or write this store
const other = await signUp(`other${Date.now()}@example.com`);
check(await asUser(other.idToken, 'GET', `/stores/${storeId}/products/${coffeeId}`) === 403, 'rules: another user cannot read the store’s products');
check(await asUser(other.idToken, 'PATCH', `/stores/${storeId}/products/${coffeeId}?updateMask.fieldPaths=stock`, { fields: { stock: { integerValue: '999' } } }) === 403, 'rules: another user cannot change stock');
check(await asUser(other.idToken, 'POST', `/stores`, { fields: { ownerUid: { stringValue: me.name.split('/').pop() }, name: { stringValue: 'Fake' } } }) === 403, 'rules: cannot create a store owned by someone else');
const owner = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }) }).then((r) => r.json());
check(await asUser(owner.idToken, 'POST', `/stores/${storeId}/sales`, { fields: { productId: { stringValue: coffeeId }, units: { integerValue: '3' }, date: { stringValue: '2026-10-01' }, at: { integerValue: '1' }, by: { stringValue: 'x' } } }) === 403, 'rules: a sale that does not reduce stock is rejected');
check(await asUser(owner.idToken, 'PATCH', `/stores/${storeId}/products/${coffeeId}?updateMask.fieldPaths=stock`, { fields: { stock: { integerValue: '-5' } } }) === 403, 'rules: negative stock is rejected');
check(await asUser(owner.idToken, 'DELETE', `/stores/${storeId}/sales/${sales.documents[0].name.split('/').pop()}`) === 403, 'rules: the sales log is append-only');

} catch (e) {
  console.log('STOPPED:', String(e.message).split('\n').slice(0, 14).join(' | '));
  const txt = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const k = Math.max(0, txt.indexOf('Live sync'));
  console.log('PAGE TEXT:', txt.slice(k, k + 700));
  failed++;
}
check(errors.length === 0, 'no page errors', errors.join(' | '));
await browser.close();
console.log(failed ? `${failed} CHECK(S) FAILED` : 'ALL E2E CHECKS PASSED');
process.exit(failed ? 1 : 0);

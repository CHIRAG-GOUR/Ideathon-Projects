// Responsive audit: horizontal page overflow + text clipped by an ancestor/viewport + ellipsis truncation.
// Usage: node responsive-audit.mjs http://localhost:3000 "/,/about" "320,390,768,1024,1440"
// Requires Playwright (npm i -D playwright). Mark decorative elements with data-audit-ignore.
import { chromium } from 'playwright';
const [base = 'http://localhost:3000', routesArg = '/', widthsArg = '320,360,390,430,600,768,900,1024,1280,1440'] = process.argv.slice(2);
const routes = routesArg.split(','); const widths = widthsArg.split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
let total = 0;
for (const route of routes) for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  await page.goto(base + route, { waitUntil: 'networkidle' });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(80); }
  await page.waitForTimeout(1200); await page.evaluate(() => window.scrollTo(0, 0));
  const issues = await page.evaluate(() => {
    const out = []; const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`PAGE scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
    const hidden = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || e.classList.contains('sr-only')) return true; } return false; };
    const clip = (el) => { const r = { l: 0, r: vw, t: -1e9, b: 1e9 };
      for (let e = el.parentElement; e; e = e.parentElement) { const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
        if (cs.overflowX !== 'visible') { r.l = Math.max(r.l, b.left); r.r = Math.min(r.r, b.right); }
        if (cs.overflowY !== 'visible') { r.t = Math.max(r.t, b.top); r.b = Math.min(r.b, b.bottom); } } return r; };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const seen = new Set();
    while ((n = tw.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement;
      if (!el || el.closest('svg,canvas,script,style,[data-audit-ignore]') || hidden(el)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const c = clip(el);
      const bad = [...rg.getClientRects()].some((q) => q.width > 0 && (q.left < c.l - 1.5 || q.right > c.r + 1.5 || q.top < c.t - 1.5 || q.bottom > c.b + 1.5));
      const ell = getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
      if ((bad || ell) && !seen.has(t)) { seen.add(t); out.push(`${ell ? 'ELLIPSIS' : 'CLIPPED'} "${t.slice(0, 60)}"`); } }
    return out;
  });
  if (issues.length) { console.log(`\n== ${route} @ ${w}px`); issues.slice(0, 20).forEach((i) => console.log('  ' + i)); total += issues.length; }
  await page.close();
}
console.log(`\nTOTAL ISSUES: ${total}`); await browser.close(); process.exit(total ? 1 : 0);

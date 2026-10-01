// Renders the launcher icon (legacy + adaptive foreground), splash logo and web PNG icons from the SVG mark.
//   node mobile/tools/icons.mjs        (needs Playwright; set PLAYWRIGHT_MODULE if it is not found)
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const full = readFileSync(path.join(root, 'web/public/icon.svg'), 'utf8');
// Adaptive foreground: the mark only, inside the 66/108 safe zone (background colour is a resource).
const mark = full.replace(/<rect width="64" height="64"[^>]*\/>/, '');
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-22 -22 108 108">${mark.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</svg>`;
const R = path.join(root, 'mobile/res');
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const b = await chromium.launch();
const p = await b.newPage();
async function render(svg, px, out) {
  mkdirSync(path.dirname(out), { recursive: true });
  await p.setViewportSize({ width: px, height: px });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
}
for (const [d, s] of Object.entries(dens)) {
  await render(full, 48 * s, `${R}/mipmap-${d}/ic_launcher.png`);
  await render(foreground, 108 * s, `${R}/mipmap-${d}/ic_launcher_foreground.png`);
}
await render(full, 288, `${R}/drawable-xxhdpi/splash_logo.png`);
await render(full, 512, path.join(root, 'web/public/icon-512.png'));
await render(full, 192, path.join(root, 'web/public/icon-192.png'));
await render(full, 180, path.join(root, 'web/public/apple-touch-icon.png'));
await b.close();
console.log('icons ok');

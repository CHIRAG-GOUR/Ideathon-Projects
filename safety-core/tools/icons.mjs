// Renders an app's launcher icon, adaptive foreground, status-bar icon, splash logo and web icons from its SVG brand marks.
//   node safety-core/tools/icons.mjs <app-dir>       reads <app-dir>/android/brand.mjs → { full, foreground, status }
// Needs Playwright (any install); set PLAYWRIGHT_MODULE if it is not found.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const app = path.resolve(process.argv[2]);
const { full, foreground, status } = await import(path.join(app, 'android/brand.mjs'));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const R = path.join(app, 'android/res');
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
  await render(status, 24 * s, `${R}/drawable-${d}/ic_stat.png`);
}
await render(full, 288, `${R}/drawable-xxhdpi/splash_logo.png`);
await render(full, 512, path.join(app, 'web/public/icon-512.png'));
await render(full, 180, path.join(app, 'web/public/apple-touch-icon.png'));
await b.close();
console.log('icons ok');

'use client';
/** Procedural canvas textures for the film (no image assets): facades, asphalt, curbs, signs, glows, sky. */
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const k = key + (opts.repeat ? opts.repeat.join('x') : '');
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  cache.set(k, t);
  return t;
}
export function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Building facade: window grid (map) + the lit windows only (emissiveMap), from one shared layout. */
export function facade(kind: 'office' | 'res' | 'old', seed: number, cols: number, rows: number) {
  const key = `facade-${kind}-${seed}-${cols}-${rows}`;
  const W = 32 * cols, H = 40 * rows;
  const r = rng(seed);
  const cells = Array.from({ length: rows * cols }, () => ({ lit: r() < (kind === 'office' ? 0.5 : 0.38), warm: r() < 0.6, ac: r() < 0.2 }));
  const wall = kind === 'office' ? '#28394f' : kind === 'res' ? ['#b9a48c', '#9d8a7a', '#c7b29a', '#8f9aa0'][seed % 4] : '#7d6d63';
  const draw = (g: CanvasRenderingContext2D, emissive: boolean) => {
    g.fillStyle = emissive ? '#000' : wall;
    g.fillRect(0, 0, W, H);
    cells.forEach((c, i) => {
      const x = (i % cols) * 32, y = Math.floor(i / cols) * 40;
      if (kind === 'office') {
        if (emissive) { if (c.lit) { g.fillStyle = c.warm ? '#ffd99a' : '#9fc8ff'; g.fillRect(x + 2, y + 3, 28, 34); } return; }
        g.fillStyle = c.lit ? (c.warm ? '#fff1cf' : '#cfe6ff') : '#18263a'; g.fillRect(x + 2, y + 3, 28, 34);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 3, 28, 6);
      } else {
        if (emissive) { if (c.lit) { g.fillStyle = c.warm ? '#ffb85c' : '#ffd79a'; g.fillRect(x + 7, y + 8, 18, 22); } return; }
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 5, y + 33, 22, 3);
        g.fillStyle = c.lit ? (c.warm ? '#ffcf86' : '#ffe8b8') : '#2b2a33'; g.fillRect(x + 7, y + 8, 18, 22);
        if (c.ac) { g.fillStyle = '#d7d4d0'; g.fillRect(x + 9, y + 32, 12, 6); }
      }
    });
  };
  return { map: canvas(W, H, (g) => draw(g, false), key), emissive: canvas(W, H, (g) => draw(g, true), key + '-e') };
}

export const asphalt = () => canvas(256, 256, (g) => {
  g.fillStyle = '#2a2b30'; g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 5000; i++) { const v = 30 + r() * 40; g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + r() * 0.3})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(15,15,18,.35)'; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60); g.stroke(); }
}, 'asphalt', { repeat: [120, 2] });

export const paving = () => canvas(128, 128, (g) => {
  g.fillStyle = '#8b8580'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(40,36,34,.45)'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
}, 'paving', { repeat: [300, 1] });

export const curb = () => canvas(128, 16, (g) => {
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#141416' : '#e7c22f'; g.fillRect(i * 32, 0, 32, 16); }
}, 'curb', { repeat: [300, 1] });

export function sign(text: string, bg: string, fg: string, sub?: string, w = 512, h = 128) {
  return canvas(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, w, h * 0.14);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${sub ? h * 0.36 : h * 0.46}px system-ui, sans-serif`;
    g.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
    if (sub) { g.font = `600 ${h * 0.2}px system-ui, sans-serif`; g.globalAlpha = 0.85; g.fillText(sub, w / 2, h * 0.76); }
  }, `sign-${text}-${bg}-${fg}-${sub}-${w}x${h}`);
}

/** A lit shopfront seen through glass: shelves of goods, a counter and a doorway (no brands). */
export function shopfront(seed: number) {
  return canvas(256, 96, (g) => {
    const r = rng(seed * 31 + 5);
    const warm = ['#ffe2b0', '#fff2d8', '#dff0ff', '#ffe9c9'][seed % 4];
    const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, warm); gr.addColorStop(1, '#8a7a66');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 96);
    for (let y = 18; y < 80; y += 16) { g.fillStyle = 'rgba(60,45,35,.55)'; g.fillRect(0, y, 256, 3); for (let x = 2; x < 254; x += 6 + r() * 8) { const h = 5 + r() * 8; g.fillStyle = `hsl(${Math.floor(r() * 360)},${40 + r() * 30}%,${40 + r() * 25}%)`; g.fillRect(x, y - h, 4 + r() * 4, h); } }
    const door = 40 + Math.floor(r() * 170);
    g.fillStyle = 'rgba(30,24,20,.7)'; g.fillRect(door, 20, 34, 76);
    g.fillStyle = 'rgba(60,40,30,.8)'; g.fillRect(0, 74, 256, 22);
    g.strokeStyle = 'rgba(20,20,22,.9)'; g.lineWidth = 4; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 96); g.stroke(); }
  }, `shop-${seed}`);
}

/** Radial glow (alpha), for light pools, halos and contact shadows. */
export const glow = () => canvas(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, 'glow', { srgb: false });

export const skyTex = (mode: 'dusk' | 'night') => canvas(4, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (mode === 'dusk') {
    gr.addColorStop(0, '#0e1a3a'); gr.addColorStop(0.35, '#2b3566'); gr.addColorStop(0.55, '#6b4f7c'); gr.addColorStop(0.66, '#c7707a'); gr.addColorStop(0.72, '#f39a63'); gr.addColorStop(0.78, '#f6c07e'); gr.addColorStop(1, '#3a2f3d');
  } else {
    gr.addColorStop(0, '#040814'); gr.addColorStop(0.5, '#0d1830'); gr.addColorStop(0.72, '#23264a'); gr.addColorStop(0.78, '#3c2f4f'); gr.addColorStop(1, '#141427');
  }
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
}, `sky-${mode}`);

export const ecg = () => canvas(256, 128, (g) => {
  g.fillStyle = '#04140f'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(61,187,126,.25)'; g.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  g.strokeStyle = '#3DDB8E'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= 256; x += 2) { const p = x % 64; const y = p > 28 && p < 32 ? 30 : p >= 32 && p < 36 ? 100 : p >= 36 && p < 40 ? 50 : 70 + Math.sin(x / 8) * 2; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  g.fillStyle = '#3DDB8E'; g.font = '700 22px monospace'; g.fillText('HR 92', 170, 24);
  g.fillStyle = '#7DE7FA'; g.fillText('SpO₂ 97', 150, 120);
}, 'ecg');

export const screenTex = (alert: boolean) => canvas(128, 256, (g) => {
  g.fillStyle = alert ? '#b81d33' : '#0d1c33'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '800 18px system-ui'; g.textAlign = 'center';
  g.fillText(alert ? 'LIFELINE' : '9:42', 64, 80);
  g.font = '600 13px system-ui'; g.fillText(alert ? 'ALERT' : '', 64, 104);
  if (alert) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(14, 130, 100, 40); }
}, `screen-${alert}`);

'use client';

import JsBarcode from 'jsbarcode';
import { PRODUCTS, ZONES, formatExpiry, getRecommendedZone } from '@/lib/products';

/**
 * Draws a printable A4 barcode sheet (150 dpi) onto a canvas and downloads it as PNG.
 * Barcodes are drawn pixel-exact (integer module width, no smoothing) so they scan
 * straight off the printed page.
 */
const W = 1240;
const H = 1754;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        resolve(img);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function buildBarcodeSheet(): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const sans = '"Plus Jakarta Sans", system-ui, sans-serif';
  const serif = 'Fraunces, Georgia, serif';
  const mono = '"JetBrains Mono", ui-monospace, monospace';

  ctx.fillStyle = '#26312A';
  ctx.font = `600 44px ${serif}`;
  ctx.fillText('Smart Stock · Demo Barcodes', 60, 92);
  ctx.font = `500 22px ${sans}`;
  ctx.fillStyle = '#77817A';
  ctx.fillText('Cut along the dashed lines, stick on any object, then scan at /scanner.', 60, 130);

  const top = 170;
  const gap = 30;
  const cardW = (W - 120 - gap) / 2;
  const cardH = (H - top - 60 - gap * 2) / 3;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const zone = ZONES[getRecommendedZone(p)];
    const x = 60 + (i % 2) * (cardW + gap);
    const y = top + Math.floor(i / 2) * (cardH + gap);

    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = '#C9B48E';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardW, cardH, 28);
    ctx.stroke();
    ctx.restore();

    const art = document.querySelector<SVGSVGElement>(`svg[data-art="${p.id}"]`);
    const img = art ? await loadSvgImage(art) : null;
    if (img) ctx.drawImage(img, x + 28, y + 24, 110, 110);

    ctx.fillStyle = '#26312A';
    ctx.font = `800 40px ${sans}`;
    ctx.fillText(p.name.toUpperCase(), x + 152, y + 72);
    ctx.font = `500 20px ${sans}`;
    ctx.fillStyle = '#77817A';
    ctx.fillText(`${p.category} · ${p.quantity} units`, x + 152, y + 104);

    // Zone pill
    ctx.font = `800 18px ${sans}`;
    const pill = zone.label.toUpperCase();
    const pw = ctx.measureText(pill).width + 32;
    ctx.fillStyle = zone.soft;
    roundRect(ctx, x + cardW - pw - 26, y + 30, pw, 36, 18);
    ctx.fill();
    ctx.fillStyle = zone.ink;
    ctx.fillText(pill, x + cardW - pw - 10, y + 55);

    // Barcode (pure black on white, pixel exact)
    const bc = document.createElement('canvas');
    JsBarcode(bc, p.barcode, { format: 'CODE128', width: 3, height: 120, margin: 36, displayValue: false, background: '#FFFFFF', lineColor: '#000000' });
    ctx.imageSmoothingEnabled = false;
    const bx = Math.round(x + (cardW - bc.width) / 2);
    const by = Math.round(y + 148);
    ctx.drawImage(bc, bx, by);

    ctx.fillStyle = '#000000';
    ctx.font = `600 30px ${mono}`;
    const num = p.barcode.split('').join(' ');
    const nw = ctx.measureText(num).width;
    ctx.fillText(num, x + (cardW - nw) / 2, by + bc.height + 34);

    ctx.fillStyle = '#26312A';
    ctx.font = `700 22px ${sans}`;
    ctx.fillText(formatExpiry(p.daysUntilExpiry), x + 28, y + cardH - 32);
    ctx.fillStyle = zone.ink;
    const shelf = `Shelf: ${zone.label}`;
    ctx.fillText(shelf, x + cardW - 28 - ctx.measureText(shelf).width, y + cardH - 32);
  }

  return canvas;
}

export async function downloadBarcodeSheet() {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await buildBarcodeSheet();
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart-stock-demo-barcodes.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

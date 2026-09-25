'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ProductArt } from '@/components/art/ProductArt';
import type { ProductArtId } from '@/lib/products';

/**
 * 3D text and labels are painted onto canvases (instead of loading remote fonts),
 * so the warehouse works offline and uses the page's own fonts.
 */

const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';

function makeTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function useSignTexture(text: string, sub: string, bg: string, fg = '#FFFFFF') {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    rounded(ctx, 0, 0, 512, 128, 28);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = `800 54px ${SANS}`;
    ctx.fillText(text, 256, sub ? 66 : 84);
    if (sub) {
      ctx.globalAlpha = 0.9;
      ctx.font = `600 26px ${SANS}`;
      ctx.fillText(sub, 256, 106);
    }
    return makeTexture(c);
  }, [text, sub, bg, fg]);
}

export function useFloorLabelTexture(text: string, color: string) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    rounded(ctx, 8, 8, 496, 240, 40);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setLineDash([26, 18]);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    rounded(ctx, 8, 8, 496, 240, 40);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.font = `800 58px ${SANS}`;
    ctx.fillText(text, 256, 150);
    return makeTexture(c);
  }, [text, color]);
}

/** Product label for a cardboard box: product picture, name, barcode stripes and status strip. */
export function useBoxLabelTexture(artId: ProductArtId, name: string, barcode: string, strip: string | null) {
  const [art, setArt] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const markup = renderToStaticMarkup(React.createElement(ProductArt, { id: artId, xmlns: 'http://www.w3.org/2000/svg', width: 240, height: 240 }));
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => setArt(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [artId]);

  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFFDF8';
    rounded(ctx, 0, 0, 256, 256, 18);
    ctx.fill();
    if (strip) {
      ctx.fillStyle = strip;
      ctx.fillRect(0, 0, 256, 22);
    }
    if (art) ctx.drawImage(art, 58, 26, 140, 140);
    ctx.fillStyle = '#26312A';
    ctx.textAlign = 'center';
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText(name.toUpperCase(), 128, 196);
    // Decorative barcode stripes (the real barcode appears in the scan card)
    let x = 64;
    for (let i = 0; i < barcode.length * 3; i++) {
      const w = (parseInt(barcode[i % barcode.length], 10) % 3) + 1.5;
      ctx.fillStyle = '#26312A';
      ctx.fillRect(x, 208, w, 30);
      x += w + 2.2;
      if (x > 190) break;
    }
    return makeTexture(c);
  }, [art, name, barcode, strip]);
}

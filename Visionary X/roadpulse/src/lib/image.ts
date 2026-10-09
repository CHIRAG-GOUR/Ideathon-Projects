'use client';

import type { Box } from '@/types';
import { measureQuality, type Quality } from './detection/quality';

/** A photo ready for detection and upload. The original is kept as the user took it (only resized). */
export interface PreparedPhoto {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  blob: Blob; // JPEG, long edge ≤ 1920 px — plenty for pothole detection and review
  url: string; // object URL for previews
  quality: Quality;
}

const MAX_EDGE = 1920;

export async function fileToBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(/heic|heif/i.test(file.type) ? 'This browser can’t open HEIC photos. Please choose a JPG or PNG, or take the photo with the camera button.' : 'That image couldn’t be opened.');
  }
}

export async function preparePhoto(source: ImageBitmap | HTMLCanvasElement): Promise<PreparedPhoto> {
  const sw = source.width, sh = source.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const width = Math.round(sw * scale), height = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await toJpeg(canvas, 0.86);
  const bitmap = await createImageBitmap(canvas);
  // Quality is measured on a small copy (fast, and blur shows up well at this size).
  const q = document.createElement('canvas');
  const qs = Math.min(1, 320 / Math.max(width, height));
  q.width = Math.round(width * qs);
  q.height = Math.round(height * qs);
  const qctx = q.getContext('2d', { willReadFrequently: true })!;
  qctx.drawImage(canvas, 0, 0, q.width, q.height);
  const quality = measureQuality(qctx.getImageData(0, 0, q.width, q.height).data, q.width, q.height);
  return { bitmap, width, height, blob, url: URL.createObjectURL(blob), quality };
}

export function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode image'))), 'image/jpeg', quality));
}

/** Separate annotated copy with the detection box drawn — the original is never modified. */
export async function annotate(photo: PreparedPhoto, box: Box, label: string): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = photo.width;
  c.height = photo.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(photo.bitmap, 0, 0);
  const lw = Math.max(3, Math.round(Math.max(c.width, c.height) / 300));
  ctx.strokeStyle = '#E5484D';
  ctx.lineWidth = lw;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  const fs = Math.max(16, Math.round(c.width / 40));
  ctx.font = `600 ${fs}px Inter, sans-serif`;
  const tw = ctx.measureText(label).width + fs;
  const ty = Math.max(0, box.y - fs * 1.6);
  ctx.fillStyle = '#E5484D';
  ctx.fillRect(box.x - lw / 2, ty, tw, fs * 1.6);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, box.x + fs / 2 - lw / 2, ty + fs * 1.15);
  return toJpeg(c, 0.85);
}

/** Crop around a detection for vehicle events (small upload, just the hazard + context). */
export async function cropEvent(source: CanvasImageSource, w: number, h: number, box: Box): Promise<Blob> {
  const pad = 0.6;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const cw = Math.min(w, box.w * (1 + pad * 2), Math.max(box.w * 2, 480));
  const ch = Math.min(h, box.h * (1 + pad * 2), Math.max(box.h * 2, 360));
  const x = Math.max(0, Math.min(w - cw, cx - cw / 2)), y = Math.max(0, Math.min(h - ch, cy - ch / 2));
  const c = document.createElement('canvas');
  const s = Math.min(1, 800 / Math.max(cw, ch));
  c.width = Math.round(cw * s);
  c.height = Math.round(ch * s);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, x, y, cw, ch, 0, 0, c.width, c.height);
  ctx.strokeStyle = '#E5484D';
  ctx.lineWidth = 3;
  ctx.strokeRect((box.x - x) * s, (box.y - y) * s, box.w * s, box.h * s);
  return toJpeg(c, 0.8);
}

export function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] ?? '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

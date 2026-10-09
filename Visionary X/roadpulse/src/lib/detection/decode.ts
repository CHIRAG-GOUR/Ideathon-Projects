import type { Box, Detection, Severity } from '@/types';

/**
 * YOLOv8 (Ultralytics ONNX export) post-processing.
 * Output tensor: [1, 4 + numClasses, N] (channels-first), rows = cx, cy, w, h, class scores…
 * Some exports are transposed to [1, N, 4 + numClasses]; both are handled.
 */

export interface Letterbox {
  scale: number; // model px per image px
  padX: number;
  padY: number;
  size: number; // model input size (square)
}

export function letterbox(imageW: number, imageH: number, size: number): Letterbox {
  const scale = Math.min(size / imageW, size / imageH);
  const padX = Math.round((size - imageW * scale) / 2);
  const padY = Math.round((size - imageH * scale) / 2);
  return { scale, padX, padY, size };
}

export function decodeYolo(
  data: Float32Array,
  dims: readonly number[],
  opts: { classIndex: number; minConfidence: number; lb: Letterbox; imageW: number; imageH: number }
): Detection[] {
  if (dims.length !== 3) return [];
  const [, a, b] = dims;
  // Channels = the small dimension (4 + classes); anchors = the big one (8400 at 640px).
  const channelsFirst = a < b;
  const C = channelsFirst ? a : b;
  const N = channelsFirst ? b : a;
  if (C < 5 || opts.classIndex >= C - 4) return [];
  const at = (c: number, i: number) => (channelsFirst ? data[c * N + i] : data[i * C + c]);
  const out: Detection[] = [];
  for (let i = 0; i < N; i++) {
    const conf = at(4 + opts.classIndex, i);
    if (!(conf >= opts.minConfidence)) continue;
    const cx = at(0, i), cy = at(1, i), w = at(2, i), h = at(3, i);
    // Undo letterbox → original image pixels, clamped to the image.
    const x1 = clamp((cx - w / 2 - opts.lb.padX) / opts.lb.scale, 0, opts.imageW);
    const y1 = clamp((cy - h / 2 - opts.lb.padY) / opts.lb.scale, 0, opts.imageH);
    const x2 = clamp((cx + w / 2 - opts.lb.padX) / opts.lb.scale, 0, opts.imageW);
    const y2 = clamp((cy + h / 2 - opts.lb.padY) / opts.lb.scale, 0, opts.imageH);
    if (x2 - x1 < 2 || y2 - y1 < 2) continue;
    out.push({ box: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, confidence: conf });
  }
  return nms(out, 0.45);
}

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export function nms(dets: Detection[], threshold: number): Detection[] {
  const sorted = [...dets].sort((p, q) => q.confidence - p.confidence);
  const keep: Detection[] = [];
  for (const d of sorted) if (keep.every((k) => iou(k.box, d.box) < threshold)) keep.push(d);
  return keep;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Confidence bands used everywhere (UI wording + whether a report counts as AI-confirmed). */
export const CONFIDENCE = { high: 0.6, medium: 0.35 } as const;
export type ConfidenceBand = 'high' | 'medium' | 'low';
export function confidenceBand(c: number | null | undefined): ConfidenceBand {
  if (c == null) return 'low';
  return c >= CONFIDENCE.high ? 'high' : c >= CONFIDENCE.medium ? 'medium' : 'low';
}

/**
 * AI-estimated severity from how much of the frame the pothole covers (a proxy for size) and
 * how sure the model is. It is NOT a depth measurement — the UI always labels it "AI-estimated".
 */
export function estimateSeverity(box: Box | null, imageW: number, imageH: number, confidence: number | null): Severity {
  if (!box || confidence == null || confidence < CONFIDENCE.medium) return 'unknown';
  const share = (box.w * box.h) / Math.max(1, imageW * imageH);
  if (share >= 0.08) return 'high';
  if (share >= 0.025) return 'medium';
  return 'low';
}

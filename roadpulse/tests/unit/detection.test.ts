import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confidenceBand, decodeYolo, estimateSeverity, iou, letterbox, nms } from '../../src/lib/detection/decode';
import { measureQuality } from '../../src/lib/detection/quality';
import { IouTracker, distanceM } from '../../src/lib/tracker';

/** Build a YOLOv8-style [1, 5, N] tensor with the given (cx, cy, w, h, conf) anchors. */
function tensor(N: number, anchors: [number, number, number, number, number][], transposed = false) {
  const C = 5;
  const d = new Float32Array(C * N);
  anchors.forEach((a, i) => a.forEach((v, c) => (transposed ? (d[i * C + c] = v) : (d[c * N + i] = v))));
  return { data: d, dims: transposed ? [1, N, C] : [1, C, N] };
}

test('letterbox maps a 1280×720 photo into 640×640 with vertical padding', () => {
  const lb = letterbox(1280, 720, 640);
  assert.equal(lb.scale, 0.5);
  assert.equal(lb.padX, 0);
  assert.equal(lb.padY, 140);
});

test('YOLOv8 output is decoded back to original image pixels (both layouts)', () => {
  const lb = letterbox(1280, 720, 640);
  for (const transposed of [false, true]) {
    // Box centred at model (320, 320) 200×100 → image centre (640, 360), 400×200.
    const { data, dims } = tensor(8400, [[320, 320, 200, 100, 0.91]], transposed);
    const [d] = decodeYolo(data, dims, { classIndex: 0, minConfidence: 0.25, lb, imageW: 1280, imageH: 720 });
    assert.ok(d, `decoded (${transposed ? 'transposed' : 'channels-first'})`);
    assert.ok(Math.abs(d.box.x - 440) < 0.01 && Math.abs(d.box.y - 260) < 0.01 && Math.abs(d.box.w - 400) < 0.01 && Math.abs(d.box.h - 200) < 0.01);
    assert.ok(Math.abs(d.confidence - 0.91) < 1e-6);
  }
});

test('low-confidence anchors are ignored and overlapping boxes are merged (NMS)', () => {
  const lb = letterbox(640, 640, 640);
  const { data, dims } = tensor(10, [
    [100, 100, 50, 50, 0.9],
    [102, 101, 50, 50, 0.8], // duplicate of the first
    [400, 400, 60, 60, 0.7],
    [500, 500, 60, 60, 0.1], // too weak
  ]);
  const dets = decodeYolo(data, dims, { classIndex: 0, minConfidence: 0.25, lb, imageW: 640, imageH: 640 });
  assert.equal(dets.length, 2);
  assert.equal(dets[0].confidence.toFixed(1), '0.9');
  assert.equal(nms(dets, 0.45).length, 2);
  assert.ok(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 }) > 0.3);
});

test('a class index the model does not have yields nothing (never guesses)', () => {
  const { data, dims } = tensor(10, [[100, 100, 50, 50, 0.9]]);
  assert.equal(decodeYolo(data, dims, { classIndex: 3, minConfidence: 0.25, lb: letterbox(640, 640, 640), imageW: 640, imageH: 640 }).length, 0);
});

test('confidence bands and AI-estimated severity', () => {
  assert.equal(confidenceBand(0.93), 'high');
  assert.equal(confidenceBand(0.45), 'medium');
  assert.equal(confidenceBand(0.2), 'low');
  assert.equal(estimateSeverity({ x: 0, y: 0, w: 500, h: 400 }, 1000, 1000, 0.9), 'high');
  assert.equal(estimateSeverity({ x: 0, y: 0, w: 200, h: 200 }, 1000, 1000, 0.9), 'medium');
  assert.equal(estimateSeverity({ x: 0, y: 0, w: 50, h: 50 }, 1000, 1000, 0.9), 'low');
  assert.equal(estimateSeverity({ x: 0, y: 0, w: 500, h: 400 }, 1000, 1000, 0.2), 'unknown', 'no severity without a confident detection');
  assert.equal(estimateSeverity(null, 1000, 1000, null), 'unknown');
});

test('image quality: dark, flat (blurry) and textured images', () => {
  const W = 64, H = 64;
  const img = (f: (x: number, y: number) => number) => {
    const a = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y); a.set([v, v, v, 255], (y * W + x) * 4); }
    return a;
  };
  assert.equal(measureQuality(img(() => 15), W, H).problem, 'dark');
  assert.equal(measureQuality(img(() => 128), W, H).problem, 'blurry');
  const textured = measureQuality(img((x, y) => ((x * 7 + y * 13) % 40) * 4 + 60), W, H);
  assert.equal(textured.ok, true, JSON.stringify(textured));
});

test('tracker confirms a pothole only after several frames', () => {
  const t = new IouTracker();
  const det = (x: number, c = 0.8) => [{ box: { x, y: 100, w: 80, h: 50 }, confidence: c }];
  assert.equal(t.update(det(100), 0).length, 0);
  assert.equal(t.update(det(104), 100).length, 0);
  const confirmed = t.update(det(108), 200);
  assert.equal(confirmed.length, 1);
  assert.equal(t.update(det(112), 300).length, 0, 'confirmed once only');
  const flicker = new IouTracker();
  flicker.update(det(100), 0);
  flicker.update([], 100);
  flicker.update([], 200);
  assert.equal(flicker.update(det(400), 300).length, 0, 'a new box elsewhere is a new track');
  const weak = new IouTracker();
  for (let i = 0; i < 5; i++) assert.equal(weak.update(det(100, 0.3), i * 100).length, 0, 'weak detections never confirm');
});

test('distance between coordinates', () => {
  const d = distanceM(28.6139, 77.209, 28.6148, 77.209);
  assert.ok(d > 99 && d < 101, String(d));
});

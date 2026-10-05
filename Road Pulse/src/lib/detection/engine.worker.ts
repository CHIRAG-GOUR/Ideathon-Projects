/// <reference lib="webworker" />
/**
 * Detection worker: runs YOLOv8 off the main thread so the live camera stays smooth.
 * Backend: WebGPU (phone GPU) when available, else multi-threaded WebAssembly (single-threaded if the page
 * isn't cross-origin isolated). Frames arrive as transferable ImageBitmaps and are never sent anywhere.
 */
import { decodeYolo, letterbox } from './decode';

type Ort = typeof import('onnxruntime-web');
let ort: Ort | null = null;
let session: import('onnxruntime-web').InferenceSession | null = null;
let INPUT = 640;
let CLASS = 0;
let backend = 'wasm';
let canvas: OffscreenCanvas | null = null;

async function init(msg: { modelUrl: string; fallbackUrl: string | null; input: number; classIndex: number }) {
  INPUT = msg.input;
  CLASS = msg.classIndex;
  const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator && !!(await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter().catch(() => null));
  ort = hasGpu ? await import('onnxruntime-web/webgpu') : await import('onnxruntime-web/wasm');
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.numThreads = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated ? Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  const providers = hasGpu ? ['webgpu', 'wasm'] : ['wasm'];
  const create = (url: string) => ort!.InferenceSession.create(url, { executionProviders: providers, graphOptimizationLevel: 'all' });
  try {
    session = await create(msg.modelUrl);
  } catch (err) {
    if (!msg.fallbackUrl) throw err;
    session = await create(msg.fallbackUrl);
  }
  backend = hasGpu ? 'webgpu' : `wasm×${ort.env.wasm.numThreads}`;
  // Warm-up run so the first real frame is fast.
  await run(new Float32Array(3 * INPUT * INPUT));
  return backend;
}

async function run(input: Float32Array) {
  const feeds = { [session!.inputNames[0]]: new ort!.Tensor('float32', input, [1, 3, INPUT, INPUT]) };
  const out = (await session!.run(feeds))[session!.outputNames[0]];
  const data = (await out.getData()) as Float32Array;
  return { data, dims: out.dims };
}

async function detect(bitmap: ImageBitmap, width: number, height: number, minConfidence: number) {
  const lb = letterbox(width, height, INPUT);
  canvas ??= new OffscreenCanvas(INPUT, INPUT);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = 'rgb(114,114,114)';
  ctx.fillRect(0, 0, INPUT, INPUT);
  ctx.drawImage(bitmap, lb.padX, lb.padY, Math.round(width * lb.scale), Math.round(height * lb.scale));
  bitmap.close();
  const px = ctx.getImageData(0, 0, INPUT, INPUT).data;
  const plane = INPUT * INPUT;
  const input = new Float32Array(3 * plane);
  for (let i = 0, j = 0; i < plane; i++, j += 4) {
    input[i] = px[j] / 255;
    input[plane + i] = px[j + 1] / 255;
    input[2 * plane + i] = px[j + 2] / 255;
  }
  const { data, dims } = await run(input);
  return decodeYolo(data, dims, { classIndex: CLASS, minConfidence, lb, imageW: width, imageH: height });
}

self.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      const b = await init(m);
      self.postMessage({ type: 'ready', backend: b });
    } else if (m.type === 'detect') {
      const t0 = performance.now();
      const dets = await detect(m.bitmap, m.width, m.height, m.minConfidence);
      self.postMessage({ type: 'result', id: m.id, dets, ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    self.postMessage({ type: m.type === 'init' ? 'init-error' : 'error', id: m.id, message: String((err as Error)?.message ?? err) });
  }
};

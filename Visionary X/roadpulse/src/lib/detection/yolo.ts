'use client';

import type { Detection, DetectionSummary } from '@/types';

/**
 * YOLOv8 pothole detector, on-device. Model: YOLOv8s fine-tuned on potholes (1 class)
 * https://huggingface.co/peterhdd/pothole-detection-yolov8 (Apache-2.0). `npm run fetch-model` copies it to
 * /models so it's served from our own site; if it's missing there, the browser loads it from Hugging Face.
 */
const LOCAL_MODEL = process.env.NEXT_PUBLIC_MODEL_URL || '/models/pothole-yolov8s.onnx';
const FALLBACK_MODEL = process.env.NEXT_PUBLIC_MODEL_URL ? null : 'https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.onnx';
export const MODEL_NAME = process.env.NEXT_PUBLIC_MODEL_NAME || 'YOLOv8s-pothole';
const INPUT = Number(process.env.NEXT_PUBLIC_MODEL_INPUT || 640);
const CLASS_INDEX = Number(process.env.NEXT_PUBLIC_POTHOLE_CLASS || 0);

export type ModelState = 'idle' | 'loading' | 'ready' | 'error';
let state: ModelState = 'idle';
let backend: string | null = null;
const listeners = new Set<(s: ModelState) => void>();
function setState(s: ModelState) {
  state = s;
  listeners.forEach((l) => l(s));
}
export const modelState = () => state;
export const modelBackend = () => backend;
export function onModelState(fn: (s: ModelState) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let worker: Worker | null = null;
let ready: Promise<string> | null = null;
let seq = 0;
const waiting = new Map<number, { resolve: (v: { dets: Detection[]; ms: number }) => void; reject: (e: Error) => void }>();

export function loadModel(): Promise<string> {
  if (ready) return ready;
  setState('loading');
  worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
  ready = new Promise<string>((resolve, reject) => {
    worker!.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'ready') {
        backend = m.backend;
        setState('ready');
        resolve(m.backend);
      } else if (m.type === 'init-error') {
        setState('error');
        ready = null;
        worker?.terminate();
        worker = null;
        reject(new Error(m.message));
      } else if (m.type === 'result' || m.type === 'error') {
        const w = waiting.get(m.id);
        waiting.delete(m.id);
        if (m.type === 'result') w?.resolve({ dets: m.dets, ms: m.ms });
        else w?.reject(new Error(m.message));
      }
    };
    worker!.onerror = (e) => {
      setState('error');
      ready = null;
      reject(new Error(e.message || 'Detector failed to start'));
    };
  });
  worker.postMessage({ type: 'init', modelUrl: LOCAL_MODEL, fallbackUrl: FALLBACK_MODEL, input: INPUT, classIndex: CLASS_INDEX });
  return ready;
}

/** Detect potholes in an image / canvas / live video frame. The frame stays on this device. */
export async function detect(source: CanvasImageSource, width: number, height: number, minConfidence = 0.25): Promise<DetectionSummary & { all: Detection[]; ms: number }> {
  await loadModel();
  const bitmap = await createImageBitmap(source as ImageBitmapSource);
  const id = ++seq;
  const { dets, ms } = await new Promise<{ dets: Detection[]; ms: number }>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker!.postMessage({ type: 'detect', id, bitmap, width, height, minConfidence }, [bitmap]);
  });
  return { best: dets[0] ?? null, count: dets.length, imageWidth: width, imageHeight: height, model: MODEL_NAME, all: dets, ms };
}

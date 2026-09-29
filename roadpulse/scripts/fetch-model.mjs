// Downloads the pothole model into public/models so RoadPulse serves it from its own site (and it's cached offline).
// Model: YOLOv8s fine-tuned for potholes — https://huggingface.co/peterhdd/pothole-detection-yolov8 (Apache-2.0).
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const URL_ = process.env.ROADPULSE_MODEL_SOURCE || 'https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.onnx';
const OUT = 'public/models/pothole-yolov8s.onnx';
mkdirSync('public/models', { recursive: true });
if (existsSync(OUT) && statSync(OUT).size > 1_000_000) {
  console.log(`[model] ${OUT} already present (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
} else {
  console.log(`[model] downloading ${URL_} …`);
  const res = await fetch(URL_, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Model download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(OUT));
  console.log(`[model] saved ${OUT} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
}

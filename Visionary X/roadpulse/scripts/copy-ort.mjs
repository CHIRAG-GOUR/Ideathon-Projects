// Serve onnxruntime-web's WebAssembly files from our own site (works offline, no CDN).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
const src = 'node_modules/onnxruntime-web/dist';
if (existsSync(src)) {
  mkdirSync('public/ort', { recursive: true });
  for (const f of readdirSync(src)) if (/^ort-wasm-simd-threaded(\.jsep|\.asyncify)?\.(wasm|mjs)$/.test(f)) cpSync(`${src}/${f}`, `public/ort/${f}`);
}

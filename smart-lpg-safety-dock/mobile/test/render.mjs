// Renders the Android app's real 3D scenes without a device: RenderShot.java runs KitchenRenderer/ProductRenderer on the
// JVM against a recording GLES20 stub; this replays the recorded GL calls in WebGL (same GLSL ES 1.00) and saves PNGs.
//   node mobile/test/render.mjs [outDir]      (needs JDK + Playwright; run `bash mobile/build.sh` once for android.jar)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(M, 'build/shots'));
mkdirSync(out, { recursive: true });
const sdk = process.env.ANDROID_SDK_ROOT || '/opt/android-sdk-lite';
const jar = [path.join(sdk, 'platforms/android-34/android.jar'), path.join(M, '.tools/android.jar')].find(existsSync);
if (!jar) throw new Error('android.jar not found — run bash mobile/build.sh first');
const cls = mkdtempSync(path.join(os.tmpdir(), 'lpg-render-'));
const srcs = execFileSync('find', [path.join(M, 'src/com/skillizee/lpgdock/engine'), path.join(M, 'src/com/skillizee/lpgdock/gl'), path.join(M, 'src/com/skillizee/lpgdock/sim'), '-name', '*.java']).toString().trim().split('\n')
  .filter((f) => !/SceneView|Clock|App\.java/.test(f));
// The stub goes first on the classpath so it replaces the framework GLES20 (which needs a real GL context).
execFileSync('javac', ['-nowarn', '-encoding', 'UTF-8', '--release', '11', '-cp', jar, '-d', cls, path.join(M, 'test/glshim/android/opengl/GLES20.java'), path.join(M, 'test/RenderShot.java'), ...srcs], { stdio: ['ignore', 'ignore', 'inherit'] });
const shots = [
  ['kitchen', 'with', 11, 'android-with-warning'],
  ['kitchen', 'with', 30, 'android-with-contained'],
  ['kitchen', 'without', 21.5, 'android-without-incident'],
  ['compare', 'with', 16, 'android-compare'],
  ['product', 'with', 1, 'android-dock'],
  ['kitchen', 'with', 5, 'android-with-cooking'],
];
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
for (const [kind, scen, t, name] of shots) {
  const [w, h] = kind === 'compare' ? [720, 900] : [720, 560];
  const json = path.join(cls, `${name}.json`);
  const log = execFileSync('java', ['-cp', `${cls}:${jar}`, 'RenderShot', path.join(M, '../shared/dock-config.json'), kind, scen, String(t), String(w), String(h), json]).toString().trim();
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<canvas id=c width=${w} height=${h} style="display:block"></canvas>`);
  const err = await p.evaluate((rec) => {
    const gl = document.getElementById('c').getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    const obj = {}, loc = {}, attr = {}, bufs = {};
    let prog = null;
    for (const [id, data] of Object.entries(rec.buffers)) { const bo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); bufs[id] = bo; }
    for (const [op, ...a] of rec.frame) {
      switch (op) {
        case 'createShader': obj[a[0]] = gl.createShader(a[1]); break;
        case 'shaderSource': gl.shaderSource(obj[a[0]], a[1]); break;
        case 'compileShader': gl.compileShader(obj[a[0]]); if (!gl.getShaderParameter(obj[a[0]], gl.COMPILE_STATUS)) return gl.getShaderInfoLog(obj[a[0]]); break;
        case 'createProgram': obj[a[0]] = gl.createProgram(); break;
        case 'attachShader': gl.attachShader(obj[a[0]], obj[a[1]]); break;
        case 'linkProgram': gl.linkProgram(obj[a[0]]); break;
        case 'useProgram': prog = obj[a[0]]; gl.useProgram(prog); break;
        case 'attrib': attr[a[2]] = gl.getAttribLocation(obj[a[0]], a[1]); break;
        case 'uniform': loc[a[2]] = gl.getUniformLocation(obj[a[0]], a[1]); break;
        case 'enable': gl.enable(a[0]); break;
        case 'disable': gl.disable(a[0]); break;
        case 'blendFunc': gl.blendFunc(a[0], a[1]); break;
        case 'depthMask': gl.depthMask(a[0]); break;
        case 'clearColor': gl.clearColor(...a); break;
        case 'clear': gl.clear(a[0]); break;
        case 'viewport': gl.viewport(...a); break;
        case 'scissor': gl.scissor(...a); break;
        case 'u1f': gl.uniform1f(loc[a[0]], a[1]); break;
        case 'u3f': gl.uniform3f(loc[a[0]], a[1], a[2], a[3]); break;
        case 'u4f': gl.uniform4f(loc[a[0]], a[1], a[2], a[3], a[4]); break;
        case 'um4': gl.uniformMatrix4fv(loc[a[0]], false, new Float32Array(a[1])); break;
        case 'enableAttrib': gl.enableVertexAttribArray(attr[a[0]]); break;
        case 'attribPointer': gl.bindBuffer(gl.ARRAY_BUFFER, bufs[a[4]]); gl.vertexAttribPointer(attr[a[0]], a[1], gl.FLOAT, false, a[2], a[3]); break;
        case 'drawArrays': gl.drawArrays(a[0], a[1], a[2]); break;
        default: return 'unknown op ' + op;
      }
    }
    const e = gl.getError();
    return e ? 'GL error ' + e : null;
  }, JSON.parse(readFileSync(json, 'utf8')));
  if (err) throw new Error(`${name}: ${err}`);
  await p.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`${name}.png  (${log})`);
}
await b.close();

// Compiles and links the app's GLES 2.0 shaders (Gl.java) as WebGL 1 / GLSL ES 1.00 in headless Chromium.
//   node mobile/test/shaders.mjs      (needs Playwright; set PLAYWRIGHT_MODULE if it is not found)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '../src/com/skillizee/lpgdock/gl/Gl.java'), 'utf8');
const grab = (name) => {
  const m = src.match(new RegExp(`static final String ${name} =([\\s\\S]*?");`));
  if (!m) throw new Error(`${name} not found in Gl.java`);
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => JSON.parse(`"${x[1]}"`)).join('\n');
};
const vs = grab('VS'), fs = grab('FS');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
const r = await p.evaluate(([vs, fs]) => {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return { ok: false, log: 'no WebGL in this browser' };
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return [o, gl.getShaderParameter(o, gl.COMPILE_STATUS), gl.getShaderInfoLog(o)]; };
  const [v, vok, vlog] = sh(gl.VERTEX_SHADER, vs), [f, fok, flog] = sh(gl.FRAGMENT_SHADER, fs);
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  const lok = gl.getProgramParameter(pr, gl.LINK_STATUS);
  const uniforms = []; for (let i = 0; i < gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i++) uniforms.push(gl.getActiveUniform(pr, i).name);
  return { ok: vok && fok && lok, log: [vlog, flog, gl.getProgramInfoLog(pr)].filter(Boolean).join('\n'), uniforms };
}, [vs, fs]);
await b.close();
// Every uniform the Java code sets must exist (an optimised-away or misspelt uniform silently does nothing).
const used = [...new Set([...readFileSync(path.join(here, '../src/com/skillizee/lpgdock/gl/Gl.java'), 'utf8').matchAll(/glGetUniformLocation\(\w+, "(\w+)"\)/g)].map((m) => m[1]))];
const missing = used.filter((u) => !(r.uniforms || []).includes(u));
console.log(r.ok ? `SHADERS OK — compiled + linked; active uniforms: ${r.uniforms.join(', ')}` : `SHADER ERROR\n${r.log}`);
if (missing.length) console.log(`Uniforms set in Java but not active in the program: ${missing.join(', ')}`);
process.exit(r.ok && !missing.length ? 0 : 1);

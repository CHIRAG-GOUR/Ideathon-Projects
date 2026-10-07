'use client';
/**
 * The film's people: articulated, human-proportioned bodies (tapered limbs, shaped torso, hands), real faces
 * (eyeballs with irises, blinking lids, brows, nose, lips, ears, hair) and expressions that blend over time —
 * worry, pain, shock, relief, a smile, talking. Clothing is built per outfit: shirts with collars, kurta and
 * salwar-kameez with side slits that follow the legs, a dupatta, a doctor's coat, hi-vis paramedic uniforms.
 * Faces +z; the pelvis is the group origin (~0.94 m above the feet standing).
 */
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mat, useClock } from './shared';

// ---------------------------------------------------------------------------------------------- poses
export interface Pose { spine: number; head: number; headYaw: number; hipL: number; hipR: number; kneeL: number; kneeR: number; shL: number; shR: number; shLz: number; shRz: number; elL: number; elR: number }
const Z: Pose = { spine: 0, head: 0, headYaw: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, shLz: 0, shRz: 0, elL: 0, elR: 0 };
export const POSE: Record<string, Pose> = {
  stand: { ...Z, shLz: 0.08, shRz: 0.08, elL: 0.14, elR: 0.14 },
  ride: { ...Z, spine: 0.38, head: -0.36, hipL: 1.3, hipR: 1.3, kneeL: 1.5, kneeR: 1.5, shL: 1.25, shR: 1.25, shLz: 0.28, shRz: 0.28, elL: 0.3, elR: 0.3 },
  kneel: { ...Z, spine: 0.42, head: 0.35, hipL: 1.45, kneeL: 1.55, hipR: -0.05, kneeR: 1.6, shL: 0.75, shR: 0.95, elL: 0.55, elR: 0.4, shLz: 0.1, shRz: 0.1 },
  sit: { ...Z, spine: -0.06, hipL: 1.5, hipR: 1.5, kneeL: 1.5, kneeR: 1.5, shL: 0.35, shR: 0.35, elL: 0.95, elR: 0.95, shLz: 0.12, shRz: 0.12 },
  lying: { ...Z, head: -0.2, headYaw: 0.35, hipL: 0.08, hipR: 0.3, kneeL: 0.15, kneeR: 0.55, shL: 0.15, shR: -0.1, shLz: 0.55, shRz: 0.3, elL: 0.3, elR: 0.5 },
  reach: { ...Z, head: -0.1, headYaw: -0.5, hipL: 0.08, hipR: 0.35, kneeL: 0.15, kneeR: 0.6, shL: 0.15, shR: 0.3, shLz: 0.55, shRz: 1.35, elL: 0.3, elR: 0.25 },
  phone: { ...Z, head: -0.45, headYaw: 0, hipL: 0.08, hipR: 0.35, kneeL: 0.15, kneeR: 0.6, shL: 0.15, shR: 1.9, shLz: 0.5, shRz: 0.15, elL: 0.3, elR: 1.25 },
  stretcher: { ...Z, head: -0.15, hipL: 0.04, hipR: 0.04, kneeL: 0.08, kneeR: 0.1, shL: 0.05, shR: 0.05, shLz: 0.12, shRz: 0.12, elL: 0.2, elR: 0.2 },
  bed: { ...Z, spine: 0.0, head: -0.35, hipL: 0.1, hipR: 0.1, kneeL: 0.2, kneeR: 0.2, shL: 0.1, shR: 0.35, shLz: 0.12, shRz: 0.2, elL: 0.3, elR: 0.9 },
  phoneEar: { ...Z, head: 0.1, shLz: 0.08, elL: 0.15, shR: 0.55, shRz: 0.55, elR: 2.45 },
  hold: { ...Z, shL: 0.55, shR: 0.55, elL: 0.9, elR: 0.9, shLz: 0.08, shRz: 0.08 },
  hug: { ...Z, spine: 0.12, shL: 1.25, shR: 1.25, shLz: -0.25, shRz: -0.25, elL: 1.1, elR: 1.1 },
  shoulder: { ...Z, shLz: 0.08, elL: 0.14, shR: 0.9, shRz: -0.35, elR: 0.35 },
  push: { ...Z, spine: 0.18, shL: 1.05, shR: 1.05, elL: 0.55, elR: 0.55, shLz: 0.08, shRz: 0.08 },
  look: { ...Z, spine: 0.08, head: 0.25, shL: 0.2, shR: 0.2, elL: 0.4, elR: 0.4, shLz: 0.08, shRz: 0.08 },
  // the two-person lift: kneeling, hands slid under shoulders and hips → standing, holding at the waist
  liftLow: { ...Z, spine: 0.75, head: 0.3, hipL: 1.45, kneeL: 1.55, hipR: -0.05, kneeR: 1.6, shL: 1.25, shR: 1.25, shLz: -0.12, shRz: -0.12, elL: 0.25, elR: 0.25 },
  carry: { ...Z, spine: 0.16, head: 0.25, hipL: 0.12, hipR: 0.12, kneeL: 0.22, kneeR: 0.22, shL: 0.85, shR: 0.85, shLz: -0.2, shRz: -0.2, elL: 0.95, elR: 0.95 },
  carryLow: { ...Z, spine: 0.55, head: 0.35, hipL: 0.5, hipR: 0.5, kneeL: 0.6, kneeR: 0.6, shL: 1.05, shR: 1.05, shLz: -0.15, shRz: -0.15, elL: 0.55, elR: 0.55 },
  door: { ...Z, spine: 0.1, head: 0.1, shR: 1.35, shRz: 0.1, elR: 0.25, shLz: 0.1, elL: 0.2 },
};
export function walk(phase: number, run = false): Pose {
  const a = run ? 0.75 : 0.42, s = Math.sin(phase);
  return {
    ...Z, spine: run ? 0.22 : 0.03, head: run ? -0.1 : 0,
    hipL: a * s, hipR: -a * s,
    kneeL: (run ? 0.35 : 0.12) + (run ? 1.1 : 0.55) * Math.max(0, -Math.cos(phase - 0.4)), kneeR: (run ? 0.35 : 0.12) + (run ? 1.1 : 0.55) * Math.max(0, Math.cos(phase - 0.4)),
    shL: -(run ? 0.7 : 0.32) * s, shR: (run ? 0.7 : 0.32) * s, shLz: 0.08, shRz: 0.08, elL: run ? 1.3 : 0.25, elR: run ? 1.3 : 0.25,
  };
}
export function mix(a: Pose, b: Pose, k: number): Pose {
  const o = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => { o[key] = a[key] + (b[key] - a[key]) * k; });
  return o;
}

// ---------------------------------------------------------------------------------------------- faces
export type Expr = 'neutral' | 'calm' | 'worried' | 'pain' | 'shock' | 'relief' | 'smile' | 'focus' | 'cry';
interface Face { browIn: number; browY: number; squint: number; smile: number; open: number }
const EXPR: Record<Expr, Face> = {
  neutral: { browIn: 0, browY: 0, squint: 0.08, smile: 0.05, open: 0 },
  calm: { browIn: 0.1, browY: 0.05, squint: 0.15, smile: 0.25, open: 0 },
  worried: { browIn: 0.95, browY: 0.25, squint: 0.12, smile: -0.45, open: 0.08 },
  pain: { browIn: -0.8, browY: -0.35, squint: 0.7, smile: -0.75, open: 0.45 },
  shock: { browIn: 0.45, browY: 1, squint: -0.15, smile: -0.25, open: 0.65 },
  relief: { browIn: 0.55, browY: 0.15, squint: 0.3, smile: 0.75, open: 0.05 },
  smile: { browIn: 0, browY: 0.12, squint: 0.32, smile: 1, open: 0.12 },
  focus: { browIn: -0.35, browY: -0.12, squint: 0.25, smile: 0, open: 0 },
  cry: { browIn: 1, browY: 0.3, squint: 0.6, smile: -0.85, open: 0.28 },
};
export interface FaceState { expr: Expr; to?: Expr; k?: number; talk?: number; closed?: number; look?: number }

// ---------------------------------------------------------------------------------------------- outfits
export interface Outfit {
  skin: string; hair: string; shirt: string; pants: string; shoes: string;
  female?: boolean;
  /** 1 = average; >1 heavier (belly, broader) */
  build?: number;
  top?: 'shirt' | 'tee' | 'kurta' | 'kameez' | 'uniform' | 'scrubs';
  sleeves?: 'long' | 'short' | 'elbow';
  /** loose salwar / pyjama trousers */
  loose?: boolean;
  /** printed fabric motif colour for kurta / kameez */
  print?: string;
  dupatta?: string;
  coat?: string; helmet?: string; backpack?: string; stripe?: string; mask?: boolean;
  hairStyle?: 'short' | 'side' | 'bun' | 'long' | 'receding';
  grey?: boolean; glasses?: boolean; mustache?: boolean; beard?: boolean; bindi?: boolean;
  watch?: boolean;
  /** treated in hospital: a head bandage and a dressed forearm */
  bandage?: boolean;
  /** stable per-character seed (blink timing, fabric) */
  seed?: number;
}
export interface PersonState { pos: [number, number, number]; yaw?: number; quat?: THREE.Quaternion; pose: Pose; visible?: boolean; bob?: number; prop?: boolean; face?: FaceState; injury?: number }

// ---------------------------------------------------------------------------------------------- geometry (shared)
const torsoProfile = (female: boolean) => (female
  ? [[0, -0.07], [0.13, -0.065], [0.14, -0.01], [0.112, 0.13], [0.125, 0.26], [0.142, 0.33], [0.138, 0.4], [0.13, 0.47], [0.1, 0.53], [0.055, 0.56], [0, 0.565]]
  : [[0, -0.07], [0.124, -0.065], [0.13, -0.01], [0.124, 0.12], [0.132, 0.24], [0.147, 0.36], [0.152, 0.44], [0.142, 0.5], [0.108, 0.545], [0.058, 0.565], [0, 0.57]]
).map(([r, y]) => new THREE.Vector2(r, y));
const taper = (rt: number, rb: number, h: number, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg, 1);
/** Skull and jaw as ONE smooth surface (no seams on the cheeks or chin): a sphere narrowed and brought forward below the eyes. */
function headGeo(narrow: number) {
  const g = new THREE.SphereGeometry(1, 44, 32), a = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) {
    let x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const u = Math.max(0, Math.min(1, (0.15 - y) / 1.15)), uu = u * u;
    x *= 1 - narrow * uu;
    z = z * (1 - 0.16 * uu) + (z > 0 ? 0.14 * u * z : -0.05 * u);
    if (y < -0.55) y = -0.55 + (y + 0.55) * 0.82;
    a.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
const G = {
  torsoM: new THREE.LatheGeometry(torsoProfile(false), 28),
  torsoF: new THREE.LatheGeometry(torsoProfile(true), 28),
  sphere: new THREE.SphereGeometry(1, 22, 16),
  headM: headGeo(0.3), headF: headGeo(0.38),
  sphereLo: new THREE.SphereGeometry(1, 12, 9),
  thigh: taper(0.074, 0.056, 0.44), thighLoose: taper(0.095, 0.084, 0.44),
  shin: taper(0.054, 0.04, 0.42), shinLoose: taper(0.082, 0.058, 0.42),
  upperArm: taper(0.05, 0.041, 0.29), forearm: taper(0.041, 0.031, 0.25),
  sleeveShort: taper(0.058, 0.054, 0.14), cuff: taper(0.037, 0.037, 0.035),
  neck: taper(0.046, 0.054, 0.13),
  collar: new THREE.TorusGeometry(0.06, 0.014, 8, 24, Math.PI * 1.4),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  circle: new THREE.CircleGeometry(1, 20),
  lid: new THREE.SphereGeometry(0.0182, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  hairCap: new THREE.SphereGeometry(0.108, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
  hairBack: new THREE.SphereGeometry(0.105, 22, 12, Math.PI, Math.PI, Math.PI * 0.32, Math.PI * 0.42),
  helmet: new THREE.SphereGeometry(0.15, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
  helmetBack: new THREE.SphereGeometry(0.15, 28, 12, Math.PI * 0.82, Math.PI * 1.36, Math.PI * 0.5, Math.PI * 0.2),
  visor: new THREE.SphereGeometry(0.158, 24, 10, Math.PI * 0.3, Math.PI * 0.4, Math.PI * 0.36, Math.PI * 0.24),
  ring: new THREE.TorusGeometry(0.017, 0.0019, 6, 20),
  bandage: new THREE.TorusGeometry(0.098, 0.011, 8, 32),
  dupattaDrape: new THREE.TorusGeometry(0.2, 0.024, 8, 28, Math.PI * 0.95),
  skirt: new THREE.CylinderGeometry(0.17, 0.215, 0.5, 32, 1, true),
};

/** A woven print for kurta / kameez / dupatta: base colour with a small repeating motif (canvas, cached). */
const fabricCache = new Map<string, THREE.Texture>();
function fabric(base: string, motif: string) {
  const k = base + motif;
  const hit = fabricCache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  // small block-print buti: a six-petal flower on a half-drop grid, plus fine dots
  g.fillStyle = motif; g.globalAlpha = 0.7;
  for (const [x, y] of [[16, 16], [48, 48]]) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 1.1, a, 0, Math.PI * 2); g.fill(); } }
  g.globalAlpha = 0.45; for (const [x, y] of [[48, 16], [16, 48], [32, 0], [0, 32], [32, 32], [0, 0]]) { g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  fabricCache.set(k, t);
  return t;
}

/** Lip line shapes, from a frown to a broad smile: arcs of different radius spanning the same mouth width. */
const LIPS = [-1, -0.5, 0, 0.5, 1].map((s) => {
  const half = 0.0215;
  if (s === 0) return { s, geo: new THREE.CapsuleGeometry(0.0042, half * 2, 4, 8).rotateZ(Math.PI / 2), rot: 0, y: 0 };
  const r = Math.abs(s) > 0.75 ? 0.025 : 0.05;
  const arc = 2 * Math.asin(half / r);
  return { s, geo: new THREE.TorusGeometry(r, 0.0042, 6, 18, arc), rot: s > 0 ? -Math.PI / 2 - arc / 2 : Math.PI / 2 - arc / 2, y: s > 0 ? r : -r };
});

const BLOOD = () => mat('#7a0a10', { rough: 0.22, metal: 0.05 });
const BLOOD_DRY = () => mat('#5a1010', { rough: 0.6 });

// ---------------------------------------------------------------------------------------------- person
/** An articulated person (faces +z, pelvis at the group origin, ~0.94 m above the feet when standing). */
export function Person({ outfit, drive, scale = 1, handR, grip = 'flat', detail = 'full' }: { outfit: Outfit; drive: (t: number) => PersonState; scale?: number; handR?: ReactNode; grip?: 'flat' | 'palm'; detail?: 'full' | 'low' }) {
  const o = outfit;
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const prop = useRef<THREE.Group>(null);
  const J = useRef<Record<string, THREE.Object3D | null>>({});
  const set = (k: string) => (g: THREE.Object3D | null) => { J.current[k] = g; };
  const female = !!o.female;
  const build = o.build ?? 1;
  const seed = o.seed ?? (o.skin.charCodeAt(2) + o.shirt.charCodeAt(3)) % 17;
  const full = detail === 'full';
  const M = useMemo(() => {
    const printed = (base: string) => (o.print ? mat('#d9d9d9', { rough: 0.9, map: fabric(base, o.print) }) : mat(base, { rough: 0.9 }));
    const hairCol = o.grey ? (female ? '#3d3632' : '#5c5550') : o.hair;
    return {
      skin: mat(o.skin, { rough: 0.72 }),
      lip: mat(new THREE.Color(o.skin).lerp(new THREE.Color('#8a3a3a'), 0.45).getStyle(), { rough: 0.45 }),
      hair: mat(hairCol, { rough: 0.75 }),
      brow: mat(o.grey ? '#3a3330' : o.hair, { rough: 0.8 }),
      top: o.top === 'kurta' || o.top === 'kameez' ? printed(o.shirt) : mat(o.shirt, { rough: o.top === 'uniform' ? 0.75 : 0.88 }),
      collar: mat(new THREE.Color(o.shirt).offsetHSL(0, 0, 0.05).getStyle(), { rough: 0.75 }),
      pants: mat(o.pants, { rough: 0.82 }),
      shoes: mat(o.shoes, { rough: 0.45, metal: 0.05 }),
      eyeW: mat('#d6cdc2', { rough: 0.35 }),
      iris: mat('#3a2215', { rough: 0.15 }),
      pupil: mat('#07060a', { rough: 0.1 }),
      dark: mat('#1a1412', { rough: 0.4 }),
      teeth: mat('#d8d0c2', { rough: 0.45 }),
      coat: o.coat ? mat(o.coat, { rough: 0.85 }) : null,
      dupatta: o.dupatta ? (o.print ? mat('#d9d9d9', { rough: 0.92, map: fabric(o.dupatta, o.print) }) : mat(o.dupatta, { rough: 0.92 })) : null,
      helmet: o.helmet ? mat(o.helmet, { rough: 0.25, metal: 0.2 }) : null,
      visor: new THREE.MeshStandardMaterial({ color: '#a9c2de', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
      pack: o.backpack ? mat(o.backpack, { rough: 0.8 }) : null,
      stripe: o.stripe ? mat(o.stripe, { rough: 0.3, emissive: o.stripe, ei: 0.35 }) : null,
      mask: new THREE.MeshStandardMaterial({ color: '#cfeee6', roughness: 0.15, transparent: true, opacity: 0.75 }),
      metal: mat('#2b2d33', { rough: 0.3, metal: 0.8 }),
      bindi: mat('#b0102a', { rough: 0.3 }),
      watch: mat('#c9ccd2', { rough: 0.2, metal: 0.9 }),
      skirt: (() => { const m = (o.top === 'kurta' || o.top === 'kameez' ? printed(o.shirt) : mat(o.shirt)).clone(); m.side = THREE.DoubleSide; return m; })(),
    };
  }, [o]);

  useFrame(() => {
    const t = clock.t;
    const s = drive(t);
    const r = root.current;
    if (!r) return;
    r.visible = s.visible !== false;
    if (!r.visible) return;
    r.position.set(s.pos[0], s.pos[1] + (s.bob ?? 0), s.pos[2]);
    if (s.quat) r.quaternion.copy(s.quat); else r.rotation.set(0, s.yaw ?? 0, 0);
    if (prop.current) prop.current.visible = !!s.prop;
    const p = s.pose, j = J.current;
    j.spine?.rotation.set(p.spine, 0, 0);
    j.head?.rotation.set(p.head, p.headYaw, 0);
    j.hipL?.rotation.set(-p.hipL, 0, 0.03);
    j.hipR?.rotation.set(-p.hipR, 0, -0.03);
    j.kneeL?.rotation.set(p.kneeL, 0, 0);
    j.kneeR?.rotation.set(p.kneeR, 0, 0);
    // the kurta / kameez hem follows the thighs: hangs straight when standing, lies over the lap when seated
    const hip = Math.min(p.hipL, p.hipR);
    j.skirt?.rotation.set(-hip * 0.92, 0, 0);
    j.skirt?.scale.set(1, 1 - 0.42 * Math.min(1, Math.max(0, hip) / 1.4), 1);
    j.shL?.rotation.set(-p.shL, 0, p.shLz);
    j.shR?.rotation.set(-p.shR, 0, -p.shRz);
    j.elL?.rotation.set(-p.elL, 0, 0);
    j.elR?.rotation.set(-p.elR, 0, 0);
    // injuries (only on the rider, after the crash)
    const inj = s.injury ?? 0;
    for (const k of ['injHead', 'injArm', 'injCheek']) { const m = j[k]; if (m) m.visible = inj > 0.01; }
    if (!full) return;
    // ---- face: blend expressions, blink, talk, gaze
    const f = s.face ?? { expr: 'neutral' as Expr };
    const a = EXPR[f.expr], b = EXPR[f.to ?? f.expr], k = f.k ?? 0;
    const F = { browIn: a.browIn + (b.browIn - a.browIn) * k, browY: a.browY + (b.browY - a.browY) * k, squint: a.squint + (b.squint - a.squint) * k, smile: a.smile + (b.smile - a.smile) * k, open: a.open + (b.open - a.open) * k };
    const talk = f.talk ?? 0;
    const open = Math.max(0, F.open + talk * Math.max(0, Math.sin(t * 11 + seed)) * 0.55 * (0.6 + 0.4 * Math.sin(t * 2.7 + seed)));
    const blinkPh = (t + seed * 0.613) % (3.3 + (seed % 5) * 0.35);
    const blink = blinkPh < 0.13 ? 1 - Math.abs(blinkPh - 0.065) / 0.065 : 0;
    const closed = Math.min(1, Math.max(f.closed ?? 0, blink, Math.max(0, F.squint)));
    for (const side of ['L', 'R'] as const) {
      const sg = side === 'L' ? 1 : -1;
      const lid = j[`lid${side}`]; if (lid) lid.rotation.x = -0.95 + closed * 2.25;
      const brow = j[`brow${side}`]; if (brow) { brow.rotation.z = -sg * F.browIn * 0.32; brow.position.y = 0.116 + F.browY * 0.007 - Math.max(0, F.squint) * 0.003; }
      const iris = j[`iris${side}`]; if (iris) iris.position.x = (f.look ?? 0) * 0.004;
    }
    const lip = j.lipLine;
    if (lip) {
      const pick = LIPS.reduce((best, l) => (Math.abs(l.s - F.smile) < Math.abs(best.s - F.smile) ? l : best), LIPS[2]);
      lip.children.forEach((c, i) => { c.visible = LIPS[i] === pick; });
      lip.position.y = 0.002 + open * 0.003;
    }
    const inner = j.mouthIn; if (inner) { inner.visible = open > 0.06; inner.scale.set(0.017 + Math.max(0, F.smile) * 0.004, 0.002 + open * 0.013, 0.005); inner.position.y = -0.004 - open * 0.006; }
    const lower = j.lipLow; if (lower) lower.position.y = -0.008 - open * 0.013;
    const teeth = j.teeth; if (teeth) teeth.visible = open > 0.18 && F.smile > -0.5;
  });

  // ---------------------------------------------------------------------------- parts
  const shoulderX = female ? 0.178 : 0.196 * Math.min(1.06, build);
  const longSleeve = (o.sleeves ?? (o.top === 'tee' || o.top === 'scrubs' ? 'short' : 'long')) !== 'short';
  const elbowSleeve = o.sleeves === 'elbow';
  const sleeveMat = M.coat ?? M.top;
  const tunic = o.top === 'kurta' || o.top === 'kameez';

  const arm = (side: 1 | -1) => (
    <group ref={set(side > 0 ? 'shL' : 'shR')} position={[shoulderX * side, 0.465, 0]}>
      <mesh geometry={G.sphere} material={sleeveMat} position={[-0.008 * side, -0.02, 0]} scale={[0.056, 0.05, 0.053]} />
      <mesh geometry={G.upperArm} material={sleeveMat} position={[0, -0.145, 0]} scale={female ? [0.9, 1, 0.9] : [1, 1, 1]} />
      {M.stripe && <mesh geometry={G.cyl} material={M.stripe} position={[0, -0.21, 0]} scale={[0.047, 0.028, 0.047]} />}
      <group ref={set(side > 0 ? 'elL' : 'elR')} position={[0, -0.29, 0]}>
        <mesh geometry={G.sphere} material={longSleeve && !elbowSleeve ? sleeveMat : M.skin} scale={0.041} />
        <mesh geometry={G.forearm} material={longSleeve && !elbowSleeve ? sleeveMat : M.skin} position={[0, -0.125, 0]} scale={female ? [0.88, 1, 0.88] : [1, 1, 1]} />
        {(elbowSleeve) && <mesh geometry={G.cuff} material={sleeveMat} position={[0, -0.01, 0]} scale={[1.25, 1, 1.25]} />}
        {longSleeve && !elbowSleeve && <mesh geometry={G.cuff} material={M.coat ? M.top : M.collar} position={[0, -0.235, 0]} />}
        {o.watch && side > 0 && <mesh geometry={G.cyl} material={M.watch} position={[0, -0.225, 0]} scale={[0.036, 0.016, 0.036]} />}
        {/* hand: palm, curled fingers and thumb */}
        <group position={[0, -0.272, 0]}>
          <mesh geometry={G.sphere} material={M.skin} position={[0, -0.025, 0.004]} scale={[0.036, 0.048, 0.019]} />
          <mesh geometry={G.sphere} material={M.skin} position={[0, -0.068, 0.012]} rotation={[0.35, 0, 0]} scale={[0.033, 0.036, 0.016]} />
          <mesh geometry={G.sphere} material={M.skin} position={[0.0 * side, -0.03, 0.027]} rotation={[0.5, 0, 0.3 * side]} scale={[0.012, 0.026, 0.012]} />
        </group>
        {side > 0 && o.bandage && <mesh geometry={G.cuff} material={mat('#f4f6f6', { rough: 0.9 })} position={[0, -0.12, 0]} scale={[1.25, 2.6, 1.25]} />}
        {side > 0 && <mesh ref={set('injArm')} geometry={G.sphere} material={BLOOD_DRY()} position={[0, -0.11, 0.036]} scale={[0.026, 0.06, 0.008]} visible={false} />}
        {/* a prop either lies across the fingers ('flat': tablet, phone at the ear) or sits in the palm, screen out, held by the thumb and fingers */}
        {side < 0 && handR && <group ref={prop} position={grip === 'palm' ? [0, -0.318, 0.04] : [0, -0.33, 0.03]} rotation={grip === 'palm' ? [0, 0, 0] : [Math.PI / 2, 0, 0]}>{handR}</group>}
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group ref={set(side > 0 ? 'hipL' : 'hipR')} position={[0.088 * side, -0.035, 0]}>
      <mesh geometry={o.loose ? G.thighLoose : G.thigh} material={M.pants} position={[0, -0.22, 0]} scale={[build, 1, build]} />
      {M.coat && <mesh geometry={G.box} material={M.coat} position={[0.02 * side, -0.15, 0.08]} scale={[0.17, 0.36, 0.014]} />}
      <group ref={set(side > 0 ? 'kneeL' : 'kneeR')} position={[0, -0.45, 0]}>
        <mesh geometry={G.sphere} material={M.pants} scale={o.loose ? 0.085 : 0.057} />
        <mesh geometry={o.loose ? G.shinLoose : G.shin} material={M.pants} position={[0, -0.21, 0]} />
        {!o.loose && <mesh geometry={G.sphere} material={M.pants} position={[0, -0.13, -0.014]} scale={[0.05, 0.1, 0.052]} />}
        {o.loose && <mesh geometry={G.cyl} material={M.pants} position={[0, -0.405, 0]} scale={[0.046, 0.04, 0.046]} />}
        {/* shoe: body + rounded toe + sole */}
        <RoundedBox args={[0.094, 0.07, 0.2]} radius={0.03} smoothness={2} material={M.shoes} position={[0, -0.448, 0.03]} />
        <mesh geometry={G.sphere} material={M.shoes} position={[0, -0.455, 0.12]} scale={[0.047, 0.035, 0.05]} />
        <mesh geometry={G.box} material={M.dark} position={[0, -0.48, 0.05]} scale={[0.098, 0.014, 0.25]} />
      </group>
    </group>
  );

  const hairStyle = o.hairStyle ?? (female ? 'bun' : 'short');
  const head = (
    <group ref={set('head')} position={[0, 0.655, 0]}>
      {/* skull, jaw, ears */}
      <mesh geometry={female ? G.headF : G.headM} material={M.skin} position={[0, 0.075, 0]} scale={[0.09, 0.106, 0.1]} />
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.sphereLo} material={M.skin} position={[0.088 * sd, 0.068, -0.006]} scale={[0.016, 0.031, 0.022]} />)}
      {/* nose: bridge, tip, wings */}
      <mesh geometry={G.sphereLo} material={M.skin} position={[0, 0.072, 0.093]} rotation={[-0.25, 0, 0]} scale={[0.0135, 0.03, 0.017]} />
      <mesh geometry={G.sphereLo} material={M.skin} position={[0, 0.049, 0.1]} scale={[0.017, 0.014, 0.015]} />
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.sphereLo} material={M.skin} position={[0.012 * sd, 0.046, 0.093]} scale={0.0095} />)}
      {full ? (
        <>
          {/* eyes: eyeball, iris, pupil, and a lid that blinks / squints */}
          {(['L', 'R'] as const).map((sd) => {
            const x = sd === 'L' ? 0.034 : -0.034;
            return (
              <group key={sd} position={[x, 0.087, 0.081]}>
                <mesh geometry={G.sphere} material={M.eyeW} scale={[0.0162, 0.014, 0.0125]} />
                <group ref={set(`iris${sd}`)}>
                  <mesh geometry={G.circle} material={M.iris} position={[0, 0, 0.0126]} scale={0.0083} />
                  <mesh geometry={G.circle} material={M.pupil} position={[0, 0, 0.0128]} scale={0.0038} />
                </group>
                <mesh ref={set(`lid${sd}`)} geometry={G.lid} material={M.skin} rotation={[-0.95, 0, 0]} />
              </group>
            );
          })}
          {(['L', 'R'] as const).map((sd) => <mesh key={sd} ref={set(`brow${sd}`)} geometry={G.box} material={M.brow} position={[sd === 'L' ? 0.035 : -0.035, 0.116, 0.091]} rotation={[0.15, 0, 0]} scale={[0.036, 0.0075, 0.008]} />)}
          {/* mouth: curved lip line, lower lip, open mouth + teeth */}
          <group position={[0, 0.026, 0.088]}>
            <group ref={set('lipLine')}>
              {LIPS.map((l) => <mesh key={l.s} geometry={l.geo} material={M.lip} rotation={[0, 0, l.rot]} position={[0, l.y, 0]} visible={l.s === 0} />)}
            </group>
            <mesh ref={set('lipLow')} geometry={G.sphere} material={M.lip} position={[0, -0.008, 0.002]} scale={[0.016, 0.0055, 0.007]} />
            <mesh ref={set('mouthIn')} geometry={G.sphere} material={M.dark} position={[0, -0.004, 0.001]} scale={[0.017, 0.002, 0.005]} />
            <mesh ref={set('teeth')} geometry={G.box} material={M.teeth} position={[0, 0.0, 0.004]} scale={[0.022, 0.005, 0.003]} visible={false} />
          </group>
          {o.mustache && <mesh geometry={G.sphere} material={M.hair} position={[0, 0.038, 0.096]} scale={[0.024, 0.0065, 0.01]} />}
          {o.beard && <mesh geometry={G.sphere} material={M.hair} position={[0, 0.01, 0.045]} scale={[0.07, 0.05, 0.06]} />}
          {o.bindi && <mesh geometry={G.circle} material={M.bindi} position={[0, 0.104, 0.1]} scale={0.004} />}
          {o.glasses && (
            <group position={[0, 0.087, 0.103]}>
              {[0.034, -0.034].map((x) => <mesh key={x} geometry={G.ring} material={M.metal} position={[x, 0, 0]} />)}
              <mesh geometry={G.box} material={M.metal} position={[0, 0.004, 0]} scale={[0.034, 0.0025, 0.0025]} />
              {[1, -1].map((sd) => <mesh key={sd} geometry={G.box} material={M.metal} position={[0.075 * sd, 0.004, -0.05]} scale={[0.003, 0.003, 0.1]} />)}
            </group>
          )}
          <mesh ref={set('injHead')} geometry={G.sphereLo} material={BLOOD()} position={[0.028, 0.125, 0.084]} rotation={[0.4, 0, 0.5]} scale={[0.02, 0.012, 0.006]} visible={false} />
          <mesh ref={set('injCheek')} geometry={G.box} material={BLOOD()} position={[0.05, 0.092, 0.075]} rotation={[0, 0.5, 0.15]} scale={[0.003, 0.034, 0.003]} visible={false} />
        </>
      ) : (
        <>
          {[0.034, -0.034].map((x) => <mesh key={x} geometry={G.sphereLo} material={M.dark} position={[x, 0.087, 0.088]} scale={0.009} />)}
          {[0.035, -0.035].map((x) => <mesh key={x} geometry={G.box} material={M.brow} position={[x, 0.114, 0.091]} scale={[0.034, 0.007, 0.008]} />)}
          <mesh geometry={G.box} material={M.lip} position={[0, 0.026, 0.091]} scale={[0.026, 0.006, 0.006]} />
        </>
      )}
      {/* hair */}
      {!M.helmet && hairStyle !== 'receding' && <mesh geometry={G.hairCap} material={M.hair} position={[0, 0.082, -0.008]} rotation={[female ? -0.5 : -0.3, 0, 0]} scale={female ? [0.9, 1.0, 0.99] : [0.95, 1.06, 1.04]} />}
      {!M.helmet && o.bindi && <mesh geometry={G.box} material={M.bindi} position={[0, 0.184, 0.05]} rotation={[0.55, 0, 0]} scale={[0.005, 0.003, 0.06]} />}
      {!M.helmet && hairStyle === 'receding' && <mesh geometry={G.hairCap} material={M.hair} position={[0, 0.07, -0.02]} rotation={[-0.62, 0, 0]} scale={[0.96, 0.98, 1.02]} />}
      {!M.helmet && <mesh geometry={G.hairBack} material={M.hair} position={[0, 0.072, -0.004]} scale={[0.95, 1.05, 1.04]} />}
      {!M.helmet && hairStyle === 'side' && <mesh geometry={G.sphere} material={M.hair} position={[0.03, 0.17, 0.06]} rotation={[0.3, 0, -0.3]} scale={[0.07, 0.022, 0.05]} />}
      {!M.helmet && !female && [1, -1].map((sd) => <mesh key={sd} geometry={G.box} material={M.hair} position={[0.087 * sd, 0.085, 0.022]} scale={[0.008, 0.035, 0.018]} />)}
      {!M.helmet && hairStyle === 'bun' && <><mesh geometry={G.sphere} material={M.hair} position={[0, 0.1, -0.112]} scale={0.042} /><mesh geometry={G.box} material={M.hair} position={[0, 0.184, 0.035]} rotation={[0.35, 0, 0]} scale={[0.004, 0.003, 0.09]} /></>}
      {!M.helmet && hairStyle === 'long' && <mesh geometry={G.sphere} material={M.hair} position={[0, -0.02, -0.075]} scale={[0.095, 0.15, 0.04]} />}
      {o.bandage && <mesh geometry={G.bandage} material={mat('#f4f6f6', { rough: 0.9 })} position={[0, 0.125, 0.004]} rotation={[Math.PI / 2 + 0.12, 0, 0]} scale={[0.93, 1.02, 1]} />}
      {o.bandage && <mesh geometry={G.sphereLo} material={mat('#f7f7f4', { rough: 0.9 })} position={[0.03, 0.128, 0.093]} scale={[0.024, 0.018, 0.006]} />}
      {o.mask && (
        <group position={[0, 0.04, 0.1]}>
          <mesh geometry={G.cyl} material={M.mask} rotation={[Math.PI / 2, 0, 0]} scale={[0.036, 0.04, 0.03]} />
          <mesh geometry={G.box} material={M.mask} position={[0, -0.04, 0.0]} scale={[0.008, 0.06, 0.008]} />
        </group>
      )}
      {M.helmet && (
        <group position={[0, 0.06, 0]}>
          <mesh geometry={G.helmet} material={M.helmet} scale={[0.95, 1.05, 1.08]} />
          <mesh geometry={G.helmetBack} material={M.helmet} position={[0, -0.005, 0]} scale={[0.95, 1, 1.08]} />
          <mesh geometry={G.visor} material={M.visor} position={[0, 0.0, 0.004]} scale={[0.99, 1.02, 1.1]} />
        </group>
      )}
    </group>
  );

  return (
    <group ref={root} scale={scale}>
      {/* hips */}
      <mesh geometry={G.sphere} material={tunic ? M.top : M.pants} position={[0, -0.02, 0]} scale={[(female ? 0.172 : 0.162) * build, 0.105, 0.112 * build]} />
      {leg(1)}
      {leg(-1)}
      {tunic && <group ref={set('skirt')} position={[0, 0.03, 0]}><mesh geometry={G.skirt} material={M.skirt} position={[0, -0.25, 0]} scale={[build, 1, 0.78 * build]} /></group>}
      <group ref={set('spine')} position={[0, 0.05, 0]}>
        <mesh geometry={female ? G.torsoF : G.torsoM} material={M.coat ?? M.top} scale={[1.13 * build, 1, 0.74 * build]} />
        {build > 1.04 && <mesh geometry={G.sphere} material={M.coat ?? M.top} position={[0, 0.1, 0.022]} scale={[0.122, 0.12, 0.092 + (build - 1) * 0.25]} />}
        {female && !M.coat && <mesh geometry={G.sphere} material={M.top} position={[0, 0.34, 0.04]} scale={[0.13, 0.07, 0.07]} />}
        {/* collar / placket / buttons */}
        {(o.top ?? 'shirt') === 'shirt' && !M.coat && (
          <>
            <mesh geometry={G.collar} material={M.collar} position={[0, 0.535, 0.012]} rotation={[Math.PI / 2 - 0.25, 0, Math.PI * 0.8]} scale={[1.05, 1.05, 1.2]} />
            {[0.44, 0.36, 0.28, 0.2, 0.12].map((y) => <mesh key={y} geometry={G.sphereLo} material={M.collar} position={[0, y, 0.106 - (0.44 - y) * 0.02]} scale={0.006} />)}
          </>
        )}
        {o.top === 'kurta' && <mesh geometry={G.box} material={mat(new THREE.Color(o.shirt).offsetHSL(0, 0.1, -0.22).getStyle(), { rough: 0.7 })} position={[0, 0.43, 0.104]} rotation={[-0.08, 0, 0]} scale={[0.026, 0.17, 0.005]} />}
        {(o.top === 'kurta' || o.top === 'kameez') && <mesh geometry={G.collar} material={mat(new THREE.Color(o.shirt).offsetHSL(0, 0.1, -0.22).getStyle(), { rough: 0.7 })} position={[0, 0.54, 0.008]} rotation={[Math.PI / 2 - 0.2, 0, Math.PI * 0.8]} scale={[1, 1, 0.5]} />}
        {M.stripe && <mesh geometry={G.cyl} material={M.stripe} position={[0, 0.16, 0]} scale={[0.15 * 1.13, 0.035, 0.105]} />}
        {M.stripe && <mesh geometry={G.cyl} material={M.stripe} position={[0, 0.3, 0]} scale={[0.16 * 1.13, 0.028, 0.11]} />}
        {M.coat && (
          <>
            <mesh geometry={G.box} material={M.top} position={[0, 0.42, 0.098]} scale={[0.07, 0.2, 0.01]} />
            <mesh geometry={G.box} material={M.coat} position={[0, 0.0, 0.0]} scale={[0.33, 0.12, 0.2]} />
          </>
        )}
        {M.dupatta && (
          <>
            {/* draped across the chest, falling behind both shoulders */}
            <mesh geometry={G.dupattaDrape} material={M.dupatta} position={[0, 0.5, 0.02]} rotation={[0.95, 0, Math.PI + 0.08]} scale={[0.95, 1.15, 1]} />
          </>
        )}
        {M.pack && <RoundedBox args={[0.3, 0.42, 0.16]} radius={0.05} position={[0, 0.27, -0.17]} material={M.pack} />}
        {M.pack && [1, -1].map((sd) => <mesh key={sd} geometry={G.box} material={M.pack!} position={[0.1 * sd, 0.42, 0.0]} rotation={[0.2, 0, 0]} scale={[0.03, 0.02, 0.22]} />)}
        {arm(1)}
        {arm(-1)}
        <mesh geometry={G.neck} material={M.skin} position={[0, 0.585, 0]} />
        {head}
      </group>
    </group>
  );
}

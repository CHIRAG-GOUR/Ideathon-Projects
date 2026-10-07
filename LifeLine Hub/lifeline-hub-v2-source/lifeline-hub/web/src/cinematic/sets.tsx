'use client';
/**
 * The film's sets. Every moving thing is driven by the physics bake in `sim.ts` (sampled by the film clock);
 * the sets only render. Static scenery is merged into a handful of draw calls.
 * All places, shops, vehicles and services are fictional — no brands or logos.
 */
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { T_SOS, clamp, lerp, seg } from './timeline';
import {
  Ambulance, AutoRickshaw, Car, Motorcycle, POSE, Person, Shadow, Stretcher, mat, mix, useClock, walk,
  type FaceState, type Outfit, type Pose, type PersonState,
} from './models';
import { asphalt, curb, ecg, facade, glow, paving, rng, shopfront, sign, skyTex } from './textures';
import {
  PI, RESCUE, SEAT, WORLD_INFO, aside, ambulance, bike, bystander, car, paramedic,
  pedestrian, queued, rider, stretcher, traffic, type Walker,
} from './sim';

// ---------------------------------------------------------------------------------------------- cast
export const OUTFIT: Record<string, Outfit> = {
  // Arjun, 29: office shirt, formal trousers, laptop backpack, open-face helmet
  arjun: { seed: 3, skin: '#a8724f', hair: '#17110e', shirt: '#9fb1c2', pants: '#2a3142', shoes: '#1c1612', helmet: '#151a22', backpack: '#2a2f38', top: 'shirt', hairStyle: 'side', watch: true },
  arjunBare: { seed: 3, skin: '#a8724f', hair: '#17110e', shirt: '#9fb1c2', pants: '#2a3142', shoes: '#1c1612', top: 'shirt', hairStyle: 'side', watch: true },
  arjunO2: { seed: 3, skin: '#a8724f', hair: '#17110e', shirt: '#9fb1c2', pants: '#2a3142', shoes: '#1c1612', top: 'shirt', hairStyle: 'side', mask: true, watch: true },
  arjunWard: { seed: 3, skin: '#a8724f', hair: '#17110e', shirt: '#7fa6b8', pants: '#7fa6b8', shoes: '#e8eef2', top: 'tee', sleeves: 'short', hairStyle: 'side', bandage: true },
  // paramedics: navy uniform with hi-vis bands
  medic: { seed: 7, skin: '#8d5a3b', hair: '#120d0b', shirt: '#163352', pants: '#163352', shoes: '#101114', stripe: '#c6f24a', top: 'uniform', mustache: true },
  medic2: { seed: 11, skin: '#b9825c', hair: '#1a1310', shirt: '#163352', pants: '#163352', shoes: '#101114', stripe: '#c6f24a', top: 'uniform', female: true, hairStyle: 'bun' },
  // bystanders
  by0: { seed: 5, skin: '#9a6444', hair: '#1b1411', shirt: '#7c3a2c', pants: '#c8b898', shoes: '#3a2a20', top: 'kurta', sleeves: 'elbow', print: '#a8553f', beard: true },
  by1: { seed: 9, skin: '#c08b67', hair: '#120c0a', shirt: '#2f6f73', pants: '#cdbfa6', shoes: '#5a3d2a', female: true, top: 'kameez', loose: true, print: '#e7c66a', dupatta: '#e8dcc6', hairStyle: 'long' },
  by2: { seed: 13, skin: '#7e5034', hair: '#16100d', shirt: '#c4bba6', pants: '#3a3f47', shoes: '#22201e', top: 'shirt', sleeves: 'short', mustache: true },
  // his parents at home: Mummy in a salwar-kameez with a dupatta, Papa in a kurta-pyjama with reading glasses
  mom: { seed: 17, skin: '#b07f5e', hair: '#2b2522', shirt: '#8c2f4f', pants: '#d2c4ad', shoes: '#6a3b2a', female: true, top: 'kameez', loose: true, print: '#e8b85c', dupatta: '#c99a3a', hairStyle: 'bun', grey: true, bindi: true, build: 1.04 },
  dad: { seed: 19, skin: '#9c6a4a', hair: '#3a3430', shirt: '#c6bfae', pants: '#d4ccbb', shoes: '#4a3526', top: 'kurta', loose: true, hairStyle: 'receding', grey: true, glasses: true, mustache: true, build: 1.07, watch: true },
  doctor: { seed: 23, skin: '#c49170', hair: '#16100d', shirt: '#7fa6c9', pants: '#2d3440', shoes: '#1d1d22', coat: '#d4dadd', female: true, hairStyle: 'bun', glasses: true },
  nurse: { seed: 29, skin: '#8f5d3e', hair: '#120c0a', shirt: '#2f8f8a', pants: '#2f8f8a', shoes: '#f0f0f0', female: true, top: 'scrubs', hairStyle: 'bun' },
};
const PED_OUTFITS: Outfit[] = [
  { skin: '#a06a48', hair: '#141010', shirt: '#3d5a80', pants: '#2b2b30', shoes: '#222', top: 'shirt' },
  { skin: '#c69272', hair: '#1a1210', shirt: '#b5523b', pants: '#e9dcc8', shoes: '#333', female: true, top: 'kameez', loose: true, print: '#f2d27a', dupatta: '#e9dcc8', hairStyle: 'long' },
  { skin: '#8a5a3c', hair: '#120e0c', shirt: '#e3d9c4', pants: '#4a4a4f', shoes: '#2a2a2a', top: 'tee', sleeves: 'short' },
  { skin: '#b7835f', hair: '#1c1512', shirt: '#4f7a54', pants: '#d9d1bd', shoes: '#3b2b20', female: true, top: 'kameez', loose: true, print: '#d9d1bd', hairStyle: 'bun' },
  { skin: '#9b6646', hair: '#16110f', shirt: '#7d6aa8', pants: '#23262d', shoes: '#1d1d1d', backpack: '#334', top: 'tee', sleeves: 'short' },
  { skin: '#c28d69', hair: '#2a2420', shirt: '#d9a441', pants: '#f0ebe0', shoes: '#262626', grey: true, top: 'kurta', loose: true, print: '#b98a2e', mustache: true },
  { skin: '#85563a', hair: '#110d0b', shirt: '#2c2f38', pants: '#2c2f38', shoes: '#111', top: 'shirt' },
  { skin: '#b07c59', hair: '#1a1411', shirt: '#9a3d5c', pants: '#5a4a3a', shoes: '#2f2a25', female: true, top: 'kameez', loose: true, print: '#e7b9c9', hairStyle: 'long' },
];

/** Pelvis height above the ground for a walker's mode (articulated rig: ~0.94 m standing). */
const PELVIS: Record<Walker['mode'], number> = { stand: 0.94, walk: 0.93, run: 0.9, kneel: 0.52, phone: 0.94, sit: 0.5, door: 0.94, liftUp: 0.52, carry: 0.92, lower: 0.92 };
const groundAt = (z: number) => (Math.abs(z) > 8 ? 0.15 : 0);
function walkerState(w: Walker, extra?: Partial<PersonState>): PersonState {
  const face: FaceState = w.mode === 'phone' ? { expr: 'worried', talk: 0.8 } : w.mode === 'run' ? { expr: 'shock' } : w.mode === 'kneel' ? { expr: 'worried', talk: 0.35 } : w.mode === 'liftUp' || w.mode === 'carry' || w.mode === 'lower' ? { expr: 'focus', talk: 0.25 } : { expr: 'neutral' };
  const k = w.k ?? 0;
  let base: Pose;
  let pelvis = PELVIS[w.mode];
  switch (w.mode) {
    case 'run': base = walk(w.phase, true); break;
    case 'walk': base = walk(w.phase); break;
    case 'phone': base = POSE.phoneEar; break;
    case 'kneel': base = POSE.kneel; break;
    case 'sit': base = POSE.sit; break;
    case 'door': base = POSE.door; break;
    // rising together from a kneel with him in their arms: the pelvis lifts as the legs straighten
    case 'liftUp': base = mix(POSE.liftLow, POSE.carry, k); pelvis = lerp(0.52, 0.92, k); break;
    // side-stepping with him: carrying arms, small steps
    case 'carry': { const wk = walk(w.phase); base = { ...POSE.carry, hipL: POSE.carry.hipL + wk.hipL * 0.35 * clamp(w.speed / 0.4), hipR: POSE.carry.hipR + wk.hipR * 0.35 * clamp(w.speed / 0.4), kneeL: POSE.carry.kneeL + (wk.kneeL - 0.12) * 0.4, kneeR: POSE.carry.kneeR + (wk.kneeR - 0.12) * 0.4 }; break; }
    // bending to set him down on the stretcher
    case 'lower': base = mix(POSE.carry, POSE.carryLow, Math.sin(Math.PI * Math.min(1, k * 1.15))); pelvis = 0.92 - 0.1 * Math.sin(Math.PI * Math.min(1, k * 1.15)); break;
    default: base = POSE.stand;
  }
  const pose = w.mode === 'walk' || w.mode === 'run' ? mix(POSE.stand, base, clamp(w.speed / 0.5)) : base;
  const bob = w.mode === 'run' ? -0.05 * Math.abs(Math.cos(w.phase)) : w.mode === 'walk' ? -0.022 * Math.abs(Math.cos(w.phase)) * clamp(w.speed / 0.5) : 0;
  return { pos: [w.pos[0], (w.pos[1] > 0.5 ? w.pos[1] : groundAt(w.pos[2])) + pelvis, w.pos[2]], yaw: w.yaw, pose, visible: w.visible, bob, face, ...extra };
}

// ---------------------------------------------------------------------------------------------- the rider
const qBike = new THREE.Quaternion(), eBike = new THREE.Euler(), vSeat = new THREE.Vector3(), qFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI / 2);
const T_HELMET_OFF = RESCUE.helmetOff;
const T_O2 = RESCUE.oxygen;
function riderPose(t: number, variant: 'helmet' | 'bare' | 'o2'): PersonState {
  const r = rider(t);
  const vis = r.mode !== 'hidden' && (variant === 'helmet' ? t < T_HELMET_OFF : variant === 'bare' ? t >= T_HELMET_OFF && t < T_O2 : t >= T_O2);
  if (r.mode === 'ride') {
    const b = bike(t);
    eBike.set(b.roll, b.yaw, 0, 'YXZ');
    qBike.setFromEuler(eBike);
    vSeat.set(-SEAT[0], SEAT[1], 0).applyQuaternion(qBike);
    const q = new THREE.Quaternion().copy(qBike).multiply(qFace);
    // calm on the ride home; a glance at the mirror as the car closes in
    const face: FaceState = t > 26.5 ? { expr: 'calm', to: 'shock', k: seg(t, 29.2, 29.9) } : { expr: 'calm' };
    return { pos: [b.x + vSeat.x, b.y + vSeat.y, b.z + vSeat.z], quat: q, pose: POSE.ride, visible: vis, face };
  }
  let pose: Pose = POSE.lying;
  if (r.mode === 'fall') pose = mix(POSE.ride, POSE.lying, r.fallK);
  else if (r.mode === 'reach') pose = mix(POSE.lying, POSE.reach, r.k);
  else if (r.mode === 'phone') pose = t > RESCUE.attendantOut + 1.5 ? mix(POSE.phone, POSE.lying, seg(t, RESCUE.attendantOut + 1.5, RESCUE.attendantOut + 3)) : mix(POSE.reach, POSE.phone, r.k);
  else if (r.mode === 'stretcher') pose = mix(POSE.lying, POSE.stretcher, r.k);
  // a conscious, injured rider: shallow breathing (spine) — tiny, rhythmic
  if (t > WORLD_INFO().tImpact + 3) pose = { ...pose, spine: pose.spine + 0.015 * Math.sin(t * 2 * PI * 0.42) };
  const prop = (r.mode === 'reach' && r.k > 0.55) || (r.mode === 'phone' && t < RESCUE.attendantOut + 2.2);
  // in pain on the road; focused when he reaches for the phone; easing once help is with him
  const face: FaceState = t < RESCUE.attendantOut + 2
    ? { expr: 'pain', to: r.mode === 'phone' || r.mode === 'reach' ? 'focus' : 'pain', k: 0.5, closed: r.mode === 'fall' ? 0.6 : 0 }
    : { expr: 'pain', to: 'worried', k: seg(t, RESCUE.attendantOut + 2, RESCUE.attendantOut + 6) };
  return { pos: r.pos, quat: r.quat, pose, visible: vis, prop, face, injury: t > WORLD_INFO().tImpact + 0.6 ? 1 : 0 };
}

/** Phone in hand: dark until SOS, then the LifeLine alert screen (coral) pulses. */
function LivePhone() {
  const clock = useClock();
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (!m.current) return;
    const on = clock.t >= T_SOS;
    m.current.color.set(on ? '#c8203a' : '#0d1c33');
    m.current.emissive.set(on ? '#ff3346' : '#2a6fd6');
    m.current.emissiveIntensity = on ? 1.6 + 0.8 * Math.sin(clock.t * 6) : 0.5;
  });
  return (
    <group>
      <RoundedBox args={[0.075, 0.155, 0.009]} radius={0.008} material={mat('#16181d', { rough: 0.3, metal: 0.4 })} />
      <mesh position={[0, 0, 0.0052]} scale={[0.067, 0.145, 1]}><planeGeometry /><meshStandardMaterial ref={m} color="#0d1c33" emissive="#2a6fd6" emissiveIntensity={0.5} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- static street (merged)
const X0 = -380, X1 = 520;
const SHOPS: [string, string, string][] = [
  ['ANNAPURNA SWEETS', '#7a1f27', '#ffe2a8'], ['KAVERI ELECTRONICS', '#10324f', '#9fe3ff'], ['NANDA TAILORS', '#3b2a4f', '#ffd6f0'],
  ['GREEN LEAF CAFÉ', '#14412d', '#c9ffd8'], ['OM SAI MOBILES', '#5a1a5e', '#ffffff'], ['SHREE MEDICALS · 24×7', '#0f4a43', '#d9fff7'],
  ['PATEL HARDWARE', '#5b3b10', '#ffe0a3'], ['MEHTA OPTICALS', '#1d2a5a', '#e2e8ff'], ['SUNRISE BAKERY', '#7c3a12', '#fff0cf'],
  ['GANGA SAREES', '#6e1239', '#ffd9e8'], ['RAJ BOOK DEPOT', '#283618', '#f1f5c8'], ['MODERN DRY CLEANERS', '#123a5c', '#d6ecff'],
];
interface Bld { x: number; z: number; w: number; d: number; h: number; kind: 'office' | 'res' | 'old'; seed: number; side: 1 | -1; shop?: number }
function layoutBuildings(): Bld[] {
  const r = rng(42);
  const out: Bld[] = [];
  for (const side of [-1, 1] as const) {
    let x = X0;
    let k = side > 0 ? 3 : 0;
    while (x < X1) {
      const w = 12 + Math.floor(r() * 12);
      const roll = r();
      const kind = roll < 0.3 ? 'office' : roll < 0.8 ? 'res' : 'old';
      const h = kind === 'office' ? 22 + r() * 24 : kind === 'res' ? 10 + r() * 12 : 7 + r() * 6;
      const d = 10 + r() * 6;
      out.push({ x: x + w / 2, z: side * (12.4 + d / 2), w, d, h, kind, seed: Math.floor(r() * 7), side, shop: r() < 0.72 ? k++ % SHOPS.length : undefined });
      x += w + (r() < 0.3 ? 2 + r() * 3 : 0.2);
    }
  }
  return out;
}

/** The city beyond the street: rows of blocks merged per facade type, UVs scaled so windows keep a real size. */
function Skyline() {
  const meshes = useMemo(() => {
    const r = rng(77);
    const kinds = ['office', 'res', 'old'] as const;
    const parts: Record<string, THREE.BufferGeometry[]> = { office: [], res: [], old: [] };
    const TILE = { w: 4 * 2.3, h: 2 * 3.3 };
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        let x = -560 + r() * 20;
        const z0 = side * (34 + row * 30);
        while (x < 700) {
          const w = 14 + r() * 26, d = 12 + r() * 14;
          const kind = kinds[r() < 0.45 - row * 0.05 ? 0 : r() < 0.85 ? 1 : 2];
          const h = kind === 'office' ? 24 + r() * (40 + row * 12) : 10 + r() * 22;
          const g = new THREE.BoxGeometry(w, h, d);
          const uv = g.attributes.uv as THREE.BufferAttribute;
          for (let f = 0; f < 6; f++) {
            for (let v = 0; v < 4; v++) {
              const k = f * 4 + v;
              if (f === 2 || f === 3) { uv.setXY(k, 0.01, 0.99); continue; }
              const span = f < 2 ? d : w;
              uv.setXY(k, uv.getX(k) * (span / TILE.w), uv.getY(k) * (h / TILE.h));
            }
          }
          g.translate(x + w / 2, h / 2, z0 + side * r() * 8);
          parts[kind].push(g);
          x += w + 1 + r() * 6;
        }
      }
    }
    return kinds.map((k, i) => {
      const f = facade(k, 11 + i, 4, 2);
      const map = f.map.clone(), em = f.emissive.clone();
      [map, em].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });
      return { geo: mergeGeometries(parts[k], false)!, mat: new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 0.9 }) };
    });
  }, []);
  return <>{meshes.map((m, i) => <mesh key={i} geometry={m.geo} material={m.mat} />)}</>;
}

function StaticStreet({ lowDetail }: { lowDetail: boolean }) {
  const built = useMemo(() => {
    const B = layoutBuildings();
    // street furniture, merged by material
    const poles: THREE.BufferGeometry[] = [], heads: THREE.BufferGeometry[] = [], pools: THREE.BufferGeometry[] = [], trunks: THREE.BufferGeometry[] = [], crowns: THREE.BufferGeometry[] = [], dashes: THREE.BufferGeometry[] = [], yellow: THREE.BufferGeometry[] = [];
    const halos: number[] = [];
    const lamps: [number, number, number][] = [];
    const put = (g: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz)); return g.clone().applyMatrix4(m); };
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10), box = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), ball = new THREE.IcosahedronGeometry(1, 1);
    for (const side of [-1, 1]) {
      for (let x = X0 + (side > 0 ? 16 : 0); x < X1; x += 32) {
        const zp = side * 8.7;
        poles.push(put(cyl, x, 4.3, zp, 0.09, 8.6, 0.09));
        poles.push(put(box, x, 8.55, zp - side * 1.1, 0.08, 0.08, 2.3));
        heads.push(put(box, x, 8.45, zp - side * 2.1, 0.32, 0.1, 0.6));
        pools.push(put(plane, x, 0.03, zp - side * 2.6, 16, 1, 16));
        halos.push(x, 8.35, zp - side * 2.1);
        lamps.push([x, 8.3, zp - side * 2.1]);
      }
      for (let x = X0 + 8 + (side > 0 ? 11 : 0); x < X1; x += 23) {
        const zt = side * 11.0;
        trunks.push(put(cyl, x, 1.6, zt, 0.14, 3.2, 0.14));
        crowns.push(put(ball, x, 4.0, zt, 1.9, 1.5, 1.9));
        crowns.push(put(ball, x + 0.9, 4.7, zt + 0.4, 1.3, 1.1, 1.3));
        crowns.push(put(ball, x - 0.8, 4.5, zt - 0.5, 1.2, 1.0, 1.2));
      }
    }
    for (let x = X0; x < X1; x += 9) for (const z of [-3.7, 3.7]) dashes.push(put(box, x, 0.012, z, 3, 0.01, 0.13));
    for (const z of [-7.55, 7.55]) dashes.push(put(box, (X0 + X1) / 2, 0.012, z, X1 - X0, 0.01, 0.12));
    for (const z of [-0.12, 0.12]) yellow.push(put(box, (X0 + X1) / 2, 0.013, z, X1 - X0, 0.01, 0.1));
    const m = (a: THREE.BufferGeometry[]) => mergeGeometries(a, false)!;
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));
    return { B, poles: m(poles), heads: m(heads), pools: m(pools), trunks: m(trunks), crowns: m(crowns), dashes: m(dashes), yellow: m(yellow), haloGeo, lamps };
  }, []);

  const mats = useMemo(() => {
    const glowTex = glow();
    return {
      road: new THREE.MeshStandardMaterial({ map: asphalt(), roughness: 0.92, color: '#9a9aa2' }),
      walkTop: new THREE.MeshStandardMaterial({ map: paving(), roughness: 0.95, color: '#a8a29c' }),
      curbSide: new THREE.MeshStandardMaterial({ map: curb(), roughness: 0.8 }),
      pole: mat('#3b3f46', { rough: 0.5, metal: 0.6 }),
      head: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd79a', emissiveIntensity: 3.2 }),
      pool: new THREE.MeshBasicMaterial({ color: '#ffae62', alphaMap: glowTex, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending }),
      halo: new THREE.PointsMaterial({ map: glowTex, color: '#ffd9a0', size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
      trunk: mat('#3b2a1f', { rough: 0.9 }),
      crown: mat('#1e3a27', { rough: 0.95 }),
      dash: new THREE.MeshStandardMaterial({ color: '#e9e9e4', roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.05 }),
      yellow: new THREE.MeshStandardMaterial({ color: '#e8c33a', roughness: 0.6 }),
      roof: mat('#1a1d24', { rough: 0.9 }),
    };
  }, []);

  const buildings = useMemo(() => built.B.map((b) => {
    const cols = Math.max(4, Math.round(b.w / 2.3)), rows = Math.max(2, Math.round(b.h / 3.3));
    const f = facade(b.kind, b.seed, cols, rows);
    const side = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.85 });
    return { b, side };
  }), [built]);

  const shopTex = useMemo(() => SHOPS.map(([n, bg, fg]) => sign(n, bg, fg)), []);
  const shopMats = useMemo(() => [0, 1, 2, 3, 4, 5].map((k) => { const t = shopfront(k); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1 }); }), []);
  const L = X1 - X0, CX = (X0 + X1) / 2;
  return (
    <group>
      {/* road, footpaths, curbs */}
      <mesh material={mats.road} rotation={[-PI / 2, 0, 0]} position={[CX, 0, 0]}><planeGeometry args={[L, 16]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[CX, 0.075, s * 9.8]} material={[mats.curbSide, mats.curbSide, mats.walkTop, mats.walkTop, mats.curbSide, mats.curbSide]}><boxGeometry args={[L, 0.15, 3.6]} /></mesh>
      ))}
      <mesh position={[CX, -0.01, 0]} rotation={[-PI / 2, 0, 0]}><planeGeometry args={[L + 400, 700]} /><meshStandardMaterial color="#16171b" roughness={1} /></mesh>
      <Skyline />
      <mesh geometry={built.dashes} material={mats.dash} />
      <mesh geometry={built.yellow} material={mats.yellow} />
      {/* streetlights, light pools, halos */}
      <mesh geometry={built.poles} material={mats.pole} />
      <mesh geometry={built.heads} material={mats.head} />
      <mesh geometry={built.pools} material={mats.pool} renderOrder={1} />
      <points geometry={built.haloGeo} material={mats.halo} />
      {!lowDetail && <><mesh geometry={built.trunks} material={mats.trunk} /><mesh geometry={built.crowns} material={mats.crown} /></>}
      {/* buildings with lit windows, shopfronts and signs */}
      {buildings.map(({ b, side }, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]} material={[side, side, mats.roof, mats.roof, side, side]}><boxGeometry args={[b.w, b.h, b.d]} /></mesh>
          {b.shop !== undefined && (
            <group position={[0, 0, -b.side * (b.d / 2 + 0.04)]} rotation={[0, b.side > 0 ? PI : 0, 0]}>
              <mesh position={[0, 1.6, 0]} material={shopMats[(b.seed + i) % shopMats.length]}><planeGeometry args={[b.w * 0.86, 2.8]} /></mesh>
              <mesh position={[0, 3.75, 0.02]}><planeGeometry args={[Math.min(b.w * 0.8, 11), 1.15]} /><meshStandardMaterial map={shopTex[b.shop]} emissiveMap={shopTex[b.shop]} emissive="#ffffff" emissiveIntensity={0.9} /></mesh>
              <mesh position={[0, 3.1, 0.6]} rotation={[0.35, 0, 0]}><boxGeometry args={[b.w * 0.9, 0.06, 1.3]} /><meshStandardMaterial color="#3a3530" roughness={0.8} /></mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/** Real lights only near the scene (performance): warm sodium/LED streetlights casting on the actors. */
function SceneLights() {
  const R = WORLD_INFO().rest;
  const xs = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const side of [-1, 1]) for (let x = X0 + (side > 0 ? 16 : 0); x < X1; x += 32) if (Math.abs(x - R[0]) < 60) out.push([x, 8.0, side * 8.7 - side * 2.1]);
    return out;
  }, [R]);
  return <>{xs.map((p, i) => <pointLight key={i} position={p} color="#ffcf8a" intensity={260} distance={34} decay={2} />)}</>;
}

// ---------------------------------------------------------------------------------------------- debris (ballistic + sliding friction)
/** Fragments from the impact (indicator lens, mirror glass, trim). Each inherits the bike's post-impact velocity,
 *  scaled and turned by a fixed amount, is thrown up, lands under gravity and slides to rest (μ = 0.5). */
const FRAGS = [
  { k: 0.72, turn: 0.18, vy: 2.2, c: '#ff8a1e', s: 0.07 }, { k: 0.9, turn: -0.12, vy: 1.6, c: '#c9d6e3', s: 0.06 },
  { k: 0.55, turn: 0.35, vy: 2.8, c: '#1a1a1d', s: 0.11 }, { k: 0.8, turn: -0.3, vy: 1.2, c: '#8f9399', s: 0.05 },
  { k: 0.62, turn: 0.05, vy: 3.1, c: '#e43a3a', s: 0.06 }, { k: 1.0, turn: 0.22, vy: 0.9, c: '#c9d6e3', s: 0.04 },
  { k: 0.46, turn: -0.42, vy: 2.4, c: '#1a1a1d', s: 0.09 }, { k: 0.84, turn: 0.4, vy: 1.9, c: '#5c1520', s: 0.08 },
];
function fragment(i: number, t: number): [number, number, number, number] {
  const w = WORLD_INFO();
  const F = FRAGS[i], g = 9.81, mu = 0.5, y0 = 0.6;
  const τ = t - w.tImpact;
  const c = Math.cos(F.turn), s = Math.sin(F.turn);
  const vx = (w.impact.vx * c + w.impact.vz * s) * F.k, vz = (-w.impact.vx * s + w.impact.vz * c) * F.k;
  if (τ <= 0) return [w.impact.x, -5, w.impact.z, 0];
  const tf = (F.vy + Math.sqrt(F.vy * F.vy + 2 * g * y0)) / g;
  if (τ < tf) return [w.impact.x + vx * τ, y0 + F.vy * τ - 0.5 * g * τ * τ, w.impact.z + vz * τ, τ * 9];
  const lx = w.impact.x + vx * tf, lz = w.impact.z + vz * tf;
  const v = Math.hypot(vx, vz) * 0.6, ts = Math.min(τ - tf, v / (mu * g)); // 40 % lost on landing
  const d = v * ts - 0.5 * mu * g * ts * ts;
  const ux = vx / (Math.hypot(vx, vz) || 1), uz = vz / (Math.hypot(vx, vz) || 1);
  return [lx + ux * d, 0.02, lz + uz * d, tf * 9 + ts * 3];
}
function Debris() {
  const clock = useClock();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => FRAGS.forEach((_, i) => { const m = refs.current[i]; if (!m) return; const [x, y, z, r] = fragment(i, clock.t); m.position.set(x, y, z); m.rotation.set(r * 0.7, r, 0); m.visible = y > -1; }));
  return <>{FRAGS.map((F, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} scale={[F.s, F.s * 0.25, F.s * 0.7]}><boxGeometry /><meshStandardMaterial color={F.c} roughness={0.35} metalness={0.3} /></mesh>)}</>;
}

/** The scrape mark the sliding bike leaves (it grows with the slide), and a small, dark stain by his head. */
function GroundMarks() {
  const clock = useClock();
  const scrape = useRef<THREE.Mesh>(null), stain = useRef<THREE.Mesh>(null);
  const w = WORLD_INFO();
  // blood: a glossy pool under his head that spreads (area ∝ time, so radius ∝ √t) and slows, plus a few drops
  // and a short smear where he came to rest. Present, not lingered on.
  const poolMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a070e', roughness: 0.12, metalness: 0.1, alphaMap: glow(), transparent: true, opacity: 0.95, depthWrite: false }), []);
  const smearMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a0a0d', roughness: 0.5, alphaMap: glow(), transparent: true, opacity: 0.7, depthWrite: false }), []);
  const drops = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = clock.t;
    if (scrape.current) {
      const b = bike(t);
      const a = w.bikeDown;
      const dx = b.x - a[0], dz = b.z - a[2], L = Math.hypot(dx, dz);
      scrape.current.visible = t > w.tBikeDown && L > 0.05;
      scrape.current.position.set(a[0] + dx / 2, 0.006, a[2] + dz / 2);
      scrape.current.rotation.set(-PI / 2, 0, Math.atan2(dz, dx) * -1);
      scrape.current.scale.set(L, 0.16, 1);
    }
    const τ = t - (w.tImpact + 2.2);
    const shown = τ > 0 && t < RESCUE.depart + 30;
    if (stain.current) {
      stain.current.visible = shown;
      const r = Math.min(1, Math.sqrt(Math.max(0, τ) / 14));
      stain.current.scale.set(0.12 + 0.5 * r, 0.1 + 0.36 * r, 1);
    }
    if (drops.current) drops.current.visible = shown;
  });
  // the head end lies toward +z at rest (body axis along z)
  return (
    <>
      <mesh ref={scrape}><planeGeometry /><meshBasicMaterial color="#0c0c0e" transparent opacity={0.55} depthWrite={false} /></mesh>
      <mesh ref={stain} material={poolMat} position={[w.rest[0] + 0.08, 0.008, w.rest[2] + 0.78]} rotation={[-PI / 2, 0, 0.35]}><planeGeometry /></mesh>
      <group ref={drops}>
        <mesh material={smearMat} position={[w.rest[0] - 0.7, 0.007, w.rest[2] + 0.35]} rotation={[-PI / 2, 0, 0.06]} scale={[1.1, 0.11, 1]}><planeGeometry /></mesh>
        {[[-0.35, 0.95, 0.07], [0.42, 1.05, 0.05], [-1.3, 0.3, 0.045], [-1.7, 0.42, 0.035], [0.3, 0.55, 0.04]].map(([x, z, r], i) => (
          <mesh key={i} material={poolMat} position={[w.rest[0] + x, 0.0075, w.rest[2] + z]} rotation={[-PI / 2, 0, i]} scale={[r * 1.3, r, 1]}><planeGeometry /></mesh>
        ))}
      </group>
    </>
  );
}

/** The LifeLine broadcast, visualised: rings spreading from his phone while SOS is active (overlay shots). */
function SignalRings() {
  const clock = useClock();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const R = WORLD_INFO().rest;
  const mats = useMemo(() => [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), []);
  useFrame(() => {
    const t = clock.t - T_SOS;
    refs.current.forEach((m, k) => {
      if (!m) return;
      const on = t > 1.4 && t < 16;
      m.visible = on;
      if (!on) return;
      const ph = ((t * 0.45 + k / 4) % 1);
      m.scale.setScalar(2 + ph * 70);
      mats[k].opacity = 0.55 * (1 - ph) * seg(t, 1.4, 2.4);
    });
  });
  return <group position={[R[0], 0.05, R[2]]}>{mats.map((m, k) => <mesh key={k} ref={(r) => { refs.current[k] = r; }} material={m} rotation={[-PI / 2, 0, 0]}><ringGeometry args={[0.96, 1, 96]} /></mesh>)}</group>;
}

// ---------------------------------------------------------------------------------------------- street set
const tcache = { t: -1, list: [] as ReturnType<typeof traffic> };
const trafficAt = (t: number) => { if (tcache.t !== t) { tcache.t = t; tcache.list = traffic(t); } return tcache.list; };

export function StreetSet({ lowDetail = false }: { lowDetail?: boolean }) {
  const sky = useMemo(() => skyTex('dusk'), []);
  const w = WORLD_INFO();
  const nPed = lowDetail ? 8 : 16;
  return (
    <group>
      <mesh scale={600}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <hemisphereLight args={['#61709f', '#1d1712', 0.65]} />
      <directionalLight position={[-120, 40, -60]} intensity={0.42} color="#ffc6a2" />
      <ambientLight intensity={0.12} color="#8fa6ff" />
      <SceneLights />
      <StaticStreet lowDetail={lowDetail} />

      {/* free-flowing traffic */}
      {Array.from({ length: 24 }, (_, i) => (i % 7 === 3
        ? <AutoRickshaw key={i} drive={(t) => trafficAt(t)[i]} />
        : <Car key={i} color={trafficAt(0)[i].color} kind={i % 3 ? 'sedan' : 'hatch'} drive={(t) => trafficAt(t)[i]} />))}
      {/* the hit-and-run car (fictional, no plates shown) */}
      <Car color="#2b2f36" drive={(t) => car(t)} />
      {/* traffic that stops behind the crash, cars yielding to the ambulance */}
      {([0, 1] as const).map((k) => <Car key={`q${k}`} color={k ? '#2C3E57' : '#C7C9CC'} drive={(t) => queued(k, t)} />)}
      {([0, 1, 2] as const).map((k) => (k === 1 ? <AutoRickshaw key={`a${k}`} drive={(t) => aside(k, t)} /> : <Car key={`a${k}`} color={['#9AA3AD', '#E8C33A', '#7A1F27'][k]} drive={(t) => aside(k, t)} />))}
      <Ambulance drive={(t) => ambulance(t)} />

      {/* the rider and his motorcycle */}
      <Motorcycle drive={(t) => { const b = bike(t); return { ...b, light: t > w.tImpact ? 1.2 : 2.2 }; }} />
      <Person outfit={OUTFIT.arjun} drive={(t) => riderPose(t, 'helmet')} handR={<LivePhone />} />
      <Person outfit={OUTFIT.arjunBare} drive={(t) => riderPose(t, 'bare')} />
      <Person outfit={OUTFIT.arjunO2} drive={(t) => riderPose(t, 'o2')} />
      <HelmetOnGround />
      <Debris />
      <GroundMarks />
      <SignalRings />

      {/* people */}
      {([0, 1, 2] as const).map((i) => <Person key={`b${i}`} outfit={[OUTFIT.by0, OUTFIT.by1, OUTFIT.by2][i]} drive={(t) => walkerState(bystander(i, t), { prop: bystander(i, t).mode === 'phone' })} handR={<LivePhoneDark />} />)}
      {([0, 1] as const).map((i) => <Person key={`m${i}`} outfit={i ? OUTFIT.medic : OUTFIT.medic2} drive={(t) => walkerState(paramedic(i, t), { face: { expr: 'focus', talk: paramedic(i, t).mode === 'kneel' ? 0.6 : 0 } })} />)}
      {Array.from({ length: nPed }, (_, i) => <Person key={`p${i}`} detail="low" outfit={PED_OUTFITS[i % PED_OUTFITS.length]} drive={(t) => walkerState(pedestrian(i, t))} />)}

      {/* rescue kit: trauma bag by his side, oxygen on the stretcher */}
      <KitBag />
      <Stretcher drive={(t) => stretcher(t)}>
        <mesh position={[-0.55, 1.02, 0.2]} rotation={[0, 0, PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.5, 14]} /><meshStandardMaterial color="#2e8b57" roughness={0.4} metalness={0.3} /></mesh>
      </Stretcher>
    </group>
  );
}
function LivePhoneDark() {
  return <group><RoundedBox args={[0.075, 0.155, 0.009]} radius={0.008} material={mat('#16181d', { rough: 0.3, metal: 0.4 })} /><mesh position={[0, 0, 0.0052]} scale={[0.067, 0.145, 1]}><planeGeometry /><meshStandardMaterial color="#14263f" emissive="#5aa7ff" emissiveIntensity={0.9} /></mesh></group>;
}
function HelmetOnGround() {
  const clock = useClock();
  const g = useRef<THREE.Group>(null);
  const R = WORLD_INFO().rest;
  useFrame(() => { if (g.current) g.current.visible = clock.t >= T_HELMET_OFF && clock.t < RESCUE.depart + 30; });
  return (
    <group ref={g} position={[R[0] + 0.55, 0.12, R[2] + 1.15]} rotation={[0.3, 0.8, 1.2]}>
      <mesh scale={[0.142, 0.157, 0.162]}><sphereGeometry args={[1, 24, 16, 0, PI * 2, 0, PI * 0.62]} /><meshStandardMaterial color="#151a22" roughness={0.25} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <Shadow w={0.5} d={0.45} />
    </group>
  );
}
function KitBag() {
  const clock = useClock();
  const g = useRef<THREE.Group>(null);
  const R = WORLD_INFO().rest;
  useFrame(() => { if (g.current) g.current.visible = clock.t > RESCUE.attendantOut + 3.4 && clock.t < RESCUE.returnStart + 1; });
  return (
    <group ref={g} position={[R[0] + 1.25, 0.16, R[2] - 0.55]} rotation={[0, 0.4, 0]}>
      <RoundedBox args={[0.55, 0.3, 0.32]} radius={0.06} material={mat('#e0562a', { rough: 0.6 })} />
      <mesh position={[0, 0.151, 0]} scale={[0.5, 0.004, 0.06]}><boxGeometry /><meshStandardMaterial color="#f4f4f4" emissive="#ffffff" emissiveIntensity={0.3} /></mesh>
      <Shadow w={0.8} d={0.6} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- home (parents)
export const HOME_T = T_SOS + 16;
const H = (k: number) => HOME_T + k;
export function HomeSet() {
  const clock = useClock();
  const tablePhone = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const tv = useRef<THREE.PointLight>(null);
  const win = useMemo(() => facade('res', 3, 10, 6), []);
  useFrame(() => {
    const t = clock.t;
    const alert = t > H(1.2);
    if (screen.current) { screen.current.emissive.set(alert ? '#ff3346' : '#1d3557'); screen.current.emissiveIntensity = alert ? 1.8 + Math.sin(t * 7) * 0.7 : 0.2; }
    if (tablePhone.current) tablePhone.current.visible = t < H(3.4);
    if (tv.current) tv.current.intensity = 6 + Math.sin(t * 9) * 1.5 + Math.sin(t * 3.1) * 1.2;
  });
  const sofaMat = mat('#6b4a3a', { rough: 0.85 });
  return (
    <group>
      <ambientLight intensity={0.2} color="#ffd9b0" />
      <pointLight position={[-1.6, 2.3, -1.2]} intensity={9} distance={9} decay={2} color="#ffc98a" />
      <pointLight position={[1.8, 1.7, 1.6]} intensity={5} distance={7} decay={2} color="#ffb070" />
      <pointLight ref={tv} position={[0, 1.2, 2.2]} intensity={6} distance={6} decay={2} color="#8fb7ff" />
      {/* room */}
      <mesh rotation={[-PI / 2, 0, 0]}><planeGeometry args={[8, 7]} /><meshStandardMaterial color="#6d4b35" roughness={0.6} /></mesh>
      <mesh position={[0, 1.5, -3.2]}><planeGeometry args={[8, 3]} /><meshStandardMaterial color="#d9c6a8" roughness={0.9} /></mesh>
      <mesh position={[-3.6, 1.5, 0]} rotation={[0, PI / 2, 0]}><planeGeometry args={[7, 3]} /><meshStandardMaterial color="#cdb899" roughness={0.9} /></mesh>
      <mesh position={[3.6, 1.5, 0]} rotation={[0, -PI / 2, 0]}><planeGeometry args={[7, 3]} /><meshStandardMaterial color="#cdb899" roughness={0.9} /></mesh>
      <mesh position={[0, 3, 0]} rotation={[PI / 2, 0, 0]}><planeGeometry args={[8, 7]} /><meshStandardMaterial color="#efe6d8" roughness={1} /></mesh>
      {/* window with the city at night */}
      <mesh position={[1.6, 1.65, -3.18]}><planeGeometry args={[2.2, 1.4]} /><meshStandardMaterial map={win.map} emissiveMap={win.emissive} emissive="#ffffff" emissiveIntensity={1.2} /></mesh>
      <mesh position={[1.6, 1.65, -3.16]}><boxGeometry args={[2.3, 0.06, 0.04]} /><meshStandardMaterial color="#f2efe9" /></mesh>
      {/* sofa (mom) and armchair (dad), coffee table */}
      <RoundedBox args={[2.2, 0.42, 0.85]} radius={0.08} position={[-0.9, 0.25, -1.9]} material={sofaMat} />
      <RoundedBox args={[2.2, 0.75, 0.22]} radius={0.08} position={[-0.9, 0.62, -2.3]} material={sofaMat} />
      <RoundedBox args={[0.95, 0.42, 0.85]} radius={0.08} position={[1.55, 0.25, -1.2]} rotation={[0, -0.8, 0]} material={sofaMat} />
      <RoundedBox args={[0.95, 0.6, 0.2]} radius={0.06} position={[1.85, 0.6, -1.5]} rotation={[0, -0.8, 0]} material={sofaMat} />
      <RoundedBox args={[1.1, 0.06, 0.6]} radius={0.02} position={[0.2, 0.42, -0.9]} material={mat('#3b2a20', { rough: 0.4 })} />
      {[[-0.3, -1.1], [0.7, -1.1], [-0.3, -0.7], [0.7, -0.7]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]} scale={[0.04, 0.4, 0.04]}><boxGeometry /><meshStandardMaterial color="#2a1d16" /></mesh>)}
      <mesh position={[0.05, 0.47, -0.85]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.05, 0.04, 0.08, 14]} /><meshStandardMaterial color="#f1ece2" /></mesh>
      <group ref={tablePhone} position={[0.35, 0.455, -0.95]} rotation={[-PI / 2, 0, 0.3]}>
        <RoundedBox args={[0.075, 0.155, 0.009]} radius={0.008} material={mat('#16181d', { rough: 0.3, metal: 0.4 })} />
        <mesh position={[0, 0, 0.0052]} scale={[0.067, 0.145, 1]}><planeGeometry /><meshStandardMaterial ref={screen} color="#0d1c33" emissive="#1d3557" emissiveIntensity={0.2} /></mesh>
      </group>
      {/* lamp + family photo + TV glow */}
      <mesh position={[-2.6, 0.75, -2.5]}><cylinderGeometry args={[0.03, 0.03, 1.5, 8]} /><meshStandardMaterial color="#3a3530" /></mesh>
      <mesh position={[-2.6, 1.6, -2.5]}><cylinderGeometry args={[0.18, 0.26, 0.32, 18, 1, true]} /><meshStandardMaterial color="#f7e3c2" emissive="#ffcf8f" emissiveIntensity={1.2} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-1.2, 1.9, -3.17]}><planeGeometry args={[0.7, 0.5]} /><meshStandardMaterial color="#3a2d22" /></mesh>
      <mesh position={[-1.2, 1.9, -3.16]}><planeGeometry args={[0.6, 0.4]} /><meshStandardMaterial color="#c9a27a" emissive="#5a4030" emissiveIntensity={0.3} /></mesh>
      {/* parents */}
      <Person outfit={OUTFIT.mom} drive={(t) => momPose(t)} />
      <Person outfit={OUTFIT.dad} drive={(t) => dadPose(t)} handR={<group><RoundedBox args={[0.075, 0.155, 0.009]} radius={0.008} material={mat('#16181d', { rough: 0.3, metal: 0.4 })} /><mesh position={[0, 0, 0.0052]} scale={[0.067, 0.145, 1]}><planeGeometry /><meshStandardMaterial color="#c8203a" emissive="#ff3346" emissiveIntensity={1.6} /></mesh></group>} />
    </group>
  );
}
function sitStand(sitPos: [number, number, number], yaw: number, k: number, top: Pose, t: number): PersonState {
  const legs = mix(POSE.sit, POSE.stand, k);
  const pose: Pose = { ...top, hipL: legs.hipL, hipR: legs.hipR, kneeL: legs.kneeL, kneeR: legs.kneeR };
  // standing up: the pelvis rises and moves forward over the feet (centre of mass over the base of support)
  const fwd = 0.32 * k;
  return { pos: [sitPos[0] + Math.sin(yaw) * fwd, lerp(0.53, 0.94, k), sitPos[2] + Math.cos(yaw) * fwd], yaw, pose: { ...pose, spine: pose.spine + 0.35 * Math.sin(PI * k) }, bob: 0.004 * Math.sin(t * 1.6) };
}
function dadPose(t: number): PersonState {
  const look = seg(t, H(1.4), H(2.2));
  const reach = seg(t, H(2.6), H(3.4));
  const ear = seg(t, H(3.6), H(4.4));
  const up = seg(t, H(4.6), H(5.8));
  let top = mix(POSE.sit, { ...POSE.sit, head: 0.45, headYaw: -0.5, spine: 0.25 }, look);
  top = mix(top, { ...POSE.sit, spine: 0.55, head: 0.5, shR: 1.0, elR: 0.3, shRz: 0.2 }, reach * (1 - ear));
  top = mix(top, { ...POSE.phoneEar, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0 }, ear);
  const s = sitStand([1.5, 0, -1.15], -0.8, up, top, t);
  // reading calmly → the alert → on the phone to 108, steady but worried, reading out the location
  const face: FaceState = t < H(1.4) ? { expr: 'calm' } : t < H(3.6) ? { expr: 'calm', to: 'shock', k: seg(t, H(1.3), H(1.8)) } : { expr: 'worried', talk: t > H(4.2) ? 0.9 : 0 };
  return { ...s, prop: t > H(3.4), face };
}
function momPose(t: number): PersonState {
  const look = seg(t, H(1.6), H(2.4));
  const worry = seg(t, H(4.2), H(5.2));
  const up = seg(t, H(5.4), H(6.6));
  let top = mix(POSE.sit, { ...POSE.sit, head: 0.2, headYaw: 0.55, spine: 0.15 }, look);
  top = mix(top, { ...POSE.hold, headYaw: 0.5, head: 0.15 }, worry);
  const face: FaceState = t < H(1.6) ? { expr: 'smile' } : t < H(4.2) ? { expr: 'smile', to: 'shock', k: seg(t, H(1.5), H(2.0)) } : { expr: 'shock', to: 'cry', k: seg(t, H(4.2), H(5.4)) };
  return { ...sitStand([-0.5, 0, -1.78], 0, up, top, t), face };
}

// ---------------------------------------------------------------------------------------------- hospital (exterior, emergency entrance)
export const HOSP_T = T_SOS + 70;
/** Arrival: 9 m/s, braking at a constant 1.84 m/s² to stop under the canopy (x = 0) — d = v²/2a = 22 m. */
function ambArrive(t: number) {
  const τ = t - HOSP_T, v0 = 9, a = 1.84, tStop = v0 / a;
  const s = τ < tStop ? v0 * τ - 0.5 * a * τ * τ : (v0 * v0) / (2 * a);
  const v = τ < tStop ? v0 - a * τ : 0;
  const x = -22 + s;
  return { x, z: 0, yaw: 0, lights: true, visible: true, doors: seg(t, HOSP_T + tStop + 0.5, HOSP_T + tStop + 1.2), wheel: s / 0.38, v };
}
const H_STOP = HOSP_T + 9 / 1.84;
function hospStretcher(t: number) {
  // out of the rear doors (−x end) and wheeled to the entrance (+z), acceleration-limited
  const a: [number, number, number] = [-3.0, 0, 0], b: [number, number, number] = [-4.4, 0, 0], c: [number, number, number] = [-4.4, 0, 5.2];
  const τ = t - (H_STOP + 1.4);
  const L1 = 1.4, L2 = 5.2, L = L1 + L2, vmax = 1.5, am = 1.3;
  const ta = vmax / am, da = 0.5 * am * ta * ta;
  let sv = 0;
  if (τ > 0) sv = τ < ta ? 0.5 * am * τ * τ : Math.min(L, da + vmax * (τ - ta));
  const pos: [number, number, number] = sv < L1 ? [lerp(a[0], b[0], sv / L1), 0, 0] : [b[0], 0, lerp(b[2], c[2], (sv - L1) / L2)];
  // castors: the heading swings smoothly from −x to +z through the corner
  const yaw = lerp(PI, 1.5 * PI, seg(sv, L1 - 0.5, L1 + 0.7));
  return { pos, visible: τ > -0.6, yaw, speed: τ > 0 && sv < L ? Math.min(vmax, am * τ) : 0, s: sv };
}
export function HospitalSet() {
  const sky = useMemo(() => skyTex('night'), []);
  const fac = useMemo(() => facade('office', 5, 18, 5), []);
  const name = useMemo(() => sign('CITY GENERAL HOSPITAL', '#0e2a3d', '#e6f6ff', undefined, 1024, 128), []);
  const er = useMemo(() => sign('EMERGENCY', '#b0182c', '#ffffff', 'OPEN 24 HOURS', 512, 160), []);
  return (
    <group>
      <mesh scale={400}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <hemisphereLight args={['#5a6a9a', '#1a1410', 0.55]} />
      <pointLight position={[0, 4.2, 3.2]} intensity={120} distance={22} decay={2} color="#eaf6ff" />
      <pointLight position={[-8, 5, 4]} intensity={60} distance={20} decay={2} color="#ffd29a" />
      <mesh rotation={[-PI / 2, 0, 0]}><planeGeometry args={[120, 80]} /><meshStandardMaterial map={asphalt()} color="#8a8a92" roughness={0.9} /></mesh>
      {/* the building */}
      <mesh position={[0, 9, 14]}><boxGeometry args={[46, 18, 10]} /><meshStandardMaterial map={fac.map} emissiveMap={fac.emissive} emissive="#ffffff" emissiveIntensity={1.1} roughness={0.8} /></mesh>
      <mesh position={[0, 15.5, 8.9]} rotation={[0, PI, 0]}><planeGeometry args={[16, 2]} /><meshStandardMaterial map={name} emissiveMap={name} emissive="#ffffff" emissiveIntensity={1.4} /></mesh>
      {/* emergency entrance: canopy, sign, lit sliding doors */}
      <mesh position={[0, 4.1, 5.6]}><boxGeometry args={[14, 0.35, 6.6]} /><meshStandardMaterial color="#e8edf0" roughness={0.6} /></mesh>
      {[-6.6, 6.6].map((x) => <mesh key={x} position={[x, 2, 3]}><cylinderGeometry args={[0.16, 0.16, 4, 14]} /><meshStandardMaterial color="#cfd6db" metalness={0.4} roughness={0.4} /></mesh>)}
      <mesh position={[0, 4.75, 2.28]} rotation={[0, PI, 0]}><planeGeometry args={[5, 1.55]} /><meshStandardMaterial map={er} emissiveMap={er} emissive="#ffffff" emissiveIntensity={1.8} /></mesh>
      <mesh position={[0, 1.5, 8.95]} rotation={[0, PI, 0]}><planeGeometry args={[5, 3]} /><meshStandardMaterial color="#dff3ff" emissive="#e6f7ff" emissiveIntensity={1.6} /></mesh>
      <mesh position={[0, 4.0, 5.6]} rotation={[PI / 2, 0, 0]}><planeGeometry args={[12, 5]} /><meshStandardMaterial color="#ffffff" emissive="#f2fbff" emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>
      {/* bays, kerb and bollards */}
      {[-10, -4, 4, 10].map((x) => <mesh key={x} position={[x, 0.012, -3]}><boxGeometry args={[0.12, 0.01, 6]} /><meshStandardMaterial color="#e9e9e4" /></mesh>)}
      <mesh position={[0, 0.08, 8.2]}><boxGeometry args={[40, 0.16, 1.4]} /><meshStandardMaterial color="#a39d97" /></mesh>
      <Ambulance drive={(t) => ambArrive(t)} />
      <Stretcher drive={(t) => { const s = hospStretcher(t); return { pos: s.pos, visible: s.visible, yaw: s.yaw }; }} />
      <Person outfit={OUTFIT.arjunO2} drive={(t) => { const s = hospStretcher(t); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw + PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -PI / 2)); return { pos: [s.pos[0], 1.03, s.pos[2]], quat: q, pose: POSE.stretcher, visible: s.visible, face: { expr: 'worried' }, injury: 1 }; }} />
      {/* paramedic pushing, nurse and doctor receiving at the doors */}
      <Person outfit={OUTFIT.medic} drive={(t) => { const s = hospStretcher(t); const back = s.s < 1.4 ? [s.pos[0] + 1.3, s.pos[2]] : [s.pos[0], s.pos[2] - 1.3]; const yaw = s.s < 1.4 ? -PI / 2 : 0; const sp = s.speed; return walkerState({ pos: [back[0], 0, back[1]], yaw, mode: sp > 0.1 ? 'walk' : 'stand', phase: (s.s / 1.5) * 2 * PI, visible: t > H_STOP + 0.8, speed: sp }); }} />
      <Person outfit={OUTFIT.nurse} drive={(t) => { const tt = t - (H_STOP + 0.4); const L = 4.4, v = 1.4; const s = clamp(tt * v, 0, L); const p: [number, number, number] = [lerp(-1.2, -5.6, s / L), 0, lerp(7.6, 1.2, s / L)]; return walkerState({ pos: p, yaw: s < L ? Math.atan2(-4.4, -6.4) : PI / 2, mode: s > 0 && s < L ? 'walk' : 'stand', phase: (s / 1.4) * 2 * PI, visible: true, speed: s > 0 && s < L ? v : 0 }); }} />
      <Person outfit={OUTFIT.doctor} drive={() => walkerState({ pos: [1.2, 0, 7.4], yaw: PI + 0.4, mode: 'stand', phase: 0, visible: true, speed: 0 }, { face: { expr: 'focus' } })} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- emergency department bay (family)
export function WardSet() {
  const clock = useClock();
  const ecgTex = useMemo(() => { const t = ecg().clone(); t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; return t; }, []);
  useFrame(() => { ecgTex.offset.x = (clock.t * 0.35) % 1; });
  const qBed = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -PI / 2 + 0.32)), []);
  return (
    <group>
      <ambientLight intensity={0.35} color="#e8f3ff" />
      <pointLight position={[0.5, 2.7, 0.6]} intensity={11} distance={9} decay={2} color="#f2f8ff" />
      <pointLight position={[-2.2, 1.8, 1.8]} intensity={9} distance={7} decay={2} color="#ffd6a6" />
      <mesh rotation={[-PI / 2, 0, 0]}><planeGeometry args={[9, 8]} /><meshStandardMaterial color="#cfd8dc" roughness={0.4} /></mesh>
      <mesh position={[0, 1.5, -2.6]}><planeGeometry args={[9, 3]} /><meshStandardMaterial color="#dfeeee" roughness={0.9} /></mesh>
      <mesh position={[-3.4, 1.4, 0]} rotation={[0, PI / 2, 0]}><planeGeometry args={[8, 2.8]} /><meshStandardMaterial color="#9cc7c4" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      <mesh position={[3.4, 1.4, 0]} rotation={[0, -PI / 2, 0]}><planeGeometry args={[8, 2.8]} /><meshStandardMaterial color="#9cc7c4" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      {/* bed */}
      <RoundedBox args={[2.1, 0.18, 0.95]} radius={0.05} position={[0, 0.62, -0.6]} material={mat('#f4f6f8', { rough: 0.6 })} />
      <RoundedBox args={[1.2, 0.08, 0.9]} radius={0.04} position={[0.4, 0.75, -0.6]} material={mat('#9fc3d8', { rough: 0.8 })} />
      <RoundedBox args={[0.9, 0.08, 0.9]} radius={0.04} position={[-0.62, 0.86, -0.6]} rotation={[0, 0, -0.32]} material={mat('#e9eef2', { rough: 0.8 })} />
      <RoundedBox args={[0.42, 0.12, 0.6]} radius={0.05} position={[-0.92, 1.03, -0.6]} rotation={[0, 0, -0.32]} material={mat('#ffffff', { rough: 0.8 })} />
      {[[-0.95, -0.2], [-0.95, -1.0], [0.95, -0.2], [0.95, -1.0]].map(([x, z], i) => <mesh key={i} position={[x, 0.27, z]} scale={[0.04, 0.54, 0.04]}><boxGeometry /><meshStandardMaterial color="#9aa3aa" metalness={0.6} roughness={0.3} /></mesh>)}
      {/* monitor + IV */}
      <mesh position={[-1.45, 1.25, -1.6]}><boxGeometry args={[0.5, 0.36, 0.08]} /><meshStandardMaterial color="#20262c" /></mesh>
      <mesh position={[-1.45, 1.25, -1.555]}><planeGeometry args={[0.44, 0.3]} /><meshStandardMaterial map={ecgTex} emissiveMap={ecgTex} emissive="#ffffff" emissiveIntensity={1.1} /></mesh>
      <mesh position={[-1.45, 0.53, -1.6]}><cylinderGeometry args={[0.02, 0.02, 1.06, 8]} /><meshStandardMaterial color="#9aa3aa" /></mesh>
      <mesh position={[1.25, 0.95, -1.25]}><cylinderGeometry args={[0.015, 0.015, 1.9, 8]} /><meshStandardMaterial color="#b9c0c6" metalness={0.6} /></mesh>
      <mesh position={[1.25, 1.75, -1.2]}><boxGeometry args={[0.14, 0.22, 0.04]} /><meshStandardMaterial color="#e8f6ff" transparent opacity={0.7} /></mesh>
      {/* Arjun: resting, conscious, bed head raised */}
      <Person outfit={OUTFIT.arjunWard} drive={(t) => ({ pos: [-0.12, 0.98, -0.6], quat: qBed, pose: { ...POSE.bed, shL: 0.04, shR: 0.06, shLz: 0.02, shRz: 0.04, elL: 0.12, elR: 0.18, head: 0.12, headYaw: -0.4 - 0.08 * Math.sin(t * 0.5) }, visible: true, face: { expr: 'calm', to: 'smile', k: seg(t, HOSP_T + 10, HOSP_T + 12) } })} />
      {/* mother at the bedside holding his hand; father's hand on her shoulder; the doctor at the foot */}
      <Person outfit={OUTFIT.mom} drive={(t) => ({ pos: [0.1, 0.5, 0.35], yaw: PI, pose: { ...POSE.sit, spine: 0.32, head: 0.15 + 0.03 * Math.sin(t * 1.2), shR: 0.95, elR: 0.6, shL: 0.8, elL: 0.9 }, visible: true, face: { expr: 'cry', to: 'relief', k: seg(t, HOSP_T + 9, HOSP_T + 12), talk: t > HOSP_T + 12.5 ? 0.4 : 0 } })} />
      <mesh position={[0.1, 0.24, 0.45]}><boxGeometry args={[0.5, 0.48, 0.5]} /><meshStandardMaterial color="#56707a" roughness={0.8} /></mesh>
      <Person outfit={OUTFIT.dad} drive={(t) => ({ pos: [0.02, 0.94, 0.86], yaw: PI - 0.12, pose: { ...POSE.shoulder, head: 0.18, headYaw: -0.15 + 0.04 * Math.sin(t * 0.8) }, visible: true, face: { expr: 'worried', to: 'relief', k: seg(t, HOSP_T + 10, HOSP_T + 13) } })} />
      <Person handR={<mesh scale={[0.17, 0.23, 0.012]}><boxGeometry /><meshStandardMaterial color="#1d2430" roughness={0.3} /></mesh>} outfit={OUTFIT.doctor} drive={(t) => ({ pos: [1.75, 0.94, -0.1], yaw: -PI / 2 - 0.35, pose: { ...POSE.stand, shR: 0.45, elR: 1.45, shRz: 0.1, shL: 0.12, head: 0.12 + 0.06 * Math.max(0, Math.sin(t * 1.4)) }, prop: true, visible: true, face: { expr: 'calm', to: 'smile', k: 0.6, talk: 0.5 } })} />
    </group>
  );
}

'use client';
/**
 * Procedural 3D cast and vehicles for "Experience LifeLine". People are articulated (pelvis, spine, head, two-
 * joint arms and legs) with realistic proportions (~1.75 m) and are posed every frame from the film clock.
 * Vehicles face +x. No brands, logos or real services: the ambulance is a generic, fictional city unit.
 */
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { glow, sign } from './textures';

// ---------------------------------------------------------------------------------------------- film clock
export const ClockCtx = createContext<{ t: number }>({ t: 0 });
export const useClock = () => useContext(ClockCtx);

// ---------------------------------------------------------------------------------------------- shared geometry
const G = {
  torso: new THREE.CapsuleGeometry(0.155, 0.3, 6, 16),
  pelvis: new THREE.CapsuleGeometry(0.13, 0.1, 6, 14),
  neck: new THREE.CylinderGeometry(0.048, 0.055, 0.12, 12),
  head: new THREE.SphereGeometry(0.105, 24, 18),
  hairCap: new THREE.SphereGeometry(0.112, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
  upperArm: new THREE.CapsuleGeometry(0.047, 0.22, 5, 12),
  forearm: new THREE.CapsuleGeometry(0.04, 0.2, 5, 12),
  hand: new THREE.SphereGeometry(0.045, 12, 10),
  thigh: new THREE.CapsuleGeometry(0.07, 0.32, 6, 14),
  shin: new THREE.CapsuleGeometry(0.052, 0.32, 6, 12),
  eye: new THREE.SphereGeometry(0.011, 8, 6),
  nose: new THREE.SphereGeometry(0.018, 8, 6),
  helmet: new THREE.SphereGeometry(0.15, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
  // lower shell round the back and sides (open at the face), and a curved visor across the front
  helmetBack: new THREE.SphereGeometry(0.15, 28, 12, Math.PI * 0.82, Math.PI * 1.36, Math.PI * 0.5, Math.PI * 0.2),
  visor: new THREE.SphereGeometry(0.158, 24, 10, Math.PI * 0.3, Math.PI * 0.4, Math.PI * 0.36, Math.PI * 0.24),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  tire: new THREE.TorusGeometry(0.29, 0.065, 12, 28),
  guard: new THREE.TorusGeometry(0.36, 0.022, 6, 24, Math.PI * 0.9),
  cone: new THREE.ConeGeometry(1, 1, 24, 1, true),
};
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; ei?: number } = {}) {
  const k = `${color}-${o.rough ?? 0.6}-${o.metal ?? 0}-${o.emissive ?? ''}-${o.ei ?? 0}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? '#000000', emissiveIntensity: o.ei ?? 0 });
    matCache.set(k, m);
  }
  return m;
}
const CHROME = () => mat('#c9ccd2', { rough: 0.18, metal: 0.95 });
const RUBBER = () => mat('#151517', { rough: 0.85 });

// ---------------------------------------------------------------------------------------------- poses
export interface Pose { spine: number; head: number; headYaw: number; hipL: number; hipR: number; kneeL: number; kneeR: number; shL: number; shR: number; shLz: number; shRz: number; elL: number; elR: number }
const Z: Pose = { spine: 0, head: 0, headYaw: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, shLz: 0, shRz: 0, elL: 0, elR: 0 };
export const POSE: Record<string, Pose> = {
  stand: { ...Z, shLz: 0.07, shRz: 0.07, elL: 0.12, elR: 0.12 },
  ride: { ...Z, spine: 0.38, head: -0.36, hipL: 1.3, hipR: 1.3, kneeL: 1.5, kneeR: 1.5, shL: 1.25, shR: 1.25, shLz: 0.28, shRz: 0.28, elL: 0.3, elR: 0.3 },
  kneel: { ...Z, spine: 0.42, head: 0.35, hipL: 1.45, kneeL: 1.55, hipR: -0.05, kneeR: 1.6, shL: 0.75, shR: 0.95, elL: 0.55, elR: 0.4, shLz: 0.1, shRz: 0.1 },
  sit: { ...Z, spine: -0.08, hipL: 1.5, hipR: 1.5, kneeL: 1.5, kneeR: 1.5, shL: 0.35, shR: 0.35, elL: 0.95, elR: 0.95, shLz: 0.1, shRz: 0.1 },
  lying: { ...Z, head: -0.2, headYaw: 0.35, hipL: 0.08, hipR: 0.3, kneeL: 0.15, kneeR: 0.55, shL: 0.15, shR: -0.1, shLz: 0.55, shRz: 0.3, elL: 0.3, elR: 0.5 },
  reach: { ...Z, head: -0.1, headYaw: -0.5, hipL: 0.08, hipR: 0.35, kneeL: 0.15, kneeR: 0.6, shL: 0.15, shR: 0.3, shLz: 0.55, shRz: 1.35, elL: 0.3, elR: 0.25 },
  phone: { ...Z, head: -0.45, headYaw: 0, hipL: 0.08, hipR: 0.35, kneeL: 0.15, kneeR: 0.6, shL: 0.15, shR: 1.9, shLz: 0.5, shRz: 0.15, elL: 0.3, elR: 1.25 },
  stretcher: { ...Z, head: -0.15, hipL: 0.04, hipR: 0.04, kneeL: 0.08, kneeR: 0.1, shL: 0.05, shR: 0.05, shLz: 0.12, shRz: 0.12, elL: 0.2, elR: 0.2 },
  bed: { ...Z, spine: 0.0, head: -0.35, hipL: 0.1, hipR: 0.1, kneeL: 0.2, kneeR: 0.2, shL: 0.1, shR: 0.35, shLz: 0.12, shRz: 0.2, elL: 0.3, elR: 0.9 },
  phoneEar: { ...Z, head: 0.1, shLz: 0.07, elL: 0.15, shR: 0.55, shRz: 0.55, elR: 2.45 },
  hold: { ...Z, shL: 0.55, shR: 0.55, elL: 0.9, elR: 0.9, shLz: 0.08, shRz: 0.08 },
  hug: { ...Z, spine: 0.12, shL: 1.25, shR: 1.25, shLz: -0.25, shRz: -0.25, elL: 1.1, elR: 1.1 },
  shoulder: { ...Z, shLz: 0.07, elL: 0.12, shR: 0.9, shRz: -0.35, elR: 0.35 },
  push: { ...Z, spine: 0.18, shL: 1.05, shR: 1.05, elL: 0.55, elR: 0.55, shLz: 0.08, shRz: 0.08 },
  look: { ...Z, spine: 0.08, head: 0.25, shL: 0.2, shR: 0.2, elL: 0.4, elR: 0.4, shLz: 0.08, shRz: 0.08 },
};
export function walk(phase: number, run = false): Pose {
  const a = run ? 0.75 : 0.42, s = Math.sin(phase);
  return {
    ...Z, spine: run ? 0.22 : 0.03, head: run ? -0.1 : 0,
    hipL: a * s, hipR: -a * s,
    kneeL: (run ? 0.35 : 0.12) + (run ? 1.1 : 0.55) * Math.max(0, -Math.cos(phase - 0.4)), kneeR: (run ? 0.35 : 0.12) + (run ? 1.1 : 0.55) * Math.max(0, Math.cos(phase - 0.4)),
    shL: -(run ? 0.7 : 0.32) * s, shR: (run ? 0.7 : 0.32) * s, shLz: 0.07, shRz: 0.07, elL: run ? 1.3 : 0.25, elR: run ? 1.3 : 0.25,
  };
}
export function mix(a: Pose, b: Pose, k: number): Pose {
  const o = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => { o[key] = a[key] + (b[key] - a[key]) * k; });
  return o;
}

// ---------------------------------------------------------------------------------------------- person
export interface Outfit { skin: string; hair: string; shirt: string; pants: string; shoes: string; female?: boolean; dress?: string; coat?: string; helmet?: string; backpack?: string; stripe?: string; mask?: boolean; bun?: boolean; grey?: boolean }
export interface PersonState { pos: [number, number, number]; yaw?: number; quat?: THREE.Quaternion; pose: Pose; visible?: boolean; bob?: number; prop?: boolean }

/** An articulated person (faces +z, pelvis at the group origin, ~0.95 m above the feet when standing). */
export function Person({ outfit, drive, scale = 1, handR }: { outfit: Outfit; drive: (t: number) => PersonState; scale?: number; handR?: ReactNode }) {
  const prop = useRef<THREE.Group>(null);
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const j = useRef<Record<string, THREE.Group | null>>({});
  const set = (k: string) => (g: THREE.Group | null) => { j.current[k] = g; };
  const M = useMemo(() => ({
    skin: mat(outfit.skin, { rough: 0.55 }), hair: mat(outfit.grey ? '#9a958f' : outfit.hair, { rough: 0.8 }), shirt: mat(outfit.shirt, { rough: 0.75 }),
    pants: mat(outfit.pants, { rough: 0.8 }), shoes: mat(outfit.shoes, { rough: 0.5 }), dark: mat('#1a1412', { rough: 0.4 }),
    coat: outfit.coat ? mat(outfit.coat, { rough: 0.7 }) : null, dress: outfit.dress ? mat(outfit.dress, { rough: 0.75 }) : null,
    helmet: outfit.helmet ? mat(outfit.helmet, { rough: 0.25, metal: 0.2 }) : null, visor: new THREE.MeshStandardMaterial({ color: '#2a3a52', roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    pack: outfit.backpack ? mat(outfit.backpack, { rough: 0.8 }) : null, stripe: outfit.stripe ? mat(outfit.stripe, { rough: 0.3, emissive: outfit.stripe, ei: 0.25 }) : null,
    mask: mat('#bfe8f2', { rough: 0.2 }),
  }), [outfit]);

  useFrame(() => {
    const s = drive(clock.t);
    const r = root.current;
    if (!r) return;
    r.visible = s.visible !== false;
    if (!r.visible) return;
    r.position.set(s.pos[0], s.pos[1] + (s.bob ?? 0), s.pos[2]);
    if (s.quat) r.quaternion.copy(s.quat); else r.rotation.set(0, s.yaw ?? 0, 0);
    if (prop.current) prop.current.visible = !!s.prop;
    const p = s.pose, J = j.current;
    J.spine?.rotation.set(p.spine, 0, 0);
    J.head?.rotation.set(p.head, p.headYaw, 0);
    J.hipL?.rotation.set(-p.hipL, 0, 0.03);
    J.hipR?.rotation.set(-p.hipR, 0, -0.03);
    J.kneeL?.rotation.set(p.kneeL, 0, 0);
    J.kneeR?.rotation.set(p.kneeR, 0, 0);
    J.shL?.rotation.set(-p.shL, 0, p.shLz);
    J.shR?.rotation.set(-p.shR, 0, -p.shRz);
    J.elL?.rotation.set(-p.elL, 0, 0);
    J.elR?.rotation.set(-p.elR, 0, 0);
  });

  const arm = (side: 1 | -1) => (
    <group ref={set(side > 0 ? 'shL' : 'shR')} position={[0.205 * side, 0.47, 0]}>
      <mesh geometry={G.upperArm} material={M.coat ?? M.shirt} position={[0, -0.14, 0]} />
      {M.stripe && <mesh geometry={G.cyl} material={M.stripe} position={[0, -0.2, 0]} scale={[0.05, 0.03, 0.05]} />}
      <group ref={set(side > 0 ? 'elL' : 'elR')} position={[0, -0.29, 0]}>
        <mesh geometry={G.forearm} material={outfit.coat || outfit.stripe ? (M.coat ?? M.shirt) : M.skin} position={[0, -0.12, 0]} />
        <mesh geometry={G.hand} material={M.skin} position={[0, -0.27, 0.01]} scale={[0.9, 1.15, 0.7]} />
        {side < 0 && handR && <group ref={prop} position={[0, -0.31, 0.03]} rotation={[Math.PI / 2, 0, 0]}>{handR}</group>}
      </group>
    </group>
  );
  const leg = (side: 1 | -1) => (
    <group ref={set(side > 0 ? 'hipL' : 'hipR')} position={[0.095 * side, -0.02, 0]}>
      <mesh geometry={G.thigh} material={M.pants} position={[0, -0.22, 0]} />
      <group ref={set(side > 0 ? 'kneeL' : 'kneeR')} position={[0, -0.45, 0]}>
        <mesh geometry={G.shin} material={M.pants} position={[0, -0.21, 0]} />
        <mesh geometry={G.box} material={M.shoes} position={[0, -0.43, 0.05]} scale={[0.1, 0.075, 0.26]} />
      </group>
    </group>
  );
  return (
    <group ref={root} scale={scale}>
      <mesh geometry={G.pelvis} material={M.pants} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.05, 0.8]} />
      {leg(1)}
      {leg(-1)}
      {M.dress && <mesh geometry={G.cone} material={M.dress} position={[0, -0.42, 0]} scale={[0.27, 0.86, 0.22]} rotation={[Math.PI, 0, 0]} />}
      <group ref={set('spine')} position={[0, 0.05, 0]}>
        <mesh geometry={G.torso} material={M.coat ?? M.shirt} position={[0, 0.26, 0]} scale={[1.18, 1, 0.72]} />
        {M.dress && <mesh geometry={G.torso} material={M.dress} position={[0, 0.26, 0]} scale={[1.12, 1, 0.7]} />}
        {M.stripe && <mesh geometry={G.cyl} material={M.stripe} position={[0, 0.2, 0]} scale={[0.19, 0.04, 0.12]} />}
        {M.coat && <mesh geometry={G.box} material={M.shirt} position={[0, 0.36, 0.1]} scale={[0.12, 0.2, 0.02]} />}
        {M.pack && <RoundedBox args={[0.3, 0.42, 0.16]} radius={0.05} position={[0, 0.27, -0.17]} material={M.pack} />}
        {arm(1)}
        {arm(-1)}
        <mesh geometry={G.neck} material={M.skin} position={[0, 0.58, 0]} />
        <group ref={set('head')} position={[0, 0.66, 0]}>
          <mesh geometry={G.head} material={M.skin} position={[0, 0.06, 0]} scale={[0.92, 1.1, 1]} />
          {!M.helmet && <mesh geometry={G.hairCap} material={M.hair} position={[0, 0.075, -0.008]} scale={[0.96, 1.08, 1.02]} />}
          {!M.helmet && outfit.bun && <mesh geometry={G.sphere} material={M.hair} position={[0, 0.08, -0.12]} scale={0.055} />}
          {!M.helmet && outfit.female && !outfit.bun && <mesh geometry={G.box} material={M.hair} position={[0, -0.02, -0.07]} scale={[0.19, 0.2, 0.06]} />}
          <mesh geometry={G.eye} material={M.dark} position={[0.035, 0.075, 0.093]} />
          <mesh geometry={G.eye} material={M.dark} position={[-0.035, 0.075, 0.093]} />
          <mesh geometry={G.box} material={M.hair} position={[0.036, 0.1, 0.094]} scale={[0.03, 0.006, 0.01]} />
          <mesh geometry={G.box} material={M.hair} position={[-0.036, 0.1, 0.094]} scale={[0.03, 0.006, 0.01]} />
          <mesh geometry={G.nose} material={M.skin} position={[0, 0.045, 0.105]} scale={[0.8, 1, 0.9]} />
          {outfit.mask && <mesh geometry={G.cyl} material={M.mask} position={[0, 0.02, 0.1]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.06, 0.045]} />}
          {M.helmet && (
            <group position={[0, 0.06, 0]}>
              <mesh geometry={G.helmet} material={M.helmet} scale={[0.95, 1.05, 1.08]} />
              <mesh geometry={G.helmetBack} material={M.helmet} position={[0, -0.005, 0]} scale={[0.95, 1, 1.08]} />
              <mesh geometry={G.visor} material={M.visor} position={[0, 0.0, 0.004]} scale={[0.99, 1.02, 1.1]} />
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- small helpers
const glowMat = (color: string, opacity: number, additive = true) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, alphaMap: glow(), side: THREE.DoubleSide });
export function Shadow({ w = 1, d = 1, o = 0.55 }: { w?: number; d?: number; o?: number }) {
  const m = useMemo(() => glowMat('#000000', o, false), [o]);
  return <mesh geometry={G.plane} material={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[w, d, 1]} />;
}
export function Halo({ color = '#fff2d0', size = 1, o = 0.8, position }: { color?: string; size?: number; o?: number; position?: [number, number, number] }) {
  return <sprite position={position} scale={[size, size, 1]}><spriteMaterial attach="material" map={glow()} color={color} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>;
}
/** A soft volumetric headlight beam pointing +x from the origin. */
const beamFade = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, '#777'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
export function Beam({ length = 14, radius = 2.4, o = 0.08, color = '#fff1cc' }: { length?: number; radius?: number; o?: number; color?: string }) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o * 0.35, alphaMap: beamFade(), depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), [color, o]);
  return <mesh geometry={G.cone} material={m} rotation={[0, 0, Math.PI / 2]} position={[length / 2, -0.25, 0]} scale={[radius, length, radius * 0.7]} />;
}

function Wheel({ spin, r = 0.29, tyre = 0.065, spokes = true }: { spin: React.MutableRefObject<THREE.Group | null>; r?: number; tyre?: number; spokes?: boolean }) {
  return (
    <group ref={spin}>
      <mesh geometry={G.tire} material={RUBBER()} scale={[r / 0.29, r / 0.29, tyre / 0.065]} />
      <mesh geometry={G.cyl} material={CHROME()} rotation={[Math.PI / 2, 0, 0]} scale={[r * 0.82, 0.02, r * 0.82]} />
      {spokes && Array.from({ length: 12 }, (_, i) => <mesh key={i} geometry={G.cyl} material={CHROME()} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[0, 0, (i % 2 ? 0.02 : -0.02)]} scale={[0.004, r * 1.6, 0.004]} />)}
      <mesh geometry={G.cyl} material={mat('#2a2a2e', { metal: 0.6, rough: 0.4 })} rotation={[Math.PI / 2, 0, 0]} scale={[0.07, 0.12, 0.07]} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- motorcycle (classic single-cylinder style)
export interface BikePose { x: number; y: number; z: number; yaw: number; roll: number; wheel: number; light?: number }
export function Motorcycle({ drive, color = '#5c1520' }: { drive: (t: number) => BikePose; color?: string }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const fw = useRef<THREE.Group>(null), rw = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const s = drive(clock.t);
    if (!root.current) return;
    root.current.position.set(s.x, s.y, s.z);
    root.current.rotation.set(s.roll, s.yaw, 0, 'YXZ');
    if (fw.current) fw.current.rotation.z = -s.wheel;
    if (rw.current) rw.current.rotation.z = -s.wheel;
    if (lamp.current) lamp.current.emissiveIntensity = s.light ?? 2.2;
  });
  const paint = mat(color, { rough: 0.22, metal: 0.4 });
  const black = mat('#141416', { rough: 0.4, metal: 0.3 });
  return (
    <group ref={root}>
      <group position={[0, 0, 0]}>
        <Shadow w={2.6} d={0.9} />
        <group position={[0.7, 0.33, 0]}><Wheel spin={fw} r={0.31} /></group>
        <group position={[-0.68, 0.33, 0]}><Wheel spin={rw} r={0.31} tyre={0.072} /></group>
        {/* front fork + mudguard */}
        {[0.08, -0.08].map((z) => <mesh key={z} geometry={G.cyl} material={CHROME()} position={[0.62, 0.62, z]} rotation={[0, 0, 0.42]} scale={[0.022, 0.72, 0.022]} />)}
        <mesh geometry={G.guard} material={paint} position={[0.7, 0.33, 0]} rotation={[0, 0, 0.25]} scale={[1, 1, 3.6]} />
        {/* headlamp nacelle */}
        <mesh geometry={G.cyl} material={black} position={[0.84, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.115, 0.12, 0.115]} />
        <mesh position={[0.91, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.095, 0.02, 0.095]} geometry={G.cyl}><meshStandardMaterial ref={lamp} color="#fff8e6" emissive="#fff1c8" emissiveIntensity={2.2} /></mesh>
        <Halo position={[0.95, 0.98, 0]} size={0.55} o={0.45} />
        <group position={[0.92, 0.95, 0]}><Beam length={16} radius={2.6} o={0.06} /></group>
        {/* handlebar + mirrors */}
        <mesh geometry={G.cyl} material={CHROME()} position={[0.6, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.016, 0.4, 0.016]} />
        {[1, -1].map((sd) => (
          <group key={sd}>
            {/* bar sweeps back to the grip */}
            <mesh geometry={G.cyl} material={CHROME()} position={[0.5, 1.11, sd * 0.27]} rotation={[Math.PI / 2, -0.95 * sd, 0]} scale={[0.016, 0.27, 0.016]} />
            <mesh geometry={G.cyl} material={black} position={[0.38, 1.12, sd * 0.36]} rotation={[Math.PI / 2, -0.55 * sd, 0]} scale={[0.025, 0.12, 0.025]} />
            {/* mirror on a stalk */}
            <mesh geometry={G.cyl} material={CHROME()} position={[0.56, 1.25, sd * 0.3]} rotation={[0.25 * sd, 0, 0]} scale={[0.007, 0.28, 0.007]} />
            <mesh geometry={G.cyl} material={CHROME()} position={[0.55, 1.39, sd * 0.335]} rotation={[0, 0, Math.PI / 2]} scale={[0.058, 0.016, 0.058]} />
            <mesh geometry={G.cyl} position={[0.538, 1.39, sd * 0.335]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.004, 0.05]}><meshStandardMaterial color="#9fb3cc" metalness={1} roughness={0.05} /></mesh>
          </group>
        ))}
        {/* teardrop tank with chrome badge strip */}
        <mesh geometry={G.sphere} material={paint} position={[0.22, 0.93, 0]} scale={[0.36, 0.15, 0.16]} />
        <mesh geometry={G.sphere} material={CHROME()} position={[0.24, 0.94, 0]} scale={[0.2, 0.05, 0.165]} />
        {/* seat */}
        <RoundedBox args={[0.62, 0.09, 0.26]} radius={0.04} position={[-0.3, 0.86, 0]} material={mat('#1c140f', { rough: 0.6 })} />
        {/* frame */}
        <mesh geometry={G.cyl} material={black} position={[0.1, 0.62, 0]} rotation={[0, 0, -1.0]} scale={[0.025, 0.85, 0.025]} />
        <mesh geometry={G.cyl} material={black} position={[-0.42, 0.62, 0]} rotation={[0, 0, 1.05]} scale={[0.022, 0.7, 0.022]} />
        {/* engine: cylinder with cooling fins, crankcase */}
        <RoundedBox args={[0.42, 0.24, 0.24]} radius={0.05} position={[-0.02, 0.42, 0]} material={mat('#8f9399', { rough: 0.35, metal: 0.8 })} />
        <mesh geometry={G.cyl} material={mat('#6d7177', { rough: 0.4, metal: 0.7 })} position={[0.05, 0.64, 0]} rotation={[0, 0, -0.3]} scale={[0.1, 0.24, 0.1]} />
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} geometry={G.cyl} material={mat('#7d8188', { rough: 0.4, metal: 0.7 })} position={[0.05 + i * 0.012, 0.56 + i * 0.04, 0]} rotation={[0, 0, -0.3]} scale={[0.14, 0.008, 0.14]} />)}
        {/* long chrome exhaust */}
        <mesh geometry={G.cyl} material={CHROME()} position={[-0.32, 0.36, 0.17]} rotation={[0, 0, Math.PI / 2 - 0.08]} scale={[0.045, 1.0, 0.045]} />
        <mesh geometry={G.cyl} material={CHROME()} position={[-0.86, 0.39, 0.17]} rotation={[0, 0, Math.PI / 2 - 0.08]} scale={[0.06, 0.18, 0.06]} />
        {/* rear mudguard + tail lamp */}
        <mesh geometry={G.guard} material={paint} position={[-0.68, 0.33, 0]} rotation={[0, 0, 0.6]} scale={[1, 1, 4.2]} />
        <mesh geometry={G.box} position={[-1.02, 0.72, 0]} scale={[0.04, 0.05, 0.1]}><meshStandardMaterial color="#ff2a2a" emissive="#ff1a1a" emissiveIntensity={2.5} /></mesh>
        <Halo color="#ff3030" position={[-1.05, 0.72, 0]} size={0.5} o={0.6} />
        {/* side box */}
        <RoundedBox args={[0.24, 0.2, 0.08]} radius={0.03} position={[-0.32, 0.62, 0.14]} material={black} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- cars
export interface CarPose { x: number; z: number; yaw: number; visible?: boolean; hazard?: boolean; braking?: boolean; wheel?: number }
export function Car({ drive, color, kind = 'sedan', lights = true }: { drive: (t: number) => CarPose; color: string; kind?: 'sedan' | 'hatch'; lights?: boolean }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const hz = useRef<THREE.MeshStandardMaterial[]>([]);
  const tail = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(() => {
    const s = drive(clock.t);
    const r = root.current;
    if (!r) return;
    r.visible = s.visible !== false;
    if (!r.visible) return;
    r.position.set(s.x, 0, s.z);
    r.rotation.set(0, s.yaw, 0);
    wheels.current.forEach((w) => w && (w.rotation.z = -(s.wheel ?? s.x / 0.32)));
    const on = s.hazard && Math.floor(clock.t * 2.4) % 2 === 0;
    hz.current.forEach((m) => m && (m.emissiveIntensity = s.hazard ? (on ? 3 : 0.1) : 0.1));
    tail.current.forEach((m) => m && (m.emissiveIntensity = s.braking ? 4.5 : 1.4));
  });
  const L = kind === 'sedan' ? 4.4 : 3.9;
  const body = mat(color, { rough: 0.25, metal: 0.55 });
  const glass = mat('#121a26', { rough: 0.05, metal: 0.8 });
  return (
    <group ref={root}>
      <Shadow w={L + 1.2} d={2.6} o={0.6} />
      <RoundedBox args={[L, 0.62, 1.78]} radius={0.16} smoothness={3} position={[0, 0.62, 0]} material={body} />
      <RoundedBox args={[L * (kind === 'sedan' ? 0.5 : 0.56), 0.56, 1.58]} radius={0.2} smoothness={3} position={[kind === 'sedan' ? -0.15 : -0.3, 1.16, 0]} material={glass} />
      <RoundedBox args={[L * (kind === 'sedan' ? 0.46 : 0.52), 0.06, 1.52]} radius={0.03} position={[kind === 'sedan' ? -0.15 : -0.3, 1.45, 0]} material={body} />
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz], i) => (
        <group key={i} position={[sx * L * 0.31, 0.32, sz * 0.86]} ref={(g) => { if (g) wheels.current[i] = g; }}>
          <mesh geometry={G.cyl} material={RUBBER()} rotation={[Math.PI / 2, 0, 0]} scale={[0.32, 0.22, 0.32]} />
          <mesh geometry={G.cyl} material={CHROME()} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 0.23, 0.2]} />
          {[0, 1, 2, 3, 4].map((k) => <mesh key={k} geometry={G.box} material={RUBBER()} position={[Math.cos((k / 5) * Math.PI * 2) * 0.12, Math.sin((k / 5) * Math.PI * 2) * 0.12, sz * 0.118]} scale={[0.035, 0.035, 0.01]} />)}
        </group>
      ))}
      {lights && [0.62, -0.62].map((z) => (
        <group key={z}>
          <mesh geometry={G.box} position={[L / 2 - 0.02, 0.72, z]} scale={[0.06, 0.12, 0.34]}><meshStandardMaterial color="#fffbe9" emissive="#fff4d2" emissiveIntensity={2.4} /></mesh>
          <Halo position={[L / 2 + 0.05, 0.72, z]} size={0.8} o={0.45} />
          <mesh geometry={G.box} position={[-L / 2 + 0.02, 0.76, z]} scale={[0.06, 0.12, 0.3]}><meshStandardMaterial ref={(m) => { if (m) tail.current[z > 0 ? 0 : 1] = m; }} color="#ff2b2b" emissive="#ff1414" emissiveIntensity={1.4} /></mesh>
          <mesh geometry={G.box} position={[-L / 2 + 0.03, 0.6, z * 1.2]} scale={[0.04, 0.06, 0.12]}><meshStandardMaterial ref={(m) => { if (m) hz.current[z > 0 ? 0 : 1] = m; }} color="#ffb020" emissive="#ffa000" emissiveIntensity={0.1} /></mesh>
        </group>
      ))}
      {lights && <group position={[L / 2, 0.72, 0]}><Beam length={18} radius={3} o={0.05} /></group>}
    </group>
  );
}

export function AutoRickshaw({ drive }: { drive: (t: number) => CarPose }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  useFrame(() => { const s = drive(clock.t); if (root.current) { root.current.visible = s.visible !== false; root.current.position.set(s.x, 0, s.z); root.current.rotation.set(0, s.yaw, 0); } });
  return (
    <group ref={root}>
      <Shadow w={3.4} d={1.9} />
      <RoundedBox args={[2.5, 0.55, 1.35]} radius={0.12} position={[0, 0.55, 0]} material={mat('#1f4a33', { rough: 0.4, metal: 0.3 })} />
      <RoundedBox args={[2.3, 0.9, 1.38]} radius={0.3} position={[-0.15, 1.35, 0]} material={mat('#e8c22a', { rough: 0.5 })} />
      <RoundedBox args={[0.5, 0.7, 1.1]} radius={0.15} position={[1.05, 0.95, 0]} material={mat('#1f4a33', { rough: 0.4, metal: 0.3 })} />
      <mesh geometry={G.box} position={[1.32, 0.82, 0]} scale={[0.04, 0.1, 0.12]}><meshStandardMaterial color="#fffbe9" emissive="#fff4d2" emissiveIntensity={2} /></mesh>
      {[[1.1, 0], [-0.8, 0.6], [-0.8, -0.6]].map(([x, z], i) => <mesh key={i} geometry={G.cyl} material={RUBBER()} position={[x, 0.24, z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.24, 0.16, 0.24]} />)}
      <group position={[1.32, 0.82, 0]}><Beam length={10} radius={1.8} o={0.05} /></group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- ambulance (generic, fictional)
export interface AmbPose { x: number; z: number; yaw: number; lights: boolean; visible?: boolean; doors?: number; wheel?: number }
export function Ambulance({ drive }: { drive: (t: number) => AmbPose }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const red = useRef<THREE.MeshStandardMaterial>(null), blue = useRef<THREE.MeshStandardMaterial>(null);
  const pr = useRef<THREE.PointLight>(null), pb = useRef<THREE.PointLight>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const doorL = useRef<THREE.Group>(null), doorR = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = drive(clock.t);
    const r = root.current;
    if (!r) return;
    r.visible = s.visible !== false;
    r.position.set(s.x, 0, s.z);
    r.rotation.set(0, s.yaw, 0);
    const ph = Math.floor(clock.t * 7) % 4;
    const onR = s.lights && (ph === 0 || ph === 1), onB = s.lights && (ph === 2 || ph === 3);
    if (red.current) red.current.emissiveIntensity = onR ? 6 : 0.2;
    if (blue.current) blue.current.emissiveIntensity = onB ? 6 : 0.2;
    if (pr.current) pr.current.intensity = onR ? 18 : 0;
    if (pb.current) pb.current.intensity = onB ? 18 : 0;
    wheels.current.forEach((w) => w && (w.rotation.z = -(s.wheel ?? s.x / 0.38)));
    const d = s.doors ?? 0;
    if (doorL.current) doorL.current.rotation.y = -1.9 * d;
    if (doorR.current) doorR.current.rotation.y = 1.9 * d;
  });
  const white = mat('#f2f4f6', { rough: 0.35, metal: 0.15 });
  const glass = mat('#121a26', { rough: 0.05, metal: 0.8 });
  const front = useMemo(() => sign('ECNALUBMA', '#f2f4f6', '#d01f35', undefined, 512, 96), []);
  const side = useMemo(() => sign('AMBULANCE', '#f2f4f6', '#d01f35', 'CITY EMERGENCY MEDICAL SERVICE', 512, 160), []);
  return (
    <group ref={root}>
      <Shadow w={6.6} d={2.9} o={0.6} />
      {/* box body + cab */}
      <RoundedBox args={[3.7, 2.2, 2.05]} radius={0.12} position={[-0.75, 1.55, 0]} material={white} />
      <RoundedBox args={[1.7, 1.45, 2.0]} radius={0.22} position={[1.85, 1.12, 0]} material={white} />
      <RoundedBox args={[0.9, 0.7, 1.9]} radius={0.15} position={[1.95, 1.62, 0]} material={glass} />
      {/* coral/red band */}
      <mesh geometry={G.box} position={[-0.75, 1.05, 0]} scale={[3.72, 0.22, 2.07]}><meshStandardMaterial color="#d01f35" roughness={0.4} /></mesh>
      <mesh geometry={G.box} position={[1.85, 0.85, 0]} scale={[1.72, 0.16, 2.02]}><meshStandardMaterial color="#d01f35" roughness={0.4} /></mesh>
      {/* lettering */}
      <mesh geometry={G.plane} position={[2.71, 1.08, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.6, 0.3, 1]}><meshStandardMaterial map={front} roughness={0.5} /></mesh>
      {[1.031, -1.031].map((z) => <mesh key={z} geometry={G.plane} position={[-0.75, 1.75, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]} scale={[3.0, 0.94, 1]}><meshStandardMaterial map={side} roughness={0.5} /></mesh>)}
      {/* light bar */}
      <mesh geometry={G.box} position={[1.5, 2.72, 0.45]} scale={[0.36, 0.14, 0.7]}><meshStandardMaterial ref={red} color="#ff2a3a" emissive="#ff1a2a" emissiveIntensity={0.2} /></mesh>
      <mesh geometry={G.box} position={[1.5, 2.72, -0.45]} scale={[0.36, 0.14, 0.7]}><meshStandardMaterial ref={blue} color="#3a7bff" emissive="#2a6bff" emissiveIntensity={0.2} /></mesh>
      <pointLight ref={pr} position={[1.5, 3.1, 1.2]} color="#ff2a3a" intensity={0} distance={16} decay={1.6} />
      <pointLight ref={pb} position={[1.5, 3.1, -1.2]} color="#3a7bff" intensity={0} distance={16} decay={1.6} />
      {/* headlights */}
      {[0.7, -0.7].map((z) => <group key={z}><mesh geometry={G.box} position={[2.72, 0.75, z]} scale={[0.05, 0.16, 0.32]}><meshStandardMaterial color="#fffbe9" emissive="#fff4d2" emissiveIntensity={2.4} /></mesh><Halo position={[2.8, 0.75, z]} size={0.9} o={0.5} /></group>)}
      <group position={[2.75, 0.8, 0]}><Beam length={20} radius={3.2} o={0.05} /></group>
      {/* rear doors (open at the scene / hospital) */}
      <group ref={doorL} position={[-2.6, 1.5, 1.0]}><mesh geometry={G.box} material={white} position={[0, 0, -0.5]} scale={[0.05, 2.0, 1.0]} /></group>
      <group ref={doorR} position={[-2.6, 1.5, -1.0]}><mesh geometry={G.box} material={white} position={[0, 0, 0.5]} scale={[0.05, 2.0, 1.0]} /></group>
      {[[1.85, 1], [1.85, -1], [-1.75, 1], [-1.75, -1]].map(([x, sz], i) => (
        <group key={i} position={[x, 0.38, sz * 0.92]} ref={(g) => { if (g) wheels.current[i] = g; }}>
          <mesh geometry={G.cyl} material={RUBBER()} rotation={[Math.PI / 2, 0, 0]} scale={[0.38, 0.26, 0.38]} />
          <mesh geometry={G.cyl} material={CHROME()} rotation={[Math.PI / 2, 0, 0]} scale={[0.22, 0.27, 0.22]} />
          {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} geometry={G.box} material={RUBBER()} position={[Math.cos((k / 6) * Math.PI * 2) * 0.14, Math.sin((k / 6) * Math.PI * 2) * 0.14, sz * 0.138]} scale={[0.04, 0.04, 0.01]} />)}
          <mesh geometry={G.cyl} material={mat('#3a3d42', { metal: 0.6, rough: 0.4 })} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, sz * 0.136]} scale={[0.06, 0.01, 0.06]} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------- props
export function Stretcher({ drive, children }: { drive: (t: number) => { pos: [number, number, number]; visible: boolean; yaw?: number }; children?: ReactNode }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  useFrame(() => { const s = drive(clock.t); if (root.current) { root.current.visible = s.visible; root.current.position.set(...s.pos); root.current.rotation.set(0, s.yaw ?? 0, 0); } });
  return (
    <group ref={root}>
      <Shadow w={2.4} d={1} />
      <RoundedBox args={[2.0, 0.12, 0.62]} radius={0.05} position={[0, 0.82, 0]} material={mat('#e9eef2', { rough: 0.5 })} />
      <RoundedBox args={[1.96, 0.05, 0.58]} radius={0.02} position={[0, 0.9, 0]} material={mat('#1f6f8b', { rough: 0.6 })} />
      {[[0.85, 0.24], [0.85, -0.24], [-0.85, 0.24], [-0.85, -0.24]].map(([x, z], i) => <group key={i}><mesh geometry={G.cyl} material={CHROME()} position={[x, 0.45, z]} scale={[0.02, 0.75, 0.02]} /><mesh geometry={G.sphere} material={RUBBER()} position={[x, 0.07, z]} scale={0.07} /></group>)}
      {children}
    </group>
  );
}
export function Phone3D({ alert = false }: { alert?: boolean }) {
  return (
    <group>
      <RoundedBox args={[0.075, 0.155, 0.009]} radius={0.008} material={mat('#16181d', { rough: 0.3, metal: 0.4 })} />
      <mesh geometry={G.plane} position={[0, 0, 0.0052]} scale={[0.067, 0.145, 1]}><meshStandardMaterial color={alert ? '#d02035' : '#0d1c33'} emissive={alert ? '#ff3346' : '#22d3ee'} emissiveIntensity={alert ? 2.2 : 0.6} /></mesh>
    </group>
  );
}
export function Group({ children, position, rotation }: { children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }) {
  return <group position={position} rotation={rotation}>{children}</group>;
}
export { G as GEOM };

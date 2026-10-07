'use client';
/**
 * Procedural 3D cast and vehicles for "Experience LifeLine". People are articulated (pelvis, spine, head, two-
 * joint arms and legs) with realistic proportions (~1.75 m) and are posed every frame from the film clock.
 * Vehicles face +x. No brands, logos or real services: the ambulance is a generic, fictional city unit.
 */
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { glow, sign } from './textures';

import { ClockCtx, mat, useClock } from './shared';
export { ClockCtx, mat, useClock };
export { POSE, Person, mix, walk, type Expr, type FaceState, type Outfit, type Pose, type PersonState } from './people';

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
  guard: new THREE.TorusGeometry(0.385, 0.03, 8, 28, Math.PI * 0.72),
  guardRear: new THREE.TorusGeometry(0.385, 0.03, 8, 28, Math.PI * 0.95),
  rim: new THREE.TorusGeometry(0.255, 0.012, 8, 40),
  rimLamp: new THREE.TorusGeometry(0.1, 0.012, 8, 32),
  spring: new THREE.TorusGeometry(0.03, 0.005, 6, 16),
  cone: new THREE.ConeGeometry(1, 1, 24, 1, true),
};
const CHROME = () => mat('#c9ccd2', { rough: 0.18, metal: 0.95 });
const RUBBER = () => mat('#151517', { rough: 0.85 });

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

function Wheel({ spin, r = 0.29, tyre = 0.065 }: { spin: React.MutableRefObject<THREE.Group | null>; r?: number; tyre?: number }) {
  // tyre, chrome rim, 18 wire spokes to a drum-brake hub
  return (
    <group ref={spin}>
      <mesh geometry={G.tire} material={RUBBER()} scale={[r / 0.29, r / 0.29, tyre / 0.065]} />
      <mesh geometry={G.rim} material={CHROME()} scale={r / 0.29} />
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <mesh key={i} geometry={G.cyl} material={CHROME()} position={[Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, i % 2 ? 0.028 : -0.028]} rotation={[i % 2 ? 0.1 : -0.1, 0, a - Math.PI / 2]} scale={[0.0035, r * 0.86, 0.0035]} />;
      })}
      <mesh geometry={G.cyl} material={mat('#8d9197', { metal: 0.7, rough: 0.35 })} rotation={[Math.PI / 2, 0, 0]} scale={[0.075, 0.1, 0.075]} />
      <mesh geometry={G.cyl} material={mat('#2a2a2e', { metal: 0.6, rough: 0.4 })} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.16, 0.03]} />
    </group>
  );
}

const tube = (pts: [number, number, number][], r: number, seg = 32) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10, false);
/** A cylinder from a to b (for frame tubes, stays, brackets). */
function Rod({ a, b, r, material }: { a: [number, number, number]; b: [number, number, number]; r: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const d = B.clone().sub(A);
    return { pos: A.clone().add(B).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() };
  }, [a, b]);
  return <mesh geometry={G.cyl} material={material} position={pos} quaternion={quat} scale={[r, len, r]} />;
}

// ---------------------------------------------------------------------------------------------- motorcycle (classic single-cylinder style)
/*
 * Built from one steering geometry so nothing floats: axles at y 0.35 (wheel Ø 0.71 m), wheelbase 1.38 m,
 * forks raked 20° from the front axle up to the top yoke; the headlamp hangs off the fork on two "ears", the
 * handlebar is clamped on the top yoke and sweeps back to the grips, the mirrors grow out of the bar.
 */
const FA: [number, number] = [0.7, 0.35], RA: [number, number] = [-0.68, 0.35];
const U: [number, number] = [-Math.sin(0.349), Math.cos(0.349)];
const onFork = (t: number, z = 0): [number, number, number] => [FA[0] + U[0] * t, FA[1] + U[1] * t, z];
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
  const black = mat('#121214', { rough: 0.45, metal: 0.35 });
  const alloy = mat('#9a9ea5', { rough: 0.35, metal: 0.8 });
  const geo = useMemo(() => {
    const bar: [number, number, number][] = [[0.335, 1.116, -0.42], [0.37, 1.11, -0.33], [0.43, 1.09, -0.23], [0.458, 1.077, -0.12], [0.465, 1.072, 0], [0.458, 1.077, 0.12], [0.43, 1.09, 0.23], [0.37, 1.11, 0.33], [0.335, 1.116, 0.42]];
    return {
      bar: tube(bar, 0.012, 48),
      grips: [1, -1].map((sd) => tube([[0.378, 1.108, 0.31 * sd], [0.356, 1.113, 0.37 * sd], [0.335, 1.116, 0.425 * sd]], 0.019, 8)),
      header: tube([[0.24, 0.7, 0.07], [0.31, 0.6, 0.12], [0.32, 0.42, 0.16], [0.2, 0.3, 0.17], [-0.25, 0.33, 0.17]], 0.027, 40),
      stalks: [1, -1].map((sd) => tube([[0.43, 1.095, 0.24 * sd], [0.43, 1.18, 0.27 * sd], [0.415, 1.3, 0.31 * sd]], 0.006, 12)),
    };
  }, []);
  const yokeLo = onFork(0.58), yokeHi = onFork(0.72);
  return (
    <group ref={root}>
      <Shadow w={2.6} d={0.9} />
      <group position={[FA[0], FA[1], 0]}><Wheel spin={fw} r={0.29} /></group>
      <group position={[RA[0], RA[1], 0]}><Wheel spin={rw} r={0.29} tyre={0.072} /></group>
      {/* front fork: chrome stanchions + alloy sliders, yokes, steering head */}
      {[0.085, -0.085].map((z) => (
        <group key={z}>
          <Rod a={onFork(0.05, z)} b={onFork(0.36, z)} r={0.026} material={alloy} />
          <Rod a={onFork(0.36, z)} b={onFork(0.76, z)} r={0.019} material={CHROME()} />
        </group>
      ))}
      <Rod a={[FA[0], FA[1], -0.11]} b={[FA[0], FA[1], 0.11]} r={0.012} material={alloy} />
      {[yokeLo, yokeHi].map((p, i) => <mesh key={i} geometry={G.box} material={black} position={p} rotation={[0, 0, 0.349]} scale={[0.07, 0.03, 0.25]} />)}
      <Rod a={onFork(0.56)} b={onFork(0.74)} r={0.032} material={black} />
      {/* headlamp on two ears off the fork, with a chrome rim and the lens */}
      {[0.1, -0.1].map((z) => <Rod key={z} a={onFork(0.64, z * 0.85)} b={[0.6, 0.95, z]} r={0.012} material={black} />)}
      <mesh geometry={G.cyl} material={black} position={[0.6, 0.95, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.105, 0.15, 0.105]} />
      <mesh geometry={G.sphere} material={black} position={[0.525, 0.95, 0]} scale={[0.05, 0.1, 0.1]} />
      <mesh geometry={G.rimLamp} material={CHROME()} position={[0.676, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh position={[0.678, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.094}><circleGeometry args={[1, 28]} /><meshStandardMaterial ref={lamp} color="#fff8e6" emissive="#fff1c8" emissiveIntensity={2.2} /></mesh>
      <Halo position={[0.7, 0.95, 0]} size={0.5} o={0.42} />
      <group position={[0.68, 0.94, 0]}><Beam length={16} radius={2.6} o={0.06} /></group>
      {/* speedometer on the top yoke */}
      <mesh geometry={G.cyl} material={black} position={[yokeHi[0] + 0.02, yokeHi[1] + 0.045, 0]} rotation={[0, 0, 0.5]} scale={[0.042, 0.04, 0.042]} />
      <mesh position={[yokeHi[0] + 0.01, yokeHi[1] + 0.064, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.036}><circleGeometry args={[1, 20]} /><meshStandardMaterial color="#e9f2ff" emissive="#9fc8ff" emissiveIntensity={0.6} /></mesh>
      {/* handlebar: clamped on the top yoke, swept back to the grips; levers; mirrors on stalks */}
      {[0.05, -0.05].map((z) => <Rod key={z} a={[yokeHi[0], yokeHi[1] + 0.01, z]} b={[0.462, 1.074, z]} r={0.012} material={black} />)}
      <mesh geometry={geo.bar} material={CHROME()} />
      {geo.grips.map((g, i) => <mesh key={i} geometry={g} material={RUBBER()} />)}
      {[1, -1].map((sd) => <Rod key={sd} a={[0.41, 1.1, 0.27 * sd]} b={[0.43, 1.09, 0.41 * sd]} r={0.006} material={alloy} />)}
      {geo.stalks.map((g, i) => <mesh key={i} geometry={g} material={CHROME()} />)}
      {[1, -1].map((sd) => (
        <group key={sd} position={[0.41, 1.33, 0.32 * sd]}>
          <mesh geometry={G.cyl} material={CHROME()} rotation={[0, 0, Math.PI / 2]} scale={[0.056, 0.016, 0.056]} />
          <mesh position={[-0.0085, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.049}><circleGeometry args={[1, 24]} /><meshStandardMaterial color="#a7b8cf" metalness={1} roughness={0.04} /></mesh>
        </group>
      ))}
      {/* frame: steering head → top tube under the tank, down tube and cradle round the engine, seat rails, swingarm */}
      {([
        [[0.46, 0.93, 0], [-0.06, 0.86, 0]], [[0.47, 0.88, 0], [0.2, 0.3, 0]], [[0.2, 0.3, 0], [-0.12, 0.24, 0]], [[-0.12, 0.24, 0], [-0.12, 0.44, 0]],
        [[-0.06, 0.86, 0], [-0.12, 0.44, 0]], [[-0.06, 0.86, 0.09], [-0.86, 0.84, 0.09]], [[-0.06, 0.86, -0.09], [-0.86, 0.84, -0.09]],
        [[-0.12, 0.42, 0.1], [RA[0], RA[1], 0.1]], [[-0.12, 0.42, -0.1], [RA[0], RA[1], -0.1]],
      ] as [[number, number, number], [number, number, number]][]).map(([a, b], i) => <Rod key={i} a={a} b={b} r={0.019} material={black} />)}
      {/* rear shocks with springs */}
      {[0.11, -0.11].map((z) => (
        <group key={z}>
          <Rod a={[-0.62, 0.38, z]} b={[-0.52, 0.85, z]} r={0.016} material={CHROME()} />
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} geometry={G.spring} material={CHROME()} position={[-0.6 + i * 0.012, 0.47 + i * 0.055, z]} rotation={[Math.PI / 2, 0, 0.21]} />)}
        </group>
      ))}
      {/* teardrop tank with knee pads and a plain chrome badge (no logo), seat */}
      <mesh geometry={G.sphere} material={paint} position={[0.2, 0.965, 0]} rotation={[0, 0, -0.06]} scale={[0.3, 0.125, 0.155]} />
      <mesh geometry={G.sphere} material={CHROME()} position={[0.24, 0.975, 0]} scale={[0.16, 0.03, 0.158]} />
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.sphere} material={black} position={[0.04, 0.95, 0.142 * sd]} scale={[0.07, 0.045, 0.015]} />)}
      <mesh geometry={G.cyl} material={CHROME()} position={[0.3, 1.09, 0]} scale={[0.03, 0.02, 0.03]} />
      <RoundedBox args={[0.6, 0.09, 0.27]} radius={0.04} position={[-0.29, 0.905, 0]} material={mat('#1c140f', { rough: 0.6 })} />
      <RoundedBox args={[0.26, 0.07, 0.24]} radius={0.03} position={[-0.72, 0.9, 0]} material={mat('#1c140f', { rough: 0.6 })} />
      {/* engine: crankcase, finned barrel, head, primary cover, gearbox */}
      <RoundedBox args={[0.36, 0.22, 0.22]} radius={0.05} position={[0.05, 0.37, 0]} material={alloy} />
      <mesh geometry={G.cyl} material={mat('#6d7177', { rough: 0.4, metal: 0.7 })} position={[0.16, 0.6, 0]} rotation={[0, 0, -0.25]} scale={[0.085, 0.26, 0.085]} />
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} geometry={G.cyl} material={mat('#80848b', { rough: 0.4, metal: 0.7 })} position={[0.135 + i * 0.0105, 0.5 + i * 0.04, 0]} rotation={[0, 0, -0.25]} scale={[0.125, 0.008, 0.125]} />)}
      <RoundedBox args={[0.14, 0.07, 0.16]} radius={0.02} position={[0.23, 0.74, 0]} rotation={[0, 0, -0.25]} material={alloy} />
      <mesh geometry={G.sphere} material={CHROME()} position={[0.0, 0.37, -0.12]} scale={[0.13, 0.09, 0.03]} />
      <RoundedBox args={[0.18, 0.18, 0.18]} radius={0.04} position={[-0.11, 0.45, 0]} material={alloy} />
      {/* exhaust: header pipe round the front of the engine into a long chrome silencer */}
      <mesh geometry={geo.header} material={CHROME()} />
      <Rod a={[-0.25, 0.33, 0.17]} b={[-0.98, 0.4, 0.17]} r={0.046} material={CHROME()} />
      {/* mudguards with stays, tail lamp and a blank plate */}
      <mesh geometry={G.guard} material={paint} position={[FA[0], FA[1], 0]} rotation={[0, 0, 0.12]} scale={[1, 1, 3.3]} />
      {[0.085, -0.085].map((z) => <Rod key={z} a={[FA[0], FA[1], z]} b={[FA[0] + 0.25, FA[1] + 0.26, z * 1.1]} r={0.006} material={CHROME()} />)}
      <mesh geometry={G.guardRear} material={paint} position={[RA[0], RA[1], 0]} rotation={[0, 0, 0.62]} scale={[1, 1, 3.9]} />
      {[0.1, -0.1].map((z) => <Rod key={z} a={[RA[0], RA[1], z]} b={[RA[0] - 0.28, RA[1] + 0.25, z * 1.05]} r={0.007} material={CHROME()} />)}
      <mesh geometry={G.box} material={black} position={[-1.01, 0.6, 0]} scale={[0.05, 0.07, 0.1]} />
      <mesh geometry={G.box} position={[-1.04, 0.6, 0]} scale={[0.012, 0.045, 0.08]}><meshStandardMaterial color="#ff2a2a" emissive="#ff1a1a" emissiveIntensity={2.5} /></mesh>
      <Halo color="#ff3030" position={[-1.06, 0.6, 0]} size={0.35} o={0.5} />
      <mesh geometry={G.box} material={mat('#e9e9e4', { rough: 0.5 })} position={[-1.03, 0.47, 0]} scale={[0.01, 0.1, 0.18]} />
      {/* footpegs, tool box, chain guard */}
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.cyl} material={RUBBER()} position={[-0.03, 0.4, 0.2 * sd]} rotation={[Math.PI / 2, 0, 0]} scale={[0.018, 0.1, 0.018]} />)}
      <RoundedBox args={[0.24, 0.2, 0.08]} radius={0.03} position={[-0.34, 0.66, -0.13]} material={black} />
      <mesh geometry={G.box} material={black} position={[-0.4, 0.4, 0.12]} rotation={[0, 0, 0.04]} scale={[0.55, 0.06, 0.012]} />
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
    // barn doors hinged at the rear corners, swinging OUT and folding back along the body (≈110°)
    const e = d * d * (3 - 2 * d);
    if (doorL.current) doorL.current.rotation.y = 1.92 * e;
    if (doorR.current) doorR.current.rotation.y = -1.92 * e;
  });
  const white = mat('#f2f4f6', { rough: 0.35, metal: 0.15 });
  const glass = mat('#121a26', { rough: 0.05, metal: 0.8 });
  const front = useMemo(() => sign('ECNALUBMA', '#f2f4f6', '#d01f35', undefined, 512, 96), []);
  const side = useMemo(() => sign('AMBULANCE', '#f2f4f6', '#d01f35', 'CITY EMERGENCY MEDICAL SERVICE', 512, 160), []);
  return (
    <group ref={root}>
      <Shadow w={6.6} d={2.9} o={0.6} />
      {/* patient compartment: a real box with an open rear behind the doors — chassis skirt, floor, walls, roof */}
      <mesh geometry={G.box} material={white} position={[-0.75, 0.6, 0]} scale={[3.7, 0.36, 2.0]} />
      <mesh geometry={G.box} material={mat('#8f9aa1', { rough: 0.7 })} position={[-0.75, 0.775, 0]} scale={[3.62, 0.05, 1.94]} />
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.box} material={white} position={[-0.75, 1.72, 1.0 * sd]} scale={[3.7, 1.9, 0.05]} />)}
      <RoundedBox args={[3.72, 0.1, 2.06]} radius={0.04} position={[-0.75, 2.67, 0]} material={white} />
      <mesh geometry={G.box} material={white} position={[1.08, 1.72, 0]} scale={[0.05, 1.9, 2.0]} />
      {/* interior: pale clinical lining, a ceiling light, the attendant's bench, cabinets, oxygen, stretcher rails */}
      {[1, -1].map((sd) => <mesh key={sd} geometry={G.box} material={mat('#dcebe5', { rough: 0.8 })} position={[-0.75, 1.72, 0.97 * sd]} scale={[3.6, 1.86, 0.01]} />)}
      <mesh geometry={G.box} material={mat('#e8f0ec', { rough: 0.8 })} position={[-0.75, 2.61, 0]} scale={[3.6, 0.01, 1.92]} />
      <mesh geometry={G.box} position={[-1.0, 2.6, 0]} scale={[1.4, 0.02, 0.32]}><meshStandardMaterial color="#ffffff" emissive="#eaf6ff" emissiveIntensity={1.6} /></mesh>
      <pointLight position={[-1.2, 2.3, 0]} color="#eef8ff" intensity={3} distance={4.5} decay={2} />
      <mesh geometry={G.box} material={mat('#1f6f8b', { rough: 0.6 })} position={[-0.9, 1.0, 0.7]} scale={[2.0, 0.4, 0.46]} />
      <mesh geometry={G.box} material={mat('#c9d3d7', { rough: 0.5 })} position={[0.92, 1.75, 0]} scale={[0.26, 1.2, 1.7]} />
      <mesh geometry={G.cyl} material={mat('#2e8b57', { rough: 0.4, metal: 0.3 })} position={[0.6, 1.35, -0.78]} scale={[0.08, 0.7, 0.08]} />
      {[0.25, -0.25].map((z) => <mesh key={z} geometry={G.box} material={CHROME()} position={[-1.0, 0.81, z]} scale={[3.1, 0.02, 0.04]} />)}
      {/* rear portal frame and step */}
      {[0.985, -0.985].map((z) => <mesh key={z} geometry={G.box} material={white} position={[-2.6, 1.72, z]} scale={[0.07, 1.9, 0.07]} />)}
      <mesh geometry={G.box} material={white} position={[-2.6, 2.6, 0]} scale={[0.07, 0.13, 2.0]} />
      <mesh geometry={G.box} material={mat('#3a3e44', { rough: 0.6, metal: 0.4 })} position={[-2.74, 0.62, 0]} scale={[0.28, 0.07, 1.9]} />
      <RoundedBox args={[1.7, 1.45, 2.0]} radius={0.22} position={[1.85, 1.12, 0]} material={white} />
      <RoundedBox args={[0.9, 0.7, 1.9]} radius={0.15} position={[1.95, 1.62, 0]} material={glass} />
      {/* coral/red band */}
      {[1.027, -1.027].map((z) => <mesh key={z} geometry={G.box} position={[-0.75, 1.05, z]} scale={[3.72, 0.22, 0.012]}><meshStandardMaterial color="#d01f35" roughness={0.4} /></mesh>)}
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
      {([[doorL, 1], [doorR, -1]] as const).map(([ref, sd]) => (
        <group key={sd} ref={ref} position={[-2.64, 1.72, 0.995 * sd]}>
          {/* hinged at the outer corner; the leaf reaches to the middle */}
          <mesh geometry={G.box} material={white} position={[0, 0, -0.495 * sd]} scale={[0.05, 1.86, 0.98]} />
          <mesh geometry={G.box} material={glass} position={[-0.027, 0.42, -0.5 * sd]} scale={[0.01, 0.48, 0.66]} />
          <mesh geometry={G.box} position={[-0.027, -0.67, -0.495 * sd]} scale={[0.01, 0.22, 0.98]}><meshStandardMaterial color="#d01f35" roughness={0.4} /></mesh>
          <mesh geometry={G.box} material={CHROME()} position={[-0.04, -0.15, -0.88 * sd]} scale={[0.03, 0.14, 0.03]} />
          {/* inner face */}
          <mesh geometry={G.box} material={mat('#dcebe5', { rough: 0.8 })} position={[0.027, 0, -0.495 * sd]} scale={[0.004, 1.8, 0.94]} />
        </group>
      ))}
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
export function Stretcher({ drive, children }: { drive: (t: number) => { pos: [number, number, number]; visible: boolean; yaw?: number; fold?: number }; children?: ReactNode }) {
  const clock = useClock();
  const root = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = drive(clock.t);
    if (!root.current) return;
    root.current.visible = s.visible;
    root.current.position.set(...s.pos);
    root.current.rotation.set(0, s.yaw ?? 0, 0);
    // as it rolls into the ambulance the undercarriage folds up under the deck, which slides on the floor rails
    const f = s.fold ?? 0;
    if (legs.current) { legs.current.scale.y = Math.max(0.04, 1 - f); legs.current.position.y = 0.76 * f; legs.current.visible = f < 0.97; }
  });
  return (
    <group ref={root}>
      <Shadow w={2.4} d={1} />
      <RoundedBox args={[2.0, 0.12, 0.62]} radius={0.05} position={[0, 0.82, 0]} material={mat('#e9eef2', { rough: 0.5 })} />
      <RoundedBox args={[1.96, 0.05, 0.58]} radius={0.02} position={[0, 0.9, 0]} material={mat('#1f6f8b', { rough: 0.6 })} />
      <group ref={legs}>{[[0.85, 0.24], [0.85, -0.24], [-0.85, 0.24], [-0.85, -0.24]].map(([x, z], i) => <group key={i}><mesh geometry={G.cyl} material={CHROME()} position={[x, 0.45, z]} scale={[0.02, 0.75, 0.02]} /><mesh geometry={G.sphere} material={RUBBER()} position={[x, 0.07, z]} scale={0.07} /></group>)}</group>
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

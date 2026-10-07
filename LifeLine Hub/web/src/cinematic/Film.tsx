'use client';
/**
 * The film renderer: one R3F canvas, four sets (only the active one is drawn), a camera rig with a move per shot,
 * and a light post stack. Time comes from the player's mutable clock; nothing here owns time.
 * Every camera target is derived from the simulated actors, so framing follows the physics.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useRef } from 'react';
import * as THREE from 'three';
import { ClockCtx } from './models';
import { HomeSet, HospitalSet, PHONE_VIEW, StreetSet, WardSet } from './sets';
import { WORLD_INFO, ambulance, bike, rider, type V3 } from './sim';
import { clamp, lerp, lerp3, seg, shotAt, type SetId } from './timeline';

export type Quality = 'high' | 'low';
/** `key`: a soft film key light near the camera for close-ups (faces read at night), 0 = none. */
interface Cam { p: V3; l: V3; fov: number; shake?: number; key?: number; up?: V3 }

const ease = (x: number) => x * x * (3 - 2 * x);
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const hand = (t: number, amp: number): V3 => [
  amp * (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 2.9 + 1.3) * 0.4),
  amp * (Math.sin(t * 2.3 + 0.4) * 0.5 + Math.sin(t * 4.1) * 0.25),
  amp * (Math.sin(t * 1.3 + 2.1) * 0.5),
];

/** Where the camera is and what it looks at, for any film time. */
export function cameraAt(t: number): Cam {
  const s = shotAt(t);
  const u = clamp((t - s.start) / (s.end - s.start));
  const w = WORLD_INFO();
  const R = w.rest;
  switch (s.id) {
    case 'aerial': {
      const b = bike(t);
      // establishing: high over the avenue behind him, craning down as he rides into the evening
      return { p: [lerp(-330, -262, ease(u)), lerp(120, 26, ease(u)), lerp(14, 2, u)], l: [b.x + lerp(140, 45, ease(u)), 0, -3], fov: 46 };
    }
    case 'roadWide': {
      const b = bike(t);
      return { p: [bike(10.5).x + 16, 1.35, -9.3], l: [b.x, 0.95, b.z], fov: 30 };
    }
    case 'tracking': {
      const b = bike(t);
      return { p: [b.x + lerp(-2.4, 0.6, u), 1.15, b.z + 5.0], l: [b.x + 0.3, 0.9, b.z], fov: 40, shake: 0.015 };
    }
    case 'helmet': {
      const b = bike(t);
      return { p: [b.x + 1.45, 1.76, b.z + 0.6], l: [b.x + 0.08, 1.74, b.z], fov: 28, shake: 0.006, key: 9 };
    }
    case 'hands': {
      const b = bike(t);
      return { p: [b.x + 1.15, 1.5, b.z + 1.0], l: [b.x + 0.42, 1.1, b.z + 0.3], fov: 34, shake: 0.004 };
    }
    case 'mirror': {
      // seen *in* the right-hand mirror: a camera at the mirror looking back (the player flips the frame)
      const b = bike(t);
      return { p: [b.x + 0.39, 1.36, b.z + 0.36], l: [b.x - 40, 0.9, b.z + 2.6], fov: 22 };
    }
    case 'pov': {
      const b = bike(t);
      const vib: V3 = [0, 0.004 * Math.sin(t * 38), 0.003 * Math.sin(t * 29)];
      // at his eyes: in front of the nose, inside the visor
      return { p: add([b.x + 0.24, 1.76, b.z], vib), l: [b.x + 10, -0.3, b.z + 0.15], fov: 80 };
    }
    case 'accident': {
      // from the far footpath: pans with the bike into the impact, then holds as the physics plays out
      const b = bike(t), r = rider(t).pos;
      const mid = clamp((b.x + r[0]) / 2, w.impact.x - 30, R[0] + 8);
      const camX = Math.min(b.x, w.impact.x) + 7;
      return { p: [camX, 1.9, 10.4], l: [mid, 0.8, -4.8], fov: 44, shake: 0.018 };
    }
    case 'ground': {
      const far: V3 = [R[0] + 34, 0.8, -2.2], near: V3 = [R[0] + 0.1, 0.25, R[2] + 0.2];
      return { p: [R[0] - 2.8, 0.34, R[2] + 1.7], l: lerp3(far, near, seg(u, 0.58, 0.92)), fov: 38, shake: 0.008 };
    }
    case 'bystanders':
      return { p: lerp3([R[0] - 6.2, 1.7, R[2] + 5.6], [R[0] - 4.6, 1.55, R[2] + 4.4], u), l: [R[0] + 0.9, 0.7, R[2] - 0.9], fov: 40, shake: 0.03 };
    case 'phone':
    case 'interactive': {
      // low beside his head: his face (in pain, then focused) and the phone he lifts —
      // then his point of view: looking up at the screen, the LifeLine SOS button under his thumb
      const base: Cam = { p: lerp3([R[0] + 0.82, 0.58, R[2] + 1.05], [R[0] + 0.7, 0.52, R[2] + 0.98], u), l: [R[0] + 0.04, 0.3, R[2] + 0.62], fov: 34, shake: 0.006, key: 7 };
      const k = t - (s.id === 'phone' ? s.start : s.start - 4);
      const e = ease(clamp((k - 2.2) / 0.9));
      if (e <= 0 || !PHONE_VIEW.live) return base;
      const P = PHONE_VIEW.p, N = PHONE_VIEW.n, U = PHONE_VIEW.up;
      const pov: V3 = [P.x + N.x * 0.3, Math.max(0.06, P.y + N.y * 0.3), P.z + N.z * 0.3];
      return { p: lerp3(base.p, pov, e), l: lerp3(base.l, [P.x, P.y, P.z], e), fov: lerp(34, 40, e), shake: 0.004, key: 7, up: [U.x * e, (1 - e) + U.y * e, U.z * e] };
    }
    case 'emergencyUi': {
      const a = 0.4 + u * 0.8;
      return { p: [R[0] + 28 * Math.cos(a), 17, R[2] + 28 * Math.sin(a)], l: R, fov: 44 };
    }
    case 'map':
      return { p: [R[0], lerp(70, 200, ease(u)), R[2] + 10], l: R, fov: 48 };
    case 'parents': {
      const k = t - s.start;
      // wide: an ordinary evening → close on Mummy as the alert lands → Papa on the phone to 108
      if (k < 3.3) return { p: lerp3([0.4, 1.5, 2.6], [0.35, 1.42, 2.0], k / 3.3), l: [0.3, 0.85, -1.4], fov: 40, shake: 0.004, key: 4 };
      if (k < 5.6) return { p: lerp3([-0.3, 1.24, -0.62], [-0.36, 1.23, -0.74], (k - 3.3) / 2.3), l: [-0.5, 1.2, -1.6], fov: 30, shake: 0.004, key: 6 };
      return { p: lerp3([0.42, 1.62, 0.02], [0.52, 1.64, -0.08], (k - 5.6) / 3.4), l: [1.28, 1.64, -0.93], fov: 32, shake: 0.005, key: 6 };
    }
    case 'ambulance': {
      const A = ambulance(t);
      const f: [number, number] = [Math.cos(A.yaw), -Math.sin(A.yaw)], r: [number, number] = [-f[1], f[0]];
      const at = (fw: number, rt: number, y: number): V3 => [A.x + f[0] * fw + r[0] * rt, y, A.z + f[1] * fw + r[1] * rt];
      const k = (t - s.start);
      if (k < 3.2) return { p: at(11, 1.6, 1.3), l: at(0, 0, 1.4), fov: 38, shake: 0.02 };
      if (k < 5.6) return { p: at(0.6, 6.8, 1.5), l: at(0.4, 0, 1.2), fov: 40, shake: 0.02 };
      if (k < 7.0) return { p: at(1.0, 2.15, 0.55), l: at(1.85, 0.92, 0.38), fov: 34, shake: 0.01 };
      return { p: [R[0] - 17, 2.1, R[2] + 9.5], l: [A.x, 1.2, A.z], fov: 40 };
    }
    case 'rescue': {
      const A = w.ambStop, k = t - s.start;
      // the crew arrive → the rear doors open, the stretcher comes out, the doors shut → it is wheeled to him →
      // the two-sided lift, close and low → doors open again, he is loaded, doors shut
      if (k < 2.8) return { p: lerp3([R[0] + 3.9, 1.85, R[2] + 6.3], [R[0] + 3.5, 1.8, R[2] + 5.9], k / 2.8), l: [R[0] - 1.5, 0.8, R[2] + 1.2], fov: 42, shake: 0.012 };
      if (k < 13) return { p: lerp3([A[0] + 7.4, 1.75, A[2] - 3.7], [A[0] + 7.0, 1.7, A[2] - 3.4], (k - 2.8) / 10.2), l: [A[0] + 3.3, 1.15, A[2] - 0.2], fov: 44, shake: 0.01 };
      if (k < 20) return { p: lerp3([R[0] + 3.6, 1.75, R[2] + 0.6], [R[0] + 3.2, 1.65, R[2] + 1.0], (k - 13) / 7), l: [R[0] - 0.3, 0.7, R[2] + 1.6], fov: 44, shake: 0.01 };
      if (k < 25) { const u2 = clamp((k - 21.2) / 3.0); return { p: [R[0] + 1.5, 1.9, R[2] - 2.3 + 0.9 * ease(u2)], l: [R[0], 0.85, R[2] + 0.4 + 1.6 * ease(u2)], fov: 42, shake: 0.008, key: 2 }; }
      return { p: lerp3([A[0] + 7.6, 1.85, A[2] + 3.6], [A[0] + 7.1, 1.8, A[2] + 3.2], (k - 25) / 10), l: [A[0] + 3.0, 1.2, A[2] - 0.2], fov: 44, shake: 0.01 };
    }
    case 'hospital':
      return { p: lerp3([-13, 2.3, -9.5], [-8.5, 1.9, -6.2], ease(u)), l: [lerp(-7, -3, u), 1.3, 3], fov: 42 };
    case 'family': {
      const k = t - s.start;
      if (k < 4.4) return { p: lerp3([2.7, 1.7, 2.7], [2.1, 1.55, 2.0], ease(k / 4.4)), l: [-0.25, 0.95, -0.45], fov: 38, shake: 0.004, key: 3 };
      // close on Arjun: the bandage, and a tired smile with his mother holding his hand
      return { p: lerp3([0.42, 1.52, 0.2], [0.3, 1.48, 0.1], (k - 4.4) / 3.6), l: [-0.75, 1.18, -0.5], fov: 32, shake: 0.004, key: 4 };
    }
    case 'final':
    default:
      // rising away over the avenue, the city lit up ahead
      return { p: [R[0] - 70 + 22 * u, lerp(24, 58, ease(u)), 3], l: [R[0] + 90, 0, -2], fov: 46 };
  }
}

const vKey = new THREE.Vector3();
function Rig({ clock }: { clock: { t: number } }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const key = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = clock.t;
    const c = cameraAt(t);
    const sh = c.shake ? hand(t, c.shake) : ([0, 0, 0] as V3);
    camera.position.set(c.p[0] + sh[0], c.p[1] + sh[1], c.p[2] + sh[2]);
    look.current.set(c.l[0] + sh[0] * 2, c.l[1] + sh[1] * 2, c.l[2] + sh[2] * 2);
    if (c.up) camera.up.set(c.up[0], c.up[1], c.up[2]); else camera.up.set(0, 1, 0);
    camera.lookAt(look.current);
    if (key.current) {
      // above and to the right of the lens, like a soft key on set
      key.current.intensity = (c.key ?? 0) * 0.28;
      key.current.position.set(c.p[0] + 0.35, c.p[1] + 0.55, c.p[2]).lerp(vKey.set(c.l[0], c.l[1], c.l[2]), -0.15);
    }
    const pc = camera as THREE.PerspectiveCamera;
    if (pc.fov !== c.fov) { pc.fov = c.fov; pc.updateProjectionMatrix(); }
  });
  return <pointLight ref={key} color="#fff1e2" intensity={0} distance={4} decay={2} />;
}

const BLACK = new THREE.Color('#000');
const FOG: Record<SetId, THREE.Fog | THREE.FogExp2 | null> = {
  street: new THREE.FogExp2('#2b2b44', 0.0062),
  home: null,
  hospital: new THREE.FogExp2('#141a2e', 0.012),
  ward: null,
};

/** Shows only the active set; compiles every set's shaders up front so the first cut doesn't stutter. */
function Sets({ clock, quality }: { clock: { t: number }; quality: Quality }) {
  const refs = useRef<Record<SetId, THREE.Group | null>>({ street: null, home: null, hospital: null, ward: null });
  const { gl, scene, camera } = useThree();
  const warmed = useRef(false);
  useFrame(() => {
    const id = shotAt(clock.t).set;
    if (!warmed.current) {
      warmed.current = true;
      (Object.keys(refs.current) as SetId[]).forEach((k) => { Object.values(refs.current).forEach((g) => g && (g.visible = false)); const g = refs.current[k]; if (g) { g.visible = true; try { gl.compile(scene, camera); } catch { /* best effort */ } } });
    }
    (Object.keys(refs.current) as SetId[]).forEach((k) => { const g = refs.current[k]; if (g) g.visible = k === id; });
    scene.fog = FOG[id];
    scene.background = id === 'home' || id === 'ward' ? BLACK : null;
  });
  return (
    <>
      <group ref={(g) => { refs.current.street = g; }}><StreetSet lowDetail={quality === 'low'} /></group>
      <group ref={(g) => { refs.current.home = g; }}><HomeSet /></group>
      <group ref={(g) => { refs.current.hospital = g; }}><HospitalSet /></group>
      <group ref={(g) => { refs.current.ward = g; }}><WardSet /></group>
    </>
  );
}

function FpsProbe({ onFps }: { onFps?: (fps: number) => void }) {
  const acc = useRef({ n: 0, t0: 0 });
  useFrame(() => {
    const now = performance.now();
    const a = acc.current;
    if (!a.t0) a.t0 = now;
    a.n++;
    if (now - a.t0 > 1000) { onFps?.((a.n * 1000) / (now - a.t0)); a.n = 0; a.t0 = now; }
  });
  return null;
}

export default function Film({ clock, quality, onFps, className }: { clock: { t: number }; quality: Quality; onFps?: (fps: number) => void; className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 40, near: 0.05, far: 1400, position: [0, 30, 60] }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.92; gl.setClearColor('#0b1018', 1); }}
      style={{ background: '#0b1018' }}
    >
      <ClockCtx.Provider value={clock}>
        <Rig clock={clock} />
        <Sets clock={clock} quality={quality} />
        <FpsProbe onFps={onFps} />
        {quality === 'high' && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.6} luminanceThreshold={0.86} luminanceSmoothing={0.15} mipmapBlur />
            <Vignette offset={0.28} darkness={0.72} />
          </EffectComposer>
        )}
      </ClockCtx.Provider>
    </Canvas>
  );
}

// The chef: a jointed, stylised-realistic character whose pose is derived every frame from the engine's chef state.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SimController } from '@/simulation/controller';

const SKIN = '#B9784A';
const COAT = '#F7F5F0';
const APRON = '#183F73';

function Limb({ len, r, color }: { len: number; r: number; color: string }) {
  return (
    <mesh castShadow position={[0, -len / 2, 0]}>
      <capsuleGeometry args={[r, Math.max(0.01, len - r * 2), 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export function Chef({ sim, reduced }: { sim: SimController; reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lHip = useRef<THREE.Group>(null);
  const rHip = useRef<THREE.Group>(null);
  const lKnee = useRef<THREE.Group>(null);
  const rKnee = useRef<THREE.Group>(null);
  const lSh = useRef<THREE.Group>(null);
  const rSh = useRef<THREE.Group>(null);
  const lEl = useRef<THREE.Group>(null);
  const rEl = useRef<THREE.Group>(null);
  const ladle = useRef<THREE.Group>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const phase = useRef(0);

  useFrame((_, dt) => {
    const s = sim.state;
    const c = s.chef;
    const g = root.current;
    if (!g) return;
    const k = Math.min(1, dt * 10);
    g.position.x = THREE.MathUtils.lerp(g.position.x, c.x, k);
    g.position.z = THREE.MathUtils.lerp(g.position.z, c.z, k);
    g.rotation.y = lerpAngle(g.rotation.y, c.heading, Math.min(1, dt * 6));
    const t = s.t;
    const since = t - c.since;
    const moving = c.action === 'walking' || c.action === 'fleeing';
    const fast = c.action === 'fleeing';
    if (moving) phase.current += dt * sim.speed * (fast ? 11 : 7.5) * (reduced ? 0.6 : 1);
    const ph = phase.current;
    const sw = moving ? Math.sin(ph) * (fast ? 0.75 : 0.45) : 0;

    // Defaults (standing)
    let lHipX = sw, rHipX = -sw, lKn = moving ? Math.max(0, -Math.sin(ph)) * 0.8 : 0, rKn = moving ? Math.max(0, Math.sin(ph)) * 0.8 : 0;
    let lShX = -sw * 0.9, rShX = sw * 0.9, lShZ = 0.08, rShZ = -0.08, lElX = moving ? -0.5 : -0.15, rElX = moving ? -0.5 : -0.15;
    let torsoX = fast ? 0.22 : moving ? 0.06 : 0, headY = 0, headX = 0, bob = moving ? Math.abs(Math.sin(ph)) * 0.03 : Math.sin(t * 2) * 0.004;
    let ladleOn = false;

    switch (c.action) {
      case 'cooking': {
        const st = t * 3.2;
        rShX = -0.95 + Math.sin(st) * 0.12;
        rShZ = -0.25 + Math.cos(st) * 0.1;
        rElX = -0.9 + Math.cos(st) * 0.12;
        lShX = -0.7;
        lShZ = 0.3;
        lElX = -0.8;
        torsoX = 0.08;
        headX = 0.25;
        ladleOn = true;
        break;
      }
      case 'alerted': {
        const a = Math.min(1, since / 0.35);
        headY = -0.9 * a; // looks towards the dock beacon
        rShX = -1.4 * a;
        rShZ = -0.5 * a;
        lShX = -0.4 * a;
        rElX = -0.3;
        torsoX = -0.05;
        break;
      }
      case 'noticing': {
        const a = Math.min(1, since / 0.3);
        rShX = -2.1 * a; // hand to face
        rShZ = -0.2;
        rElX = -2.0 * a;
        headY = -0.6 * Math.sin(since * 5);
        torsoX = -0.12 * a;
        break;
      }
      case 'exited': {
        headY = Math.sin(t * 0.8) * 0.2;
        bob = Math.sin(t * 2.4) * 0.006;
        break;
      }
      case 'relieved': {
        // "Whew": wipe the forehead, then shoulders drop with a long exhale.
        const cyc = (since % 3.2) / 3.2;
        const wipe = cyc < 0.45 ? Math.sin((cyc / 0.45) * Math.PI) : 0;
        rShX = -2.3 * Math.min(1, since * 3) + wipe * 0.1;
        rShZ = -0.35 + wipe * 0.6;
        rElX = -2.2 * Math.min(1, since * 3);
        if (cyc > 0.55) {
          rShX = -0.25;
          rElX = -0.2;
          rShZ = -0.1;
        }
        headX = cyc > 0.55 ? 0.25 : -0.12;
        torsoX = cyc > 0.55 ? 0.12 : -0.05;
        bob = cyc > 0.55 ? -0.02 : 0.01;
        break;
      }
    }
    const L = Math.min(1, dt * 12);
    const set = (r: React.RefObject<THREE.Group>, x: number, z = 0, y = 0) => {
      if (!r.current) return;
      r.current.rotation.x = THREE.MathUtils.lerp(r.current.rotation.x, x, L);
      r.current.rotation.z = THREE.MathUtils.lerp(r.current.rotation.z, z, L);
      r.current.rotation.y = THREE.MathUtils.lerp(r.current.rotation.y, y, L);
    };
    set(lHip, lHipX);
    set(rHip, rHipX);
    set(lKnee, lKn);
    set(rKnee, rKn);
    set(lSh, lShX, lShZ);
    set(rSh, rShX, rShZ);
    set(lEl, lElX);
    set(rEl, rElX);
    set(torso, torsoX);
    set(head, headX, 0, headY);
    g.position.y = bob;
    if (ladle.current) ladle.current.visible = ladleOn;
    if (bubble.current) {
      const show = c.action === 'relieved';
      bubble.current.style.opacity = show ? '1' : '0';
      bubble.current.style.transform = show ? 'translateY(0) scale(1)' : 'translateY(6px) scale(.9)';
    }
  });

  const k = sim.state.chef;
  return (
    <group ref={root} position={[k.x, 0, k.z]} rotation={[0, k.heading, 0]}>
      {/* Legs */}
      {([[-0.095, lHip, lKnee], [0.095, rHip, rKnee]] as const).map(([x, hip, knee], i) => (
        <group key={i} ref={hip} position={[x, 0.92, 0]}>
          <Limb len={0.44} r={0.068} color="#2b2f36" />
          <group ref={knee} position={[0, -0.44, 0]}>
            <Limb len={0.42} r={0.058} color="#2b2f36" />
            <mesh castShadow position={[0, -0.43, 0.05]}>
              <boxGeometry args={[0.1, 0.07, 0.24]} />
              <meshStandardMaterial color="#111" roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Torso, apron, head */}
      <group ref={torso} position={[0, 0.94, 0]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <capsuleGeometry args={[0.18, 0.36, 8, 20]} />
          <meshStandardMaterial color={COAT} roughness={0.85} />
        </mesh>
        {[0.42, 0.32, 0.22].map((y) => (
          <mesh key={y} position={[0.07, y, 0.17]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#1F2733" />
          </mesh>
        ))}
        <mesh castShadow position={[0, 0.12, 0.155]}>
          <boxGeometry args={[0.3, 0.42, 0.04]} />
          <meshStandardMaterial color={APRON} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.58, 0.04]}>
          <torusGeometry args={[0.07, 0.025, 8, 20]} />
          <meshStandardMaterial color="#E8730C" />
        </mesh>
        <group ref={head} position={[0, 0.66, 0]}>
          <mesh castShadow position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.105, 24, 24]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.115, -0.015]}>
            <sphereGeometry args={[0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          {[-0.036, 0.036].map((x) => (
            <mesh key={x} position={[x, 0.085, 0.095]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
          <mesh position={[0, 0.035, 0.098]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.01, 0.05, 4, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Chef's toque */}
          <mesh castShadow position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.095, 0.09, 0.12, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.125, 20, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <Html position={[0, 0.55, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div ref={bubble} className="whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-sm font-extrabold text-ok-700 shadow-card ring-1 ring-ok-100 transition-all duration-300" style={{ opacity: 0 }}>
              Whew! 😮‍💨
            </div>
          </Html>
        </group>
        {/* Arms */}
        {([[-0.235, lSh, lEl, false], [0.235, rSh, rEl, true]] as const).map(([x, sh, el, right], i) => (
          <group key={i} ref={sh} position={[x, 0.5, 0]}>
            <Limb len={0.29} r={0.058} color={COAT} />
            <group ref={el} position={[0, -0.29, 0]}>
              <Limb len={0.25} r={0.048} color={COAT} />
              <mesh position={[0, -0.27, 0]} castShadow>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color={SKIN} />
              </mesh>
              {right && (
                <group ref={ladle} position={[0, -0.29, 0.02]} rotation={[1.2, 0, 0]}>
                  <mesh position={[0, 0.0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.32, 8]} />
                    <meshStandardMaterial color="#C3CAD3" metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 0, 0.32]}>
                    <sphereGeometry args={[0.04, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    <meshStandardMaterial color="#C3CAD3" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

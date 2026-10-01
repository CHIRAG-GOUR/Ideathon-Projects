// Small commercial kitchen (Indian restaurant + gas-agency demo lab). Static set dressing is built once;
// everything that changes is driven from the engine state inside useFrame.
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '@engine/engine';
import type { SimController } from '@/simulation/controller';
import { CylinderDock, type DockVisual } from './CylinderDock';
import { Chef } from './Chef';
import { brushedSteel, floorTiles, signTexture, wallTiles, woodFloor } from './textures';
import type { Quality } from '@/services/settings';
import { QUALITY } from '@/services/settings';

const K = CONFIG.kitchen;
const CYL = K.cylinder as [number, number, number];
const VALVE = new THREE.Vector3(CYL[0], 0.95, CYL[2]);

// Deterministic pseudo-random (identical scene on every load).
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function dockVisual(sim: SimController): DockVisual {
  const s = sim.state;
  const led = s.safety === 'SAFE' ? 5 : s.supply === 'ISOLATED' ? 4 : s.safety === 'CRITICAL' ? 3 : s.safety === 'WARNING' ? 2 : s.safety === 'ANOMALY' ? 1 : 0;
  const iso = s.supply === 'ISOLATED' ? 1 : s.supply === 'CLOSING' ? Math.min(1, (s.t - s.timers.shutoffAt) / CONFIG.dock.valveTravelSec) : 0;
  return { led, valveClosed: iso, heat: THREE.MathUtils.clamp((s.temp - 34) / 30, 0, 1), tiltDeg: s.tilt, scorched: s.timers.incidentAt >= 0 ? 1 : 0 };
}

export function Kitchen({ sim, quality, reduced }: { sim: SimController; quality: Quality; reduced: boolean }) {
  const Q = QUALITY[quality];
  const withDock = sim.scenario === 'with';
  return (
    <group>
      <Lights sim={sim} shadows={Q.shadows} />
      <Room />
      <Counter />
      <Stove sim={sim} />
      <Hood sim={sim} />
      <Shelves />
      <Dining />
      <Signage withDock={withDock} />
      <group position={CYL}>
        <CylinderDock withDock={withDock} read={() => dockVisual(sim)} />
        {withDock && <DockTag sim={sim} />}
      </group>
      <Hose sim={sim} />
      {withDock && <Beacon sim={sim} />}
      <GasCloud sim={sim} count={Q.particles} />
      <Chef sim={sim} reduced={reduced} />
      <Incident sim={sim} smoke={Q.smoke} reduced={reduced} />
      <CameraShake sim={sim} reduced={reduced} />
    </group>
  );
}

/** Label above the dock; updated from the render loop (the Html overlay itself lives outside the Canvas). */
function DockTag({ sim }: { sim: SimController }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const s = sim.state;
    const txt = s.safety === 'SAFE' ? 'SAFE' : s.supply === 'ISOLATED' ? 'ISOLATED' : s.safety === 'NORMAL' ? 'PROTECTED' : s.safety;
    if (el.dataset.t !== txt) {
      el.dataset.t = txt;
      el.textContent = `SMART DOCK · ${txt}`;
      el.className =
        'whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-bold tracking-wider shadow-card ring-1 ' +
        (txt === 'WARNING' || txt === 'ANOMALY' ? 'bg-safety-50 text-safety-700 ring-safety-100' : txt === 'CRITICAL' ? 'bg-danger-50 text-danger-700 ring-danger-100' : txt === 'ISOLATED' ? 'bg-lpg-100 text-lpg-800 ring-lpg-200' : 'bg-white/90 text-ok-700 ring-ok-100');
    }
  });
  return (
    <Html position={[0, 1.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} />
    </Html>
  );
}

function Lights({ sim, shadows }: { sim: SimController; shadows: boolean }) {
  const warm = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const s = sim.state;
    const after = s.timers.incidentAt >= 0 ? s.t - s.timers.incidentAt : -1;
    // Lights flicker after the simulated incident, then settle dim.
    const flick = after > 0.4 && after < 4 ? 0.4 + 0.6 * Math.abs(Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7)) : after >= 4 ? 0.55 : 1;
    if (warm.current) warm.current.intensity = 6 * flick;
  });
  return (
    <>
      <hemisphereLight args={['#fff4e2', '#6b5a48', 0.75]} />
      <directionalLight
        position={[3.5, 6, 4]}
        intensity={1.5}
        color="#fff1dc"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <pointLight ref={warm} position={[0, 2.6, 0.6]} intensity={6} distance={8} color="#ffd9a3" />
      <pointLight position={[-5.5, 2.4, 2.4]} intensity={4} distance={6} color="#ffc27a" />
    </>
  );
}

function Room() {
  const wall = useMemo(() => wallTiles(), []);
  const floor = useMemo(() => floorTiles(), []);
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.8]}>
        <planeGeometry args={[6.2, 4.8]} />
        <meshStandardMaterial map={floor} roughness={0.85} />
      </mesh>
      {/* Back wall with tiles up to 1.6 m, painted above */}
      <mesh receiveShadow position={[0, 0.8, -1.5]}>
        <planeGeometry args={[6.2, 1.6]} />
        <meshStandardMaterial map={wall} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.3, -1.5]}>
        <planeGeometry args={[6.2, 1.4]} />
        <meshStandardMaterial color="#efe6d6" roughness={0.95} />
      </mesh>
      {/* Right wall */}
      <mesh receiveShadow position={[3.1, 1.5, 0.8]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4.8, 3]} />
        <meshStandardMaterial color="#e9dfcd" roughness={0.95} />
      </mesh>
      {/* Left wall with the exit doorway (z 1.25 … 2.35) */}
      <mesh receiveShadow position={[-3.1, 1.5, -0.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.1, 3]} />
        <meshStandardMaterial color="#e9dfcd" roughness={0.95} />
      </mesh>
      <mesh position={[-3.1, 1.5, 2.85]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1, 3]} />
        <meshStandardMaterial color="#e9dfcd" roughness={0.95} />
      </mesh>
      <mesh position={[-3.1, 2.6, 1.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshStandardMaterial color="#e9dfcd" roughness={0.95} />
      </mesh>
      {/* Door frame */}
      {[1.22, 2.38].map((z) => (
        <mesh key={z} position={[-3.1, 1.1, z]}>
          <boxGeometry args={[0.1, 2.2, 0.06]} />
          <meshStandardMaterial color="#6b4a2e" />
        </mesh>
      ))}
      <mesh position={[-3.1, 2.22, 1.8]}>
        <boxGeometry args={[0.1, 0.06, 1.22]} />
        <meshStandardMaterial color="#6b4a2e" />
      </mesh>
      {/* Skirting */}
      <mesh position={[0, 0.05, -1.49]}>
        <boxGeometry args={[6.2, 0.1, 0.02]} />
        <meshStandardMaterial color="#8a7f70" />
      </mesh>
    </group>
  );
}

function Counter() {
  const steel = useMemo(() => brushedSteel(), []);
  return (
    <group>
      {/* Base cabinets (x −2.7 … 0.95) */}
      <mesh castShadow receiveShadow position={[-0.875, 0.42, -1.13]}>
        <boxGeometry args={[3.65, 0.84, 0.62]} />
        <meshStandardMaterial map={steel} metalness={0.6} roughness={0.4} />
      </mesh>
      {[-2.4, -1.5, -0.6, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.5, -0.815]}>
          <boxGeometry args={[0.3, 0.025, 0.02]} />
          <meshStandardMaterial color="#59626e" metalness={0.8} />
        </mesh>
      ))}
      {/* Granite top */}
      <mesh castShadow receiveShadow position={[-0.875, 0.865, -1.11]}>
        <boxGeometry args={[3.72, 0.05, 0.7]} />
        <meshStandardMaterial color="#2f3238" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Prep table (right front) with chopping board and vegetables */}
      <group position={[1.75, 0, 1.25]}>
        <mesh castShadow receiveShadow position={[0, 0.86, 0]}>
          <boxGeometry args={[1.2, 0.04, 0.7]} />
          <meshStandardMaterial map={steel} metalness={0.7} roughness={0.35} />
        </mesh>
        {[[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].map(([x, z], i) => (
          <mesh key={i} castShadow position={[x, 0.42, z]}>
            <cylinderGeometry args={[0.022, 0.022, 0.84, 8]} />
            <meshStandardMaterial color="#9aa4b1" metalness={0.8} />
          </mesh>
        ))}
        <mesh castShadow position={[-0.15, 0.9, 0]}>
          <boxGeometry args={[0.45, 0.03, 0.3]} />
          <meshStandardMaterial color="#c99a62" roughness={0.8} />
        </mesh>
        {[['#d63b2f', 0.25, 0.05], ['#e7a02f', 0.35, -0.1], ['#4c8b3a', 0.18, -0.15], ['#8c3b6d', 0.42, 0.12]].map(([c, x, z], i) => (
          <mesh key={i} castShadow position={[x as number, 0.92, z as number]}>
            <sphereGeometry args={[0.045, 14, 12]} />
            <meshStandardMaterial color={c as string} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Stove({ sim }: { sim: SimController }) {
  const flames = useRef<THREE.Group>(null);
  const steam = useRef<THREE.Group>(null);
  const pans = useRef<THREE.Group>(null);
  const [sx, , sz] = K.stove;
  const R = useMemo(() => rng(7), []);
  const puffs = useMemo(() => Array.from({ length: 10 }, () => ({ o: R(), x: (R() - 0.5) * 0.12, z: (R() - 0.5) * 0.12 })), [R]);
  useFrame(({ clock }) => {
    const s = sim.state;
    const on = s.burner;
    const big = s.usage === 'ABNORMAL' ? 1.6 : 1;
    if (flames.current)
      flames.current.children.forEach((f, i) => {
        const fl = on ? (0.85 + 0.15 * Math.sin(clock.elapsedTime * 30 + i)) * big : 0;
        f.scale.set(1, fl, 1);
        f.visible = on;
      });
    if (steam.current)
      steam.current.children.forEach((p, i) => {
        const ph = (clock.elapsedTime * 0.35 + puffs[i].o) % 1;
        p.position.set(puffs[i].x * (1 + ph * 2), 0.15 + ph * 0.9, puffs[i].z * (1 + ph * 2));
        const sc = 0.05 + ph * 0.12;
        p.scale.setScalar(sc);
        ((p as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = on || s.temp > 26 ? 0.22 * (1 - ph) : 0;
      });
    // Cookware is thrown off the stove in the simulated incident.
    if (pans.current) {
      const a = s.timers.incidentAt >= 0 ? Math.min(1, (s.t - s.timers.incidentAt) / 0.8) : 0;
      pans.current.children.forEach((p, i) => {
        const dir = i === 0 ? -1 : 1;
        p.position.x = (i === 0 ? -0.22 : 0.22) + dir * a * 0.5;
        p.position.y = 0.98 + Math.sin(a * Math.PI) * 0.35 - a * 0.1;
        p.rotation.z = dir * a * 1.6;
      });
    }
  });
  return (
    <group position={[sx, 0, sz]}>
      <RoundedBox args={[0.9, 0.1, 0.5]} radius={0.02} position={[0, 0.94, 0]} castShadow>
        <meshStandardMaterial color="#1F2733" metalness={0.5} roughness={0.35} />
      </RoundedBox>
      {[-0.22, 0.22].map((x) => (
        <group key={x} position={[x, 0.995, 0]}>
          <mesh>
            <torusGeometry args={[0.085, 0.018, 8, 24]} />
            <meshStandardMaterial color="#111" metalness={0.6} roughness={0.5} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation={[0, (k * Math.PI) / 3, 0]} position={[0, 0.012, 0]}>
              <boxGeometry args={[0.24, 0.012, 0.012]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.32, -0.12, 0.12, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.93, 0.255]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.02, 16]} />
          <meshStandardMaterial color="#C3CAD3" metalness={0.8} />
        </mesh>
      ))}
      <group ref={flames}>
        {[-0.22, 0.22].flatMap((x) =>
          Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={`${x}-${i}`} position={[x + Math.cos(a) * 0.07, 1.0, Math.sin(a) * 0.07]}>
                <coneGeometry args={[0.014, 0.06, 6]} />
                <meshBasicMaterial color="#5aa9ff" transparent opacity={0.85} toneMapped={false} />
              </mesh>
            );
          }),
        )}
      </group>
      <group ref={pans}>
        {/* Kadhai */}
        <group position={[-0.22, 0.98, 0]}>
          <mesh castShadow position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.17, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.01, 28]} />
            <meshStandardMaterial color="#c9772b" roughness={0.6} />
          </mesh>
          {[-0.19, 0.19].map((x) => (
            <mesh key={x} position={[x, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.025, 0.008, 6, 12]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.7} />
            </mesh>
          ))}
        </group>
        {/* Stock pot */}
        <group position={[0.22, 0.98, 0]}>
          <mesh castShadow position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.13, 0.12, 0.22, 28]} />
            <meshStandardMaterial color="#C3CAD3" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.225, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.015, 28]} />
            <meshStandardMaterial color="#9AA4B1" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      </group>
      <group ref={steam} position={[0.22, 1.2, 0]}>
        {puffs.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Hood({ sim }: { sim: SimController }) {
  const steel = useMemo(() => brushedSteel(), []);
  const fan = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    // Exhaust fan runs throughout; it also clears the simulated gas after isolation.
    if (fan.current) fan.current.rotation.z += dt * (sim.running ? 9 : 2);
  });
  return (
    <group>
      <mesh castShadow position={[0, 2.05, -1.18]}>
        <boxGeometry args={[1.3, 0.35, 0.65]} />
        <meshStandardMaterial map={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.65, -1.32]}>
        <boxGeometry args={[0.4, 0.9, 0.35]} />
        <meshStandardMaterial map={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.875, -1.15]}>
        <boxGeometry args={[1.1, 0.01, 0.5]} />
        <meshStandardMaterial color="#fff6e0" emissive="#ffe4b0" emissiveIntensity={0.6} />
      </mesh>
      {/* Wall exhaust fan */}
      <group position={[-2.35, 2.3, -1.47]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.04, 32]} />
          <meshStandardMaterial color="#59626e" metalness={0.6} roughness={0.4} />
        </mesh>
        <group ref={fan} position={[0, 0, 0.03]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              <boxGeometry args={[0.46, 0.08, 0.01]} />
              <meshStandardMaterial color="#C3CAD3" metalness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function Shelves() {
  const R = useMemo(() => rng(42), []);
  const jars = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: -2.55 + i * 0.16, c: ['#c2410c', '#e7a02f', '#7a4a2a', '#d4b483', '#8b2c1a', '#5f7f3a'][i % 6], h: 0.12 + R() * 0.08 })), [R]);
  return (
    <group>
      {[1.45, 1.85].map((y, k) => (
        <group key={y}>
          <mesh castShadow position={[-1.7, y, -1.36]}>
            <boxGeometry args={[2.0, 0.03, 0.26]} />
            <meshStandardMaterial color="#9aa4b1" metalness={0.75} roughness={0.35} />
          </mesh>
          {jars.slice(k * 6, k * 6 + 6).map((j, i) => (
            <group key={i} position={[j.x + 0.3 + i * 0.12 + k * 0.05, y + 0.015, -1.36]}>
              <mesh castShadow position={[0, j.h / 2, 0]}>
                <cylinderGeometry args={[0.045, 0.045, j.h, 16]} />
                <meshStandardMaterial color="#e8edf2" transparent opacity={0.55} roughness={0.1} />
              </mesh>
              <mesh position={[0, j.h * 0.38, 0]}>
                <cylinderGeometry args={[0.04, 0.04, j.h * 0.7, 16]} />
                <meshStandardMaterial color={j.c} roughness={0.9} />
              </mesh>
              <mesh position={[0, j.h + 0.01, 0]}>
                <cylinderGeometry args={[0.046, 0.046, 0.02, 16]} />
                <meshStandardMaterial color="#C3CAD3" metalness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Utensil rail with ladles */}
      <mesh position={[1.2, 1.55, -1.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 8]} />
        <meshStandardMaterial color="#C3CAD3" metalness={0.9} roughness={0.2} />
      </mesh>
      {[0.8, 0.98, 1.16, 1.34, 1.52].map((x, i) => (
        <group key={x} position={[x, 1.38, -1.43]}>
          <mesh>
            <cylinderGeometry args={[0.006, 0.006, 0.32, 6]} />
            <meshStandardMaterial color="#C3CAD3" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.17, 0.01]}>
            <sphereGeometry args={[i % 2 ? 0.035 : 0.045, 12, 8]} />
            <meshStandardMaterial color="#C3CAD3" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Fire extinguisher on the right wall */}
      <group position={[3.0, 0, -0.2]}>
        <mesh castShadow position={[0, 0.55, 0]}>
          <capsuleGeometry args={[0.08, 0.38, 8, 16]} />
          <meshStandardMaterial color="#c8241b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    </group>
  );
}

function Dining() {
  const wood = useMemo(() => woodFloor(), []);
  return (
    <group position={[-5.4, 0, 1.8]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.6, 5]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh position={[-2.1, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3]} />
        <meshStandardMaterial color="#b85c38" roughness={0.95} />
      </mesh>
      {[[-0.8, -1.2], [-0.8, 1.2]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.74, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.04, 28]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.74, 10]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
          <mesh position={[0, 0.77, 0]}>
            <cylinderGeometry args={[0.47, 0.47, 0.005, 28]} />
            <meshStandardMaterial color="#f4efe4" />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e7a02f" emissive="#ffb347" emissiveIntensity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Signage({ withDock }: { withDock: boolean }) {
  const lpg = useMemo(() => signTexture('sign-lpg', [{ text: 'LPG CYLINDER AREA', color: '#ffffff', size: 46 }, { text: 'NO SMOKING · NO NAKED FLAME', color: '#FFE3C4', size: 30, weight: 700 }], '#183F73', '#F99A3D'), []);
  const exit = useMemo(() => signTexture('sign-exit', [{ text: 'EXIT', color: '#ffffff', size: 110 }], '#167A45', undefined, 512, 200), []);
  const lab = useMemo(() => signTexture('sign-lab', [{ text: 'SAFETY FIRST', color: '#1F2733', size: 52 }, { text: 'Check the regulator before cooking', color: '#5E6977', size: 26, weight: 600 }], '#FFF4E8', '#E8730C'), []);
  const sim = useMemo(() => signTexture('sign-sim', [{ text: withDock ? 'SMART DOCK INSTALLED' : 'NO SAFETY MONITORING', color: '#ffffff', size: 40 }, { text: 'SIMULATION', color: '#D7E6F6', size: 26, weight: 700 }], withDock ? '#1D4F91' : '#3B4656'), [withDock]);
  return (
    <group>
      <mesh position={[1.55, 1.25, -1.485]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshStandardMaterial map={lpg} roughness={0.5} />
      </mesh>
      <mesh position={[-3.04, 2.45, 1.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.22]} />
        <meshStandardMaterial map={exit} emissive="#2ecc71" emissiveIntensity={0.35} emissiveMap={exit} />
      </mesh>
      <mesh position={[3.08, 1.6, 0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshStandardMaterial map={lab} roughness={0.6} />
      </mesh>
      <mesh position={[-1.25, 2.45, -1.48]}>
        <planeGeometry args={[1.0, 0.36]} />
        <meshStandardMaterial map={sim} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Hose from the regulator to the stove, with gas-flow dots that move with the measured flow. */
function Hose({ sim }: { sim: SimController }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(CYL[0], 1.0, CYL[2] - 0.15), new THREE.Vector3(1.2, 1.05, -1.42), new THREE.Vector3(0.7, 0.95, -1.42), new THREE.Vector3(0.45, 0.95, -1.25)]),
    [],
  );
  const dots = useRef<THREE.Group>(null);
  const off = useRef(0);
  useFrame((_, dt) => {
    const s = sim.state;
    off.current = (off.current + dt * s.flow * 0.9) % 1;
    dots.current?.children.forEach((d, i) => {
      const u = (i / 8 + off.current) % 1;
      d.position.copy(curve.getPointAt(u));
      d.visible = s.flow > 0.01;
    });
  });
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curve, 40, 0.011, 8, false]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>
      <group ref={dots}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshBasicMaterial color="#fff2c9" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The dock's alarm beacon on the wall (only exists when the dock is installed). */
function Beacon({ sim }: { sim: SimController }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const s = sim.state;
    const on = s.alarm !== 'none';
    const col = s.alarm === 'critical' ? '#ef4444' : '#f59e0b';
    const pulse = on ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * (s.alarm === 'critical' ? 16 : 8)) : 0;
    if (mat.current) {
      mat.current.emissive.set(on ? col : s.supply === 'ISOLATED' ? '#3b82f6' : '#22c55e');
      mat.current.emissiveIntensity = on ? 0.6 + 2.4 * pulse : 0.8;
    }
    if (light.current) {
      light.current.color.set(col);
      light.current.intensity = on ? 3 + 9 * pulse : 0;
    }
  });
  return (
    <group position={[2.2, 2.05, -1.42]}>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.1]} />
        <meshStandardMaterial color="#1F2733" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.07, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={mat} color="#fff" emissive="#22c55e" emissiveIntensity={0.8} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <pointLight ref={light} position={[0, 0, 0.25]} intensity={0} distance={5} />
    </group>
  );
}

/** Visualisation of simulated gas around the cylinder. Real LPG is invisible; this cloud is a teaching aid. */
function GasCloud({ sim, count }: { sim: SimController; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const tag = useRef<HTMLDivElement>(null);
  const seeds = useMemo(() => {
    const R = rng(99);
    return Array.from({ length: count }, () => ({ a: R() * Math.PI * 2, r: R(), h: R(), sp: 0.3 + R() * 0.7, ph: R() }));
  }, [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const s = sim.state;
    const amt = THREE.MathUtils.clamp((s.gas - 0.05) / 0.75, 0, 1);
    if (mat.current) mat.current.opacity = 0.07 + 0.2 * amt;
    const im = mesh.current;
    if (im) {
      const n = Math.floor(count * Math.min(1, amt * 1.4));
      const spread = 0.25 + amt * 2.2;
      seeds.forEach((p, i) => {
        if (i >= n || s.timers.incidentAt >= 0) {
          m.makeScale(0, 0, 0);
        } else {
          const tt = clock.elapsedTime * 0.05 * p.sp + p.ph;
          const r = (p.r * spread + (tt % 1) * 0.3) * (0.6 + amt);
          v.set(VALVE.x + Math.cos(p.a + tt) * r, 0.05 + p.h * (0.35 + amt * 0.9) * (1 - p.r * 0.5), VALVE.z + Math.sin(p.a + tt) * r * 0.8 + 0.2);
          sc.setScalar(0.08 + p.r * 0.18 * (0.5 + amt));
          m.compose(v, q, sc);
        }
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
    }
    if (tag.current) tag.current.style.opacity = amt > 0.04 && s.timers.incidentAt < 0 ? '1' : '0';
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial ref={mat} color="#d8e27a" transparent opacity={0.1} depthWrite={false} />
      </instancedMesh>
      <Html position={[VALVE.x - 0.2, 0.45, VALVE.z + 0.6]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={tag} className="whitespace-nowrap rounded-md bg-graphite/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-white transition-opacity" style={{ opacity: 0 }}>
          SIMULATED GAS (LPG itself is invisible)
        </div>
      </Html>
    </group>
  );
}

/** The SIMULATED INCIDENT visual: flash, fireball, smoke, scorch. Educational, not a model of real behaviour. */
function Incident({ sim, smoke, reduced }: { sim: SimController; smoke: number; reduced: boolean }) {
  const fire = useRef<THREE.Group>(null);
  const smokeMesh = useRef<THREE.InstancedMesh>(null);
  const flash = useRef<THREE.PointLight>(null);
  const scorch = useRef<THREE.Mesh>(null);
  const seeds = useMemo(() => {
    const R = rng(5);
    return Array.from({ length: smoke }, () => ({ x: (R() - 0.5) * 1.6, z: (R() - 0.5) * 1.2, d: R() * 1.2, s: 0.4 + R() * 0.8 }));
  }, [smoke]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const s = sim.state;
    const a = s.timers.incidentAt >= 0 ? s.t - s.timers.incidentAt : -1;
    const on = a >= 0;
    if (flash.current) flash.current.intensity = on && a < 1.2 ? (reduced ? 20 : 60) * Math.max(0, 1 - a / 1.2) : 0;
    if (fire.current) {
      fire.current.visible = on && a < 3.5;
      fire.current.children.forEach((c, i) => {
        const grow = Math.min(1, a / (0.35 + i * 0.12));
        const fade = Math.max(0, 1 - Math.max(0, a - 0.8 - i * 0.2) / 2.2);
        c.scale.setScalar((0.25 + i * 0.22) * grow * (1 + 0.06 * Math.sin(clock.elapsedTime * 20 + i)) * (reduced ? 0.7 : 1));
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
      });
    }
    const im = smokeMesh.current;
    if (im) {
      seeds.forEach((p, i) => {
        const t = on ? Math.max(0, a - p.d * 0.5) : 0;
        if (!on || t <= 0) m.makeScale(0, 0, 0);
        else {
          v.set(CYL[0] + p.x * (0.3 + t * 0.25), 0.4 + t * 0.32 * p.s, CYL[2] + 0.3 + p.z * (0.3 + t * 0.2));
          sc.setScalar(Math.min(0.9, 0.12 + t * 0.12 * p.s));
          m.compose(v, q, sc);
        }
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
    }
    if (scorch.current) ((scorch.current.material as THREE.MeshBasicMaterial).opacity = on ? Math.min(0.75, a * 2) : 0);
  });
  return (
    <group>
      <pointLight ref={flash} position={[CYL[0], 1.2, CYL[2] + 0.4]} color="#ffd18a" intensity={0} distance={12} />
      <group ref={fire} position={[CYL[0], 0.7, CYL[2] + 0.1]} visible={false}>
        {['#fff3b0', '#ffb347', '#ff7a1a', '#c2410c'].map((c, i) => (
          <mesh key={c}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshBasicMaterial color={c} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={smokeMesh} args={[undefined, undefined, smoke]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#4a4a4a" transparent opacity={0.55} depthWrite={false} roughness={1} />
      </instancedMesh>
      <mesh ref={scorch} rotation={[-Math.PI / 2, 0, 0]} position={[CYL[0] - 0.2, 0.004, CYL[2] + 0.3]}>
        <circleGeometry args={[1.1, 40]} />
        <meshBasicMaterial color="#111" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraShake({ sim, reduced }: { sim: SimController; reduced: boolean }) {
  const { camera } = useThree();
  const base = useRef<THREE.Vector3 | null>(null);
  useFrame(({ clock }) => {
    const s = sim.state;
    const a = s.timers.incidentAt >= 0 ? s.t - s.timers.incidentAt : -1;
    const amp = !reduced && a >= 0 && a < 1.6 ? 0.08 * (1 - a / 1.6) : 0;
    if (amp > 0) {
      base.current ??= camera.position.clone();
      camera.position.set(base.current.x + Math.sin(clock.elapsedTime * 63) * amp, base.current.y + Math.sin(clock.elapsedTime * 71) * amp, base.current.z + Math.cos(clock.elapsedTime * 57) * amp);
    } else if (base.current) {
      camera.position.copy(base.current);
      base.current = null;
    }
  });
  return null;
}

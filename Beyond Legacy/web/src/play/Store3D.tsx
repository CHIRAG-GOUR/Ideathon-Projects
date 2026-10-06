// The 3D kirana store for Shelf Rush. Shelves show the real simulated stock; during a day customers walk in, take
// products, and leave (a red marker when what they wanted was out of stock). Simple shapes, no external assets.
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { lookFor, Person, SHOPKEEPER, type Look, type PersonHandle } from './Person';
import { ITEMS, stockOf, type DayLog, type SimItem, type SimState } from './sim';

const SLOT_UNITS: Record<string, number> = { milk: 3, bread: 1, paneer: 1, sweets: 1, oil: 1, atta: 1, namkeen: 2, biscuits: 4 };
const SHAPE: Record<string, [number, number, number]> = {
  milk: [0.22, 0.3, 0.16], bread: [0.3, 0.2, 0.2], paneer: [0.26, 0.1, 0.2], sweets: [0.3, 0.12, 0.26],
  oil: [0.18, 0.4, 0.14], atta: [0.3, 0.36, 0.16], namkeen: [0.24, 0.3, 0.08], biscuits: [0.28, 0.1, 0.14],
};
const POS: [number, number][] = [[-4.2, -3], [-1.4, -3], [1.4, -3], [4.2, -3], [-4.2, 0.2], [-1.4, 0.2], [1.4, 0.2], [4.2, 0.2]];
const DOOR: [number, number] = [-5.6, 4.6];
const COUNTER: [number, number] = [4.4, 3.4];

export interface Shelf { stock: number; expiring: number; discount: boolean }
export function shelvesFrom(state: SimState, extra?: Record<string, number>): Record<string, Shelf> {
  return Object.fromEntries(ITEMS.map((it) => {
    const s = state.items[it.id];
    const expiring = s.batches.filter((b) => b.expiresDay !== null && b.expiresDay <= state.day).reduce((n, b) => n + b.qty, 0);
    return [it.id, { stock: stockOf(s) + (extra?.[it.id] ?? 0), expiring, discount: s.discount }];
  }));
}

function ShelfUnit({ it, x, z, shelf, sold, progress, festive }: { it: SimItem; x: number; z: number; shelf: Shelf; sold: number; progress: number; festive: boolean }) {
  const ups = SLOT_UNITS[it.id] ?? 1;
  const shown = Math.max(0, shelf.stock - Math.round(sold * progress));
  const slots = Math.min(18, Math.ceil(shown / ups));
  const old = Math.min(slots, Math.ceil(shelf.expiring / ups));
  const [w, h, d] = SHAPE[it.id];
  const out = shown === 0;
  return (
    <group position={[x, 0, z]}>
      {/* frame */}
      <mesh position={[0, 1.05, -0.3]}><boxGeometry args={[2.3, 2.1, 0.06]} /><meshStandardMaterial color="#0E6B47" /></mesh>
      {[-1.15, 1.15].map((sx) => <mesh key={sx} position={[sx, 1.05, 0]}><boxGeometry args={[0.06, 2.1, 0.66]} /><meshStandardMaterial color="#0A3D2C" /></mesh>)}
      {[0.12, 0.72, 1.32, 1.92].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[2.3, 0.05, 0.66]} /><meshStandardMaterial color="#C89B63" /></mesh>)}
      {/* products: oldest (expiring) first, tinted */}
      {Array.from({ length: slots }, (_, i) => {
        const level = Math.floor(i / 6), col = i % 6;
        const expiring = i < old;
        return (
          <mesh key={i} position={[-0.95 + col * 0.38, 0.15 + level * 0.6 + h / 2, 0.05 + (i % 2) * 0.04]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={expiring ? '#E8772E' : it.color} roughness={0.55} />
          </mesh>
        );
      })}
      {festive && it.festival >= 2 && <mesh position={[0, 2.25, -0.27]}><boxGeometry args={[2.1, 0.22, 0.04]} /><meshStandardMaterial color="#F5B82E" emissive="#F5B82E" emissiveIntensity={0.35} /></mesh>}
      <Html position={[0, 2.55, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap text-center">
          <div className={`rounded-lg px-2 py-0.5 text-[13px] font-extrabold shadow ${out ? 'bg-red text-white' : 'bg-white/95 text-ink'}`}>
            {it.name.replace(/ \d.*$/, '')} · {out ? 'OUT' : shown}
          </div>
          <div className="mt-0.5 flex justify-center gap-1">
            {shelf.discount && <span className="rounded bg-yellow px-1.5 text-[11px] font-extrabold text-ink">15% OFF</span>}
            {shelf.expiring > 0 && <span className="rounded bg-orange px-1.5 text-[11px] font-extrabold text-white">{shelf.expiring} expire today</span>}
          </div>
        </div>
      </Html>
    </group>
  );
}

interface Walker { target: number; start: number; missed: boolean; look: Look }
function Customers({ walkers, progress }: { walkers: Walker[]; progress: number }) {
  return <>{walkers.map((w, i) => <Customer key={i} w={w} progress={progress} />)}</>;
}
function Customer({ w, progress }: { w: Walker; progress: number }) {
  const ref = useRef<Group>(null);
  const person = useRef<PersonHandle>(null);
  useFrame(({ clock }: { clock: any }) => {
    if (!ref.current) return;
    const t = (progress - w.start) / 0.45; // each visit takes 45% of the day
    ref.current.visible = t > 0 && t < 1;
    if (!ref.current.visible) return;
    const [sx, sz] = POS[w.target];
    const shelf: [number, number] = [sx, sz + 0.95];
    const path: [number, number][] = [DOOR, shelf, shelf, COUNTER, DOOR];
    const seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    const f = t * (path.length - 1) - seg;
    const [ax, az] = path[seg], [bx, bz] = path[seg + 1];
    ref.current.position.set(ax + (bx - ax) * f, 0, az + (bz - az) * f);
    const moving = ax !== bx || az !== bz;
    if (moving) ref.current.rotation.y = Math.atan2(bx - ax, bz - az);
    else ref.current.rotation.y = Math.PI; // face the shelf while taking a product
    person.current?.pose(moving ? 'walk' : 'reach', clock.elapsedTime * 9 + w.start * 40);
  });
  return (
    <group ref={ref} visible={false}>
      <Person ref={person} look={w.look} />
      {w.missed && (
        // "!" above the head: the product this customer wanted was out of stock
        <group position={[0, 2.05, 0]}>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.035, 0.02, 0.2, 8]} /><meshStandardMaterial color="#D7372B" emissive="#D7372B" emissiveIntensity={0.8} /></mesh>
          <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#D7372B" emissive="#D7372B" emissiveIntensity={0.8} /></mesh>
        </group>
      )}
    </group>
  );
}

function Diyas() {
  const lights = useMemo(() => Array.from({ length: 22 }, (_, i) => -5.6 + i * 0.53), []);
  const g = useRef<Group>(null);
  useFrame(({ clock }: { clock: any }) => g.current?.children.forEach((c: any, i: number) => ((c as Mesh).scale.setScalar(0.85 + Math.sin(clock.elapsedTime * 4 + i) * 0.15))));
  return (
    <group ref={g}>
      {lights.map((x, i) => (
        <mesh key={i} position={[x, 3.05 - Math.sin((i / 21) * Math.PI * 4) * 0.12, -3.45]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color={i % 2 ? '#F5B82E' : '#E8772E'} emissive={i % 2 ? '#F5B82E' : '#E8772E'} emissiveIntensity={1.4} />
        </mesh>
      ))}
      <pointLight position={[0, 2.8, -2.6]} intensity={6} distance={9} color="#FFB347" />
    </group>
  );
}


export default function Store3D({ shelves, log, progress, festive }: { shelves: Record<string, Shelf>; log: DayLog | null; progress: number; festive: boolean }) {
  const walkers = useMemo<Walker[]>(() => {
    if (!log) return [];
    const list: Walker[] = [];
    ITEMS.forEach((it, idx) => {
      const visits = Math.min(4, Math.ceil((log.sold[it.id] + log.missed[it.id]) / 6));
      for (let v = 0; v < visits; v++) list.push({ target: idx, start: 0, missed: log.missed[it.id] > 0 && v === 0, look: lookFor(idx * 5 + v + log.day * 11) });
    });
    list.sort((a, b) => ((a.target * 7 + (a.missed ? 1 : 0)) % 5) - ((b.target * 7 + (b.missed ? 1 : 0)) % 5));
    list.forEach((w, i) => (w.start = (i / Math.max(1, list.length)) * 0.55));
    return list;
  }, [log]);

  return (
    <Canvas camera={{ position: [0, 13.5, 12.5], fov: 44 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={[festive ? '#2A1B10' : '#0A3D2C']} />
      <ambientLight intensity={festive ? 0.9 : 1.15} />
      <hemisphereLight args={['#FFF8E8', '#C9B48E', festive ? 0.5 : 0.8]} />
      <directionalLight position={[4, 9, 6]} intensity={1.4} />
      <directionalLight position={[-6, 5, 2]} intensity={0.4} color="#FFE6B0" />
      {/* floor, walls, counter, door */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}><planeGeometry args={[13, 9.4]} /><meshStandardMaterial color="#F1E6CF" /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-6 + i * 1.08 + 0.54, 0.002, 0.6]}><planeGeometry args={[0.02, 9.4]} /><meshStandardMaterial color="#E2D3B5" /></mesh>)}
      <mesh position={[0, 1.7, -3.55]}><boxGeometry args={[13, 3.4, 0.1]} /><meshStandardMaterial color="#FBF5E9" /></mesh>
      <mesh position={[-6.5, 1.7, 0.6]}><boxGeometry args={[0.1, 3.4, 9.4]} /><meshStandardMaterial color="#F5ECDA" /></mesh>
      <mesh position={[COUNTER[0], 0.5, COUNTER[1] - 0.6]}><boxGeometry args={[2.2, 1, 0.7]} /><meshStandardMaterial color="#0E6B47" /></mesh>
      <mesh position={[COUNTER[0] + 0.5, 1.12, COUNTER[1] - 0.6]}><boxGeometry args={[0.5, 0.25, 0.4]} /><meshStandardMaterial color="#1E1B16" /></mesh>
      <mesh position={[DOOR[0] - 0.3, 0.01, DOOR[1]]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 0.9]} /><meshStandardMaterial color="#D7372B" /></mesh>
      {ITEMS.map((it, i) => (
        <ShelfUnit key={it.id} it={it} x={POS[i][0]} z={POS[i][1]} shelf={shelves[it.id]} sold={log?.sold[it.id] ?? 0} progress={log ? progress : 0} festive={festive} />
      ))}
      {festive && <Diyas />}
      {/* the shopkeeper, behind the counter */}
      <group position={[COUNTER[0] - 0.35, 0, COUNTER[1] - 1.35]}><Person look={SHOPKEEPER} apron idle /></group>
      <Customers walkers={walkers} progress={log ? progress : -1} />
      <OrbitControls enablePan={false} minDistance={11} maxDistance={24} minPolarAngle={0.45} maxPolarAngle={1.1} minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} target={[0, 0.8, 0.4]} />
    </Canvas>
  );
}

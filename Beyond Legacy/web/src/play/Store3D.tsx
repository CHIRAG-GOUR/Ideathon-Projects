// The 3D kirana store for Shelf Rush, drawn from the live day (live.ts): shelves hold real product models and shrink
// as customers take them; customers walk the aisles, carry what they picked, queue and pay at the counter; the worker
// carries cartons from the stockroom. Click a shelf (or its number tag) to send the worker to restock it.
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh } from 'three';
import { CASHIER, COUNTER, DOOR, shelfPos, stepLive, STOCKROOM, type Customer, type LiveDay } from './live';
import { lookFor, Person, SHOPKEEPER, type Look, type PersonHandle } from './Person';
import { Carton, PaperBag, ProductModel } from './Products3D';
import { ITEMS, SHELF_CAP, expiringOn, units, type SimItem } from './sim';

const WORKER_LOOK: Look = { skin: '#8D5524', top: '#0E6B47', bottom: '#2C3E50', hair: '#151515', hairStyle: 'cap', outfit: 'shirt', accent: '#F5B82E', height: 1.02, basket: false };
const LEVELS = [0.15, 0.75, 1.35];

function ShelfUnit({ it, index, live, hint, onPick }: { it: SimItem; index: number; live: LiveDay; hint: boolean; onPick: (id: string) => void }) {
  const { x, z } = shelfPos(index);
  const s = live.items[it.id], cap = SHELF_CAP[it.id];
  const onShelf = units(s.shelf), back = units(s.back), exp = expiringOn(s.shelf, live.day);
  const perLevel = Math.ceil(cap / 3), gap = 2.0 / perLevel;
  const out = onShelf === 0;
  const arrow = useRef<Mesh>(null);
  useFrame(({ clock }: { clock: any }) => { if (arrow.current) arrow.current.position.y = 2.95 + Math.sin(clock.elapsedTime * 3) * 0.08; });
  return (
    <group position={[x, 0, z]}>
      <group
        onClick={(e) => { e.stopPropagation(); onPick(it.id); }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh position={[0, 1.05, -0.3]}><boxGeometry args={[2.3, 2.1, 0.06]} /><meshStandardMaterial color={hint ? '#13804F' : '#0E6B47'} /></mesh>
        {[-1.15, 1.15].map((sx) => <mesh key={sx} position={[sx, 1.05, 0]}><boxGeometry args={[0.06, 2.1, 0.66]} /><meshStandardMaterial color="#0A3D2C" /></mesh>)}
        {[0.12, 0.72, 1.32, 1.92].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[2.3, 0.05, 0.66]} /><meshStandardMaterial color="#C89B63" /></mesh>)}
        {/* price strip on each shelf edge */}
        {[0.12, 0.72, 1.32].map((y) => <mesh key={y} position={[0, y - 0.01, 0.335]}><boxGeometry args={[2.3, 0.06, 0.01]} /><meshStandardMaterial color={out ? '#D7372B' : '#F5B82E'} /></mesh>)}
      </group>
      {/* the products themselves: front-of-queue items first, those expiring today carry an orange date sticker */}
      {Array.from({ length: Math.min(onShelf, cap) }, (_, i) => {
        const level = Math.floor(i / perLevel), col = i % perLevel;
        return (
          <group key={i} position={[-1.0 + gap / 2 + col * gap, LEVELS[level], 0.04]}>
            <ProductModel id={it.id} expiring={i < exp} />
          </group>
        );
      })}
      {hint && <mesh ref={arrow} position={[0, 2.95, 0.2]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.16, 0.32, 16]} /><meshStandardMaterial color="#F5B82E" emissive="#F5B82E" emissiveIntensity={0.6} /></mesh>}
      <Html position={[0, 2.38, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-lg bg-white/95 px-2 py-0.5 text-[13px] font-extrabold text-ink shadow">{it.name.replace(/ \d.*$/, '')}{s.discount && <span className="ml-1 rounded bg-yellow px-1 text-[11px]">15% OFF</span>}</div>
      </Html>
      {/* the live count on the side of the unit; click to restock */}
      <Html position={[1.32, 1.15, 0.25]} center distanceFactor={9} zIndexRange={[20, 0]}>
        <button onClick={() => onPick(it.id)} title={`Restock ${it.name}`} className={`flex w-[62px] select-none flex-col items-center rounded-xl px-1.5 py-1 text-center shadow-lg ring-2 transition hover:scale-105 ${out ? 'bg-red text-white ring-white' : hint ? 'bg-yellow text-ink ring-white' : 'bg-white text-ink ring-green/40'}`}>
          <span className="font-display text-[24px] font-black leading-none tabular-nums">{onShelf}</span>
          <span className="text-[9.5px] font-bold leading-tight opacity-75">on shelf</span>
          <span className="mt-0.5 w-full border-t border-current/20 pt-0.5 text-[10.5px] font-extrabold leading-tight tabular-nums">+{back} back</span>
          {exp > 0 && <span className="mt-0.5 rounded bg-orange px-1 text-[9.5px] font-extrabold leading-tight text-white">{exp} exp. today</span>}
        </button>
      </Html>
    </group>
  );
}

function CustomerView({ c, live }: { c: Customer; live: LiveDay }) {
  const ref = useRef<Group>(null);
  const person = useRef<PersonHandle>(null);
  const look = useMemo(() => lookFor(c.look), [c.look]);
  const stride = useRef(0), last = useRef({ x: c.pos.x, z: c.pos.z });
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.visible = c.phase !== 'waiting' && c.phase !== 'gone';
    if (!g.visible) return;
    g.position.set(c.pos.x, 0, c.pos.z);
    // turn smoothly towards the heading
    let dh = c.heading - g.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.rotation.y += dh * 0.25;
    const moved = Math.hypot(c.pos.x - last.current.x, c.pos.z - last.current.z);
    last.current = { x: c.pos.x, z: c.pos.z };
    stride.current += moved * 5.5; // limbs swing with distance walked, so speed and stride always match
    const walking = moved > 0.0005;
    person.current?.pose(c.phase === 'picking' ? 'reach' : walking ? 'walk' : 'stand', c.phase === 'picking' ? live.time * 3 : stride.current);
  });
  const holding = c.paid ? <PaperBag /> : c.got > 0 && c.phase !== 'picking' ? <group scale={0.85}><ProductModel id={c.item} /></group> : null;
  const missed = c.got === 0 && c.phase === 'leaving';
  return (
    <group ref={ref} visible={false}>
      <Person ref={person} look={look} holding={holding} />
      {missed && (
        <group position={[0, 2.05, 0]}>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.035, 0.02, 0.2, 8]} /><meshStandardMaterial color="#D7372B" emissive="#D7372B" emissiveIntensity={0.8} /></mesh>
          <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#D7372B" emissive="#D7372B" emissiveIntensity={0.8} /></mesh>
        </group>
      )}
    </group>
  );
}

function WorkerView({ live }: { live: LiveDay }) {
  const ref = useRef<Group>(null);
  const person = useRef<PersonHandle>(null);
  const stride = useRef(0), last = useRef({ ...live.worker.pos });
  useFrame(({ clock }: { clock: any }) => {
    const w = live.worker, g = ref.current;
    if (!g) return;
    g.position.set(w.pos.x, 0, w.pos.z);
    let dh = w.heading - g.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.rotation.y += dh * 0.25;
    const moved = Math.hypot(w.pos.x - last.current.x, w.pos.z - last.current.z);
    last.current = { ...w.pos };
    stride.current += moved * 5;
    const mode = w.phase === 'toShelf' ? 'carry' : w.phase === 'stocking' ? 'reach' : moved > 0.0005 ? 'walk' : 'stand';
    person.current?.pose(mode, w.phase === 'stocking' ? clock.elapsedTime * 4 : stride.current);
  });
  return (
    <group ref={ref}>
      <Person ref={person} look={WORKER_LOOK} apron carrying={live.worker.phase === 'toShelf' ? <Carton /> : undefined} />
      <Html position={[0, 2.15, 0]} center distanceFactor={10} zIndexRange={[25, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full bg-green-dark px-2 py-0.5 text-[11px] font-extrabold text-yellow shadow">You · worker</div>
      </Html>
    </group>
  );
}

function CashierView({ live }: { live: LiveDay }) {
  const person = useRef<PersonHandle>(null);
  useFrame(({ clock }) => person.current?.pose(live.serving !== null ? 'scan' : 'stand', clock.elapsedTime * 5));
  const serving = live.serving !== null ? live.customers[live.serving] : null;
  return (
    <group>
      <group position={[CASHIER.x, 0, CASHIER.z]}><Person ref={person} look={SHOPKEEPER} apron /></group>
      {/* the item being scanned sits on the counter */}
      {serving && <group position={[COUNTER.x + 0.35, 1.0, COUNTER.z]}><ProductModel id={serving.item} /></group>}
    </group>
  );
}

function Popups({ live }: { live: LiveDay }) {
  const recent = live.events.filter((e) => live.time - e.t < 1.8);
  return <>{recent.map((e) => (
    <Html key={`${e.t}-${e.text}`} position={[e.at.x, e.kind === 'pay' ? 1.9 : 2.4, e.at.z]} center distanceFactor={10} zIndexRange={[30, 0]}>
      <div className={`pointer-events-none animate-[floatUp_1.8s_ease-out_forwards] select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-black shadow ${e.kind === 'pay' ? 'bg-green text-white' : e.kind === 'restock' ? 'bg-yellow text-ink' : 'bg-red text-white'}`}>{e.text}</div>
    </Html>
  ))}</>;
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

/** Steps the simulation in fixed 50 ms slices, so speed changes never change the outcome. */
function Driver({ live, running, speed, onEnd }: { live: LiveDay; running: boolean; speed: number; onEnd: () => void }) {
  const acc = useRef(0), ended = useRef(false);
  useEffect(() => { ended.current = false; acc.current = 0; }, [live]);
  useFrame((_, dt) => {
    if (!running || live.ended) {
      if (running && live.ended && !ended.current) { ended.current = true; onEnd(); }
      return;
    }
    acc.current += Math.min(dt, 0.1) * speed;
    while (acc.current >= 0.05 && !live.ended) { stepLive(live, 0.05); acc.current -= 0.05; }
  });
  return null;
}

export default function Store3D({ live, running, speed, festive, hint, onPick, onEnd }: { live: LiveDay; running: boolean; speed: number; festive: boolean; hint: string | null; onPick: (id: string) => void; onEnd: () => void }) {
  // labels, counts and held items refresh five times a second; movement is updated every frame
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);
  return (
    <Canvas camera={{ position: [0, 13.5, 12.5], fov: 44 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <Driver live={live} running={running} speed={speed} onEnd={onEnd} />
      <color attach="background" args={[festive ? '#2A1B10' : '#0A3D2C']} />
      <ambientLight intensity={festive ? 0.9 : 1.15} />
      <hemisphereLight args={['#FFF8E8', '#C9B48E', festive ? 0.5 : 0.8]} />
      <directionalLight position={[4, 9, 6]} intensity={1.4} />
      <directionalLight position={[-6, 5, 2]} intensity={0.4} color="#FFE6B0" />
      {/* floor, walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.85]}><planeGeometry args={[13, 9.9]} /><meshStandardMaterial color="#F1E6CF" /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-6 + i * 1.08 + 0.54, 0.002, 0.85]}><planeGeometry args={[0.02, 9.9]} /><meshStandardMaterial color="#E2D3B5" /></mesh>)}
      <mesh position={[0, 1.7, -3.55]}><boxGeometry args={[13, 3.4, 0.1]} /><meshStandardMaterial color="#FBF5E9" /></mesh>
      <mesh position={[-6.55, 1.7, 0.85]}><boxGeometry args={[0.1, 3.4, 9.9]} /><meshStandardMaterial color="#F5ECDA" /></mesh>
      {/* stockroom doorway on the left wall, cartons inside */}
      <mesh position={[-6.49, 1.05, STOCKROOM.z]}><boxGeometry args={[0.04, 2.1, 1.2]} /><meshStandardMaterial color="#3A2A1E" /></mesh>
      <group position={[-6.4, 0.16, STOCKROOM.z - 0.3]}><Carton /></group>
      <group position={[-6.4, 0.46, STOCKROOM.z - 0.3]}><Carton /></group>
      <Html position={[-6.45, 2.35, STOCKROOM.z]} center distanceFactor={9} zIndexRange={[20, 0]}>
        <div className="pointer-events-none select-none rounded bg-ink px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-yellow">STOCKROOM</div>
      </Html>
      {/* entrance */}
      <mesh position={[DOOR.x + 0.1, 0.01, DOOR.z - 0.15]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 0.8]} /><meshStandardMaterial color="#D7372B" /></mesh>
      {/* checkout counter: cashier behind it, register and scanner on top */}
      <mesh position={[COUNTER.x, 0.48, COUNTER.z]}><boxGeometry args={[COUNTER.w, 0.96, COUNTER.d]} /><meshStandardMaterial color="#0E6B47" /></mesh>
      <mesh position={[COUNTER.x, 0.97, COUNTER.z]}><boxGeometry args={[COUNTER.w + 0.06, 0.04, COUNTER.d + 0.06]} /><meshStandardMaterial color="#C89B63" /></mesh>
      <mesh position={[COUNTER.x - 0.6, 1.14, COUNTER.z - 0.05]}><boxGeometry args={[0.5, 0.3, 0.38]} /><meshStandardMaterial color="#1E1B16" /></mesh>
      <mesh position={[COUNTER.x - 0.6, 1.36, COUNTER.z - 0.12]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.4, 0.22, 0.03]} /><meshStandardMaterial color="#2F6FB0" emissive="#2F6FB0" emissiveIntensity={0.3} /></mesh>
      <mesh position={[COUNTER.x + 0.35, 0.995, COUNTER.z]}><boxGeometry args={[0.36, 0.01, 0.26]} /><meshStandardMaterial color="#D7372B" emissive="#D7372B" emissiveIntensity={live.serving !== null ? 0.8 : 0.1} /></mesh>
      {ITEMS.map((it, i) => <ShelfUnit key={it.id} it={it} index={i} live={live} hint={hint === it.id} onPick={onPick} />)}
      {festive && <Diyas />}
      <CashierView live={live} />
      <WorkerView live={live} />
      {live.customers.map((c) => <CustomerView key={`${live.day}-${c.id}`} c={c} live={live} />)}
      <Popups live={live} />
      <OrbitControls enablePan={false} minDistance={9} maxDistance={24} minPolarAngle={0.45} maxPolarAngle={1.15} minAzimuthAngle={-0.8} maxAzimuthAngle={0.8} target={[0, 0.8, 0.9]} />
    </Canvas>
  );
}

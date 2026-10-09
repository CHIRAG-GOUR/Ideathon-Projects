'use client';

import React, { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ZONES, ZONE_ORDER, ZoneId } from '@/lib/products';
import type { StockItem } from '@/lib/store';
import { useBoxLabelTexture, useFloorLabelTexture, useSignTexture } from './textures';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const RACK_X: Record<ZoneId, number> = { SELL_FIRST: -4.2, SELL_SOON: 0, FRESH: 4.2 };
const RACK_Z = -3.5;
const PAD_Z = -2.05;
const PLANKS = [0.18, 0.95, 1.72];
const BOX = 0.55;
const BOUNDS = { minX: -7.2, maxX: 7.2, minZ: -2.35, maxZ: 5.4 };
const SPAWN = new THREE.Vector3(0, 0, 1.6);

/** Where each product waits in today's delivery before it is organised. */
const DELIVERY_SPOTS: Record<string, [number, number, number]> = {
  milk: [-5.2, 2.4, 0.3],
  bread: [-2.3, 4.2, -0.2],
  biscuits: [2.2, 4.3, 0.4],
  juice: [5.3, 2.6, -0.3],
  paneer: [-1.6, 1.3, 0.2],
  rice: [2.4, 1.1, -0.4],
};

const SLOTS: [number, number][] = [
  [-0.72, PLANKS[1]],
  [0, PLANKS[1]],
  [0.72, PLANKS[1]],
  [-0.72, PLANKS[2]],
  [0, PLANKS[2]],
  [0.72, PLANKS[2]],
];

export type Nearby = { kind: 'box'; id: string } | { kind: 'pad'; zone: ZoneId } | null;

export interface ControlRefs {
  /** -1..1 joystick/keyboard input in screen space (x = right, z = down). */
  input: MutableRefObject<{ x: number; z: number }>;
  /** Set to true by the HUD / E key; consumed by the controller. */
  action: MutableRefObject<boolean>;
}

interface SceneProps {
  items: StockItem[];
  carryingId: string | null;
  scanningId: string | null;
  lastPlaced: { id: string; zone: ZoneId; at: number } | null;
  controls: ControlRefs;
  onNearbyChange: (n: Nearby) => void;
  onScan: (id: string) => void;
  onPlace: (zone: ZoneId) => void;
}

type Pending = { type: 'scan'; id: string } | { type: 'place'; zone: ZoneId } | null;

interface SharedRefs {
  player: MutableRefObject<THREE.Group | null>;
  moveTarget: MutableRefObject<THREE.Vector3 | null>;
  pending: MutableRefObject<Pending>;
  moving: MutableRefObject<boolean>;
}

function shelfSlot(items: StockItem[], id: string, zone: ZoneId): THREE.Vector3 {
  const onShelf = items.filter((i) => i.progress.placedCorrectly && i.progress.zone === zone);
  const idx = Math.max(0, onShelf.findIndex((i) => i.id === id));
  const [dx, y] = SLOTS[idx % SLOTS.length];
  return new THREE.Vector3(RACK_X[zone] + dx, y + BOX / 2 + 0.03, RACK_Z + 0.05);
}

/* ------------------------------------------------------------------ */
/* Static room                                                         */
/* ------------------------------------------------------------------ */

function useTileTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F2E4CA';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#EBDBBD';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillRect(128, 128, 128, 128);
    ctx.strokeStyle = '#E2CFA9';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Room({ onFloorClick }: { onFloorClick: (p: THREE.Vector3) => void }) {
  const tiles = useTileTexture();
  const sign = useSignTexture('VISIONARY X', 'Scan · Check expiry · Right shelf', '#2F8F55');
  const delivery = useFloorLabelTexture('NEW DELIVERY', '#A97C47');

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onFloorClick(e.point.clone());
        }}
      >
        <planeGeometry args={[18, 13]} />
        <meshStandardMaterial map={tiles} roughness={0.9} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, 2.4, -4.4]} receiveShadow>
        <boxGeometry args={[18, 4.8, 0.2]} />
        <meshStandardMaterial color="#FFF4E0" roughness={1} />
      </mesh>
      <mesh position={[0, 0.35, -4.28]}>
        <boxGeometry args={[18, 0.7, 0.05]} />
        <meshStandardMaterial color="#E6D0B0" roughness={1} />
      </mesh>
      <mesh position={[0, 3.55, -4.28]}>
        <planeGeometry args={[5.2, 1.3]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      {[-6.2, 6.2].map((x) => (
        <mesh key={x} position={[x, 3.3, -4.28]}>
          <planeGeometry args={[2.2, 1.3]} />
          <meshStandardMaterial color="#C4E0F4" emissive="#E2F0FA" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* side walls (low) */}
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.5]} receiveShadow>
          <boxGeometry args={[0.2, 2.4, 10]} />
          <meshStandardMaterial color="#FBEFD9" roughness={1} />
        </mesh>
      ))}
      {/* delivery area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 3.3]}>
        <planeGeometry args={[4.2, 2.1]} />
        <meshBasicMaterial map={delivery} transparent toneMapped={false} />
      </mesh>
      {/* decorative stacks */}
      {[
        [-7.4, -1.2],
        [-7.4, 4.3],
        [7.4, -0.8],
        [7.4, 4.4],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <PlainBox position={[0, BOX / 2, 0]} />
          <PlainBox position={[0.05, BOX * 1.5, 0.02]} rotation={0.2} />
          <PlainBox position={[0.62, BOX / 2, 0.1]} rotation={-0.15} />
        </group>
      ))}
    </group>
  );
}

function PlainBox({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[BOX, BOX, BOX]} radius={0.03} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color="#D6B587" roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, BOX / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, BOX]} />
        <meshStandardMaterial color="#F2E7D6" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Shelves                                                             */
/* ------------------------------------------------------------------ */

function Rack({ zone, highlight, onClick }: { zone: ZoneId; highlight: boolean; onClick: () => void }) {
  const z = ZONES[zone];
  const sign = useSignTexture(z.label.toUpperCase(), z.rule, z.color);
  const floor = useFloorLabelTexture(z.label.toUpperCase(), z.color);
  const padRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const m = padRef.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = highlight ? 0.75 + Math.sin(clock.elapsedTime * 5) * 0.25 : 0.9;
  });

  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group>
      <group position={[RACK_X[zone], 0, RACK_Z]} onClick={handle} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        {[-1.15, 1.15].map((x) =>
          [-0.3, 0.3].map((zz) => (
            <mesh key={`${x}${zz}`} position={[x, 1.1, zz]} castShadow>
              <boxGeometry args={[0.07, 2.2, 0.07]} />
              <meshStandardMaterial color="#8A6237" roughness={0.8} />
            </mesh>
          ))
        )}
        {PLANKS.map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.07, 0.72]} />
            <meshStandardMaterial color="#D6B587" roughness={0.7} />
          </mesh>
        ))}
        {PLANKS.map((y) => (
          <mesh key={`s${y}`} position={[0, y, 0.37]}>
            <boxGeometry args={[2.4, 0.07, 0.02]} />
            <meshStandardMaterial color={z.color} />
          </mesh>
        ))}
        <mesh position={[0, 2.5, 0.05]}>
          <planeGeometry args={[2.5, 0.62]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={padRef} rotation={[-Math.PI / 2, 0, 0]} position={[RACK_X[zone], 0.014, PAD_Z]} onClick={handle}>
        <planeGeometry args={[2.6, 1.3]} />
        <meshBasicMaterial map={floor} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Product boxes                                                       */
/* ------------------------------------------------------------------ */

function ProductBox({
  item,
  items,
  carried,
  scanning,
  shared,
  onClick,
}: {
  item: StockItem;
  items: StockItem[];
  carried: boolean;
  scanning: boolean;
  shared: SharedRefs;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const zone = item.progress.placedCorrectly ? item.progress.zone : null;
  const strip = item.progress.placedCorrectly ? ZONES[item.recommendedZone].color : item.progress.scanned ? '#5DB277' : null;
  const label = useBoxLabelTexture(item.id, item.name, item.barcode, strip);
  const spot = DELIVERY_SPOTS[item.id];
  const target = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    let rotY = spot[2];
    if (zone) {
      target.copy(shelfSlot(items, item.id, zone));
      rotY = 0;
    } else if (carried && shared.player.current) {
      const p = shared.player.current;
      tmp.set(0, 0, 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation.y);
      target.set(p.position.x + tmp.x, 1.02 + (shared.moving.current ? Math.sin(clock.elapsedTime * 11) * 0.025 : 0), p.position.z + tmp.z);
      rotY = p.rotation.y;
    } else {
      target.set(spot[0], BOX / 2, spot[1]);
    }
    const k = 1 - Math.exp(-delta * 9);
    g.position.lerp(target, k);
    g.rotation.y += (rotY - g.rotation.y) * k;
    const pulse = scanning ? 1 + Math.sin(clock.elapsedTime * 22) * 0.04 : 1;
    g.scale.setScalar(pulse);
  });

  return (
    <group
      ref={ref}
      position={[spot[0], BOX / 2, spot[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <RoundedBox args={[BOX, BOX, BOX]} radius={0.03} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color={scanning ? '#E6C697' : '#D6B587'} roughness={0.85} emissive={scanning ? '#5DB277' : '#000000'} emissiveIntensity={scanning ? 0.25 : 0} />
      </RoundedBox>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
        <mesh key={r} rotation={[0, r, 0]} position={[Math.sin(r) * (BOX / 2 + 0.003), 0, Math.cos(r) * (BOX / 2 + 0.003)]}>
          <planeGeometry args={[0.42, 0.42]} />
          <meshStandardMaterial map={label} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, BOX / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, BOX]} />
        <meshStandardMaterial color="#F2E7D6" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Shopkeeper                                                          */
/* ------------------------------------------------------------------ */

const Shopkeeper = React.forwardRef<THREE.Group, { carrying: boolean; moving: MutableRefObject<boolean> }>(function Shopkeeper(
  { carrying, moving },
  ref
) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const walk = moving.current ? 1 : 0;
    if (body.current) body.current.position.y = walk * Math.abs(Math.sin(t * 11)) * 0.05;
    const swing = Math.sin(t * 11) * 0.5 * walk;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    const armTarget = carrying ? -1.25 : 0;
    if (armL.current) armL.current.rotation.x += ((carrying ? armTarget : -swing * 0.8) - armL.current.rotation.x) * 0.25;
    if (armR.current) armR.current.rotation.x += ((carrying ? armTarget : swing * 0.8) - armR.current.rotation.x) * 0.25;
  });

  return (
    <group ref={ref} position={SPAWN.toArray()}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#6B4B2B" transparent opacity={0.16} />
      </mesh>
      <group ref={body}>
        <mesh ref={legL} position={[-0.11, 0.3, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.36, 4, 8]} />
          <meshStandardMaterial color="#6B5444" />
        </mesh>
        <mesh ref={legR} position={[0.11, 0.3, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.36, 4, 8]} />
          <meshStandardMaterial color="#6B5444" />
        </mesh>
        <mesh position={[0, 0.88, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.3, 0.78, 16]} />
          <meshStandardMaterial color="#F6EAD3" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.84, 0.215]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.36, 0.64, 0.05]} />
          <meshStandardMaterial color="#2F8F55" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.33, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.12, 10]} />
          <meshStandardMaterial color="#9C6240" />
        </mesh>
        <mesh position={[0, 1.52, 0]} castShadow>
          <sphereGeometry args={[0.22, 24, 20]} />
          <meshStandardMaterial color="#B9784F" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.56, -0.01]}>
          <sphereGeometry args={[0.228, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <meshStandardMaterial color="#2E2520" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.47, 0.2]}>
          <boxGeometry args={[0.13, 0.03, 0.04]} />
          <meshStandardMaterial color="#2E2520" />
        </mesh>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} position={[x, 1.55, 0.2]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#2E2520" />
          </mesh>
        ))}
        {[
          [armL, -0.32],
          [armR, 0.32],
        ].map(([r, x]) => (
          <group key={x as number} ref={r as React.RefObject<THREE.Group>} position={[x as number, 1.18, 0]}>
            <mesh position={[0, -0.26, 0]} castShadow>
              <capsuleGeometry args={[0.075, 0.38, 4, 8]} />
              <meshStandardMaterial color="#F6EAD3" />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.075, 10, 10]} />
              <meshStandardMaterial color="#B9784F" />
            </mesh>
          </group>
        ))}
        {/* handheld scanner on the right hip */}
        {!carrying && (
          <group position={[0.42, 0.72, 0.08]} rotation={[0.3, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.1, 0.2, 0.06]} />
              <meshStandardMaterial color="#237645" />
            </mesh>
            <mesh position={[0, 0.12, 0.05]}>
              <boxGeometry args={[0.13, 0.08, 0.16]} />
              <meshStandardMaterial color="#FFFDF8" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function ScanBeam({ from, to }: { from: MutableRefObject<THREE.Group | null>; to: THREE.Vector3 | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    if (!to || !from.current) {
      m.visible = false;
      return;
    }
    m.visible = true;
    a.copy(from.current.position).add(new THREE.Vector3(0, 1.0, 0));
    const mid = a.clone().add(to).multiplyScalar(0.5);
    const len = a.distanceTo(to);
    m.position.copy(mid);
    m.scale.set(1, len, 1);
    m.lookAt(to);
    m.rotateX(Math.PI / 2);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(clock.elapsedTime * 30) * 0.3;
  });
  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[0.02, 0.06, 1, 8]} />
      <meshBasicMaterial color="#5DB277" transparent opacity={0.7} toneMapped={false} />
    </mesh>
  );
}

function Sparkles({ event }: { event: { zone: ZoneId; at: number } | null }) {
  const group = useRef<THREE.Group>(null);
  const start = useRef(0);
  const colors = ['#2F8F55', '#F2A516', '#E4572E', '#5DB277', '#95C8EA'];
  const dirs = useMemo(
    () => Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.cos((i / 14) * Math.PI * 2), 0.8 + (i % 3) * 0.35, Math.sin((i / 14) * Math.PI * 2) * 0.4)),
    []
  );
  useEffect(() => {
    if (event) start.current = -1;
  }, [event]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !event) return;
    if (start.current === -1) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    g.visible = t < 1;
    g.position.set(RACK_X[event.zone], 1.4, RACK_Z + 0.5);
    g.children.forEach((c, i) => {
      c.position.copy(dirs[i]).multiplyScalar(t * 1.6);
      c.position.y -= t * t * 1.2;
      c.rotation.set(t * 6, t * 4, 0);
      c.scale.setScalar(Math.max(0.001, 1 - t));
    });
  });
  return (
    <group ref={group} visible={false}>
      {dirs.map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color={colors[i % colors.length]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Controller: movement, camera, interaction                           */
/* ------------------------------------------------------------------ */

function Controller({
  items,
  carryingId,
  scanningId,
  controls,
  shared,
  onNearbyChange,
  onScan,
  onPlace,
}: Pick<SceneProps, 'items' | 'carryingId' | 'scanningId' | 'controls' | 'onNearbyChange' | 'onScan' | 'onPlace'> & { shared: SharedRefs }) {
  const { camera, size } = useThree();
  const nearbyRef = useRef<Nearby>(null);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lookSmoothed = useRef(new THREE.Vector3(0, 0.8, 0));
  const latest = useRef({ items, carryingId, scanningId, onScan, onPlace });
  latest.current = { items, carryingId, scanningId, onScan, onPlace };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const p = shared.player.current;
    if (!p) return;
    const { items: its, carryingId: carrying, scanningId: scanning } = latest.current;

    // 1. Movement: keyboard / joystick first, otherwise walk to the clicked point.
    const inp = controls.input.current;
    const dir = new THREE.Vector3(inp.x, 0, inp.z);
    if (dir.lengthSq() > 0.01) {
      shared.moveTarget.current = null;
      shared.pending.current = null;
    } else if (shared.moveTarget.current) {
      dir.subVectors(shared.moveTarget.current, p.position).setY(0);
      if (dir.length() < 0.12) {
        shared.moveTarget.current = null;
        dir.set(0, 0, 0);
        const pend = shared.pending.current;
        shared.pending.current = null;
        if (pend?.type === 'scan' && !carrying && !scanning) latest.current.onScan(pend.id);
        if (pend?.type === 'place' && carrying) latest.current.onPlace(pend.zone);
      }
    }
    const moving = dir.lengthSq() > 0.0001 && !scanning;
    shared.moving.current = moving;
    if (moving) {
      const speed = 3.4;
      const len = dir.length();
      const stepLen = shared.moveTarget.current ? Math.min(speed * delta, len) : speed * delta * Math.min(1, len);
      p.position.add(dir.clone().normalize().multiplyScalar(stepLen));
      p.position.x = THREE.MathUtils.clamp(p.position.x, BOUNDS.minX, BOUNDS.maxX);
      p.position.z = THREE.MathUtils.clamp(p.position.z, BOUNDS.minZ, BOUNDS.maxZ);
      const targetRot = Math.atan2(dir.x, dir.z);
      let diff = targetRot - p.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.rotation.y += diff * Math.min(1, delta * 12);
    }

    // 2. What can the shopkeeper interact with right now?
    let next: Nearby = null;
    if (carrying) {
      for (const zone of ZONE_ORDER) {
        if (Math.abs(p.position.x - RACK_X[zone]) < 1.7 && p.position.z < PAD_Z + 1.5) next = { kind: 'pad', zone };
      }
    } else {
      let best = 1.45;
      for (const it of its) {
        if (it.progress.placedCorrectly) continue;
        const s = DELIVERY_SPOTS[it.id];
        const d = Math.hypot(s[0] - p.position.x, s[1] - p.position.z);
        if (d < best) {
          best = d;
          next = { kind: 'box', id: it.id };
        }
      }
    }
    const prev = nearbyRef.current;
    const same =
      prev === next ||
      (prev && next && prev.kind === next.kind && (prev.kind === 'box' ? prev.id === (next as { id: string }).id : prev.zone === (next as { zone: ZoneId }).zone));
    if (!same) {
      nearbyRef.current = next;
      onNearbyChange(next);
    }

    // 3. Action button / E key
    if (controls.action.current) {
      controls.action.current = false;
      const n = nearbyRef.current;
      if (n?.kind === 'box' && !carrying && !scanning) {
        const s = DELIVERY_SPOTS[n.id];
        p.rotation.y = Math.atan2(s[0] - p.position.x, s[1] - p.position.z);
        latest.current.onScan(n.id);
      } else if (n?.kind === 'pad' && carrying) {
        latest.current.onPlace(n.zone);
      }
    }

    // 4. Follow camera (pulls back on tall/narrow screens).
    const portrait = size.width / size.height < 1;
    const close = carrying || scanning;
    camTarget.set(p.position.x * 0.85, portrait ? 9.5 : close ? 5.6 : 6.4, p.position.z + (portrait ? 9.8 : close ? 6.2 : 7.2));
    camera.position.lerp(camTarget, 1 - Math.exp(-delta * 3));
    look.set(p.position.x * 0.9, 0.7, p.position.z - 1.6);
    lookSmoothed.current.lerp(look, 1 - Math.exp(-delta * 4));
    camera.lookAt(lookSmoothed.current);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene(props: SceneProps) {
  const { items, carryingId, scanningId, lastPlaced, controls, onNearbyChange, onScan, onPlace } = props;
  const shared: SharedRefs = {
    player: useRef<THREE.Group | null>(null),
    moveTarget: useRef<THREE.Vector3 | null>(null),
    pending: useRef<Pending>(null),
    moving: useRef(false),
  };

  const walkTo = (x: number, z: number, pending: Pending) => {
    shared.moveTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(z, BOUNDS.minZ, BOUNDS.maxZ)
    );
    shared.pending.current = pending;
  };

  const clickBox = (id: string) => {
    if (carryingId || scanningId) return;
    const p = shared.player.current;
    const s = DELIVERY_SPOTS[id];
    if (!p) return;
    const d = Math.hypot(s[0] - p.position.x, s[1] - p.position.z);
    if (d < 1.45) {
      p.rotation.y = Math.atan2(s[0] - p.position.x, s[1] - p.position.z);
      onScan(id);
      return;
    }
    const away = new THREE.Vector3(p.position.x - s[0], 0, p.position.z - s[1]).normalize().multiplyScalar(0.95);
    walkTo(s[0] + away.x, s[1] + away.z, { type: 'scan', id });
  };

  const clickZone = (zone: ZoneId) => {
    if (!carryingId) return;
    walkTo(RACK_X[zone], PAD_Z + 0.2, { type: 'place', zone });
  };

  const scanTarget = scanningId ? new THREE.Vector3(DELIVERY_SPOTS[scanningId][0], BOX / 2, DELIVERY_SPOTS[scanningId][1]) : null;

  return (
    <>
      <color attach="background" args={['#FFF6E6']} />
      <fog attach="fog" args={['#FFF6E6', 16, 30]} />
      <hemisphereLight args={['#FFFBF0', '#E6D0B0', 1.1]} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={1.5}
        color="#FFF3DC"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <Room onFloorClick={(pt) => walkTo(pt.x, pt.z, null)} />
      {ZONE_ORDER.map((zone) => (
        <Rack key={zone} zone={zone} highlight={Boolean(carryingId)} onClick={() => clickZone(zone)} />
      ))}
      {items.map((it) => (
        <ProductBox
          key={it.id}
          item={it}
          items={items}
          carried={carryingId === it.id}
          scanning={scanningId === it.id}
          shared={shared}
          onClick={() => clickBox(it.id)}
        />
      ))}
      <Shopkeeper ref={shared.player} carrying={Boolean(carryingId)} moving={shared.moving} />
      <ScanBeam from={shared.player} to={scanTarget} />
      <Sparkles event={lastPlaced} />
      <Controller
        items={items}
        carryingId={carryingId}
        scanningId={scanningId}
        controls={controls}
        shared={shared}
        onNearbyChange={onNearbyChange}
        onScan={onScan}
        onPlace={onPlace}
      />
    </>
  );
}

export default function WarehouseScene3D(props: SceneProps) {
  useEffect(() => () => void (document.body.style.cursor = ''), []);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 6.4, 8.8], fov: 45, near: 0.1, far: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      className="!touch-none"
    >
      <Scene {...props} />
    </Canvas>
  );
}

'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PRODUCTS, ZONES, ZONE_ORDER, ZoneId, formatExpiry, getRecommendedZone, ProductArtId } from '@/lib/products';
import { useBoxLabelTexture, useSignTexture } from '@/components/warehouse/textures';

const RACK_X: Record<ZoneId, number> = { SELL_FIRST: -2.3, SELL_SOON: 0, FRESH: 2.3 };
export const PREVIEW_ITEMS: ProductArtId[] = ['milk', 'bread', 'rice'];
const START: Record<string, [number, number]> = { milk: [-1.1, 1.6], bread: [0, 1.9], rice: [1.1, 1.6] };

function MiniRack({ zone }: { zone: ZoneId }) {
  const z = ZONES[zone];
  const sign = useSignTexture(z.label.toUpperCase(), '', z.color);
  return (
    <group position={[RACK_X[zone], 0, -0.6]}>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]}>
          <boxGeometry args={[0.07, 1.8, 0.6]} />
          <meshStandardMaterial color="#A97C47" />
        </mesh>
      ))}
      {[0.12, 0.8].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.95, 0.07, 0.62]} />
            <meshStandardMaterial color="#D6B587" />
          </mesh>
          <mesh position={[0, y, 0.32]}>
            <boxGeometry args={[1.95, 0.07, 0.02]} />
            <meshStandardMaterial color={z.color} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.95, 0.05]}>
        <planeGeometry args={[1.9, 0.48]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function MiniBox({ id, placed, selected, onClick }: { id: ProductArtId; placed: boolean; selected: boolean; onClick: () => void }) {
  const product = PRODUCTS.find((p) => p.id === id)!;
  const zone = getRecommendedZone(product);
  const label = useBoxLabelTexture(id, product.name, product.barcode, placed ? ZONES[zone].color : null);
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    if (placed) target.set(RACK_X[zone], 0.8 + 0.25, -0.55);
    else target.set(START[id][0], 0.25 + (selected ? 0.25 + Math.sin(clock.elapsedTime * 4) * 0.04 : 0), START[id][1]);
    g.position.lerp(target, 1 - Math.exp(-delta * 5));
  });

  return (
    <group
      ref={ref}
      position={[START[id][0], 0.25, START[id][1]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.03} smoothness={2}>
        <meshStandardMaterial color={selected ? '#E6C697' : '#D6B587'} />
      </RoundedBox>
      <mesh position={[0, 0, 0.253]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial map={label} />
      </mesh>
      {selected && !placed && (
        <Html position={[0, 0.62, 0]} center distanceFactor={6} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-center shadow-lift ring-1 ring-cream-300">
            <p className="font-display text-lg font-semibold leading-none text-ink">{product.name}</p>
            <p className="mt-1 text-xs font-extrabold" style={{ color: ZONES[zone].ink }}>
              {formatExpiry(product.daysUntilExpiry)}
            </p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider" style={{ color: ZONES[zone].ink }}>
              → {ZONES[zone].label}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function WarehousePreview3D({ placed, selected, onSelect }: { placed: string[]; selected: string | null; onSelect: (id: ProductArtId) => void }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3.1, 6.6], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 0.8, 0.2)}>
      <color attach="background" args={['#FFF6E6']} />
      <hemisphereLight args={['#FFFBF0', '#E6D0B0', 1.2]} />
      <directionalLight position={[3, 6, 4]} intensity={1.3} color="#FFF3DC" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#F2E4CA" />
      </mesh>
      <mesh position={[0, 2, -1.2]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color="#FFF4E0" />
      </mesh>
      {ZONE_ORDER.map((z) => (
        <MiniRack key={z} zone={z} />
      ))}
      <mesh position={[0, 0.02, 1.75]}>
        <boxGeometry args={[3.4, 0.04, 1]} />
        <meshStandardMaterial color="#C4985F" />
      </mesh>
      {PREVIEW_ITEMS.map((id) => (
        <MiniBox key={id} id={id} placed={placed.includes(id)} selected={selected === id} onClick={() => onSelect(id)} />
      ))}
    </Canvas>
  );
}

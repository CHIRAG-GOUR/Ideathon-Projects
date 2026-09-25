'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGroceryStore } from '@/lib/store';
import { ShelfZone, DemoProduct } from '@/lib/products';
import { playScanBeep, playSuccessChime, playWarningBuzz } from '@/lib/sound';

interface Shelf3DConfig {
  id: ShelfZone;
  name: string;
  sub: string;
  color: string;
  glow: string;
  position: [number, number, number];
}

const SHELVES_3D: Shelf3DConfig[] = [
  {
    id: 'SELL_FIRST',
    name: '🔴 SELL FIRST',
    sub: 'Expires in ≤2 Days',
    color: '#E63946',
    glow: '#FCA5A5',
    position: [-2.8, 0, 0],
  },
  {
    id: 'SELL_SOON',
    name: '🟡 SELL SOON',
    sub: 'Expires in 3-7 Days',
    color: '#F59E0B',
    glow: '#FDE68A',
    position: [0, 0, 0],
  },
  {
    id: 'FRESH',
    name: '🟢 FRESH STORAGE',
    sub: 'Expires in >7 Days',
    color: '#2D6A4F',
    glow: '#A7F3D0',
    position: [2.8, 0, 0],
  },
];

// Single 3D Shelf Rack Component
function ShelfRack3D({
  shelf,
  isTarget,
  onSelectShelf,
}: {
  shelf: Shelf3DConfig;
  isTarget: boolean;
  onSelectShelf: () => void;
}) {
  return (
    <group position={shelf.position} onClick={(e) => { e.stopPropagation(); onSelectShelf(); }}>
      {/* 3D Rack Uprights */}
      {[-1.0, 1.0].map((x, idx) => (
        <group key={idx} position={[x, 1.2, 0]}>
          <mesh castShadow position={[-0.35, 0, 0]}>
            <boxGeometry args={[0.06, 2.4, 0.06]} />
            <meshStandardMaterial color="#8C6D46" roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0.35, 0, 0]}>
            <boxGeometry args={[0.06, 2.4, 0.06]} />
            <meshStandardMaterial color="#8C6D46" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Wooden Shelves Tiers */}
      {[0.4, 1.2, 2.0].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.06, 0.8]} />
          <meshStandardMaterial color="#D8C79D" roughness={0.5} />
        </mesh>
      ))}

      {/* Illuminated Header Sign Board */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[2.2, 0.35, 0.08]} />
        <meshStandardMaterial color={shelf.color} />
      </mesh>

      <Text
        position={[0, 2.35, 0.05]}
        fontSize={0.15}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {shelf.name}
      </Text>

      {/* Floor Zone Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.2]} receiveShadow>
        <planeGeometry args={[2.4, 1.8]} />
        <meshStandardMaterial
          color={shelf.color}
          opacity={isTarget ? 0.35 : 0.15}
          transparent
        />
      </mesh>
    </group>
  );
}

// 3D Product Box Model
function ProductBox3D({
  product,
  isSelected,
  onSelect,
}: {
  product: DemoProduct;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);

  // Compute position based on currentZone
  let targetX = 0;
  let targetY = 0.35;
  let targetZ = 1.8;

  if (product.currentZone === 'SELL_FIRST') {
    targetX = -2.8 + (product.id === 'prod-1' ? -0.4 : 0.4);
    targetY = 0.65;
    targetZ = 0;
  } else if (product.currentZone === 'SELL_SOON') {
    targetX = 0;
    targetY = 0.65;
    targetZ = 0;
  } else if (product.currentZone === 'FRESH') {
    targetX = 2.8 + (product.id === 'prod-3' ? -0.5 : product.id === 'prod-4' ? 0 : 0.5);
    targetY = 0.65;
    targetZ = 0;
  } else {
    // Unassigned Intake Pallet in Foreground
    const idx = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6'].indexOf(product.id);
    targetX = -2.0 + idx * 0.8;
    targetY = 0.35;
    targetZ = 2.2;
  }

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 8);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 8);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, delta * 8);
    }
  });

  return (
    <group
      ref={meshRef}
      position={[targetX, targetY, targetZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <RoundedBox args={[0.5, 0.4, 0.5]} radius={0.03} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial
          color={
            isSelected
              ? '#52B788'
              : product.placedCorrectly
              ? '#A7F3D0'
              : '#E6D5B8'
          }
          roughness={0.7}
        />
      </RoundedBox>

      {/* Label on Front */}
      <mesh position={[0, 0, 0.26]}>
        <planeGeometry args={[0.38, 0.24]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      <Text
        position={[0, 0.04, 0.27]}
        fontSize={0.075}
        color="#1A2421"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {product.name}
      </Text>

      <Text
        position={[0, -0.05, 0.27]}
        fontSize={0.05}
        color={product.idealZone === 'SELL_FIRST' ? '#DC2626' : '#2D6A4F'}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {product.shelfLifeText}
      </Text>
    </group>
  );
}

export const SimpleWarehouse3D: React.FC<{
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
  onPlaceInShelf: (zone: ShelfZone) => void;
}> = ({ selectedProductId, onSelectProduct, onPlaceInShelf }) => {
  const { products } = useGroceryStore();

  return (
    <div className="w-full h-[450px] sm:h-[500px] relative bg-[#FAF7F0] rounded-3xl overflow-hidden border border-[#E8DFC8] shadow-warm-md">
      <Canvas
        shadows
        camera={{ position: [0, 4.2, 5.8], fov: 45 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.9} color="#FFFBF0" />
        <directionalLight
          position={[4, 8, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color="#FFF8E7"
        />

        {/* Tiled Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 10]} />
          <meshStandardMaterial color="#F4ECE1" roughness={0.5} />
        </mesh>

        {/* Back Wall */}
        <mesh position={[0, 2.5, -2.5]} receiveShadow>
          <boxGeometry args={[12, 5, 0.2]} />
          <meshStandardMaterial color="#EAE2D2" roughness={0.8} />
        </mesh>

        {/* 3 Main Storage Shelves */}
        {SHELVES_3D.map((shelf) => (
          <ShelfRack3D
            key={shelf.id}
            shelf={shelf}
            isTarget={Boolean(selectedProductId)}
            onSelectShelf={() => onPlaceInShelf(shelf.id)}
          />
        ))}

        {/* Intake Pallet in Front */}
        <mesh position={[0, 0.04, 2.2]} receiveShadow castShadow>
          <boxGeometry args={[5.2, 0.08, 1.2]} />
          <meshStandardMaterial color="#8C6D46" roughness={0.8} />
        </mesh>

        <Text
          position={[0, 0.1, 2.7]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.16}
          color="#694D31"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          INTAKE DELIVERY AREA (UNASSIGNED ITEMS)
        </Text>

        {/* 6 Product Boxes */}
        {products.map((p) => (
          <ProductBox3D
            key={p.id}
            product={p}
            isSelected={selectedProductId === p.id}
            onSelect={() => onSelectProduct(p.id)}
          />
        ))}

        <OrbitControls
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3.5}
          maxDistance={9}
          target={[0, 0.8, 0.5]}
        />
      </Canvas>

      {/* Floating 3D Navigation Hint */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cardboard-200 text-[10px] text-gray-600 font-medium pointer-events-none shadow-xs">
        💡 Drag to rotate camera • Click a product then click a shelf to place
      </div>
    </div>
  );
};

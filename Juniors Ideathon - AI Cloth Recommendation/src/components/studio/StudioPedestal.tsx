import React from 'react';

export function StudioPedestal() {
  return (
    <group position={[0, 0, 0]}>
      {/* Studio Floor Pedestal Cylinder: Top surface rests at exactly y = 0.00 */}
      <mesh receiveShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.95, 1.05, 0.04, 64]} />
        <meshStandardMaterial 
          color="#FAF8F4" 
          roughness={0.65} 
          metalness={0.05}
        />
      </mesh>

      {/* Subtle outer accent ring */}
      <mesh receiveShadow position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 0.95, 64]} />
        <meshBasicMaterial color="#EAE6EE" />
      </mesh>

      {/* Soft Contact shadow circle under character's shoes */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.65, 32]} />
        <meshBasicMaterial color="#29243B" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

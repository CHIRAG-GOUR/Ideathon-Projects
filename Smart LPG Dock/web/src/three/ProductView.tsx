import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SimController } from '@/simulation/controller';
import { CylinderDock, type PartId } from './CylinderDock';
import { dockVisual } from './Kitchen';
import { webglAvailable } from './KitchenView';
import { DockIllustration } from '@/assets/art';
import { prefersReducedMotion } from '@/services/settings';

export function ProductView({ sim, explode, selected, onSelect, className = '', still = false }: { sim: SimController; explode: number; selected: PartId | null; onSelect: (p: PartId) => void; className?: string; still?: boolean }) {
  const [hover, setHover] = useState<PartId | null>(null);
  const [gl] = useState(webglAvailable);
  if (!gl) return <div className={`grid place-items-center bg-cream-100 ${className}`}><DockIllustration className="h-72" /><p className="text-sm text-graphite-muted">3D unavailable — showing the illustration.</p></div>;
  return (
    <div className={`relative ${className}`} style={{ cursor: hover ? 'pointer' : 'grab' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [1.9, 1.25, 2.3], fov: 36 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl: r }) => (r.toneMapping = THREE.ACESFilmicToneMapping)}>
        <color attach="background" args={['#F5EEE2']} />
        <hemisphereLight args={['#ffffff', '#c9b79c', 0.9]} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#cfe0ff" />
        <Suspense fallback={null}>
          <group position={[0, -0.45, 0]}>
            <CylinderDock withDock read={() => dockVisual(sim)} explode={explode} selected={selected ?? hover} onSelect={onSelect} hover={setHover} />
            <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={3} blur={2.4} far={1.2} />
          </group>
        </Suspense>
        <OrbitControls target={[0, 0.12 + explode * 0.2, 0]} enablePan={false} minDistance={1} maxDistance={5} autoRotate={!still && !prefersReducedMotion() && !selected} autoRotateSpeed={0.6} />
      </Canvas>
      {hover && <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-graphite px-2 py-1 font-mono text-[11px] font-bold text-white">{hover.toUpperCase()}</span>}
    </div>
  );
}

import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Avatar3D } from './Avatar3D';
import { StudioPedestal } from './StudioPedestal';
import { StudioControls } from './StudioControls';
import { useFashionStore } from '../../store/useFashionStore';
import { Loader2 } from 'lucide-react';

function CameraRig({ view }: { view: 'default' | 'closeup' | 'back' | 'low' | 'upper' | 'shoes' }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  React.useEffect(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;

    if (view === 'closeup') {
      ctrl.target.set(0, 1.62, 0);
      ctrl.object.position.set(0, 1.65, 1.05);
    } else if (view === 'upper') {
      // Focus on Chest, Shirt, Jacket and Collar
      ctrl.target.set(0, 1.30, 0);
      ctrl.object.position.set(0, 1.35, 1.85);
    } else if (view === 'shoes') {
      // Focus on Pants, Shorts, Sneakers and Boots
      ctrl.target.set(0, 0.45, 0);
      ctrl.object.position.set(0, 0.50, 1.85);
    } else if (view === 'back') {
      ctrl.target.set(0, 0.90, 0);
      ctrl.object.position.set(0, 1.02, -3.4);
    } else {
      // default: Full body framing from head to shoes firmly on pedestal
      ctrl.target.set(0, 0.90, 0);
      ctrl.object.position.set(0, 1.02, 3.4);
    }
    ctrl.update();
  }, [view]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0.92, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.8}
      maxDistance={5.0}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2 + 0.02}
    />
  );
}

export function StudioCanvas() {
  const { 
    isDragging, 
    draggedGarment, 
    equipGarment, 
    setDraggingGarment,
    cameraView,
    setCameraView 
  } = useFashionStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedGarment) {
      equipGarment(draggedGarment);
    }
    setDraggingGarment(null);
  };

  const handleResetCamera = () => {
    setCameraView('default');
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full h-[620px] lg:h-[720px] rounded-3xl overflow-hidden bg-gradient-to-b from-white via-ivory/80 to-ivory border transition-all duration-300 ${
        isDragging 
          ? 'border-coral ring-4 ring-coral/20 bg-coral-light/10 shadow-float' 
          : 'border-border-light shadow-card'
      }`}
    >
      {/* Drop Zone Visual Pill Indicator */}
      {isDragging && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full bg-coral text-white font-semibold text-xs tracking-wider uppercase shadow-float animate-bounce flex items-center gap-2">
          <span>Release to wear {draggedGarment?.name}</span>
        </div>
      )}

      {/* Floating Canvas UI Controls */}
      <StudioControls 
        onResetCamera={handleResetCamera}
        onSetCameraView={setCameraView}
      />

      {/* WebGL Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 1.02, 3.4]} fov={34} />
        <CameraRig view={cameraView} />

        {/* Ambient & Studio Directional Lighting */}
        <ambientLight intensity={0.85} />
        <hemisphereLight args={['#FFFFFF', '#FAF8F4', 0.85]} />

        {/* Soft Key Light with Cast Shadow */}
        <directionalLight
          position={[2.5, 4.5, 3.0]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={10}
          shadow-camera-left={-1.5}
          shadow-camera-right={1.5}
          shadow-camera-top={2.5}
          shadow-camera-bottom={-1.5}
          shadow-bias={-0.0005}
        />

        {/* Warm Fill Light */}
        <directionalLight position={[-2.5, 2.5, 2.0]} intensity={0.55} color="#FFF0C7" />

        {/* Subtle Rim / Contour Light */}
        <directionalLight position={[0, 3.5, -3.0]} intensity={0.85} color="#E9E4FF" />

        <Suspense fallback={null}>
          <Avatar3D />
          <StudioPedestal />
        </Suspense>
      </Canvas>

      {/* Loading Skeleton if assets are streaming */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-0 transition-opacity peer-[loading]:opacity-100">
        <div className="flex flex-col items-center gap-2 text-plum-muted text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-coral" />
          <span>Setting up fashion studio...</span>
        </div>
      </div>
    </div>
  );
}

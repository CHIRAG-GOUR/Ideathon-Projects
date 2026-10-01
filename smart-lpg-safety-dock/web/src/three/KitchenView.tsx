import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SimController } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { prefersReducedMotion, QUALITY, resolveQuality, useSettings } from '@/services/settings';
import { Kitchen } from './Kitchen';
import { AutoFrame } from './AutoFrame';
import { KitchenFallback } from './Fallback';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('3D view failed, showing the 2D fallback:', e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Pauses rendering when the canvas is off-screen (scrolling, other panel) — the simulation clock keeps running. */
function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vis] as const;
}

export const CAMERAS = {
  overview: { pos: [3.4, 2.5, 3.9] as [number, number, number], target: [-0.5, 0.9, -0.2] as [number, number, number] },
  cylinder: { pos: [2.6, 1.5, 0.6] as [number, number, number], target: [1.4, 0.6, -1.1] as [number, number, number] },
  exit: { pos: [0.6, 2.2, 3.6] as [number, number, number], target: [-2.8, 0.9, 1.6] as [number, number, number] },
};

export function KitchenView({ sim, className = '', camera = 'overview', compact = false, label }: { sim: SimController; className?: string; camera?: keyof typeof CAMERAS; compact?: boolean; label?: string }) {
  const settings = useSettings();
  const quality = compact && settings.quality === 'auto' ? (resolveQuality() === 'high' ? 'medium' : 'low') : resolveQuality();
  const reduced = prefersReducedMotion();
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [gl] = useState(webglAvailable);
  const s = useSim(sim, 8);
  const cam = CAMERAS[camera];
  const incidentAge = s.timers.incidentAt >= 0 ? s.t - s.timers.incidentAt : -1;
  const frozen = s.phase === 'RECOVERY';
  const fallback = <KitchenFallback sim={sim} />;

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-xl2 bg-[#1b2230] ${className}`} role="img" aria-label={`${label ?? '3D kitchen'} — ${s.scenario === 'with' ? 'with Smart Dock' : 'without Smart Dock'}. Chef: ${s.chef.action}. Gas ${s.gas.toFixed(2)} ppm.`}>
      <div className="absolute inset-0 transition-[filter] duration-700" style={{ filter: frozen ? 'grayscale(.75) brightness(.8)' : 'none' }}>
        {gl ? (
          <Boundary fallback={fallback}>
            <Suspense fallback={fallback}>
              <Canvas
                shadows={QUALITY[quality].shadows}
                dpr={QUALITY[quality].dpr}
                frameloop={visible ? 'always' : 'never'}
                camera={{ position: cam.pos, fov: compact ? 50 : 45, near: 0.1, far: 60 }}
                gl={{ antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: true }}
                onCreated={({ gl: r }) => {
                  r.toneMapping = THREE.ACESFilmicToneMapping;
                  r.toneMappingExposure = 1.05;
                }}
              >
                <color attach="background" args={['#2a2f38']} />
                <fog attach="fog" args={['#2a2f38', 9, 20]} />
                <Kitchen sim={sim} quality={quality} reduced={reduced} />
                <AutoFrame sim={sim} base={cam.target} />
                <OrbitControls makeDefault target={cam.target} enableDamping maxPolarAngle={Math.PI * 0.49} minDistance={1.6} maxDistance={9} enablePan={!compact} />
              </Canvas>
            </Suspense>
          </Boundary>
        ) : (
          fallback
        )}
      </div>
      {/* Flash: a white-out overlay at the moment of the simulated incident (reduced under reduced-motion). */}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: incidentAge >= 0 && incidentAge < 0.9 ? (reduced ? 0.35 : 1) * (1 - incidentAge / 0.9) : 0 }} />
      {incidentAge >= 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="rounded-xl bg-danger-600/95 px-4 py-2 text-center font-mono text-[11px] font-bold tracking-wider text-white shadow-card sm:text-xs">
            SIMULATED INCIDENT — FOR DEMONSTRATION ONLY
            <span className="block text-[10px] font-medium opacity-80">Educational visualisation · not a prediction of real LPG behaviour</span>
          </div>
        </div>
      )}
      {frozen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-lg bg-graphite/85 px-3 py-1 font-mono text-[11px] font-semibold text-white">SIMULATION FROZEN · press Restart</span>
        </div>
      )}
    </div>
  );
}

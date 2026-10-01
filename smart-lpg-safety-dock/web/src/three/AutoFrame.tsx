// Gently keeps the action in frame (the chef walking out, the whew) — until the viewer takes the camera.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimController } from '@/simulation/controller';

type Controls = { target: THREE.Vector3; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void; update: () => void };

export function AutoFrame({ sim, base }: { sim: SimController; base: [number, number, number] }) {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const touched = useRef(0);
  const home = useMemo(() => new THREE.Vector3(...base), [base]);
  const want = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    if (!controls) return;
    const on = () => (touched.current = performance.now());
    controls.addEventListener('start', on);
    return () => controls.removeEventListener('start', on);
  }, [controls]);
  useFrame((_, dt) => {
    if (!controls || performance.now() - touched.current < 12000) return;
    const c = sim.state.chef;
    const away = c.action === 'walking' || c.action === 'fleeing' || c.action === 'exited' || c.action === 'relieved';
    const s = sim.state;
    want.copy(home);
    if (s.timers.incidentAt >= 0) want.set(-0.2, 0.9, -0.2); // keep the cylinder area (the simulated incident) in view
    else if (away) want.lerp(new THREE.Vector3(c.x, 1.0, c.z), s.scenario === 'with' ? 0.55 : 0.35);
    controls.target.lerp(want, Math.min(1, dt * 1.6));
    controls.update();
  });
  return null;
}

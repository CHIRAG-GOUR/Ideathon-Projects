// LPG cylinder + regulator + Smart Dock. Used in the kitchen and in the product view.
import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

export type PartId = 'cylinder' | 'regulator' | 'dock' | 'gas' | 'temp' | 'tilt' | 'status' | 'shutoff' | 'controller';

export interface DockVisual {
  /** 0 normal, 1 anomaly, 2 warning, 3 critical, 4 isolated, 5 safe */
  led: number;
  valveClosed: number; // 0..1 lever travel
  heat: number; // 0..1 glow
  tiltDeg: number;
  scorched: number; // 0..1 (incident aftermath)
}

const LED_COLORS = ['#22c55e', '#60a5fa', '#f59e0b', '#ef4444', '#3b82f6', '#22c55e'];

export function CylinderDock({
  withDock,
  read,
  explode = 0,
  selected,
  onSelect,
  hover,
}: {
  withDock: boolean;
  read: () => DockVisual;
  explode?: number;
  selected?: PartId | null;
  onSelect?: (p: PartId) => void;
  hover?: (p: PartId | null) => void;
}) {
  const tiltRef = useRef<THREE.Group>(null);
  const ledMat = useRef<THREE.MeshStandardMaterial>(null);
  const sensorLed = useRef<THREE.MeshStandardMaterial>(null);
  const lever = useRef<THREE.Group>(null);
  const body = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);

  const hoseCurve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.86, 0), new THREE.Vector3(0.12, 0.95, -0.05), new THREE.Vector3(0.0, 1.0, -0.15)]), []);

  useFrame(({ clock }) => {
    const v = read();
    const tilt = THREE.MathUtils.degToRad(v.tiltDeg);
    if (tiltRef.current) tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, -tilt, 0.25);
    const blink = v.led === 2 || v.led === 3 ? 0.55 + 0.45 * Math.sin(clock.elapsedTime * (v.led === 3 ? 14 : 7)) : 1;
    if (ledMat.current) {
      ledMat.current.color.set(LED_COLORS[v.led]);
      ledMat.current.emissive.set(LED_COLORS[v.led]);
      ledMat.current.emissiveIntensity = 1.6 * blink;
    }
    if (sensorLed.current) {
      sensorLed.current.emissive.set(LED_COLORS[v.led]);
      sensorLed.current.emissiveIntensity = 2 * blink;
    }
    if (ring.current) {
      const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 0.6;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = v.led >= 1 && v.led <= 3 ? 0.5 * (1.6 - s) : 0;
    }
    if (lever.current) lever.current.rotation.y = THREE.MathUtils.lerp(lever.current.rotation.y, (v.valveClosed * Math.PI) / 2, 0.2);
    if (body.current) {
      body.current.emissive.setRGB(0.9 * v.heat, 0.25 * v.heat, 0.05 * v.heat);
      body.current.color.set(v.scorched > 0 ? '#3a3f47' : '#2563B0');
    }
  });

  const e = explode;
  const pick = (p: PartId) =>
    onSelect
      ? {
          onClick: (ev: ThreeEvent<MouseEvent>) => {
            ev.stopPropagation();
            onSelect(p);
          },
          onPointerOver: (ev: ThreeEvent<PointerEvent>) => {
            ev.stopPropagation();
            hover?.(p);
          },
          onPointerOut: () => hover?.(null),
        }
      : {};
  const hl = (p: PartId) => (selected === p ? { emissive: new THREE.Color('#F99A3D'), emissiveIntensity: 0.55 } : {});

  return (
    <group>
      {withDock ? (
        <group>
          {/* Dock base: steel tray with cream top plate (load-cell platform concept) */}
          <group position={[0, -e * 0.25, 0]} {...pick('dock')}>
            <mesh castShadow receiveShadow position={[0, 0.035, 0]}>
              <boxGeometry args={[0.56, 0.07, 0.56]} />
              <meshStandardMaterial color="#9aa4b1" metalness={0.75} roughness={0.35} {...hl('dock')} />
            </mesh>
            <mesh receiveShadow position={[0, 0.075, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.012, 48]} />
              <meshStandardMaterial color="#EADFCB" roughness={0.6} {...hl('dock')} />
            </mesh>
            <mesh position={[0, 0.073, 0.282]}>
              <boxGeometry args={[0.3, 0.03, 0.004]} />
              <meshStandardMaterial color="#142F55" />
            </mesh>
          </group>
          {/* Status ring around the cylinder foot */}
          <group position={[0, 0.085 - e * 0.1, 0]} {...pick('status')}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.215, 0.012, 12, 64]} />
              <meshStandardMaterial ref={ledMat} color="#22c55e" emissive="#22c55e" emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
            <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
              <ringGeometry args={[0.25, 0.27, 48]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
          {/* Sensor tower: gas sensor grille (top), temperature probe (side), tilt/IMU board (inside) */}
          <group position={[0.24 + e * 0.35, 0.07, 0.24 + e * 0.1]}>
            <mesh castShadow position={[0, 0.13, 0]} {...pick('controller')}>
              <boxGeometry args={[0.07, 0.26, 0.07]} />
              <meshStandardMaterial color="#1F2733" roughness={0.4} metalness={0.3} {...hl('controller')} />
            </mesh>
            <mesh position={[0, 0.27 + e * 0.12, 0]} {...pick('gas')}>
              <cylinderGeometry args={[0.03, 0.03, 0.03, 20]} />
              <meshStandardMaterial color="#C3CAD3" metalness={0.8} roughness={0.25} {...hl('gas')} />
            </mesh>
            <mesh position={[0, 0.287 + e * 0.12, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.006, 20]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-0.042 - e * 0.12, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} {...pick('temp')}>
              <cylinderGeometry args={[0.008, 0.008, 0.06, 12]} />
              <meshStandardMaterial color="#E8730C" metalness={0.4} {...hl('temp')} />
            </mesh>
            <mesh position={[0, 0.08, 0.036 + e * 0.12]} {...pick('tilt')}>
              <boxGeometry args={[0.045, 0.045, 0.006]} />
              <meshStandardMaterial color="#167A45" {...hl('tilt')} />
            </mesh>
            <mesh position={[0, 0.2, 0.036]}>
              <sphereGeometry args={[0.009, 12, 12]} />
              <meshStandardMaterial ref={sensorLed} color="#111" emissive="#22c55e" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ) : (
        // No dock: the cylinder stands on an old rubber mat.
        <mesh receiveShadow position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.012, 32]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.95} />
        </mesh>
      )}

      {/* The cylinder tilts about its foot (tilt sensor / fault injection) */}
      <group ref={tiltRef} position={[0, withDock ? 0.08 : 0.012, 0]}>
        <group position={[0, e * 0.35, 0]} {...pick('cylinder')}>
          <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.165, 0.17, 0.08, 40, 1, true]} />
            <meshStandardMaterial color="#1D4F91" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} {...hl('cylinder')} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
            <capsuleGeometry args={[0.16, 0.5, 12, 40]} />
            <meshStandardMaterial ref={body} color="#2563B0" metalness={0.35} roughness={0.38} {...hl('cylinder')} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.1615, 0.1615, 0.05, 40, 1, true]} />
            <meshStandardMaterial color="#EADFCB" roughness={0.7} />
          </mesh>
          {/* Collar / guard ring */}
          <mesh castShadow position={[0, 0.77, 0]}>
            <cylinderGeometry args={[0.1, 0.11, 0.09, 24, 1, true]} />
            <meshStandardMaterial color="#1D4F91" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.05, 16]} />
            <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
        {/* Regulator + hose */}
        <group position={[0, e * 0.55, 0]} {...pick('regulator')}>
          <mesh castShadow position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.05, 24]} />
            <meshStandardMaterial color="#E8730C" roughness={0.45} {...hl('regulator')} />
          </mesh>
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.015, 20]} />
            <meshStandardMaterial color="#1F2733" />
          </mesh>
          <mesh>
            <tubeGeometry args={[hoseCurve, 16, 0.009, 8, false]} />
            <meshStandardMaterial color="#c2410c" roughness={0.7} />
          </mesh>
        </group>
        {/* Simulated shutoff actuator clamped on the regulator */}
        {withDock && (
          <group position={[-0.07 - e * 0.3, 0.86 + e * 0.5, 0]} {...pick('shutoff')}>
            <mesh castShadow>
              <boxGeometry args={[0.05, 0.05, 0.06]} />
              <meshStandardMaterial color="#142F55" roughness={0.4} {...hl('shutoff')} />
            </mesh>
            <group ref={lever} position={[0, 0.035, 0]}>
              <mesh position={[-0.03, 0, 0]}>
                <boxGeometry args={[0.07, 0.012, 0.014]} />
                <meshStandardMaterial color="#E8730C" />
              </mesh>
            </group>
          </group>
        )}
      </group>
    </group>
  );
}

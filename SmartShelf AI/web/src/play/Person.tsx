// Low-poly people for Shelf Rush, built from simple shapes but proportioned like humans: legs and feet, hips, torso,
// shoulders, arms and hands, neck, head with eyes and hair. They walk (legs and arms swing in opposition), reach for a
// shelf, and stand at the counter. Variety comes from skin tone, height, hairstyle and clothing (shirt and trousers,
// kurta, saree), chosen deterministically per customer.
import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { Group } from 'three';

export interface Look {
  skin: string;
  top: string;
  bottom: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bun' | 'cap';
  outfit: 'shirt' | 'kurta' | 'saree';
  accent: string;
  height: number; // scale, ~0.92–1.06
  basket: boolean;
}

const SKIN = ['#8D5524', '#C68642', '#E0AC69', '#A86B3C', '#6B4226', '#D9A066', '#7A4A2A'];
const TOPS = ['#2F6FB0', '#C0392B', '#F2F2EE', '#16A085', '#8E44AD', '#E67E22', '#34495E', '#D4A017', '#B03A6E'];
const BOTTOMS = ['#2C3E50', '#3B3B3B', '#5D6D7E', '#1F3A5F', '#6E5B4B', '#ECE6D8'];
const HAIR = ['#1B1410', '#2B1D14', '#3A2A1E', '#151515', '#6E6E6E'];
const ACCENT = ['#D7372B', '#F5B82E', '#0E6B47', '#E8772E', '#7B4FB8'];

/** A deterministic look for customer n. */
export function lookFor(n: number): Look {
  const r = (k: number) => Math.abs(Math.sin(n * 12.9898 + k * 78.233) * 43758.5453) % 1;
  const outfit = r(1) < 0.55 ? 'shirt' : r(1) < 0.8 ? 'kurta' : 'saree';
  const hairStyle = outfit === 'saree' ? (r(2) < 0.5 ? 'bun' : 'long') : r(2) < 0.5 ? 'short' : r(2) < 0.72 ? 'cap' : r(2) < 0.86 ? 'long' : 'bun';
  return {
    skin: SKIN[Math.floor(r(3) * SKIN.length)],
    top: TOPS[Math.floor(r(4) * TOPS.length)],
    bottom: outfit === 'kurta' ? '#ECE6D8' : BOTTOMS[Math.floor(r(5) * BOTTOMS.length)],
    hair: HAIR[Math.floor(r(6) * HAIR.length)],
    hairStyle,
    outfit,
    accent: ACCENT[Math.floor(r(7) * ACCENT.length)],
    height: 0.92 + r(8) * 0.14,
    basket: r(9) < 0.45,
  };
}

export const SHOPKEEPER: Look = { skin: '#A86B3C', top: '#F2F2EE', bottom: '#2C3E50', hair: '#1B1410', hairStyle: 'short', outfit: 'shirt', accent: '#0E6B47', height: 1, basket: false };

export interface PersonHandle {
  /** Pose for this frame: 'walk' swings limbs; 'reach' raises an arm to a shelf; 'carry' holds a carton in front while
   * walking; 'scan' moves the cashier's hands over the counter; 'stand' idles. */
  pose(mode: PoseMode, phase: number): void;
}

const Mat = ({ c, rough = 0.75 }: { c: string; rough?: number }) => <meshStandardMaterial color={c} roughness={rough} />;

export type PoseMode = 'walk' | 'reach' | 'stand' | 'carry' | 'carryStand' | 'scan';

export const Person = forwardRef<PersonHandle, { look: Look; apron?: boolean; idle?: boolean; holding?: ReactNode; carrying?: ReactNode }>(function Person({ look, apron, idle, holding, carrying }, ref) {
  const legL = useRef<Group>(null), legR = useRef<Group>(null), armL = useRef<Group>(null), armR = useRef<Group>(null), body = useRef<Group>(null);
  const pose = (mode: PoseMode, phase: number) => {
    const s = Math.sin(phase);
    const walking = mode === 'walk' || mode === 'carry';
    const swing = walking ? (mode === 'carry' ? 0.45 : 0.55) : 0;
    if (legL.current) legL.current.rotation.x = s * swing;
    if (legR.current) legR.current.rotation.x = -s * swing;
    if (mode === 'carry' || mode === 'carryStand') {
      if (armL.current) armL.current.rotation.x = -1.05;
      if (armR.current) armR.current.rotation.x = -1.05;
    } else if (mode === 'scan') {
      if (armL.current) armL.current.rotation.x = -0.7 + Math.sin(phase * 0.8) * 0.12;
      if (armR.current) armR.current.rotation.x = -0.95 + Math.sin(phase * 1.6) * 0.3;
    } else {
      if (armL.current) armL.current.rotation.x = -s * swing * 0.8;
      if (armR.current) armR.current.rotation.x = mode === 'reach' ? -1.35 + Math.sin(phase * 0.5) * 0.12 : s * swing * 0.8;
    }
    if (body.current) body.current.position.y = walking ? Math.abs(Math.cos(phase)) * 0.03 : 0;
  };
  useImperativeHandle(ref, () => ({ pose }));
  // a standing figure (the shopkeeper) breathes and gestures slightly on its own
  useFrame(({ clock }) => {
    if (!idle) return;
    const t = clock.elapsedTime;
    if (armR.current) armR.current.rotation.x = -0.35 + Math.sin(t * 1.3) * 0.25;
    if (armL.current) armL.current.rotation.x = -0.2 + Math.sin(t * 0.9 + 1) * 0.08;
    if (body.current) body.current.position.y = Math.sin(t * 1.6) * 0.008;
  });

  const long = look.outfit !== 'shirt'; // kurta and saree cover the upper legs
  return (
    <group scale={look.height}>
      <group ref={body}>
        {/* legs: pivot at the hip so they swing from the top; trousers, ankle, shoe */}
        {([[-0.09, legL], [0.09, legR]] as const).map(([x, r]) => (
          <group key={x} ref={r} position={[x, 0.86, 0]}>
            <mesh position={[0, -0.4, 0]}><capsuleGeometry args={[0.075, 0.62, 4, 10]} /><Mat c={look.outfit === 'saree' ? look.top : look.bottom} /></mesh>
            <mesh position={[0, -0.82, 0.05]}><boxGeometry args={[0.12, 0.08, 0.26]} /><Mat c="#2A211B" rough={0.5} /></mesh>
          </group>
        ))}
        {/* hips */}
        <mesh position={[0, 0.9, 0]} scale={[1.05, 0.6, 0.75]}><sphereGeometry args={[0.19, 16, 12]} /><Mat c={look.outfit === 'shirt' ? look.bottom : look.top} /></mesh>
        {/* long garment: kurta hem or saree skirt (a flared cylinder over the upper legs) */}
        {long && <mesh position={[0, look.outfit === 'saree' ? 0.5 : 0.72, 0]}><cylinderGeometry args={[0.2, look.outfit === 'saree' ? 0.27 : 0.25, look.outfit === 'saree' ? 0.9 : 0.42, 18, 1, true]} /><meshStandardMaterial color={look.top} roughness={0.8} side={2} /></mesh>}
        {/* torso: slightly tapered, wider at the shoulders */}
        <mesh position={[0, 1.16, 0]} scale={[1, 1, 0.68]}><cylinderGeometry args={[0.23, 0.19, 0.5, 18]} /><Mat c={look.top} /></mesh>
        <mesh position={[0, 1.4, 0]} scale={[1.18, 0.55, 0.72]}><sphereGeometry args={[0.2, 16, 12]} /><Mat c={look.top} /></mesh>
        {/* saree pallu: a drape across the chest over one shoulder */}
        {look.outfit === 'saree' && (
          <group>
            <mesh position={[0, 1.17, 0.168]} rotation={[0.06, 0, 0.58]}><boxGeometry args={[0.13, 0.66, 0.012]} /><Mat c={look.accent} /></mesh>
            <mesh position={[-0.2, 1.22, -0.06]} rotation={[0, 0, 0.08]}><boxGeometry args={[0.1, 0.5, 0.16]} /><Mat c={look.accent} /></mesh>
            <mesh position={[0, 0.94, 0]}><cylinderGeometry args={[0.215, 0.215, 0.05, 18]} /><Mat c={look.accent} /></mesh>
          </group>
        )}
        {/* shopkeeper's apron */}
        {apron && (
          <group>
            <mesh position={[0, 1.0, 0.142]}><boxGeometry args={[0.27, 0.46, 0.012]} /><Mat c={look.accent} /></mesh>
            <mesh position={[0, 1.33, 0.13]}><boxGeometry args={[0.2, 0.012, 0.012]} /><Mat c={look.accent} /></mesh>
          </group>
        )}
        {/* arms: pivot at the shoulder; sleeve, forearm, hand */}
        {([[-0.27, armL, false], [0.27, armR, true]] as const).map(([x, r, right]) => (
          <group key={x} ref={r} position={[x, 1.4, 0]} rotation={[0, 0, x < 0 ? 0.08 : -0.08]}>
            <mesh position={[0, -0.14, 0]}><capsuleGeometry args={[0.07, 0.16, 4, 8]} /><Mat c={look.top} /></mesh>
            <mesh position={[0, -0.36, 0]}><capsuleGeometry args={[0.055, 0.24, 4, 8]} /><Mat c={look.outfit === 'shirt' ? look.skin : look.top} /></mesh>
            <mesh position={[0, -0.55, 0.01]}><sphereGeometry args={[0.058, 12, 10]} /><Mat c={look.skin} rough={0.6} /></mesh>
            {right && holding && <group position={[0, -0.62, 0.07]}>{holding}</group>}
            {look.basket && !right && (
              <group position={[0, -0.66, 0.02]}>
                <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.26, 0.14, 0.18]} /><Mat c="#D7372B" rough={0.5} /></mesh>
                <mesh position={[0, 0.0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.08, 0.012, 6, 16, Math.PI]} /><Mat c="#9E2318" /></mesh>
              </group>
            )}
          </group>
        ))}
        {/* a carton carried in front with both hands */}
        {carrying && <group position={[0, 1.02, 0.36]}>{carrying}</group>}
        {/* neck and head */}
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.055, 0.065, 0.12, 12]} /><Mat c={look.skin} rough={0.6} /></mesh>
        <group position={[0, 1.66, 0]}>
          <mesh scale={[0.92, 1.08, 0.98]}><sphereGeometry args={[0.135, 20, 16]} /><Mat c={look.skin} rough={0.6} /></mesh>
          {/* ears */}
          {[-0.125, 0.125].map((x) => <mesh key={x} position={[x, -0.005, 0]} scale={[0.5, 1, 0.8]}><sphereGeometry args={[0.03, 8, 8]} /><Mat c={look.skin} rough={0.6} /></mesh>)}
          {/* eyes and brows */}
          {[-0.045, 0.045].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.015, 0.118]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color="#141010" roughness={0.3} /></mesh>
              <mesh position={[x, 0.05, 0.118]} rotation={[0, 0, x < 0 ? 0.12 : -0.12]}><boxGeometry args={[0.04, 0.008, 0.01]} /><Mat c={look.hair} /></mesh>
            </group>
          ))}
          {/* nose and mouth */}
          <mesh position={[0, -0.02, 0.13]} scale={[0.7, 1, 1]}><sphereGeometry args={[0.018, 8, 8]} /><Mat c={look.skin} rough={0.6} /></mesh>
          <mesh position={[0, -0.065, 0.118]}><boxGeometry args={[0.045, 0.008, 0.01]} /><Mat c="#5A2E22" /></mesh>
          {/* hair */}
          <mesh position={[0, 0.025, -0.012]} rotation={[-0.42, 0, 0]}><sphereGeometry args={[0.148, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.75]} /><Mat c={look.hairStyle === 'cap' ? look.accent : look.hair} rough={0.9} /></mesh>
          {look.hairStyle === 'cap' && <mesh position={[0, 0.045, 0.12]} rotation={[0.25, 0, 0]}><boxGeometry args={[0.2, 0.012, 0.12]} /><Mat c={look.accent} /></mesh>}
          {look.hairStyle === 'long' && <mesh position={[0, -0.12, -0.08]}><boxGeometry args={[0.24, 0.3, 0.07]} /><Mat c={look.hair} rough={0.9} /></mesh>}
          {look.hairStyle === 'bun' && <mesh position={[0, 0.06, -0.15]}><sphereGeometry args={[0.065, 12, 10]} /><Mat c={look.hair} rough={0.9} /></mesh>}
        </group>
      </group>
    </group>
  );
});

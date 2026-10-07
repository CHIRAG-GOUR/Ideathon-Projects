'use client';
/** Shared by the film's models: the film clock context and a cached standard-material factory. */
import { createContext, useContext } from 'react';
import * as THREE from 'three';

export const ClockCtx = createContext<{ t: number }>({ t: 0 });
export const useClock = () => useContext(ClockCtx);

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; ei?: number; map?: THREE.Texture } = {}) {
  const k = `${color}-${o.rough ?? 0.6}-${o.metal ?? 0}-${o.emissive ?? ''}-${o.ei ?? 0}-${o.map?.uuid ?? ''}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? '#000000', emissiveIntensity: o.ei ?? 0, map: o.map ?? null });
    matCache.set(k, m);
  }
  return m;
}

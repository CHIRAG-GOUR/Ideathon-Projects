import { useSyncExternalStore } from 'react';

export interface Settings {
  muted: boolean;
  vibration: boolean;
  reducedMotion: 'auto' | 'on' | 'off';
  quality: 'auto' | 'high' | 'medium' | 'low';
  speed: number;
  autoSave: boolean;
  telemetrySource: 'simulation' | 'hardware';
}
const KEY = 'lpgdock.settings.v1';
const DEFAULTS: Settings = { muted: false, vibration: true, reducedMotion: 'auto', quality: 'auto', speed: 1, autoSave: true, telemetrySource: 'simulation' };

let current: Settings = load();
const subs = new Set<() => void>();
function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}
export const settings = {
  get: () => current,
  set(patch: Partial<Settings>) {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* storage blocked: settings last for this visit */
    }
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};
export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get);

export function prefersReducedMotion() {
  const s = current.reducedMotion;
  if (s !== 'auto') return s === 'on';
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type Quality = 'high' | 'medium' | 'low';
/** Auto quality: small/weak devices get fewer particles, no shadows and a lower pixel ratio. */
export function resolveQuality(): Quality {
  if (current.quality !== 'auto') return current.quality;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(screen.width, screen.height) < 500;
  if (cores <= 4 || mem <= 2) return 'low';
  if (small || cores <= 6 || mem <= 4) return 'medium';
  return 'high';
}
export const QUALITY = {
  high: { dpr: [1, 2] as [number, number], shadows: true, particles: 140, smoke: 70 },
  medium: { dpr: [1, 1.5] as [number, number], shadows: true, particles: 80, smoke: 40 },
  low: { dpr: [1, 1] as [number, number], shadows: false, particles: 40, smoke: 18 },
};

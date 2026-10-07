/**
 * "Experience LifeLine" — the film's edit. Every shot is a pure function of time; the interactive SOS is a
 * hold-point the clock waits at until the viewer activates SOS (or chooses to continue).
 * All people, places, vehicles and services are fictional.
 */
import type { LayerId } from '@/services/sound';

export type ShotId =
  | 'aerial' | 'roadWide' | 'tracking' | 'helmet' | 'hands' | 'mirror' | 'pov' | 'accident' | 'ground' | 'bystanders'
  | 'phone' | 'interactive' | 'emergencyUi' | 'map' | 'parents' | 'ambulance' | 'rescue' | 'hospital' | 'family' | 'final';
export type SetId = 'street' | 'home' | 'hospital' | 'ward';

export interface Caption { at: number; to: number; text: string; who?: string; voice?: boolean }
export interface Shot {
  id: ShotId;
  start: number;
  end: number;
  set: SetId;
  cam?: string;
  chapter: string;
  enter: 'cut' | 'fade' | 'black' | 'flash';
  mix: Partial<Record<LayerId, number>>;
  captions?: Caption[];
  /** depth-of-field focus for close-ups (metres from camera) */
  dof?: number;
}

/** The accident moment (absolute seconds) — the world simulation keys off it. */
export const T_CRASH = 30.2;
/** The film waits here for the viewer's SOS. */
export const T_SOS = 50;

export const SHOTS: Shot[] = [
  { id: 'aerial', start: 0, end: 6.5, set: 'street', cam: 'AERIAL · CITY', chapter: 'Evening', enter: 'black', mix: { city: 0.4, wind: 0.2, calm: 0.6 },
    captions: [{ at: 1.2, to: 6, text: '6:42 PM. The city heads home.' }] },
  { id: 'roadWide', start: 6.5, end: 10.5, set: 'street', cam: 'CAM 1 · ROAD', chapter: 'Evening', enter: 'cut', mix: { city: 0.7, bike: 0.35, calm: 0.55 },
    captions: [{ at: 0.5, to: 3.8, text: 'Arjun Sharma, 29, rides home from the office.' }] },
  { id: 'tracking', start: 10.5, end: 15, set: 'street', cam: 'CAM 2 · TRACKING', chapter: 'The ride', enter: 'cut', mix: { city: 0.55, bike: 0.7, wind: 0.3, calm: 0.5 } },
  { id: 'helmet', start: 15, end: 18, set: 'street', cam: 'CAM 3 · CLOSE-UP', chapter: 'The ride', enter: 'cut', mix: { city: 0.3, bike: 0.6, wind: 0.5, calm: 0.45 }, dof: 1.2 },
  { id: 'hands', start: 18, end: 20.5, set: 'street', cam: 'CAM 3 · HANDS', chapter: 'The ride', enter: 'cut', mix: { city: 0.3, bike: 0.75, wind: 0.4, calm: 0.4 }, dof: 0.9 },
  { id: 'mirror', start: 20.5, end: 24, set: 'street', cam: 'MIRROR', chapter: 'The ride', enter: 'cut', mix: { city: 0.3, bike: 0.6, car: 0.6, tension: 0.4 }, dof: 4 },
  { id: 'pov', start: 24, end: 28, set: 'street', cam: 'POV', chapter: 'The ride', enter: 'cut', mix: { city: 0.4, bike: 0.8, wind: 0.6, car: 0.7, tension: 0.7 } },
  { id: 'accident', start: 28, end: 33.5, set: 'street', cam: 'CAM 1 · WIDE', chapter: 'Accident', enter: 'cut', mix: { city: 0.4, car: 0.6, tension: 0.9 } },
  { id: 'ground', start: 33.5, end: 38.5, set: 'street', cam: 'GROUND', chapter: 'Accident', enter: 'cut', mix: { city: 0.2, tension: 0.6 }, dof: 3,
    captions: [{ at: 1.2, to: 4.8, text: 'The car doesn’t stop.' }] },
  { id: 'bystanders', start: 38.5, end: 46, set: 'street', cam: 'CAM 4 · STREET', chapter: 'Bystanders', enter: 'cut', mix: { city: 0.3, crowd: 0.6, tension: 0.6 },
    captions: [
      { at: 0.6, to: 2.4, text: 'Call an ambulance!', who: 'Bystander', voice: true },
      { at: 2.6, to: 4.2, text: 'I’m trying!', who: 'Bystander', voice: true },
      { at: 4.4, to: 6.0, text: 'It’s not connecting…', who: 'Bystander', voice: true },
      { at: 6.1, to: 7.5, text: 'Still nothing. Try again!', who: 'Bystander', voice: true },
    ] },
  { id: 'phone', start: 46, end: T_SOS, set: 'street', cam: 'CLOSE-UP · PHONE', chapter: 'The phone', enter: 'cut', mix: { city: 0.2, crowd: 0.35, tension: 0.5 }, dof: 0.8,
    captions: [{ at: 0.4, to: 3.8, text: 'Arjun reaches for his phone.' }] },
  { id: 'interactive', start: T_SOS, end: T_SOS + 1.5, set: 'street', chapter: 'Your turn', enter: 'cut', mix: { city: 0.15, tension: 0.35 } },
  { id: 'emergencyUi', start: T_SOS + 1.5, end: T_SOS + 9.5, set: 'street', cam: 'LIFELINE HUB · LIVE', chapter: 'SOS active', enter: 'flash', mix: { city: 0.1, response: 0.5 } },
  { id: 'map', start: T_SOS + 9.5, end: T_SOS + 16, set: 'street', cam: 'GEO-RADAR', chapter: 'Geo-Radar', enter: 'fade', mix: { response: 0.55 } },
  { id: 'parents', start: T_SOS + 16, end: T_SOS + 25, set: 'home', cam: 'MEANWHILE · HOME', chapter: 'Family', enter: 'black', mix: { room: 0.6, response: 0.3 },
    captions: [{ at: 3.6, to: 8.6, text: 'Papa calls 108 and reads out the exact location from the alert.' }] },
  { id: 'ambulance', start: T_SOS + 25, end: T_SOS + 35, set: 'street', cam: 'CAM 5 · RESPONSE', chapter: 'Response', enter: 'cut', mix: { city: 0.4, siren: 0.7, response: 0.6 },
    captions: [{ at: 0.6, to: 6, text: 'The ambulance service sends the nearest unit to the shared location.' }] },
  { id: 'rescue', start: T_SOS + 35, end: T_SOS + 48, set: 'street', cam: 'CAM 4 · SCENE', chapter: 'Response', enter: 'cut', mix: { city: 0.25, siren: 0.2, response: 0.45 },
    captions: [{ at: 0.8, to: 5.6, text: 'Paramedics already know: B+, mild asthma, carries an inhaler.' }, { at: 7.4, to: 12.2, text: 'Oxygen, a collar, a careful lift — no time lost on questions.' }] },
  { id: 'hospital', start: T_SOS + 48, end: T_SOS + 56, set: 'hospital', cam: 'CAM 6 · HOSPITAL', chapter: 'Care', enter: 'fade', mix: { city: 0.25, siren: 0.15, hospital: 0.3, warm: 0.35 } },
  { id: 'family', start: T_SOS + 56, end: T_SOS + 64, set: 'ward', cam: 'EMERGENCY DEPARTMENT', chapter: 'Care', enter: 'fade', mix: { hospital: 0.45, warm: 0.7 },
    captions: [{ at: 1, to: 6.5, text: 'Stable. His parents are here.' }] },
  { id: 'final', start: T_SOS + 64, end: T_SOS + 76, set: 'street', chapter: 'LifeLine', enter: 'black', mix: { warm: 0.7 } },
];
export const DURATION = SHOTS[SHOTS.length - 1].end;

export type CueId = 'brake' | 'impact' | 'slide' | 'notify' | 'ping' | 'door';
export const CUES: { at: number; play: CueId }[] = [
  { at: T_CRASH - 1.1, play: 'brake' },
  { at: T_CRASH, play: 'impact' },
  { at: T_CRASH + 0.15, play: 'slide' },
  { at: T_SOS + 2.2, play: 'ping' },
  { at: T_SOS + 17.2, play: 'notify' },
  { at: T_SOS + 35.2, play: 'door' },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (t: number, a: number, b: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: readonly number[], b: readonly number[], k: number): [number, number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

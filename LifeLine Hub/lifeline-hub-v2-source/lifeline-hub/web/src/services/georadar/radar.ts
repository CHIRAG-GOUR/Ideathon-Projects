'use client';
/**
 * Geo-Radar — the emergency network around the user.
 *
 * Real today: the user's GPS fix, and hospitals / police / fire stations / pharmacies from OpenStreetMap
 * (Overpass), ranked by distance. ETAs are ESTIMATED from straight-line distance (× road factor ÷ city speed) —
 * there is no live traffic or routing service connected, and the UI says so.
 * Not connected: live ambulance positions, LifeLine Helper positions, cell-tower triangulation. Those appear
 * only in Demo mode, labelled as simulated.
 *
 * The data model (RadarPoint + source) is the seam for the Geo-Safety Graph: a ranking/routing service can
 * replace `estimateEta` and add live feeds without changing the UI.
 */
import { useEffect, useRef, useState } from 'react';
import { distanceM } from '@shared/geo';
import { nearbyHelp, type HelpPlace } from '@core/places';

export type RadarKind = 'hospital' | 'police' | 'fire' | 'pharmacy' | 'ambulance' | 'helper' | 'safe';
export interface RadarPoint {
  id: string;
  kind: RadarKind;
  name: string;
  latitude: number;
  longitude: number;
  distance: number; // m
  bearing: number; // degrees from north
  etaMin: number;
  status: 'available' | 'responding' | 'open' | 'unknown' | 'busy';
  phone: string | null;
  source: 'osm' | 'demo';
  safeZone: boolean;
  note?: string;
}
export interface Fix { latitude: number; longitude: number; accuracy: number | null }

export const KIND_LABEL: Record<RadarKind, string> = { hospital: 'Hospital', police: 'Police', fire: 'Fire & rescue', pharmacy: 'Pharmacy', ambulance: 'Ambulance', helper: 'LifeLine Helper', safe: 'Safe zone' };
export const KIND_COLOR: Record<RadarKind, string> = { hospital: '#0B8A57', police: '#1F70C4', fire: '#E07B12', pharmacy: '#27A36C', ambulance: '#DA1E2C', helper: '#6E5BEA', safe: '#0B8A57' };

const ROAD_FACTOR = 1.35;
const CITY_KMH = 24;
/** Distance-based estimate (no traffic data). */
export const estimateEta = (meters: number, kmh = CITY_KMH) => Math.max(1, Math.round(((meters * ROAD_FACTOR) / 1000 / kmh) * 60));

type LL = { latitude: number; longitude: number };
export function bearingDeg(a: LL, b: LL) {
  const toR = Math.PI / 180;
  const y = Math.sin((b.longitude - a.longitude) * toR) * Math.cos(b.latitude * toR);
  const x = Math.cos(a.latitude * toR) * Math.sin(b.latitude * toR) - Math.sin(a.latitude * toR) * Math.cos(b.latitude * toR) * Math.cos((b.longitude - a.longitude) * toR);
  return ((Math.atan2(y, x) / toR) + 360) % 360;
}

function fromPlace(me: Fix, p: HelpPlace): RadarPoint {
  const d = distanceM(me, p);
  return {
    id: p.id, kind: p.kind, name: p.name, latitude: p.latitude, longitude: p.longitude, distance: d, bearing: bearingDeg(me, p), etaMin: estimateEta(d),
    status: p.hours?.includes('24/7') ? 'open' : 'unknown', phone: p.phone, source: 'osm', safeZone: p.kind !== 'pharmacy' || !!p.hours?.includes('24/7'),
    note: p.hours ? `Hours: ${p.hours}` : undefined,
  };
}

/** Real nearby help (OSM). Refetches when the user moves more than 600 m. */
export function useRealRadar(me: Fix | null, enabled: boolean) {
  const [points, setPoints] = useState<RadarPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<Fix | null>(null);
  useEffect(() => {
    if (!enabled || !me) return;
    if (last.current && distanceM(last.current, me) < 600) return;
    last.current = me;
    let alive = true;
    setError(null);
    nearbyHelp(me.latitude, me.longitude, 5000)
      .then((list) => alive && setPoints(list.map((p) => fromPlace(me, p)).sort((a, b) => a.distance - b.distance)))
      .catch(() => alive && setError('Nearby places could not be loaded. Check your connection.'));
    return () => { alive = false; };
  }, [me, enabled]);
  return { points, error };
}

// ---------------------------------------------------------------------------------------------- demo network
export const DEMO_FIX: Fix = { latitude: 28.63153, longitude: 77.21671, accuracy: 9 }; // same demo location as the Safety Core demo SOS
const off = (m: Fix, dx: number, dy: number): Fix => ({ latitude: m.latitude + dy / 111_320, longitude: m.longitude + dx / (111_320 * Math.cos((m.latitude * Math.PI) / 180)), accuracy: null });
type Seed = { id: string; kind: RadarKind; name: string; dx: number; dy: number; status: RadarPoint['status']; note?: string };
const SEEDS: Seed[] = [
  { id: 'h1', kind: 'hospital', name: 'CityCare Multispeciality (demo)', dx: 900, dy: 1300, status: 'open', note: '24×7 emergency department' },
  { id: 'h2', kind: 'hospital', name: 'Lakeview Hospital (demo)', dx: -1800, dy: -900, status: 'open', note: 'Trauma care' },
  { id: 'h3', kind: 'hospital', name: 'Sunrise Clinic (demo)', dx: 400, dy: -700, status: 'unknown' },
  { id: 'p1', kind: 'police', name: 'Central Police Station (demo)', dx: -650, dy: 520, status: 'open' },
  { id: 'f1', kind: 'fire', name: 'Fire & Rescue Station (demo)', dx: 1500, dy: -1400, status: 'open' },
  { id: 'ph1', kind: 'pharmacy', name: 'NightCare 24×7 Pharmacy (demo)', dx: 220, dy: 300, status: 'open' },
  { id: 'a1', kind: 'ambulance', name: 'Ambulance AMB-12 (simulated)', dx: 1200, dy: 1800, status: 'available' },
  { id: 'a2', kind: 'ambulance', name: 'Ambulance AMB-07 (simulated)', dx: -2100, dy: 600, status: 'available' },
  { id: 'hp1', kind: 'helper', name: 'Rahul', dx: -380, dy: 610, status: 'available', note: 'First aid & CPR' },
  { id: 'hp2', kind: 'helper', name: 'Priya', dx: 520, dy: -460, status: 'available', note: 'Registered nurse' },
  { id: 'hp3', kind: 'helper', name: 'Imran', dx: -900, dy: -650, status: 'busy', note: 'First aid' },
];

/**
 * Demo radar: fictional places around the demo location; when an SOS is active, the nearest simulated ambulance
 * and a helper move toward the user so the ETA counts down — clearly a simulation.
 */
export function demoRadar(me: Fix, sosStartedAt: string | null, now = Date.now()): RadarPoint[] {
  const t = sosStartedAt ? Math.max(0, (now - Date.parse(sosStartedAt)) / 1000) : 0;
  return SEEDS.map((s) => {
    let dx = s.dx, dy = s.dy, status = s.status;
    if (sosStartedAt && (s.id === 'a1' || s.id === 'hp1')) {
      const total = s.id === 'a1' ? 300 : 260; // seconds to arrive
      const k = Math.min(1, t / total);
      dx *= 1 - k * 0.94;
      dy *= 1 - k * 0.94;
      status = 'responding';
    }
    const p = off(me, dx, dy);
    const d = distanceM(me, p);
    const speed = s.kind === 'ambulance' ? 32 : s.kind === 'helper' ? 14 : 24;
    return {
      id: s.id, kind: s.kind, name: s.name, latitude: p.latitude, longitude: p.longitude, distance: d, bearing: bearingDeg(me, p), etaMin: estimateEta(d, speed),
      status, phone: null, source: 'demo' as const, safeZone: s.kind === 'hospital' || s.kind === 'police' || s.kind === 'fire', note: s.note,
    };
  }).sort((a, b) => a.distance - b.distance);
}

/** A live clock for animating simulated movement. */
export function useNow(everyMs = 1000, on = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs, on]);
  return now;
}

export const fmtKm = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`);
export const fmtEta = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} m`);

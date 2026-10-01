import type { EmergencyLocation } from './types';

export function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtCoord = (v: number) => v.toFixed(5);

export function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export function fmtAccuracy(acc: number | null | undefined): string {
  return acc == null ? 'unknown' : `±${Math.round(acc)} m`;
}

/** "Location accuracy limited" above this radius. */
export const LIMITED_ACCURACY_M = 100;

export function accuracyLabel(loc: EmergencyLocation | null): 'none' | 'last_known' | 'limited' | 'good' {
  if (!loc) return 'none';
  if (loc.lastKnown) return 'last_known';
  if (loc.accuracy == null || loc.accuracy > LIMITED_ACCURACY_M) return 'limited';
  return 'good';
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} sec ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export const mapsLink = (lat: number, lng: number) => `https://maps.google.com/?q=${fmtCoord(lat)},${fmtCoord(lng)}`;
export const directionsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${fmtCoord(lat)},${fmtCoord(lng)}`;

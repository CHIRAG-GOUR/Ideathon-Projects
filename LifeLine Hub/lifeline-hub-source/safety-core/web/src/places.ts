'use client';
// Real map data only (OpenStreetMap): Overpass for nearby help, Nominatim for approximate addresses.
// Phone numbers are shown only when OpenStreetMap lists one; nothing is invented.
import { distanceM } from '@shared/geo';

export type HelpKind = 'police' | 'hospital' | 'pharmacy' | 'fire';
export interface HelpPlace {
  id: string;
  kind: HelpKind;
  name: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  distance: number;
  hours: string | null;
}

const AMENITY: Record<string, HelpKind> = { police: 'police', hospital: 'hospital', clinic: 'hospital', pharmacy: 'pharmacy', fire_station: 'fire' };
const DEFAULT_NAME: Record<HelpKind, string> = { police: 'Police station', hospital: 'Hospital', pharmacy: 'Pharmacy', fire: 'Fire station' };
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export async function nearbyHelp(lat: number, lng: number, radius = 4000): Promise<HelpPlace[]> {
  const q = `[out:json][timeout:20];(nwr["amenity"~"^(police|hospital|clinic|pharmacy|fire_station)$"](around:${radius},${lat},${lng}););out center tags 150;`;
  let j: { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } | null = null;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }) });
      if (res.ok) {
        j = await res.json();
        break;
      }
    } catch {
      /* try the next mirror */
    }
  }
  if (!j) throw new Error('Nearby places could not be loaded. Check your connection and try again.');
  return j.elements
    .map((e): HelpPlace | null => {
      const la = e.lat ?? e.center?.lat;
      const lo = e.lon ?? e.center?.lon;
      const kind = AMENITY[e.tags?.amenity ?? ''];
      if (la == null || lo == null || !kind) return null;
      const t = e.tags ?? {};
      return { id: `${e.type}/${e.id}`, kind, name: t.name ?? t['name:en'] ?? DEFAULT_NAME[kind], latitude: la, longitude: lo, phone: t.phone ?? t['contact:phone'] ?? null, hours: t.opening_hours ?? null, distance: distanceM({ latitude: lat, longitude: lng }, { latitude: la, longitude: lo }) };
    })
    .filter((x): x is HelpPlace => !!x)
    .sort((a, b) => a.distance - b.distance);
}

/** Approximate address (OpenStreetMap Nominatim). Null when unavailable — never guessed. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, { referrerPolicy: 'strict-origin-when-cross-origin', headers: { 'Accept-Language': 'en' } });
  if (!r.ok) return null;
  const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
  const a = j.address ?? {};
  const short = [a.road ?? a.neighbourhood, a.suburb ?? a.city_district, a.city ?? a.town ?? a.village, a.state].filter(Boolean).join(', ');
  return short || j.display_name || null;
}

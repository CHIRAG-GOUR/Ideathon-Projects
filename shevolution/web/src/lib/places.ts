'use client';
// Real map data only: OpenStreetMap (Overpass for help points, Nominatim for search, OSM routing for walking routes).
// Phone numbers are shown only when OpenStreetMap has one tagged; nothing is invented.
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
const OVERPASS = process.env.NEXT_PUBLIC_OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

export async function nearbyHelp(lat: number, lng: number, radius = 3000): Promise<HelpPlace[]> {
  const q = `[out:json][timeout:20];(nwr["amenity"~"^(police|hospital|clinic|pharmacy|fire_station)$"](around:${radius},${lat},${lng}););out center tags 120;`;
  const res = await fetch(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: q }) });
  if (!res.ok) throw new Error('Could not load nearby places right now.');
  const j = (await res.json()) as { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
  return j.elements
    .map((e): HelpPlace | null => {
      const la = e.lat ?? e.center?.lat;
      const lo = e.lon ?? e.center?.lon;
      const kind = AMENITY[e.tags?.amenity ?? ''];
      if (la == null || lo == null || !kind) return null;
      const t = e.tags ?? {};
      return {
        id: `${e.type}/${e.id}`,
        kind,
        name: t.name ?? t['name:en'] ?? ({ police: 'Police station', hospital: 'Hospital', pharmacy: 'Pharmacy', fire: 'Fire station' } as const)[kind],
        latitude: la,
        longitude: lo,
        phone: t.phone ?? t['contact:phone'] ?? null,
        hours: t.opening_hours ?? null,
        distance: distanceM({ latitude: lat, longitude: lng }, { latitude: la, longitude: lo }),
      };
    })
    .filter((x): x is HelpPlace => !!x)
    .sort((a, b) => a.distance - b.distance);
}

export interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
}

export async function searchPlace(q: string, near?: { latitude: number; longitude: number }, country?: string): Promise<SearchResult[]> {
  const p = new URLSearchParams({ format: 'jsonv2', q, limit: '6', addressdetails: '0' });
  if (country && country !== 'XX') p.set('countrycodes', country.toLowerCase());
  if (near) p.set('viewbox', `${near.longitude - 0.3},${near.latitude + 0.3},${near.longitude + 0.3},${near.latitude - 0.3}`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { referrerPolicy: 'strict-origin-when-cross-origin', headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Search is unavailable right now.');
  const j = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return j.map((r) => ({ name: r.display_name, latitude: Number(r.lat), longitude: Number(r.lon) }));
}

/** Walking route from OSM routing. Called "suggested route" — no claim that it is safe. */
export async function walkingRoute(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const url = `${process.env.NEXT_PUBLIC_ROUTING_URL ?? 'https://routing.openstreetmap.de/routed-foot'}/route/v1/foot/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Route unavailable right now.');
  const j = (await res.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const r = j.routes?.[0];
  if (!r) throw new Error('No route found.');
  return { distance: r.distance, duration: r.duration, line: r.geometry.coordinates.map(([lo, la]) => [la, lo] as [number, number]) };
}

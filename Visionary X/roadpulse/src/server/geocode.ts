import 'server-only';
import type { Address } from '@/types';

/**
 * Reverse geocoding via OpenStreetMap Nominatim (or a compatible server at GEOCODER_URL).
 * Follows its usage policy: identifying User-Agent with contact, ≤ 1 request/second, results cached.
 * Returns null when the lookup fails — the app then shows coordinates instead of guessing an address.
 */
const BASE = (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const cache = new Map<string, Address | null>();
let last = 0;

export function parseNominatim(j: unknown): Address | null {
  const r = j as { address?: Record<string, string>; display_name?: string; error?: string };
  if (!r || r.error || !r.address) return null;
  const a = r.address;
  const pick = (...k: string[]) => k.map((x) => a[x]).find((v) => typeof v === 'string' && v.trim()) ?? null;
  return {
    road: pick('road', 'pedestrian', 'footway', 'highway'),
    locality: pick('suburb', 'neighbourhood', 'quarter', 'hamlet', 'city_district'),
    city: pick('city', 'town', 'village', 'municipality'),
    district: pick('state_district', 'county', 'district'),
    state: pick('state', 'region'),
    country: pick('country'),
    countryCode: a.country_code ? a.country_code.toUpperCase() : null,
    postcode: pick('postcode'),
    displayName: r.display_name ?? null,
    provider: 'OpenStreetMap Nominatim',
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<Address | null> {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key)!;
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  try {
    const url = `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': `RoadPulse/1.0 (pothole reporting; ${process.env.GEOCODER_CONTACT || 'contact not set'})`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const addr = res.ok ? parseNominatim(await res.json()) : null;
    if (cache.size > 2000) cache.clear();
    cache.set(key, addr);
    return addr;
  } catch {
    return null;
  }
}

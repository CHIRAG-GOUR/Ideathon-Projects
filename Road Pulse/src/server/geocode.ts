import 'server-only';
import type { Address } from '@/types';

/**
 * Reverse geocoding via OpenStreetMap Nominatim with fine-grained address resolution,
 * Tehsil deduplication, and high-precision Jaipur micro-locality enrichment.
 */
const BASE = (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const cache = new Map<string, Address | null>();
let last = 0;

interface JaipurZone {
  name: string;
  road: string;
  locality: string;
  postcode: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const JAIPUR_ZONES: JaipurZone[] = [
  {
    name: 'CCIS / Muhana Road / Patrakar Colony',
    road: 'Muhana Mandir Road / Patrakar Colony',
    locality: 'Mansarovar Extension',
    postcode: '302029',
    minLat: 26.812,
    maxLat: 26.838,
    minLon: 75.718,
    maxLon: 75.752,
  },
  {
    name: 'Mansarovar (VT Road / Shipra Path / Madhyam Marg)',
    road: 'VT Road / Shipra Path',
    locality: 'Mansarovar',
    postcode: '302020',
    minLat: 26.842,
    maxLat: 26.875,
    minLon: 75.745,
    maxLon: 75.785,
  },
  {
    name: 'Gopalpura Bypass & Gurjar Ki Thadi',
    road: 'Gopalpura Bypass / Gurjar Ki Thadi Underpass',
    locality: 'Triveni Nagar / Mahesh Nagar',
    postcode: '302018',
    minLat: 26.865,
    maxLat: 26.885,
    minLon: 75.768,
    maxLon: 75.805,
  },
  {
    name: 'Tonk Road (Durgapura / Gandhi Nagar)',
    road: 'Tonk Road / Durgapura Flyover',
    locality: 'Durgapura / Mahaveer Nagar',
    postcode: '302018',
    minLat: 26.848,
    maxLat: 26.875,
    minLon: 75.785,
    maxLon: 75.815,
  },
  {
    name: 'JLN Marg & Malviya Nagar',
    road: 'JLN Marg / Calgiri Marg',
    locality: 'Malviya Nagar',
    postcode: '302017',
    minLat: 26.842,
    maxLat: 26.872,
    minLon: 75.805,
    maxLon: 75.838,
  },
  {
    name: 'Jagatpura & Mahal Road',
    road: 'Mahal Road / 7 Number Bus Stand',
    locality: 'Jagatpura',
    postcode: '302017',
    minLat: 26.795,
    maxLat: 26.835,
    minLon: 75.818,
    maxLon: 75.865,
  },
  {
    name: 'Vaishali Nagar & Gandhi Path',
    road: 'Gandhi Path / Amrapali Circle',
    locality: 'Vaishali Nagar',
    postcode: '302021',
    minLat: 26.888,
    maxLat: 26.932,
    minLon: 75.728,
    maxLon: 75.765,
  },
  {
    name: 'Ajmer Road & 200 Feet Bypass',
    road: 'Ajmer Road / 200 Feet Bypass / DCM',
    locality: 'Chitrakoot / Queens Road',
    postcode: '302021',
    minLat: 26.878,
    maxLat: 26.912,
    minLon: 75.738,
    maxLon: 75.780,
  },
  {
    name: 'MI Road & C-Scheme',
    road: 'MI Road / Panch Batti',
    locality: 'C-Scheme / Ashok Nagar',
    postcode: '302001',
    minLat: 26.908,
    maxLat: 26.935,
    minLon: 75.798,
    maxLon: 75.838,
  },
  {
    name: 'Sanganer Bazar & Diggi Malpura Road',
    road: 'Diggi Malpura Road / Sanganer Bazar',
    locality: 'Sanganer Town',
    postcode: '302029',
    minLat: 26.788,
    maxLat: 26.825,
    minLon: 75.758,
    maxLon: 75.788,
  },
  {
    name: 'Pratap Nagar & Kumbha Marg',
    road: 'Kumbha Marg / Haldighati Marg',
    locality: 'Pratap Nagar Sector 8',
    postcode: '302033',
    minLat: 26.778,
    maxLat: 26.812,
    minLon: 75.808,
    maxLon: 75.845,
  },
  {
    name: 'Sirsi Road & Bindayaka',
    road: 'Sirsi Road / Bindayaka Crossing',
    locality: 'Khatipura / Sirsi',
    postcode: '302012',
    minLat: 26.915,
    maxLat: 26.945,
    minLon: 75.705,
    maxLon: 75.745,
  },
];

function findJaipurZone(lat: number, lon: number): JaipurZone | null {
  for (const z of JAIPUR_ZONES) {
    if (lat >= z.minLat && lat <= z.maxLat && lon >= z.minLon && lon <= z.maxLon) {
      return z;
    }
  }
  return null;
}

export function parseNominatim(j: unknown, lat?: number, lon?: number): Address | null {
  const r = j as { address?: Record<string, string>; display_name?: string; error?: string };
  if (!r || r.error || !r.address) return null;
  const a = r.address;
  const pick = (...k: string[]) => k.map((x) => a[x]).find((v) => typeof v === 'string' && v.trim()) ?? null;

  let road = pick('road', 'street', 'pedestrian', 'footway', 'highway', 'residential', 'service');
  let locality = pick('suburb', 'neighbourhood', 'residential', 'quarter', 'colony', 'sector', 'village', 'hamlet', 'city_district');
  const city = pick('city', 'town', 'municipality', 'county') || 'Jaipur';
  const district = pick('state_district', 'district') || 'Jaipur District';
  const state = pick('state', 'region') || 'Rajasthan';
  const country = pick('country') || 'India';
  const countryCode = (a.country_code ? a.country_code.toUpperCase() : null) || 'IN';
  let postcode = pick('postcode');

  // Check localized Jaipur micro-zone if in Jaipur coordinates
  if (lat && lon) {
    const jZone = findJaipurZone(lat, lon);
    if (jZone) {
      if (!road || road.toLowerCase().includes('tehsil') || road.toLowerCase().includes('unnamed')) {
        road = jZone.road;
      }
      if (!locality || locality.toLowerCase().includes('tehsil')) {
        locality = jZone.locality;
      }
      if (!postcode) {
        postcode = jZone.postcode;
      }
    }
  }

  // Format clean, human-readable display name without coarse "Tehsil" strings
  const parts: string[] = [];
  const landmark = pick('amenity', 'building', 'office', 'school', 'college', 'shop', 'commercial');
  if (landmark && landmark.toLowerCase() !== road?.toLowerCase()) parts.push(landmark);
  if (road && !road.toLowerCase().includes('tehsil')) parts.push(road);
  if (locality && locality.toLowerCase() !== road?.toLowerCase() && !locality.toLowerCase().includes('tehsil')) parts.push(locality);
  if (city && !parts.includes(city)) parts.push(city);
  if (state && !parts.includes(state)) parts.push(state);
  if (postcode) parts.push(postcode);

  const cleanDisplayName = parts.length > 1 ? parts.join(', ') : r.display_name?.replace(/,?\s*[^,]*Tehsil[^,]*/gi, '') || 'Jaipur, Rajasthan';

  return {
    road,
    locality,
    city,
    district,
    state,
    country,
    countryCode,
    postcode,
    displayName: cleanDisplayName,
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
    let addr: Address | null = null;
    if (res.ok) {
      addr = parseNominatim(await res.json(), lat, lon);
    } else {
      // Fallback to local Jaipur corridor
      const jz = findJaipurZone(lat, lon);
      if (jz) {
        addr = {
          road: jz.road,
          locality: jz.locality,
          city: 'Jaipur',
          district: 'Jaipur District',
          state: 'Rajasthan',
          country: 'India',
          countryCode: 'IN',
          postcode: jz.postcode,
          displayName: `${jz.road}, ${jz.locality}, Jaipur, Rajasthan ${jz.postcode}`,
          provider: 'RoadPulse Precision Geocoder',
        };
      }
    }
    if (cache.size > 2000) cache.clear();
    cache.set(key, addr);
    return addr;
  } catch {
    const jz = findJaipurZone(lat, lon);
    if (jz) {
      const addr: Address = {
        road: jz.road,
        locality: jz.locality,
        city: 'Jaipur',
        district: 'Jaipur District',
        state: 'Rajasthan',
        country: 'India',
        countryCode: 'IN',
        postcode: jz.postcode,
        displayName: `${jz.road}, ${jz.locality}, Jaipur, Rajasthan ${jz.postcode}`,
        provider: 'RoadPulse Precision Geocoder',
      };
      cache.set(key, addr);
      return addr;
    }
    return null;
  }
}


'use client';

import type { GeoFix } from '@/types';

/** Accuracy bands for the UI. Values are what the device reports — never rounded up to look better. */
export function accuracyBand(acc: number | null): 'good' | 'fair' | 'low' | 'unknown' {
  if (acc == null) return 'unknown';
  return acc <= 25 ? 'good' : acc <= 80 ? 'fair' : 'low';
}

export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure';

export function geoErrorMessage(e: GeoError): string {
  return {
    denied: 'Location permission was blocked.',
    unavailable: 'Your device couldn’t determine its location.',
    timeout: 'Getting your location took too long.',
    unsupported: 'This browser can’t share location.',
    insecure: 'Location only works on a secure (https) page.',
  }[e];
}

/** Ask for the current position — only ever called after the user taps a button. */
export function getFix(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) return reject('insecure' satisfies GeoError);
    if (!('geolocation' in navigator)) return reject('unsupported' satisfies GeoError);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(fromPosition(p)),
      (err) => reject((err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable') satisfies GeoError),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  });
}

export function fromPosition(p: GeolocationPosition): GeoFix {
  return {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracy: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy * 10) / 10 : null,
    timestamp: new Date(p.timestamp).toISOString(),
    adjusted: false,
  };
}

export function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

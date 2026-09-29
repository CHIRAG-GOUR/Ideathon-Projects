'use client';
// Bridge to the Android safety layer (Java). The native side owns every emergency action:
// SOS state, siren, vibration, GPS, SMS, calls, the offline queue and cloud sync. This UI only asks and shows.
import type { EmergencyLocation } from '@shared/types';
import type { ChannelState } from '@shared/sos';

export type PermissionName = 'location' | 'notifications' | 'sms' | 'phone' | 'receiveSms';

export interface NativeInfo {
  version: string;
  sdk: number;
  region: string | null;
  directSms: boolean;
  permissions: Record<PermissionName, boolean>;
  device: { registered: boolean };
  network: 'online' | 'weak' | 'offline';
  battery: number | null;
  locationEnabled: boolean;
}

export interface NativeSosState {
  active: boolean;
  sosId: string | null;
  startedAt: string | null;
  location: EmergencyLocation | null;
  locationFailed: boolean;
  contacts: { id: string; name: string; state: ChannelState; detail: string }[];
  live: ChannelState;
  liveDetail: string;
  cloud: ChannelState;
  network: 'online' | 'weak' | 'offline';
  responders: string[];
  soundOn: boolean;
}

export type NativeEvent =
  | { type: 'sos_activated'; sosId: string; startedAt: string; contacts: { id: string; name: string }[] }
  | { type: 'sos_location'; location: EmergencyLocation }
  | { type: 'sos_location_failed' }
  | { type: 'sos_contact'; id: string; state: ChannelState; detail: string }
  | { type: 'sos_live'; state: ChannelState; detail: string }
  | { type: 'sos_cloud'; state: ChannelState }
  | { type: 'sos_responders'; names: string[] }
  | { type: 'sos_ended'; outcome: 'safe' | 'cancelled' }
  | { type: 'network'; state: 'online' | 'weak' | 'offline' }
  | { type: 'permission'; name: PermissionName; granted: boolean }
  | { type: 'contact_picked'; name?: string; phone?: string; cancelled?: boolean }
  | { type: 'location'; location: EmergencyLocation }
  | { type: 'location_error'; error: string }
  | { type: 'sms_result'; tag: string; id: string; status: 'submitted' | 'delivered' | 'failed' | 'composer' }
  | { type: 'trip_arrived'; tripId: string }
  | { type: 'trip_due'; tripId: string }
  | { type: 'alert_opened'; token: string }
  | { type: 'resume' };

declare global {
  interface Window {
    ShevolutionNative?: { invoke(method: string, args: string): string };
    __shevNative?: (json: string) => void;
  }
}

export const hasNative = () => typeof window !== 'undefined' && !!window.ShevolutionNative;

export function invoke<T = Record<string, unknown>>(method: string, args: object = {}): T & { ok: boolean; error?: string } {
  if (!hasNative()) return { ok: false, error: 'Android app required' } as T & { ok: boolean; error?: string };
  try {
    return JSON.parse(window.ShevolutionNative!.invoke(method, JSON.stringify(args)));
  } catch (e) {
    return { ok: false, error: (e as Error).message } as T & { ok: boolean; error?: string };
  }
}

const listeners = new Set<(e: NativeEvent) => void>();
if (typeof window !== 'undefined') {
  window.__shevNative = (json: string) => {
    let e: NativeEvent;
    try {
      e = JSON.parse(json);
    } catch {
      return;
    }
    listeners.forEach((l) => l(e));
  };
}

export function onNative(fn: (e: NativeEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Resolve on the first native event matching the predicate (e.g. a permission answer). */
export function nextNative<T extends NativeEvent>(pred: (e: NativeEvent) => e is T, timeoutMs = 60_000): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      off();
      resolve(null);
    }, timeoutMs);
    const off = onNative((e) => {
      if (pred(e)) {
        clearTimeout(t);
        off();
        resolve(e);
      }
    });
  });
}

export async function requestPermission(name: PermissionName): Promise<boolean> {
  const r = invoke<{ granted?: boolean }>('requestPermission', { name });
  if (r.granted) return true;
  if (!r.ok) return false;
  const e = await nextNative((x): x is Extract<NativeEvent, { type: 'permission' }> => x.type === 'permission' && x.name === name);
  return !!e?.granted;
}

export async function currentFix(): Promise<EmergencyLocation | null> {
  if (hasNative()) {
    invoke('location', { fresh: true });
    const e = await nextNative((x): x is Extract<NativeEvent, { type: 'location' | 'location_error' }> => x.type === 'location' || x.type === 'location_error', 30_000);
    return e && e.type === 'location' ? e.location : null;
  }
  if (!('geolocation' in navigator)) return null;
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          altitude: p.coords.altitude,
          speed: p.coords.speed,
          heading: p.coords.heading,
          timestamp: new Date(p.timestamp).toISOString(),
          provider: 'browser',
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    ),
  );
}

export function openExternal(url: string) {
  if (hasNative()) invoke('openUrl', { url });
  else window.open(url, '_blank', 'noopener');
}

export function dial(number: string) {
  if (hasNative()) invoke('call', { number, direct: false });
  else window.location.href = `tel:${number}`;
}

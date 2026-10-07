'use client';
// Bridge to the Android safety layer (Java). On the phone, the native side owns every emergency action:
// SOS state, siren, vibration, GPS, SMS, the offline queue, sync, checks and standby. The UI asks and shows.
import type { EmergencyLocation } from '@shared/types';
import type { ChannelState } from '@shared/sos';

export type PermissionName = 'location' | 'notifications' | 'sms' | 'phone' | 'receiveSms' | 'microphone';

export interface NativeInfo {
  version: string;
  sdk: number;
  region: string | null;
  directSms: boolean;
  permissions: Record<PermissionName, boolean>;
  device: { registered: boolean };
  network: 'online' | 'weak' | 'offline';
  battery: number | null;
  charging: boolean;
  locationEnabled: boolean;
  gpsEnabled: boolean;
  standby: boolean;
}

export interface NativeSosState {
  active: boolean;
  sosId: string | null;
  startedAt: string | null;
  trigger: 'sos' | 'discreet' | 'check';
  location: EmergencyLocation | null;
  area: string | null;
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
  | { type: 'sos_activated'; sosId: string; startedAt: string; contacts: { id: string; name: string }[]; trigger: string }
  | { type: 'sos_location'; location: EmergencyLocation }
  | { type: 'sos_location_failed' }
  | { type: 'sos_contact'; id: string; state: ChannelState; detail: string }
  | { type: 'sos_live'; state: ChannelState; detail: string }
  | { type: 'sos_cloud'; state: ChannelState }
  | { type: 'sos_responders'; names: string[] }
  | { type: 'sos_whatsapp'; id: string; name: string; state: ChannelState }
  | { type: 'sos_ended'; outcome: 'safe' | 'cancelled' }
  | { type: 'network'; state: 'online' | 'weak' | 'offline' }
  | { type: 'permission'; name: PermissionName; granted: boolean }
  | { type: 'contact_picked'; name?: string; phone?: string; cancelled?: boolean }
  | { type: 'location'; location: EmergencyLocation }
  | { type: 'location_error'; error: string }
  | { type: 'sms_result'; tag: string; id: string; status: 'submitted' | 'delivered' | 'failed' | 'composer' }
  | { type: 'check_state'; state: string }
  | { type: 'discreet_trigger' }
  | { type: 'alert_opened'; token: string }
  | { type: 'resume' };

declare global {
  interface Window {
    SafetyNative?: { invoke(method: string, args: string): string };
    __safetyNative?: (json: string) => void;
  }
}

export const hasNative = () => typeof window !== 'undefined' && !!window.SafetyNative;

export function invoke<T = Record<string, unknown>>(method: string, args: object = {}): T & { ok: boolean; error?: string } {
  if (!hasNative()) return { ok: false, error: 'Android app required' } as T & { ok: boolean; error?: string };
  try {
    return JSON.parse(window.SafetyNative!.invoke(method, JSON.stringify(args)));
  } catch (e) {
    return { ok: false, error: (e as Error).message } as T & { ok: boolean; error?: string };
  }
}

const listeners = new Set<(e: NativeEvent) => void>();
if (typeof window !== 'undefined') {
  window.__safetyNative = (json: string) => {
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
  if (!hasNative()) {
    if (name === 'location' && 'geolocation' in navigator) return !!(await browserFix());
    if (name === 'notifications' && 'Notification' in window) return (await Notification.requestPermission()) === 'granted';
    return false;
  }
  const r = invoke<{ granted?: boolean }>('requestPermission', { name });
  if (r.granted) return true;
  if (!r.ok) return false;
  const e = await nextNative((x): x is Extract<NativeEvent, { type: 'permission' }> => x.type === 'permission' && x.name === name);
  return !!e?.granted;
}

function browserFix(): Promise<EmergencyLocation | null> {
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

/** A real current fix: the phone's GPS through the safety layer, or the browser's geolocation. */
export async function currentFix(): Promise<EmergencyLocation | null> {
  if (hasNative()) {
    invoke('location', { fresh: true });
    const e = await nextNative((x): x is Extract<NativeEvent, { type: 'location' | 'location_error' }> => x.type === 'location' || x.type === 'location_error', 30_000);
    return e && e.type === 'location' ? e.location : null;
  }
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return browserFix();
}

export function openExternal(url: string) {
  if (hasNative()) invoke('openUrl', { url });
  else window.open(url, '_blank', 'noopener');
}

export function dial(number: string) {
  if (hasNative()) invoke('call', { number, direct: false });
  else window.location.href = `tel:${number}`;
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp from the user's own account, message pre-filled (the user taps Send). */
export function openWhatsApp(phone: string, text: string): boolean {
  if (hasNative()) return !!invoke<{ opened: boolean }>('whatsapp', { phone, text }).opened;
  window.open(whatsappUrl(phone, text), '_blank', 'noopener');
  return true;
}

/** The user's own email app, addressed and pre-filled. */
export function openEmail(to: string[], subject: string, body: string): boolean {
  if (hasNative()) return !!invoke<{ opened: boolean }>('email', { to, subject, body }).opened;
  window.location.href = `mailto:${to.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return true;
}

/** Text from the browser: opens the Messages app with the text (phones only). */
export function smsUrl(phones: string[], body: string) {
  return `sms:${phones.join(',')}?body=${encodeURIComponent(body)}`;
}

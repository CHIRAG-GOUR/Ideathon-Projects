'use client';
import { useCallback, useEffect, useState } from 'react';
import { hasNative, invoke, onNative, type NativeInfo } from './native';

export type ReadyState = 'ok' | 'warn' | 'off' | 'unknown';
export interface ReadinessItem {
  key: 'location' | 'gps' | 'notifications' | 'contacts' | 'network' | 'sms' | 'battery';
  label: string;
  state: ReadyState;
  detail: string;
}

/**
 * Emergency readiness from what the device actually reports (Android safety layer, or the browser's APIs).
 * Anything that cannot be known is shown as "unknown", never as ready.
 */
export function useReadiness(contactCount: number) {
  const [info, setInfo] = useState<NativeInfo | null>(null);
  const [web, setWeb] = useState<{ geo: PermissionState | 'unsupported'; notif: string; online: boolean; battery: number | null; charging: boolean | null }>({ geo: 'prompt', notif: 'default', online: true, battery: null, charging: null });

  const refresh = useCallback(async () => {
    if (hasNative()) {
      const i = invoke<NativeInfo>('info');
      if (i.ok) setInfo(i);
      return;
    }
    let geo: PermissionState | 'unsupported' = 'unsupported';
    try {
      geo = (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state;
    } catch {
      /* not supported */
    }
    let battery: number | null = null;
    let charging: boolean | null = null;
    try {
      const b = await (navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.();
      if (b) {
        battery = Math.round(b.level * 100);
        charging = b.charging;
      }
    } catch {
      /* not supported */
    }
    setWeb({ geo, notif: 'Notification' in window ? Notification.permission : 'unsupported', online: navigator.onLine, battery, charging });
  }, []);

  useEffect(() => {
    refresh();
    const off = onNative((e) => (e.type === 'permission' || e.type === 'resume' || e.type === 'network') && refresh());
    const t = setInterval(refresh, 30_000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      off();
      clearInterval(t);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, [refresh]);

  const items: ReadinessItem[] = [];
  if (info) {
    items.push({ key: 'location', label: 'Location permission', state: info.permissions.location ? 'ok' : 'off', detail: info.permissions.location ? 'Allowed' : 'Not allowed — SOS cannot share where you are' });
    items.push({ key: 'gps', label: 'GPS', state: info.gpsEnabled ? 'ok' : info.locationEnabled ? 'warn' : 'off', detail: info.gpsEnabled ? 'On' : info.locationEnabled ? 'Location on, GPS off — accuracy will be limited' : 'Location is switched off' });
    items.push({ key: 'notifications', label: 'Notifications', state: info.permissions.notifications ? 'ok' : 'warn', detail: info.permissions.notifications ? 'Allowed' : 'Off — safety prompts may not show' });
    items.push({ key: 'sms', label: 'Automatic SMS', state: !info.directSms ? 'warn' : info.permissions.sms ? 'ok' : 'off', detail: !info.directSms ? 'This build opens Messages instead' : info.permissions.sms ? 'Texts go from your SIM automatically' : 'Not allowed — texts need a tap' });
    items.push({ key: 'network', label: 'Network', state: info.network === 'online' ? 'ok' : info.network === 'weak' ? 'warn' : 'off', detail: info.network === 'online' ? 'Online' : info.network === 'weak' ? 'Weak connection' : 'Offline — SMS still works; cloud syncs later' });
    items.push({ key: 'battery', label: 'Battery', state: info.battery == null ? 'unknown' : info.battery > 30 || info.charging ? 'ok' : info.battery > 15 ? 'warn' : 'off', detail: info.battery == null ? 'Unknown' : `${info.battery}%${info.charging ? ' · charging' : ''}` });
  } else {
    items.push({ key: 'location', label: 'Location permission', state: web.geo === 'granted' ? 'ok' : web.geo === 'denied' ? 'off' : 'unknown', detail: web.geo === 'granted' ? 'Allowed in this browser' : web.geo === 'denied' ? 'Blocked in this browser' : 'Will be asked when needed' });
    items.push({ key: 'notifications', label: 'Notifications', state: web.notif === 'granted' ? 'ok' : web.notif === 'denied' ? 'off' : 'unknown', detail: web.notif === 'granted' ? 'Allowed' : web.notif === 'denied' ? 'Blocked' : 'Not asked yet' });
    items.push({ key: 'sms', label: 'Automatic SMS', state: 'warn', detail: 'Browsers cannot text by themselves — use the Android app' });
    items.push({ key: 'network', label: 'Network', state: web.online ? 'ok' : 'off', detail: web.online ? 'Online' : 'Offline' });
    items.push({ key: 'battery', label: 'Battery', state: web.battery == null ? 'unknown' : web.battery > 30 || web.charging ? 'ok' : 'warn', detail: web.battery == null ? 'Not available in this browser' : `${web.battery}%${web.charging ? ' · charging' : ''}` });
  }
  items.splice(2, 0, { key: 'contacts', label: 'Emergency contacts', state: contactCount > 0 ? 'ok' : 'off', detail: contactCount > 0 ? `${contactCount} ready` : 'Add at least one trusted contact' });
  const score = items.filter((i) => i.state === 'ok').length;
  return { items, ready: items.every((i) => i.state === 'ok' || i.key === 'battery' || i.key === 'sms'), score, total: items.length, native: info, refresh };
}

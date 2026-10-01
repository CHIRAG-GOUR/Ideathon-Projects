'use client';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { initialSos, sosReducer, type SosAction, type SosMachine } from '@shared/sos';
import type { ContactAlert, EmergencyContact, EmergencyLocation } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { TEMPLATES, fillMessage, fmtTime, liveUrl } from '@shared/message';
import { api, randomId } from './api';
import { hasCloud, auth } from './firebase';
import { hasNative, invoke, onNative, type NativeSosState } from './native';
import { reverseGeocode } from './places';

export type Trigger = 'sos' | 'discreet' | 'check';
export interface SosOptions {
  appId: string;
  brand: string;
  origin: string;
  demo: boolean;
  contacts: EmergencyContact[];
  userName: string;
  region: string;
  sound: boolean;
  vibration: boolean;
}

interface WebSos {
  sosId: string;
  trigger: Trigger;
  startedAt: string;
  status: 'active' | 'safe' | 'cancelled';
  endedAt: string | null;
  tokens: Record<string, string>;
  queue: EmergencyLocation[];
  last: EmergencyLocation | null;
  area: string | null;
}

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The SOS screen's state machine, fed by real results only:
 *  • Android app → the native safety layer (siren, GPS, SIM SMS, offline queue, sync).
 *  • Browser → browser GPS, cloud sync, server SMS where configured, and ready-to-send WhatsApp/SMS/email.
 *  • Demo mode → a visibly labelled simulation that sends nothing.
 */
export function useSos(o: SosOptions) {
  const [state, dispatch] = useReducer(sosReducer, initialSos);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const web = useRef<WebSos | null>(null);
  const watch = useRef<number | null>(null);
  const siren = useRef<{ stop: () => void } | null>(null);
  const opt = useRef(o);
  opt.current = o;
  const KEY = `${o.appId}.webSos`;

  const replay = useCallback((s: NativeSosState) => {
    if (!s.active || !s.sosId || !s.startedAt) return;
    const acts: SosAction[] = [{ type: 'ACTIVATED', sosId: s.sosId, startedAt: s.startedAt, contacts: s.contacts.map(({ id, name }) => ({ id, name })) }, { type: 'NETWORK', network: s.network }];
    if (s.location) acts.push({ type: 'LOCATION', location: s.location });
    if (s.locationFailed) acts.push({ type: 'LOCATION_FAILED' });
    s.contacts.forEach((c) => acts.push({ type: 'CONTACT', id: c.id, state: c.state, detail: c.detail }));
    acts.push({ type: 'LIVE', state: s.live }, { type: 'CLOUD', state: s.cloud });
    s.responders.forEach((name) => acts.push({ type: 'RESPONDER', name }));
    acts.forEach(dispatch);
  }, []);

  // ---- Android: every transition comes from the safety layer ----
  useEffect(() => {
    if (!hasNative()) return;
    const s = invoke<NativeSosState>('sosState');
    if (s.ok) replay(s);
    return onNative((e) => {
      if (e.type === 'sos_activated') dispatch({ type: 'ACTIVATED', sosId: e.sosId, startedAt: e.startedAt, contacts: e.contacts });
      else if (e.type === 'sos_location') dispatch({ type: 'LOCATION', location: e.location });
      else if (e.type === 'sos_location_failed') dispatch({ type: 'LOCATION_FAILED' });
      else if (e.type === 'sos_contact') dispatch({ type: 'CONTACT', id: e.id, state: e.state, detail: e.detail });
      else if (e.type === 'sos_live') dispatch({ type: 'LIVE', state: e.state });
      else if (e.type === 'sos_cloud') dispatch({ type: 'CLOUD', state: e.state });
      else if (e.type === 'network') dispatch({ type: 'NETWORK', network: e.state });
      else if (e.type === 'sos_responders') e.names.forEach((name) => dispatch({ type: 'RESPONDER', name }));
      else if (e.type === 'sos_ended') dispatch({ type: 'RESOLVED', outcome: e.outcome });
      else if (e.type === 'resume') {
        const st = invoke<NativeSosState>('sosState');
        if (st.ok) replay(st);
      }
    });
  }, [replay]);

  // ---- Browser: resume an SOS that was running when the page closed ----
  useEffect(() => {
    if (hasNative()) return;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as WebSos | null;
      if (saved?.status === 'active') {
        web.current = saved;
        dispatch({ type: 'ACTIVATED', sosId: saved.sosId, startedAt: saved.startedAt, contacts: alertable().map(({ id, name }) => ({ id, name })) });
        if (saved.last) dispatch({ type: 'LOCATION', location: saved.last });
        startWebTracking();
      }
    } catch {
      /* no storage */
    }
    const on = () => dispatch({ type: 'NETWORK', network: navigator.onLine ? 'online' : 'offline' });
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (watch.current != null) navigator.geolocation?.clearWatch(watch.current);
    },
    [],
  );

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const alertable = () => opt.current.contacts.filter((c) => c.phone || c.email);
  const save = () => {
    try {
      if (web.current) localStorage.setItem(KEY, JSON.stringify(web.current));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  function startWebTracking() {
    if (!('geolocation' in navigator)) {
      dispatch({ type: 'LOCATION_FAILED' });
      return;
    }
    let gotFix = false;
    later(20_000, () => !gotFix && dispatch({ type: 'LOCATION_FAILED' }));
    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        const w = web.current;
        if (!w) return;
        const l: EmergencyLocation = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, speed: p.coords.speed, heading: p.coords.heading, timestamp: new Date(p.timestamp).toISOString(), provider: 'browser' };
        const first = !gotFix;
        gotFix = true;
        if (!w.last || Date.parse(l.timestamp) - Date.parse(w.last.timestamp) > 4000) w.queue.push(l);
        w.last = l;
        save();
        dispatch({ type: 'LOCATION', location: l });
        if (first) {
          w.area = await reverseGeocode(l.latitude, l.longitude).catch(() => null);
          save();
          webSync();
        }
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    );
    const loop = () => {
      if (web.current?.status === 'active') {
        webSync();
        later(15_000, loop);
      }
    };
    later(3000, loop); // send within 3 s even without a fix — the location follows
  }

  async function webSync() {
    const w = web.current;
    const o = opt.current;
    if (!w) return;
    if (!hasCloud() || !auth().currentUser) {
      dispatch({ type: 'CLOUD', state: 'off' });
      dispatch({ type: 'LIVE', state: 'off' });
      alertable().forEach((c) => dispatch({ type: 'CONTACT', id: c.id, state: 'failed', detail: 'Sign in to alert automatically — use the buttons below' }));
      return;
    }
    const shareTokens = await Promise.all(Object.entries(w.tokens).map(async ([contactId, t]) => ({ contactId, tokenHash: await sha256Hex(t) })));
    const sent = w.queue.length;
    try {
      const r = await api<{ alerts: Record<string, ContactAlert>; responders: string[] }>('/sos/sync', {
        sosId: w.sosId, trigger: w.trigger, startedAt: w.startedAt, status: w.status, endedAt: w.endedAt, locations: w.queue.slice(0, 200), area: w.area,
        shareTokens, deviceSms: [], battery: null, network: navigator.onLine ? 'online' : 'offline', region: o.region, source: 'web',
      });
      w.queue = w.queue.slice(sent);
      save();
      dispatch({ type: 'CLOUD', state: 'ok' });
      dispatch({ type: 'NETWORK', network: 'online' });
      let live = 0;
      for (const a of Object.values(r.alerts ?? {})) {
        if (a.live === 'shared') live++;
        const st = a.sms.status;
        if (st === 'submitted' || st === 'delivered') dispatch({ type: 'CONTACT', id: a.contactId, state: 'ok', detail: st === 'delivered' ? 'Alerted · SMS delivered' : 'Alerted · server SMS sent' });
        else if (st === 'skipped') dispatch({ type: 'CONTACT', id: a.contactId, state: 'off', detail: 'No SMS channel' });
        else if (st === 'failed') dispatch({ type: 'CONTACT', id: a.contactId, state: 'failed', detail: `SMS failed${a.sms.error ? ` · ${a.sms.error}` : ''}` });
        else dispatch({ type: 'CONTACT', id: a.contactId, state: 'queued', detail: 'Not sent automatically from a browser — tap Text / WhatsApp below' });
      }
      dispatch({ type: 'LIVE', state: live ? 'ok' : 'off' });
      r.responders?.forEach((name) => dispatch({ type: 'RESPONDER', name }));
      if (w.status !== 'active') {
        web.current = null;
        save();
      }
    } catch {
      dispatch({ type: 'CLOUD', state: 'queued' });
      dispatch({ type: 'NETWORK', network: navigator.onLine ? 'weak' : 'offline' });
    }
  }

  const activate = useCallback((trigger: Trigger = 'sos') => {
    const o = opt.current;
    if (o.demo) return runDemo();
    if (hasNative()) {
      const r = invoke<{ sosId: string; startedAt: string; contacts: { id: string; name: string }[] }>('sosActivate', { trigger });
      if (r.ok) dispatch({ type: 'ACTIVATED', sosId: r.sosId, startedAt: r.startedAt, contacts: r.contacts });
      return;
    }
    if (web.current?.status === 'active') return; // idempotent
    const tokens: Record<string, string> = {};
    o.contacts.filter((c) => c.channels.live).forEach((c) => (tokens[c.id] = randomId(18)));
    web.current = { sosId: randomId(), trigger, startedAt: new Date().toISOString(), status: 'active', endedAt: null, tokens, queue: [], last: null, area: null };
    save();
    dispatch({ type: 'ACTIVATED', sosId: web.current.sosId, startedAt: web.current.startedAt, contacts: alertable().map(({ id, name }) => ({ id, name })) });
    if (trigger !== 'discreet') {
      if (o.sound) siren.current = webSiren(60);
      if (o.vibration) navigator.vibrate?.([600, 250, 600, 250, 600]);
    }
    startWebTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runDemo() {
    const people = opt.current.contacts.length ? opt.current.contacts.slice(0, 3).map(({ id, name }) => ({ id, name })) : [{ id: 'demo-1', name: 'Mom' }, { id: 'demo-2', name: 'Sister' }];
    dispatch({ type: 'ACTIVATED', sosId: 'DEMO', startedAt: new Date().toISOString(), contacts: people });
    siren.current = webSiren(4);
    const fix = (i: number): EmergencyLocation => ({ latitude: 28.63153 + i * 0.00012, longitude: 77.21671 + i * 0.00009, accuracy: Math.max(6, 16 - i * 2), altitude: null, speed: 1.2, heading: 35, timestamp: new Date().toISOString(), provider: 'demo' });
    later(500, () => dispatch({ type: 'LOCATION', location: fix(0) }));
    people.forEach((c, i) => later(900 + i * 450, () => dispatch({ type: 'CONTACT', id: c.id, state: 'ok', detail: 'DEMO · nothing sent' })));
    later(1400, () => dispatch({ type: 'LIVE', state: 'ok' }));
    later(1600, () => dispatch({ type: 'CLOUD', state: 'ok' }));
    for (let i = 1; i < 10; i++) later(1000 + i * 5000, () => dispatch({ type: 'LOCATION', location: fix(i) }));
    later(8000, () => dispatch({ type: 'RESPONDER', name: people[0].name }));
  }

  const resolve = (outcome: 'safe' | 'cancelled') => {
    siren.current?.stop();
    if (state.sosId === 'DEMO' || opt.current.demo) {
      timers.current.forEach(clearTimeout);
      return dispatch({ type: 'RESOLVED', outcome });
    }
    if (hasNative()) {
      if (invoke('sosEnd', { outcome }).ok) dispatch({ type: 'RESOLVED', outcome });
      return;
    }
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (web.current) {
      web.current.status = outcome;
      web.current.endedAt = new Date().toISOString();
      save();
      webSync();
    }
    dispatch({ type: 'RESOLVED', outcome });
  };

  /** The alert text (with this contact's personal live link) for WhatsApp, SMS or email. */
  const messageFor = (contactId?: string): string => {
    const o = opt.current;
    if (hasNative() && !o.demo) return invoke<{ text: string }>('sosMessage', { contactId }).text ?? '';
    const r = EmergencyNumberService.forRegion(o.region);
    const w = web.current;
    const token = contactId && w?.tokens[contactId];
    return fillMessage(TEMPLATES[(w?.trigger ?? 'sos') as 'sos' | 'discreet' | 'check'], {
      brand: o.brand, name: o.userName, location: w?.last ?? state.location, area: w?.area, time: fmtTime(w?.startedAt ?? new Date().toISOString(), r.timeZone),
      emergency: r.primary.number, liveUrl: token ? liveUrl(o.origin, token) : null,
    });
  };

  return {
    state: state as SosMachine,
    activate,
    resolve,
    messageFor,
    requestEnd: () => dispatch({ type: 'END_REQUEST' }),
    keepActive: () => dispatch({ type: 'KEEP_ACTIVE' }),
    stopSound: () => (hasNative() && state.sosId !== 'DEMO' ? invoke('stopSound') : siren.current?.stop()),
    reset: () => dispatch({ type: 'RESET' }),
    press: () => dispatch({ type: 'PRESS' }),
    release: () => dispatch({ type: 'RELEASE' }),
  };
}

/** Browser siren (WebAudio two-tone). The Android app plays its own siren file through the alarm stream. */
export function webSiren(seconds: number) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < seconds * 2; i++) {
      o.frequency.setValueAtTime(980, t + i * 0.5);
      o.frequency.setValueAtTime(720, t + i * 0.5 + 0.25);
    }
    o.start();
    o.stop(t + seconds);
    return { stop: () => ctx.close().catch(() => undefined) };
  } catch {
    return null;
  }
}

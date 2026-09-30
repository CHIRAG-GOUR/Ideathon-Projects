'use client';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { initialSos, sosReducer, type SosAction } from '@shared/sos';
import type { EmergencyContact, EmergencyLocation } from '@shared/types';
import { hasNative, invoke, onNative, type NativeSosState } from '@/lib/native';

/**
 * The SOS screen's state machine. With the Android app, every transition comes from the native
 * safety layer's real results. In DEMO mode a simulation drives it — visibly labelled, nothing is sent.
 */
export function useSos(demo: boolean, contacts: EmergencyContact[]) {
  const [state, dispatch] = useReducer(sosReducer, initialSos);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const siren = useRef<{ stop: () => void } | null>(null);

  // Rebuild the machine from the native layer (app reopened during an SOS).
  const replay = useCallback((s: NativeSosState) => {
    if (!s.active || !s.sosId || !s.startedAt) return;
    const acts: SosAction[] = [{ type: 'ACTIVATED', sosId: s.sosId, startedAt: s.startedAt, contacts: s.contacts.map(({ id, name }) => ({ id, name })) }];
    acts.push({ type: 'NETWORK', network: s.network });
    if (s.location) acts.push({ type: 'LOCATION', location: s.location });
    if (s.locationFailed) acts.push({ type: 'LOCATION_FAILED' });
    s.contacts.forEach((c) => acts.push({ type: 'CONTACT', id: c.id, state: c.state, detail: c.detail }));
    acts.push({ type: 'LIVE', state: s.live }, { type: 'CLOUD', state: s.cloud });
    s.responders.forEach((name) => acts.push({ type: 'RESPONDER', name }));
    acts.forEach(dispatch);
  }, []);

  useEffect(() => {
    if (!hasNative()) return;
    const s = invoke<NativeSosState>('sosState');
    if (s.ok) replay(s);
    return onNative((e) => {
      switch (e.type) {
        case 'sos_activated':
          return dispatch({ type: 'ACTIVATED', sosId: e.sosId, startedAt: e.startedAt, contacts: e.contacts });
        case 'sos_location':
          return dispatch({ type: 'LOCATION', location: e.location });
        case 'sos_location_failed':
          return dispatch({ type: 'LOCATION_FAILED' });
        case 'sos_contact':
          return dispatch({ type: 'CONTACT', id: e.id, state: e.state, detail: e.detail });
        case 'sos_live':
          return dispatch({ type: 'LIVE', state: e.state });
        case 'sos_cloud':
          return dispatch({ type: 'CLOUD', state: e.state });
        case 'network':
          return dispatch({ type: 'NETWORK', network: e.state });
        case 'sos_responders':
          return e.names.forEach((name) => dispatch({ type: 'RESPONDER', name }));
        case 'sos_ended':
          return dispatch({ type: 'RESOLVED', outcome: e.outcome });
        case 'resume': {
          const st = invoke<NativeSosState>('sosState');
          if (st.ok) replay(st);
        }
      }
    });
  }, [replay]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const activate = useCallback(() => {
    if (demo || !hasNative()) {
      runDemo();
      return;
    }
    // The native layer starts siren, vibration, GPS, SMS, call and sync before this even returns.
    const r = invoke<{ sosId: string; startedAt: string; contacts: { id: string; name: string }[] }>('sosActivate');
    if (r.ok) dispatch({ type: 'ACTIVATED', sosId: r.sosId, startedAt: r.startedAt, contacts: r.contacts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, contacts]);

  function runDemo() {
    const people = contacts.length ? contacts.slice(0, 3) : ([{ id: 'demo-mom', name: 'Mom' }, { id: 'demo-bro', name: 'Brother' }] as EmergencyContact[]);
    dispatch({ type: 'ACTIVATED', sosId: 'DEMO', startedAt: new Date().toISOString(), contacts: people.map((c) => ({ id: c.id, name: c.name })) });
    siren.current = demoSiren();
    if ('vibrate' in navigator) navigator.vibrate?.([500, 200, 500, 200, 500]);
    const base = { latitude: 28.63153, longitude: 77.21671 }; // DEMO position (Connaught Place, New Delhi)
    const fix = (i: number): EmergencyLocation => ({
      latitude: base.latitude + i * 0.00012,
      longitude: base.longitude + i * 0.00009,
      accuracy: Math.max(6, 18 - i * 2),
      altitude: null,
      speed: 1.2,
      heading: 35,
      timestamp: new Date().toISOString(),
      provider: 'demo',
    });
    later(600, () => dispatch({ type: 'LOCATION', location: fix(0) }));
    people.forEach((c, i) => later(1100 + i * 500, () => dispatch({ type: 'CONTACT', id: c.id, state: 'ok', detail: 'DEMO · SMS sent' })));
    later(1500, () => dispatch({ type: 'LIVE', state: 'ok' }));
    later(1700, () => dispatch({ type: 'CLOUD', state: 'ok' }));
    for (let i = 1; i < 12; i++) later(1000 + i * 5000, () => dispatch({ type: 'LOCATION', location: fix(i) }));
    later(9000, () => dispatch({ type: 'RESPONDER', name: people[0].name }));
  }

  const requestEnd = () => dispatch({ type: 'END_REQUEST' });
  const keepActive = () => dispatch({ type: 'KEEP_ACTIVE' });
  const resolve = (outcome: 'safe' | 'cancelled') => {
    if (state.sosId === 'DEMO' || !hasNative()) {
      timers.current.forEach(clearTimeout);
      siren.current?.stop();
      dispatch({ type: 'RESOLVED', outcome });
      return;
    }
    const r = invoke('sosEnd', { outcome });
    if (r.ok) dispatch({ type: 'RESOLVED', outcome });
  };
  const stopSound = () => (state.sosId === 'DEMO' ? siren.current?.stop() : invoke('stopSound'));
  const reset = () => dispatch({ type: 'RESET' });
  const press = () => dispatch({ type: 'PRESS' });
  const release = () => dispatch({ type: 'RELEASE' });

  return { state, activate, requestEnd, keepActive, resolve, stopSound, reset, press, release };
}

/** DEMO only: a short synthetic two-tone siren from the browser (the app uses assets/audio/sos-alert.wav). */
function demoSiren() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    g.gain.value = 0.06;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      o.frequency.setValueAtTime(960, t + i * 0.5);
      o.frequency.setValueAtTime(700, t + i * 0.5 + 0.25);
    }
    o.start();
    o.stop(t + 4);
    return { stop: () => ctx.close().catch(() => undefined) };
  } catch {
    return null;
  }
}

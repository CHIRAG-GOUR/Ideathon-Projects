import type { EmergencyLocation } from './types';

/** One explicit state machine for the SOS screen (no scattered booleans). */
export type SosPhase =
  | 'IDLE'
  | 'ARMING'
  | 'ACTIVE'
  | 'LOCATING'
  | 'ALERTING'
  | 'LIVE'
  | 'RESOLVING'
  | 'SAFE'
  | 'CANCELLED'
  | 'ALERT_PARTIAL'
  | 'LOCATION_UNAVAILABLE'
  | 'OFFLINE';

/** ok = confirmed. Nothing is shown as confirmed until the device/server said so. */
export type ChannelState = 'pending' | 'ok' | 'failed' | 'queued' | 'available' | 'off';

export interface ContactChannel {
  id: string;
  name: string;
  state: ChannelState;
  detail: string;
}

export interface SosMachine {
  phase: SosPhase;
  sosId: string | null;
  startedAt: string | null;
  location: EmergencyLocation | null;
  locationState: ChannelState;
  contacts: ContactChannel[];
  live: ChannelState;
  cloud: ChannelState;
  network: 'online' | 'weak' | 'offline';
  responders: string[];
  holdCancelled: boolean;
}

export type SosAction =
  | { type: 'PRESS' }
  | { type: 'RELEASE' }
  | { type: 'ACTIVATED'; sosId: string; startedAt: string; contacts: { id: string; name: string }[] }
  | { type: 'LOCATION'; location: EmergencyLocation }
  | { type: 'LOCATION_FAILED' }
  | { type: 'CONTACT'; id: string; state: ChannelState; detail: string }
  | { type: 'LIVE'; state: ChannelState }
  | { type: 'CLOUD'; state: ChannelState }
  | { type: 'NETWORK'; network: SosMachine['network'] }
  | { type: 'RESPONDER'; name: string }
  | { type: 'END_REQUEST' }
  | { type: 'KEEP_ACTIVE' }
  | { type: 'RESOLVED'; outcome: 'safe' | 'cancelled' }
  | { type: 'RESET' };

export const initialSos: SosMachine = {
  phase: 'IDLE',
  sosId: null,
  startedAt: null,
  location: null,
  locationState: 'pending',
  contacts: [],
  live: 'pending',
  cloud: 'pending',
  network: 'online',
  responders: [],
  holdCancelled: false,
};

const ACTIVE_PHASES: SosPhase[] = ['ACTIVE', 'LOCATING', 'ALERTING', 'LIVE', 'ALERT_PARTIAL', 'LOCATION_UNAVAILABLE', 'OFFLINE'];
export const isEmergency = (p: SosPhase) => ACTIVE_PHASES.includes(p) || p === 'RESOLVING';

/** Where an active SOS stands, derived only from confirmed channel results. */
export function derivePhase(s: SosMachine): SosPhase {
  if (s.locationState === 'failed' && !s.location) return 'LOCATION_UNAVAILABLE';
  if (s.locationState === 'pending') return 'LOCATING';
  if (s.contacts.some((c) => c.state === 'pending')) return 'ALERTING';
  if (s.network === 'offline') return 'OFFLINE';
  if (s.contacts.some((c) => c.state === 'failed')) return 'ALERT_PARTIAL';
  return 'LIVE';
}

export function sosReducer(s: SosMachine, e: SosAction): SosMachine {
  const active = ACTIVE_PHASES.includes(s.phase);
  const settle = (n: SosMachine): SosMachine => (ACTIVE_PHASES.includes(n.phase) ? { ...n, phase: derivePhase(n) } : n);
  switch (e.type) {
    case 'PRESS':
      return s.phase === 'IDLE' || s.phase === 'SAFE' || s.phase === 'CANCELLED' ? { ...initialSos, phase: 'ARMING' } : s;
    case 'RELEASE':
      return s.phase === 'ARMING' ? { ...initialSos, holdCancelled: true } : s;
    case 'ACTIVATED':
      // Idempotent: a second activation for the running SOS changes nothing.
      if (active && s.sosId) return s;
      return {
        ...initialSos,
        phase: 'LOCATING',
        sosId: e.sosId,
        startedAt: e.startedAt,
        network: s.network,
        contacts: e.contacts.map((c) => ({ ...c, state: 'pending', detail: 'Sending…' })),
      };
    case 'LOCATION':
      return settle({ ...s, location: e.location, locationState: 'ok' });
    case 'LOCATION_FAILED':
      return settle({ ...s, locationState: s.location ? 'ok' : 'failed' });
    case 'CONTACT':
      return settle({ ...s, contacts: s.contacts.map((c) => (c.id === e.id ? { ...c, state: e.state, detail: e.detail } : c)) });
    case 'LIVE':
      return settle({ ...s, live: e.state });
    case 'CLOUD':
      return settle({ ...s, cloud: e.state });
    case 'NETWORK':
      return settle({ ...s, network: e.network });
    case 'RESPONDER':
      return s.responders.includes(e.name) ? s : { ...s, responders: [...s.responders, e.name] };
    case 'END_REQUEST':
      return active ? { ...s, phase: 'RESOLVING' } : s;
    case 'KEEP_ACTIVE':
      return s.phase === 'RESOLVING' ? { ...s, phase: derivePhase(s) } : s;
    case 'RESOLVED':
      return s.sosId ? { ...s, phase: e.outcome === 'safe' ? 'SAFE' : 'CANCELLED' } : s;
    case 'RESET':
      return initialSos;
  }
}

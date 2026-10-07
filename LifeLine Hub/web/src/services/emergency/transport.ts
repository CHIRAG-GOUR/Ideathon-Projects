'use client';
/**
 * EmergencyTransport — the resilient communication stack, as an explicit abstraction:
 *
 *   EmergencyTransport
 *    ├── SMSTransport       Android app: automatic SMS from the phone's SIM (works without internet).
 *    │                      Browser: server SMS if a provider is configured, otherwise a ready-to-send SMS.
 *    ├── WhatsAppTransport  Opens WhatsApp with the alert text; the user taps Send. No app can send
 *    │                      WhatsApp messages silently, so this is never shown as "sent" automatically.
 *    ├── PushTransport      Not configured in this build (no push service) — shown as such.
 *    └── OfflineTransport   Network watchdog: when the connection drops, SMS (device) becomes the fallback and
 *                           cloud updates are queued until the network returns.
 *
 * Every status shown comes from the Safety Core SOS engine (real device / server results). In Demo mode the
 * engine simulates and everything is labelled as simulated. "Local carrier handshakes" from the product vision
 * are not implemented and not claimed.
 */
import type { SosMachine, ChannelState } from '@shared/sos';
import type { EmergencyContact } from '@shared/types';

export type TransportId = 'sms' | 'whatsapp' | 'push' | 'offline' | 'live';
export type TransportState = 'idle' | 'working' | 'sent' | 'partial' | 'ready' | 'manual' | 'queued' | 'failed' | 'unavailable' | 'standby' | 'degraded' | 'simulated';
export interface TransportStatus {
  id: TransportId;
  label: string;
  state: TransportState;
  detail: string;
}

export interface TransportContext {
  sos: SosMachine;
  contacts: EmergencyContact[];
  native: boolean;
  demo: boolean;
  online: boolean;
  whatsappOpened: Record<string, boolean>;
}

interface EmergencyTransport {
  id: TransportId;
  label: string;
  status(c: TransportContext): TransportStatus;
}

const count = (cs: SosMachine['contacts'], s: ChannelState) => cs.filter((c) => c.state === s).length;

export const SMSTransport: EmergencyTransport = {
  id: 'sms',
  label: 'SMS',
  status({ sos, native, demo, online }) {
    const total = sos.contacts.length;
    const mk = (state: TransportState, detail: string): TransportStatus => ({ id: 'sms', label: 'SMS', state, detail });
    if (sos.phase === 'IDLE') return mk(native ? 'ready' : 'manual', native ? 'Automatic SMS from your SIM — works without internet' : 'Browser: server SMS if configured, otherwise ready-to-send');
    if (demo) return mk('simulated', `${count(sos.contacts, 'ok')}/${total} contacts · demo, nothing sent`);
    const ok = count(sos.contacts, 'ok');
    if (!total) return mk('failed', 'No trusted contacts to alert');
    if (ok === total) return mk('sent', `${ok}/${total} sent${native ? ' from your SIM' : ' by the server'}`);
    if (ok > 0) return mk('partial', `${ok}/${total} sent · others need attention`);
    if (count(sos.contacts, 'queued') > 0) return mk(native || online ? 'manual' : 'queued', native ? 'Queued — sends when signal returns' : 'Not sent automatically from a browser — tap Text below');
    if (count(sos.contacts, 'failed') === total) return mk('failed', 'SMS could not be sent — use WhatsApp or call');
    return mk('working', 'Sending…');
  },
};

export const WhatsAppTransport: EmergencyTransport = {
  id: 'whatsapp',
  label: 'WhatsApp',
  status({ sos, contacts, demo, whatsappOpened }) {
    const wa = contacts.filter((c) => c.phone && c.channels.whatsapp);
    const opened = wa.filter((c) => whatsappOpened[c.id]).length;
    const mk = (state: TransportState, detail: string): TransportStatus => ({ id: 'whatsapp', label: 'WhatsApp', state, detail });
    if (!wa.length) return mk('unavailable', 'No contact has WhatsApp turned on');
    if (sos.phase === 'IDLE') return mk('ready', `Priority channel for ${wa.length} contact${wa.length > 1 ? 's' : ''} — opens ready to send`);
    if (demo) return mk('simulated', 'Demo · would open WhatsApp with your alert');
    if (opened) return mk('manual', `Opened for ${opened}/${wa.length} · confirm you tapped Send`);
    return mk('ready', 'Tap a contact to open WhatsApp with the alert');
  },
};

export const PushTransport: EmergencyTransport = {
  id: 'push',
  label: 'Push',
  status: () => ({ id: 'push', label: 'Push', state: 'unavailable', detail: 'Not configured in this build' }),
};

export const OfflineTransport: EmergencyTransport = {
  id: 'offline',
  label: 'Network',
  status({ sos, native, online, demo }) {
    const mk = (state: TransportState, detail: string): TransportStatus => ({ id: 'offline', label: 'Network', state, detail });
    const net = !online ? 'offline' : sos.network;
    if (demo && sos.phase !== 'IDLE') return mk('simulated', 'Demo network');
    if (net === 'offline') return mk('degraded', native ? 'Connection degraded · SMS fallback ready (no internet needed)' : 'Offline · updates queued — on a browser, call or text directly');
    if (net === 'weak') return mk('degraded', 'Weak connection · retrying with fallback');
    return mk('standby', 'Online · fallback on standby');
  },
};

export const LiveTransport: EmergencyTransport = {
  id: 'live',
  label: 'Live location',
  status({ sos, demo }) {
    const mk = (state: TransportState, detail: string): TransportStatus => ({ id: 'live', label: 'Live location', state, detail });
    if (sos.phase === 'IDLE') return mk('ready', 'A private, expiring link per contact');
    if (demo) return mk('simulated', 'Demo link · nothing shared');
    if (sos.live === 'ok') return mk('sent', 'Sharing live · stops when SOS ends');
    if (sos.live === 'failed') return mk('failed', 'Live link unavailable · coordinates still in SMS');
    if (sos.live === 'queued') return mk('queued', 'Waiting for connection');
    return mk('working', 'Starting…');
  },
};

export const TRANSPORTS: EmergencyTransport[] = [WhatsAppTransport, SMSTransport, LiveTransport, PushTransport, OfflineTransport];
export const broadcastStatus = (c: TransportContext) => TRANSPORTS.map((t) => t.status(c));

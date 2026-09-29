'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import type { SosMachine, ChannelState } from '@shared/sos';
import type { ChatMessage, EmergencyContact, Responder } from '@shared/types';
import type { RegionConfig } from '@shared/emergency';
import { accuracyLabel, fmtAccuracy, fmtCoord, distanceM } from '@shared/geo';
import { db, auth, hasCloud } from '@/lib/firebase';
import { dial } from '@/lib/native';
import { Button, Card, E3d, Sheet, cn } from '@/components/ui';
import { HoldButton } from '@/components/HoldButton';
import { Chat } from '../live/Chat';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-blush-100" /> });

interface Props {
  sos: SosMachine;
  region: RegionConfig;
  contacts: EmergencyContact[];
  demo: boolean;
  onEndHold: () => void;
  onKeep: () => void;
  onResolve: (o: 'safe' | 'cancelled') => void;
  onSilence: () => void;
  onDone: () => void;
}

const HEADLINE: Partial<Record<SosMachine['phase'], string>> = {
  LOCATING: 'Getting your location…',
  ALERTING: 'Alerting your Safety Circle…',
  LIVE: 'Help has been alerted.',
  ALERT_PARTIAL: 'Some alerts could not be sent.',
  OFFLINE: 'No internet — emergency actions on this phone continue.',
  LOCATION_UNAVAILABLE: 'Location unavailable — alerts continue without it.',
};

function useAddress(lat?: number, lng?: number) {
  const [addr, setAddr] = useState<string | null>(null);
  const [at, setAt] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (lat == null || lng == null || !navigator.onLine) return;
    if (at && distanceM({ latitude: at.lat, longitude: at.lng }, { latitude: lat, longitude: lng }) < 80) return;
    setAt({ lat, lng });
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { referrerPolicy: 'strict-origin-when-cross-origin', headers: { 'Accept-Language': 'en' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAddr(j?.display_name ?? null))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return addr;
}

export function Emergency({ sos, region, contacts, demo, onEndHold, onKeep, onResolve, onSilence, onDone }: Props) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // The SOS screen must never depend on the cloud: only touch Firebase if it is already available.
  const cloud = !demo && !!sos.sosId && sos.sosId !== 'DEMO' && hasCloud() && !!auth().currentUser;
  const loc = sos.location;
  const address = useAddress(loc?.latitude, loc?.longitude);

  useEffect(() => {
    if (!cloud || !sos.sosId) return;
    const ref = doc(db(), `sosEvents/${sos.sosId}`);
    const a = onSnapshot(collection(ref, 'responders'), (s) => setResponders(s.docs.map((d) => d.data() as Responder)), () => undefined);
    const b = onSnapshot(query(collection(ref, 'messages'), orderBy('at'), limit(100)), (s) => setMessages(s.docs.map((d) => ({ ...(d.data() as ChatMessage), id: d.id }))), () => undefined);
    return () => {
      a();
      b();
    };
  }, [cloud, sos.sosId]);

  const respondingNames = useMemo(() => Array.from(new Set([...sos.responders, ...responders.filter((r) => r.responding).map((r) => r.name)])), [sos.responders, responders]);
  const primary = contacts.find((c) => c.phone && c.priority === 1) ?? contacts.find((c) => c.phone);
  const alerted = sos.contacts.filter((c) => c.state === 'ok').length;
  const quality = accuracyLabel(loc);
  const ended = sos.phase === 'SAFE' || sos.phase === 'CANCELLED';

  if (ended) {
    return (
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-screen place-items-center bg-gradient-to-b from-safe-50 to-white px-6 text-center">
        <div>
          <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            <E3d name={sos.phase === 'SAFE' ? 'check' : 'bell'} size={120} className="mx-auto" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-extrabold">{sos.phase === 'SAFE' ? "You're safe" : 'SOS cancelled'}</h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-soft">
            Live location sharing has stopped. {alerted > 0 && 'The contacts who were alerted are being told.'}
          </p>
          <Button big className="mt-8 w-full max-w-xs" onClick={onDone}>
            Back to home
          </Button>
        </div>
      </motion.main>
    );
  }

  const rows: { label: string; state: ChannelState; text: string }[] = [
    { label: 'SOS', state: 'ok', text: 'ACTIVE' },
    {
      label: 'Location',
      state: loc ? (quality === 'good' ? 'ok' : 'queued') : sos.locationState === 'failed' ? 'failed' : 'pending',
      text: loc ? (quality === 'last_known' ? 'LAST KNOWN' : quality === 'limited' ? `LIMITED ${fmtAccuracy(loc.accuracy)}` : `LOCKED ${fmtAccuracy(loc.accuracy)}`) : sos.locationState === 'failed' ? 'UNAVAILABLE' : 'LOCATING…',
    },
    ...sos.contacts.map((c) => ({ label: c.name, state: c.state, text: c.detail.toUpperCase() })),
    { label: 'Live location', state: sos.live, text: sos.live === 'ok' ? 'SHARING' : sos.live === 'queued' ? 'WAITING FOR NETWORK' : sos.live === 'off' ? 'OFF' : sos.live === 'failed' ? 'NOT SHARED' : 'STARTING…' },
    { label: `Emergency service (${region.primary.number})`, state: 'available', text: 'CALL AVAILABLE' },
    { label: 'Cloud sync', state: sos.cloud, text: sos.cloud === 'ok' ? 'SYNCED' : sos.cloud === 'queued' ? 'OFFLINE · QUEUED' : sos.cloud === 'off' ? 'NOT SIGNED IN' : sos.cloud === 'failed' ? 'FAILED · RETRYING' : 'SYNCING…' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sos-50 via-white to-white pb-12">
      <motion.header initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="rounded-b-4xl bg-gradient-to-br from-sos-500 to-sos-700 px-5 pb-6 pt-[max(env(safe-area-inset-top),1.25rem)] text-white shadow-glow">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <motion.span className="h-2.5 w-2.5 rounded-full bg-white" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            {sos.network === 'offline' ? 'OFFLINE' : 'LIVE'}
          </span>
          <button onClick={onSilence} className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold" aria-label="Silence the siren">
            🔇 Silence siren
          </button>
        </div>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight" aria-live="assertive">
          🚨 SOS ACTIVE
        </h1>
        <p className="mt-2 text-lg font-semibold text-white/95">{alerted > 0 && sos.phase !== 'OFFLINE' ? HEADLINE.LIVE : HEADLINE[sos.phase] ?? ''}</p>
        <AnimatePresence>
          {respondingNames.length > 0 && (
            <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 rounded-2xl bg-white px-4 py-2.5 font-bold text-safe-600">
              💚 {respondingNames.join(', ')} {respondingNames.length > 1 ? 'are' : 'is'} responding. Help is on the way.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button big variant="dark" className="col-span-2 !min-h-[68px] text-xl" onClick={() => !demo && dial(region.primary.number)}>
            📞 CALL {region.primary.number}
          </Button>
          {primary && (
            <Button big variant="white" className="col-span-2" onClick={() => !demo && dial(primary.phone!)}>
              Call {primary.name}
            </Button>
          )}
        </div>

        <Card>
          <p className="h-eyebrow">{quality === 'last_known' ? 'Last known location' : 'Your location'}</p>
          {loc ? (
            <>
              <div className="num mt-2 grid grid-cols-2 gap-3">
                <Big label="Latitude" value={fmtCoord(loc.latitude)} />
                <Big label="Longitude" value={fmtCoord(loc.longitude)} />
                <Big label="Accuracy" value={fmtAccuracy(loc.accuracy)} warn={quality !== 'good'} />
                <Big label="Time" value={new Date(loc.timestamp).toLocaleTimeString()} />
              </div>
              {quality === 'limited' && <p className="mt-2 text-sm font-semibold text-warn-600">Location accuracy limited — using the best available position.</p>}
              {quality === 'last_known' && <p className="mt-2 text-sm font-semibold text-warn-600">This is the last known position, not a current fix. Still trying for a fresh one.</p>}
              {address && <p className="mt-2 text-sm text-ink-soft">{address}</p>}
            </>
          ) : (
            <p className="mt-2 font-semibold text-ink-muted">{sos.locationState === 'failed' ? 'Location unavailable. Turn on Location — the phone keeps trying.' : 'Getting the best available location…'}</p>
          )}
        </Card>

        {loc && (
          <div className="h-64 overflow-hidden rounded-4xl border border-line bg-white shadow-soft">
            <MapView className="h-full" me={loc} urgent />
          </div>
        )}

        <Card>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-semibold text-ink">{r.label}</span>
                <span className={cn('inline-flex items-center gap-1.5 text-right text-xs font-extrabold tracking-wide', TONE[r.state])}>
                  <span aria-hidden>{MARK[r.state]}</span>
                  {r.text}
                </span>
              </li>
            ))}
          </ul>
          {demo && <p className="mt-2 text-xs font-bold text-plum">DEMONSTRATION ONLY — no SMS, call or location was sent.</p>}
        </Card>

        {cloud && sos.sosId && <Chat sosId={sos.sosId} messages={messages} myUid={auth().currentUser?.uid} quick={["I'm okay for now.", 'Please call me.', 'I need help now.']} />}

        <div className="flex flex-col items-center pt-4">
          <HoldButton variant="end" size={170} onComplete={onEndHold} />
          <p className="mt-2 text-center text-sm text-ink-muted">Ending needs a 3-second hold, so it can&apos;t be cancelled by accident.</p>
        </div>
      </div>

      <Sheet open={sos.phase === 'RESOLVING'} onClose={onKeep} title="Are you safe?">
        <div className="grid gap-3">
          <Button big variant="safe" onClick={() => onResolve('safe')}>
            I&apos;m safe
          </Button>
          <Button big onClick={onKeep}>
            Keep SOS active
          </Button>
          <button className="py-2 text-sm font-semibold text-ink-muted" onClick={() => onResolve('cancelled')}>
            It was a false alarm — cancel SOS
          </button>
        </div>
      </Sheet>
    </main>
  );
}

const MARK: Record<ChannelState, string> = { ok: '✓', pending: '…', failed: '✕', queued: '○', available: '○', off: '–' };
const TONE: Record<ChannelState, string> = { ok: 'text-safe-600', pending: 'text-ink-muted', failed: 'text-sos-600', queued: 'text-warn-600', available: 'text-ink-soft', off: 'text-ink-faint' };

function Big({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={cn('text-xl font-extrabold', warn ? 'text-warn-600' : 'text-ink')}>{value}</p>
    </div>
  );
}

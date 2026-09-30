'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { ChatMessage, EmergencyLocation, Responder, SosEvent } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { accuracyLabel, ago, directionsLink, distanceM, fmtAccuracy, fmtCoord, fmtDistance } from '@shared/geo';
import { db, auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { currentFix, dial, openExternal } from '@/lib/native';
import { Button, Card, E3d, Pill, Sheet, cn } from '@/components/ui';
import { Chat } from './Chat';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-blush-100" /> });

function useNow(ms = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => set(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

/** What a trusted contact sees: the person, status, live map, trail, and the actions that matter. */
export function LiveView({ sosId, compact }: { sosId: string; compact?: boolean }) {
  const [event, setEvent] = useState<SosEvent | null | undefined>(undefined);
  const [trail, setTrail] = useState<EmergencyLocation[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [denied, setDenied] = useState(false);
  const [mine, setMine] = useState<EmergencyLocation | null>(null);
  const [askShare, setAskShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setInterval>>();
  const now = useNow();
  const uid = auth().currentUser?.uid;

  useEffect(() => {
    const ref = doc(db(), `sosEvents/${sosId}`);
    const offs = [
      onSnapshot(ref, (s) => setEvent(s.exists() ? ({ ...(s.data() as SosEvent), id: s.id }) : null), () => setDenied(true)),
      onSnapshot(query(collection(ref, 'locations'), orderBy('timestamp', 'desc'), limit(40)), (s) => setTrail(s.docs.map((d) => d.data() as EmergencyLocation).reverse()), () => undefined),
      onSnapshot(collection(ref, 'responders'), (s) => setResponders(s.docs.map((d) => d.data() as Responder)), () => undefined),
      onSnapshot(query(collection(ref, 'messages'), orderBy('at', 'asc'), limit(100)), (s) => setMessages(s.docs.map((d) => ({ ...(d.data() as ChatMessage), id: d.id }))), () => undefined),
    ];
    return () => offs.forEach((o) => o());
  }, [sosId]);

  useEffect(() => () => shareTimer.current && clearInterval(shareTimer.current), []);

  const me = responders.find((r) => r.uid === uid);
  const loc = event?.lastLocation ?? trail[trail.length - 1] ?? null;
  const region = EmergencyNumberService.forRegion(event?.region);
  const open = event && (event.status === 'active' || event.status === 'responding');
  const responding = responders.filter((r) => r.responding);
  const points = useMemo(
    () => responders.filter((r) => r.responding && r.location).map((r) => ({ id: r.uid, latitude: r.location!.latitude, longitude: r.location!.longitude, label: `${r.name} (responding)`, kind: 'responder' as const })),
    [responders],
  );

  async function respond(share: boolean) {
    setAskShare(false);
    setBusy(true);
    try {
      const location = share ? await currentFix() : null;
      if (location) setMine(location);
      await api('/sos/respond', { sosId, responding: true, shareLocation: share && !!location, location });
      if (share && location) {
        // Keep the person in distress updated while this screen is open (every 20 s).
        shareTimer.current = setInterval(async () => {
          const l = await currentFix();
          if (l) {
            setMine(l);
            api('/sos/respond', { sosId, responding: true, shareLocation: true, location: l }).catch(() => undefined);
          }
        }, 20_000);
      }
    } finally {
      setBusy(false);
    }
  }

  async function stopResponding() {
    if (shareTimer.current) clearInterval(shareTimer.current);
    await api('/sos/respond', { sosId, responding: false, shareLocation: false, location: null }).catch(() => undefined);
  }

  if (denied || event === null) {
    return (
      <Card className="text-center">
        <E3d name="lock" size={56} className="mx-auto" />
        <p className="mt-3 font-bold text-ink">This live view is no longer available.</p>
        <p className="mt-1 text-sm text-ink-muted">The SOS ended, the link expired, or you were removed from the Safety Circle.</p>
      </Card>
    );
  }
  if (event === undefined) return <div className="h-72 animate-pulse rounded-3xl bg-blush-100" />;

  if (!open) {
    return (
      <Card className="text-center">
        <E3d name={event.status === 'safe' ? 'check' : 'bell'} size={64} className="mx-auto" />
        <h2 className="mt-3 text-2xl font-extrabold text-ink">{event.status === 'safe' ? `${event.ownerName} is safe` : 'SOS cancelled'}</h2>
        <p className="mt-1 text-sm text-ink-muted">Ended {ago(event.endedAt, now)}. Live location sharing has stopped.</p>
      </Card>
    );
  }

  const fixAge = loc ? (now - Date.parse(loc.timestamp)) / 1000 : Infinity;
  const quality = accuracyLabel(loc);
  const dist = mine && loc ? distanceM(mine, loc) : null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-4xl bg-gradient-to-br from-sos-500 to-sos-700 p-5 text-white shadow-glow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-widest">🚨 SOS ALERT</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
            <motion.span className="h-2 w-2 rounded-full bg-white" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            {fixAge < 120 ? 'LIVE' : 'NO RECENT UPDATE'}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">{event.ownerName} needs help</h1>
        <p className="mt-1 text-sm text-white/85">
          SOS started {ago(event.startedAt, now)} · Last update {loc ? ago(loc.timestamp, now) : 'waiting for location'}
          {event.battery != null && ` · Battery ${event.battery}%`}
          {event.network && ` · ${event.network}`}
        </p>
        <AnimatePresence>
          {responding.length > 0 && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold">
              {responding.map((r) => r.name).join(', ')} {responding.length > 1 ? 'are' : 'is'} responding
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <div className={cn('overflow-hidden rounded-4xl border border-line bg-white shadow-soft', compact ? 'h-64' : 'h-80 sm:h-96')}>
        <MapView className="h-full" me={loc} meLabel={event.ownerName} trail={trail} points={mine ? [...points.filter((p) => p.id !== uid), { id: 'me', latitude: mine.latitude, longitude: mine.longitude, label: 'You', kind: 'contact' }] : points} urgent />
      </div>

      <Card>
        {loc ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label={quality === 'last_known' ? 'Last known latitude' : 'Latitude'} value={fmtCoord(loc.latitude)} />
            <Stat label="Longitude" value={fmtCoord(loc.longitude)} />
            <Stat label="Accuracy" value={fmtAccuracy(loc.accuracy)} warn={quality === 'limited'} />
            <Stat label="Updated" value={new Date(loc.timestamp).toLocaleTimeString()} />
            {dist != null && <Stat label="Distance from you" value={fmtDistance(dist)} />}
            {quality === 'limited' && <p className="col-span-full text-xs font-semibold text-warn-600">Location accuracy limited — the phone could not get a precise fix.</p>}
          </div>
        ) : (
          <p className="text-sm font-semibold text-ink-muted">Waiting for location…</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {event.ownerPhone ? (
          <Button big onClick={() => dial(event.ownerPhone!)} className="col-span-2">
            📞 Call {event.ownerName.split(' ')[0]}
          </Button>
        ) : null}
        <Button big variant="white" disabled={!loc} onClick={() => loc && openExternal(directionsLink(loc.latitude, loc.longitude))}>
          🧭 Directions
        </Button>
        <Button big variant="dark" onClick={() => dial(region.primary.number)}>
          Call {region.primary.number}
        </Button>
        {me?.responding ? (
          <Button big variant="soft" className="col-span-2" onClick={stopResponding}>
            You are responding · Stop
          </Button>
        ) : (
          <Button big variant="safe" className="col-span-2" disabled={busy} onClick={() => setAskShare(true)}>
            🏃‍♀️ I&apos;m going to help
          </Button>
        )}
      </div>

      {trail.length > 1 && (
        <Card>
          <h3 className="mb-2 font-bold text-ink">Recent movement</h3>
          <ol className="relative ml-2 border-l-2 border-dashed border-sos-200">
            {trail
              .slice(-5)
              .reverse()
              .map((p, i) => (
                <li key={p.timestamp} className="mb-3 ml-4 last:mb-0">
                  <span className={cn('absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white', i === 0 ? 'bg-sos-500' : 'bg-sos-200')} />
                  <p className="text-sm font-semibold text-ink">{i === 0 ? 'Current' : ago(p.timestamp, now)}</p>
                  <p className="num text-xs text-ink-muted">
                    {fmtCoord(p.latitude)}, {fmtCoord(p.longitude)} · {fmtAccuracy(p.accuracy)}
                  </p>
                </li>
              ))}
          </ol>
        </Card>
      )}

      {event.profile && (
        <Card>
          <h3 className="mb-2 font-bold text-ink">Emergency information (shared by {event.ownerName})</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {event.profile.age != null && <Stat label="Age" value={String(event.profile.age)} />}
            {event.profile.bloodGroup && <Stat label="Blood group" value={event.profile.bloodGroup} />}
            {event.profile.allergies && <Stat label="Allergies" value={event.profile.allergies} />}
            {event.profile.medicalNotes && <Stat label="Medical notes" value={event.profile.medicalNotes} />}
          </dl>
        </Card>
      )}

      <Chat sosId={sosId} messages={messages} myUid={uid} quick={["I'm coming.", 'Are you okay?', 'Stay where you are.', 'Call 112.']} />

      <p className="px-2 text-center text-xs text-ink-muted">
        Shevolution shares this location only with {event.ownerName}&apos;s Safety Circle while the SOS is active. It has not contacted the police for you — call {region.primary.number} if needed.
      </p>

      <Sheet open={askShare} onClose={() => setAskShare(false)} title="Share your location?">
        <p className="text-ink-soft">
          {event.ownerName} will see where you are while you head over, so they know help is on the way. Only while this screen is open.
        </p>
        <div className="mt-5 grid gap-3">
          <Button big onClick={() => respond(true)}>
            Share my location
          </Button>
          <Button big variant="white" onClick={() => respond(false)}>
            Respond without location
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className={cn('num mt-0.5 font-bold', warn ? 'text-warn-600' : 'text-ink')}>{value}</dd>
    </div>
  );
}

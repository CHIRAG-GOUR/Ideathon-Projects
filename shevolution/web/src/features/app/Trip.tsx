'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { EmergencyContact, EmergencyLocation, SafetyTrip, TripKind } from '@shared/types';
import { distanceM, fmtDistance } from '@shared/geo';
import { api, randomId } from '@/lib/api';
import { currentFix, hasNative, invoke, onNative } from '@/lib/native';
import { nearbyHelp, searchPlace, walkingRoute, type HelpPlace, type SearchResult } from '@/lib/places';
import { Button, Card, E3d, Field, Pill, Toggle, cn, inputCls } from '@/components/ui';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const KEY = 'shev.trip';
type Local = Pick<SafetyTrip, 'id' | 'kind' | 'label' | 'destination' | 'startedAt' | 'dueAt' | 'autoEscalate' | 'contactIds'> & { status: 'active' | 'arrived' | 'checked_in' | 'cancelled'; serverBackup: boolean };

export function loadTrip(): Local | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Local | null;
    if (t && hasNative()) {
      // The phone is the source of truth (the trip may have been ended from its notification).
      const n = invoke<{ trip: { tripId: string } | null }>('tripState');
      if (n.ok && n.trip?.tripId !== t.id) {
        localStorage.removeItem(KEY);
        return null;
      }
    }
    return t?.status === 'active' ? t : null;
  } catch {
    return null;
  }
}
const saveTrip = (t: Local | null) => {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the native alarm still runs */
  }
};

export function Trip({ kind, contacts, region, signedIn, demo, onSos }: { kind: TripKind; contacts: EmergencyContact[]; region: string; signedIn: boolean; demo: boolean; onSos: () => void }) {
  const [trip, setTrip] = useState<Local | null>(null);
  useEffect(() => setTrip(loadTrip()), []);
  return trip ? <ActiveTrip trip={trip} setTrip={setTrip} signedIn={signedIn} demo={demo} onSos={onSos} /> : <Setup kind={kind} contacts={contacts} region={region} signedIn={signedIn} demo={demo} onStart={setTrip} />;
}

function Setup({ kind, contacts, region, signedIn, demo, onStart }: { kind: TripKind; contacts: EmergencyContact[]; region: string; signedIn: boolean; demo: boolean; onStart: (t: Local) => void }) {
  const [label, setLabel] = useState(kind === 'trip' ? 'Going home' : "I'm going home");
  const [minutes, setMinutes] = useState(kind === 'trip' ? 30 : 60);
  const [custom, setCustom] = useState('');
  const [picked, setPicked] = useState<string[]>(contacts.filter((c) => c.phone).map((c) => c.id));
  const [auto, setAuto] = useState(true);
  const [here, setHere] = useState<EmergencyLocation | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dest, setDest] = useState<SearchResult | null>(null);
  const [route, setRoute] = useState<{ line: [number, number][]; distance: number; duration: number } | null>(null);
  const [help, setHelp] = useState<HelpPlace[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (kind === 'trip') currentFix().then(setHere);
  }, [kind]);

  useEffect(() => {
    if (!dest || !here) return;
    setRoute(null);
    setHelp([]);
    walkingRoute(here, dest)
      .then(async (r) => {
        setRoute(r);
        setMinutes(Math.max(15, Math.ceil((r.duration / 60) * 1.3 / 5) * 5));
        const mid = r.line[Math.floor(r.line.length / 2)];
        const places = await nearbyHelp(mid[0], mid[1], Math.min(5000, r.distance / 2 + 600));
        setHelp(places.filter((p) => (p.kind === 'police' || p.kind === 'hospital') && r.line.some(([la, lo]) => distanceM(p, { latitude: la, longitude: lo }) < 300)).slice(0, 12));
      })
      .catch((e) => setMsg((e as Error).message));
  }, [dest, here]);

  async function search() {
    setMsg(null);
    try {
      setResults(await searchPlace(q, here ?? undefined, region));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function start() {
    setBusy(true);
    setMsg(null);
    const mins = custom ? Math.max(5, Math.min(1440, Number(custom))) : minutes;
    const id = randomId();
    const now = new Date();
    const t: Local = {
      id,
      kind,
      label: label.trim() || (kind === 'trip' ? 'Safe trip' : 'Safety timer'),
      destination: dest ? { name: dest.name.split(',').slice(0, 2).join(','), latitude: dest.latitude, longitude: dest.longitude } : null,
      startedAt: now.toISOString(),
      dueAt: new Date(now.getTime() + mins * 60_000).toISOString(),
      autoEscalate: auto,
      contactIds: picked,
      status: 'active',
      serverBackup: false,
    };
    if (!demo) {
      // The phone reminds and escalates on its own (works offline); the server is the backup if the phone goes silent.
      if (hasNative()) invoke('tripStart', { tripId: id, kind, label: t.label, dueAt: t.dueAt, destination: t.destination, autoEscalate: auto, contactIds: picked, graceMin: 5 });
      if (signedIn) {
        try {
          await api('/trips/start', { id, kind, label: t.label, destination: t.destination, minutes: mins, autoEscalate: auto, contactIds: picked });
          t.serverBackup = true;
        } catch {
          /* offline: phone-only */
        }
      }
    }
    saveTrip(t);
    onStart(t);
    setBusy(false);
  }

  const presets = kind === 'trip' ? [30, 60] : [30, 60, 120, 240];
  return (
    <div className="space-y-4">
      <Field label={kind === 'trip' ? 'Trip name' : "What's happening?"}>
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
      </Field>

      {kind === 'trip' && (
        <Card>
          <p className="font-bold">Destination</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place or address" />
            <Button variant="dark">Find</Button>
          </form>
          {results.length > 0 && !dest && (
            <ul className="mt-2 divide-y divide-line">
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button className="w-full py-2.5 text-left text-sm" onClick={() => setDest(r)}>
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-muted">Or tap the map to set the destination.</p>
          <div className="mt-3 h-60 overflow-hidden rounded-3xl border border-line">
            <MapView
              className="h-full"
              me={here}
              route={route?.line}
              follow={false}
              points={[
                ...(dest ? [{ id: 'dest', latitude: dest.latitude, longitude: dest.longitude, label: 'Destination', kind: 'destination' as const }] : []),
                ...help.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, label: p.name, kind: p.kind })),
              ]}
              onPick={(la, lo) => setDest({ name: `Pinned location (${la.toFixed(4)}, ${lo.toFixed(4)})`, latitude: la, longitude: lo })}
            />
          </div>
          {dest && (
            <div className="mt-3 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{dest.name.split(',').slice(0, 3).join(',')}</p>
              <button className="text-xs font-bold text-sos-600" onClick={() => (setDest(null), setRoute(null))}>
                Change
              </button>
            </div>
          )}
          {route && (
            <p className="mt-2 text-sm text-ink-soft">
              <b>Suggested route</b> · {fmtDistance(route.distance)} · about {Math.round(route.duration / 60)} min walk · {help.length} police/hospital points within 300 m of it
            </p>
          )}
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-soft">Check in within</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((m) => (
            <button key={m} onClick={() => (setMinutes(m), setCustom(''))} className={cn('rounded-2xl px-4 py-2.5 font-bold', !custom && minutes === m ? 'bg-sos-500 text-white' : 'bg-white shadow-soft')}>
              {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}
            </button>
          ))}
          <input className={cn(inputCls, '!w-28')} inputMode="numeric" placeholder="Custom min" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>

      <Card>
        <p className="mb-2 font-bold">Who should know?</p>
        {contacts.length === 0 && <p className="text-sm text-ink-muted">Add a safety contact first.</p>}
        <div className="flex flex-wrap gap-2">
          {contacts.map((c) => (
            <button key={c.id} onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} className={cn('rounded-full px-3.5 py-2 text-sm font-semibold', picked.includes(c.id) ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}>
              {c.name}
            </button>
          ))}
        </div>
        <Toggle on={auto} onChange={setAuto} label="Alert them if I don't check in" hint="You're asked first. If you don't answer within 5 minutes, they get a text with your last known location." />
      </Card>

      {msg && <p className="text-sm font-semibold text-sos-700">{msg}</p>}
      <Button big className="w-full" disabled={busy || (kind === 'trip' && !dest)} onClick={start}>
        {kind === 'trip' ? 'Start Safe Trip' : 'Start Safety Timer'}
      </Button>
      {kind === 'trip' && <p className="text-center text-xs text-ink-muted">Location is shared with the people you chose only while this trip runs.</p>}
    </div>
  );
}

function ActiveTrip({ trip, setTrip, signedIn, demo, onSos }: { trip: Local; setTrip: (t: Local | null) => void; signedIn: boolean; demo: boolean; onSos: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [arrived, setArrived] = useState(false);
  const [dist, setDist] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const off = onNative((e) => e.type === 'trip_arrived' && e.tripId === trip.id && setArrived(true));
    return () => {
      clearInterval(t);
      off();
    };
  }, [trip.id]);

  useEffect(() => {
    if (!trip.destination) return;
    const tick = () =>
      currentFix().then((l) => {
        if (!l || !trip.destination) return;
        const d = distanceM(l, trip.destination);
        setDist(d);
        if (d < 150) setArrived(true);
      });
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [trip.destination]);

  const total = Date.parse(trip.dueAt) - Date.parse(trip.startedAt);
  const left = Date.parse(trip.dueAt) - now;
  const overdue = left <= 0;
  const pct = Math.max(0, Math.min(1, 1 - left / total));
  const ring = useMemo(() => 2 * Math.PI * 54, []);

  async function finish(status: 'arrived' | 'checked_in' | 'cancelled') {
    if (!demo) {
      if (hasNative()) invoke('tripEnd', { tripId: trip.id, status });
      if (signedIn && trip.serverBackup) await api('/trips/update', { tripId: trip.id, action: status }).catch(() => undefined);
    }
    saveTrip(null);
    if (status === 'cancelled') setTrip(null);
    else {
      setArrived(true);
      setTimeout(() => setTrip(null), 2600);
    }
  }

  async function extend() {
    const dueAt = new Date(Math.max(Date.now(), Date.parse(trip.dueAt)) + 15 * 60_000).toISOString();
    const t = { ...trip, dueAt };
    if (!demo) {
      if (hasNative()) invoke('tripExtend', { tripId: trip.id, dueAt });
      if (signedIn && trip.serverBackup) await api('/trips/update', { tripId: trip.id, action: 'extend', minutes: 15 }).catch(() => undefined);
    }
    saveTrip(t);
    setTrip(t);
  }

  const mm = Math.floor(Math.abs(left) / 60000);
  const ss = Math.floor((Math.abs(left) % 60000) / 1000);

  return (
    <div className="space-y-5 text-center">
      <AnimatePresence mode="wait">
        {arrived && !overdue ? (
          <motion.div key="arrived" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <E3d name="home" size={110} className="mx-auto" />
            </motion.div>
            <h2 className="mt-3 text-3xl font-extrabold">You made it.</h2>
            <p className="text-ink-muted">Confirm so your circle isn&apos;t alerted.</p>
          </motion.div>
        ) : (
          <motion.div key="ring" className="relative mx-auto grid h-64 w-64 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#FFE0E6" strokeWidth="8" />
              <motion.circle cx="60" cy="60" r="54" fill="none" stroke={overdue ? '#E0900F' : '#F02452'} strokeWidth="8" strokeLinecap="round" strokeDasharray={ring} animate={{ strokeDashoffset: ring * (1 - pct) }} />
            </svg>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">{overdue ? 'Overdue by' : 'Check in within'}</p>
              <p className={cn('num text-5xl font-extrabold', overdue ? 'text-warn-600' : 'text-ink')}>
                {mm}:{String(ss).padStart(2, '0')}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{trip.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-2">
        {trip.destination && <Pill>{trip.destination.name}</Pill>}
        {dist != null && <Pill tone="red">{fmtDistance(dist)} to go</Pill>}
        <Pill tone={trip.autoEscalate ? 'safe' : 'neutral'}>{trip.autoEscalate ? 'Auto-alert on' : 'Auto-alert off'}</Pill>
        {!trip.serverBackup && !demo && <Pill tone="warn">Phone-only (no server backup)</Pill>}
      </div>

      {overdue ? (
        <Card className="border-warn-500/40 bg-warn-50 text-left">
          <p className="text-xl font-extrabold">Are you safe?</p>
          <p className="text-sm text-ink-soft">{trip.autoEscalate ? 'If you don’t answer, your chosen contacts get a text with your last known location.' : 'Automatic alerts are off for this trip.'}</p>
          <div className="mt-3 grid gap-2">
            <Button big variant="safe" onClick={() => finish('checked_in')}>
              I&apos;m safe
            </Button>
            <Button big onClick={onSos}>
              I need help — open SOS
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-2">
          <Button big variant="safe" onClick={() => finish(trip.kind === 'trip' ? 'arrived' : 'checked_in')}>
            {trip.kind === 'trip' ? "I've arrived safely" : "I'm safe — stop timer"}
          </Button>
          <Button variant="white" onClick={extend}>
            + 15 minutes
          </Button>
          <button className="py-2 text-sm font-semibold text-ink-muted" onClick={() => finish('cancelled')}>
            Cancel {trip.kind === 'trip' ? 'trip' : 'timer'}
          </button>
        </div>
      )}
    </div>
  );
}

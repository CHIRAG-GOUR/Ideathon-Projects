'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EmergencyContact, EmergencyLocation, SafetyTrip, TripKind } from '@shared/types';
import { distanceM, fmtDistance } from '@shared/geo';
import { api, randomId } from '@/lib/api';
import { currentFix, dial, hasNative, invoke, onNative, openExternal } from '@/lib/native';
import { nearbyHelp, reverseGeocode, searchPlace, tripRoute, POPULAR_JAIPUR_SPOTS, type HelpPlace, type SearchResult } from '@/lib/places';
import { Button, Card, E3d, Field, Pill, Sheet, Toggle, cn, inputCls } from '@/components/ui';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const KEY = 'shev.trip';

type Local = Pick<SafetyTrip, 'id' | 'kind' | 'label' | 'pickup' | 'destination' | 'route' | 'startedAt' | 'dueAt' | 'autoEscalate' | 'contactIds'> & {
  status: 'active' | 'arrived' | 'checked_in' | 'cancelled';
  serverBackup: boolean;
  distance?: number;
  duration?: number;
  travelMode?: 'driving' | 'walking';
};

export function loadTrip(): Local | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Local | null;
    if (t && hasNative()) {
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
    /* storage unavailable: native alarm still runs */
  }
};

export function Trip({
  kind,
  contacts,
  region,
  signedIn,
  demo,
  onSos,
}: {
  kind: TripKind;
  contacts: EmergencyContact[];
  region: string;
  signedIn: boolean;
  demo: boolean;
  onSos: () => void;
}) {
  const [trip, setTrip] = useState<Local | null>(null);
  useEffect(() => setTrip(loadTrip()), []);

  return trip ? (
    <ActiveTrip trip={trip} setTrip={setTrip} contacts={contacts} signedIn={signedIn} demo={demo} onSos={onSos} />
  ) : (
    <Setup kind={kind} contacts={contacts} region={region} signedIn={signedIn} demo={demo} onStart={setTrip} />
  );
}

function Setup({
  kind,
  contacts,
  region,
  signedIn,
  demo,
  onStart,
}: {
  kind: TripKind;
  contacts: EmergencyContact[];
  region: string;
  signedIn: boolean;
  demo: boolean;
  onStart: (t: Local) => void;
}) {
  const [label, setLabel] = useState(kind === 'trip' ? 'Safe Ride Home' : "I'm going home");
  const [minutes, setMinutes] = useState(kind === 'trip' ? 30 : 60);
  const [custom, setCustom] = useState('');
  const [picked, setPicked] = useState<string[]>(contacts.filter((c) => c.phone).map((c) => c.id));
  const [auto, setAuto] = useState(true);

  // Uber / Rapido Locations
  const [here, setHere] = useState<EmergencyLocation | null>(null);
  const [pickup, setPickup] = useState<SearchResult | null>(null);
  const [dest, setDest] = useState<SearchResult | null>(null);
  const [pickupQuery, setPickupQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [pickupResults, setPickupResults] = useState<SearchResult[]>([]);
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [mapTarget, setMapTarget] = useState<'pickup' | 'destination'>('destination');
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');

  const [route, setRoute] = useState<{ line: [number, number][]; distance: number; duration: number } | null>(null);
  const [help, setHelp] = useState<HelpPlace[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);

  // Fetch initial GPS fix for pickup and stream refined updates
  useEffect(() => {
    if (kind === 'trip') {
      currentFix().then(async (loc) => {
        if (!loc) return;
        setHere(loc);
        const name = await reverseGeocode(loc.latitude, loc.longitude);
        setPickup({ name: `📍 ${name}`, latitude: loc.latitude, longitude: loc.longitude });
      });

      const off = onNative((ev) => {
        if (ev.type === 'location' && ev.location) {
          setHere(ev.location);
          setPickup((prev) => {
            // Only auto-update if pickup is still based on GPS (starts with 📍)
            if (!prev || prev.name.startsWith('📍')) {
              reverseGeocode(ev.location.latitude, ev.location.longitude).then((name) => {
                setPickup({ name: `📍 ${name}`, latitude: ev.location.latitude, longitude: ev.location.longitude });
              });
            }
            return prev;
          });
        }
      });
      return () => off();
    }
  }, [kind]);

  // Recalculate route whenever pickup, dest, or travelMode changes
  useEffect(() => {
    const origin = pickup ?? here;
    if (!origin || !dest) return;
    setRoute(null);
    setHelp([]);
    setMsg(null);

    tripRoute(origin, dest, travelMode)
      .then(async (r) => {
        setRoute(r);
        setMsg(null);
        const suggestedMin = Math.max(15, Math.ceil((r.duration / 60) * 1.35 / 5) * 5);
        setMinutes(suggestedMin);

        // Fetch safety corridor help points safely
        try {
          const mid = r.line[Math.floor(r.line.length / 2)] ?? [origin.latitude, origin.longitude];
          const places = await nearbyHelp(mid[0], mid[1], Math.min(5000, r.distance / 2 + 600));
          setHelp(
            places
              .filter((p) => (p.kind === 'police' || p.kind === 'hospital') && r.line.some(([la, lo]) => distanceM(p, { latitude: la, longitude: lo }) < 450))
              .slice(0, 10)
          );
        } catch {
          /* ignore corridor points if offline */
        }
      })
      .catch(() => {
        setMsg(null);
      });
  }, [pickup, dest, here, travelMode]);

  // Live autocomplete as user types for pick-up
  useEffect(() => {
    if (!pickupQuery.trim() || pickup) {
      setPickupResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPickup(true);
      try {
        const anchor = here ?? (dest ? { latitude: dest.latitude, longitude: dest.longitude } : undefined);
        const res = await searchPlace(pickupQuery, anchor, region);
        setPickupResults(res);
      } catch {
        /* ignore */
      } finally {
        setSearchingPickup(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pickupQuery, pickup, here, dest, region]);

  // Live autocomplete as user types for destination
  useEffect(() => {
    if (!destQuery.trim() || dest) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const anchor = here ?? (pickup ? { latitude: pickup.latitude, longitude: pickup.longitude } : undefined);
        const res = await searchPlace(destQuery, anchor, region);
        setDestResults(res);
      } catch {
        /* ignore */
      } finally {
        setSearchingDest(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [destQuery, dest, here, pickup, region]);

  async function handleSearchPickup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!pickupQuery.trim()) return;
    setSearchingPickup(true);
    setMsg(null);
    try {
      const anchor = here ?? (dest ? { latitude: dest.latitude, longitude: dest.longitude } : undefined);
      const res = await searchPlace(pickupQuery, anchor, region);
      setPickupResults(res);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSearchingPickup(false);
    }
  }

  async function handleSearchDest(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!destQuery.trim()) return;
    setSearchingDest(true);
    setMsg(null);
    try {
      const anchor = here ?? (pickup ? { latitude: pickup.latitude, longitude: pickup.longitude } : undefined);
      const res = await searchPlace(destQuery, anchor, region);
      setDestResults(res);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSearchingDest(false);
    }
  }

  async function resetPickupToGPS() {
    setBusy(true);
    try {
      const loc = await currentFix();
      if (loc) {
        setHere(loc);
        const name = await reverseGeocode(loc.latitude, loc.longitude);
        setPickup({ name: `📍 ${name}`, latitude: loc.latitude, longitude: loc.longitude });
        setPickupQuery('');
        setPickupResults([]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleMapPick(la: number, lo: number) {
    const name = await reverseGeocode(la, lo);
    if (mapTarget === 'pickup') {
      setPickup({ name, latitude: la, longitude: lo });
      setPickupQuery('');
      setPickupResults([]);
    } else {
      setDest({ name, latitude: la, longitude: lo });
      setDestQuery('');
      setDestResults([]);
    }
  }

  function swapLocations() {
    const oldP = pickup;
    const oldD = dest;
    setPickup(oldD);
    setDest(oldP);
    setRoute(null);
  }

  async function start() {
    setBusy(true);
    setMsg(null);
    const mins = custom ? Math.max(5, Math.min(1440, Number(custom))) : minutes;
    const id = randomId();
    const now = new Date();
    const effectivePickup = pickup ?? (here ? { name: 'Current Location', latitude: here.latitude, longitude: here.longitude } : null);

    const t: Local = {
      id,
      kind,
      label: label.trim() || (kind === 'trip' ? 'Safe Trip' : 'Safety Timer'),
      pickup: effectivePickup ? { name: effectivePickup.name.split(',').slice(0, 3).join(','), latitude: effectivePickup.latitude, longitude: effectivePickup.longitude } : null,
      destination: dest ? { name: dest.name.split(',').slice(0, 3).join(','), latitude: dest.latitude, longitude: dest.longitude } : null,
      route: route?.line ?? null,
      distance: route?.distance,
      duration: route?.duration,
      travelMode,
      startedAt: now.toISOString(),
      dueAt: new Date(now.getTime() + mins * 60_000).toISOString(),
      autoEscalate: auto,
      contactIds: picked,
      status: 'active',
      serverBackup: false,
    };

    if (!demo) {
      if (hasNative()) {
        invoke('tripStart', {
          tripId: id,
          kind,
          label: t.label,
          pickup: t.pickup,
          destination: t.destination,
          dueAt: t.dueAt,
          autoEscalate: auto,
          contactIds: picked,
          graceMin: 5,
        });
      }
      if (signedIn) {
        try {
          await api('/trips/start', {
            id,
            kind,
            label: t.label,
            pickup: t.pickup,
            destination: t.destination,
            route: t.route,
            minutes: mins,
            autoEscalate: auto,
            contactIds: picked,
          });
          t.serverBackup = true;
        } catch {
          /* phone-only offline backup */
        }
      }
    }
    saveTrip(t);
    onStart(t);
    setBusy(false);
  }

  const presets = kind === 'trip' ? [20, 30, 45, 60] : [30, 60, 120, 240];

  const mapPoints = useMemo(() => {
    const pts: { id: string; latitude: number; longitude: number; label: string; kind: 'pickup' | 'destination' | 'police' | 'hospital' }[] = [];
    if (pickup) {
      pts.push({ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, label: 'Pick-up', kind: 'pickup' });
    }
    if (dest) {
      pts.push({ id: 'dest', latitude: dest.latitude, longitude: dest.longitude, label: 'Destination', kind: 'destination' });
    }
    help.forEach((p) => {
      pts.push({ id: p.id, latitude: p.latitude, longitude: p.longitude, label: p.name, kind: p.kind as 'police' | 'hospital' });
    });
    return pts;
  }, [pickup, dest, help]);

  return (
    <div className="space-y-4">
      <Field label={kind === 'trip' ? 'Trip / Ride Name' : "What's happening?"}>
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="e.g. Going Home, Uber to City Center" />
      </Field>

      {kind === 'trip' && (
        <Card className="p-3.5 sm:p-5 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-line/60">
            <span className="text-xs font-black uppercase tracking-wider text-sos-600">Rapido / Uber Safe Ride</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={cn('rounded-full px-2.5 py-1 text-xs font-bold transition-all', travelMode === 'driving' ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}
              >
                🚗 Cab/Ride
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={cn('rounded-full px-2.5 py-1 text-xs font-bold transition-all', travelMode === 'walking' ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}
              >
                🚶‍♀️ Walk
              </button>
            </div>
          </div>

          {/* Connected Pick-up and Destination inputs */}
          <div className="relative mt-4 space-y-3">
            {/* Visual connector line between pickup and dropoff */}
            <div className="absolute left-[17px] top-[26px] bottom-[26px] w-[2px] bg-gradient-to-b from-emerald-500 via-line to-sos-500 z-0" />

            {/* Pick-up Row */}
            <div className="relative z-10 flex items-start gap-2.5 w-full min-w-0">
              <span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs ring-4 ring-emerald-100 shadow-sm">
                🟢
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 shrink-0">Pick-up Location</label>
                  <button type="button" onClick={resetPickupToGPS} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0">
                    🎯 GPS Current
                  </button>
                </div>
                {pickup ? (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2.5 w-full min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate flex-1 min-w-0">{pickup.name}</p>
                    <button type="button" onClick={() => setPickup(null)} className="text-xs font-bold text-emerald-700 hover:text-sos-600 shrink-0">
                      Edit
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSearchPickup} className="mt-1 flex items-center gap-2 w-full min-w-0">
                    <input
                      className={cn(inputCls, 'flex-1 min-w-0 !py-2 text-xs sm:text-sm')}
                      value={pickupQuery}
                      onChange={(e) => setPickupQuery(e.target.value)}
                      placeholder="Search pick-up in your city"
                    />
                    <Button variant="dark" className="!min-h-[38px] px-3 text-xs shrink-0">
                      {searchingPickup ? '…' : 'Find'}
                    </Button>
                  </form>
                )}

                {/* Pickup Results Dropdown */}
                {pickupResults.length > 0 && !pickup && (
                  <ul className="mt-1.5 divide-y divide-line rounded-2xl border border-line bg-white shadow-soft max-h-48 overflow-y-auto z-20 relative w-full">
                    {pickupResults.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-blush-50 truncate"
                          onClick={() => {
                            setPickup(r);
                            setPickupResults([]);
                          }}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-end pr-2 -my-2 relative z-10">
              <button
                type="button"
                onClick={swapLocations}
                title="Swap Pick-up and Destination"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-line text-xs font-bold text-ink-muted shadow-sm hover:text-ink active:scale-95"
              >
                ⇅
              </button>
            </div>

            {/* Destination Row */}
            <div className="relative z-10 flex items-start gap-2.5 w-full min-w-0">
              <span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sos-500 text-white font-bold text-xs ring-4 ring-sos-100 shadow-sm">
                🏁
              </span>
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-bold uppercase tracking-wider text-sos-700 block">Destination (Where to?)</label>
                {dest ? (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-2xl bg-sos-50/70 border border-sos-200/80 px-3.5 py-2.5 w-full min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate flex-1 min-w-0">{dest.name}</p>
                    <button type="button" onClick={() => (setDest(null), setRoute(null))} className="text-xs font-bold text-sos-600 hover:text-ink shrink-0">
                      Change
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSearchDest} className="mt-1 flex items-center gap-2 w-full min-w-0">
                    <input
                      className={cn(inputCls, 'flex-1 min-w-0 !py-2 text-xs sm:text-sm')}
                      value={destQuery}
                      onChange={(e) => setDestQuery(e.target.value)}
                      placeholder="Search destination (e.g. Hawa Mahal, Jaipur)"
                    />
                    <Button variant="dark" className="!min-h-[38px] px-3 text-xs shrink-0">
                      {searchingDest ? '…' : 'Find'}
                    </Button>
                  </form>
                )}

                {/* Destination Results Dropdown */}
                {destResults.length > 0 && !dest && (
                  <ul className="mt-1.5 divide-y divide-line rounded-2xl border border-line bg-white shadow-soft max-h-48 overflow-y-auto z-20 relative w-full">
                    {destResults.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-blush-50 truncate"
                          onClick={() => {
                            setDest(r);
                            setDestResults([]);
                          }}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Quick Rapido / Uber Popular Jaipur Hotspots */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted">
              <span>⚡ Rapido & Uber Popular Spots:</span>
              <span className="text-[10px] font-medium text-ink-soft">Tap to select {mapTarget === 'pickup' ? 'pick-up' : 'destination'}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
              {POPULAR_JAIPUR_SPOTS.slice(0, 10).map((spot, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (mapTarget === 'pickup') {
                      setPickup(spot);
                      setPickupQuery('');
                      setPickupResults([]);
                    } else {
                      setDest(spot);
                      setDestQuery('');
                      setDestResults([]);
                    }
                  }}
                  className="shrink-0 rounded-full border border-line bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink shadow-xs transition-all hover:border-sos-400 hover:bg-blush-50 active:scale-95"
                >
                  {spot.name.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Map Pin Selection Controls */}
          <div className="mt-2 flex items-center justify-between rounded-xl bg-blush-50/80 p-2 text-xs">
            <span className="font-semibold text-ink-soft">Tap map to pin:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setMapTarget('pickup')}
                className={cn('rounded-lg px-2.5 py-1 font-bold transition-all', mapTarget === 'pickup' ? 'bg-emerald-600 text-white' : 'bg-white text-ink-soft border border-line')}
              >
                🟢 Pick-up
              </button>
              <button
                type="button"
                onClick={() => setMapTarget('destination')}
                className={cn('rounded-lg px-2.5 py-1 font-bold transition-all', mapTarget === 'destination' ? 'bg-sos-500 text-white' : 'bg-white text-ink-soft border border-line')}
              >
                🏁 Destination
              </button>
            </div>
          </div>

          {/* Interactive Map Preview */}
          <div className="mt-3 h-64 overflow-hidden rounded-3xl border border-line">
            <MapView
              className="h-full"
              me={pickup ? { latitude: pickup.latitude, longitude: pickup.longitude, accuracy: 10, altitude: null, speed: 0, heading: null, timestamp: '' } : here}
              meLabel="Pick-up"
              route={route?.line}
              follow={false}
              points={mapPoints}
              onPick={handleMapPick}
            />
          </div>

          {/* Route Summary */}
          {route && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-3.5 border border-pink-200/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sos-700">Calculated Route</span>
                <span className="font-black text-ink">
                  {fmtDistance(route.distance)} · ~{Math.round(route.duration / 60)} min {travelMode === 'driving' ? 'ride' : 'walk'}
                </span>
              </div>
              {help.length > 0 && (
                <p className="mt-1 text-ink-muted">
                  🛡️ <b>Safe Corridor:</b> {help.length} police stations & hospitals mapped along your journey.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Safety Check-in Timer presets */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-soft">
          {kind === 'trip' ? 'Safe Journey Check-in (Buffer Timer)' : 'Check in within'}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMinutes(m);
                setCustom('');
              }}
              className={cn('rounded-2xl px-4 py-2.5 font-bold transition-all', !custom && minutes === m ? 'bg-sos-500 text-white shadow-glow' : 'bg-white shadow-soft')}
            >
              {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}
            </button>
          ))}
          <input
            className={cn(inputCls, '!w-28')}
            inputMode="numeric"
            placeholder="Custom min"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      {/* Contacts selection */}
      <Card>
        <p className="mb-2 font-bold">Who should receive your live ride & route?</p>
        {contacts.length === 0 && <p className="text-sm text-ink-muted">Add trusted contacts in your Safety Circle first.</p>}
        <div className="flex flex-wrap gap-2">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
              className={cn('rounded-full px-3.5 py-2 text-sm font-semibold transition-all', picked.includes(c.id) ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}
            >
              {c.name}
            </button>
          ))}
        </div>
        <Toggle
          on={auto}
          onChange={setAuto}
          label="Alert them automatically if I don't check in"
          hint="You're notified first. If unacknowledged within 5 minutes, contacts get an immediate SOS with your live path."
        />
      </Card>

      {msg && <p className="text-sm font-semibold text-sos-700">{msg}</p>}

      <Button big className="w-full" disabled={busy || (kind === 'trip' && !dest)} onClick={start}>
        {kind === 'trip' ? '🚀 Start Safe Ride & Live Tracking' : 'Start Safety Timer'}
      </Button>

      {kind === 'trip' && (
        <p className="text-center text-xs text-ink-muted">
          Your live moving location and route are shared with chosen contacts in real time until you arrive safely.
        </p>
      )}
    </div>
  );
}

function ActiveTrip({
  trip,
  setTrip,
  contacts,
  signedIn,
  demo,
  onSos,
}: {
  trip: Local;
  setTrip: (t: Local | null) => void;
  contacts: EmergencyContact[];
  signedIn: boolean;
  demo: boolean;
  onSos: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [arrived, setArrived] = useState(false);
  const [liveLoc, setLiveLoc] = useState<EmergencyLocation | null>(null);
  const [dist, setDist] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);
  const lastPostRef = useRef<number>(0);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const off = onNative((e) => e.type === 'trip_arrived' && e.tripId === trip.id && setArrived(true));
    return () => {
      clearInterval(t);
      off();
    };
  }, [trip.id]);

  // High-accuracy live position tracker (watchPosition)
  useEffect(() => {
    let watchId: number | null = null;

    const handlePosition = (pos: GeolocationPosition) => {
      const loc: EmergencyLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        altitude: pos.coords.altitude ?? null,
        speed: pos.coords.speed != null ? pos.coords.speed : null,
        heading: pos.coords.heading != null && !isNaN(pos.coords.heading) ? pos.coords.heading : null,
        timestamp: new Date(pos.timestamp).toISOString(),
      };

      setLiveLoc(loc);
      if (loc.speed != null && loc.speed > 0.5) {
        setSpeedKmh(Math.round(loc.speed * 3.6));
      }

      // Check distance to destination
      if (trip.destination) {
        const d = distanceM(loc, trip.destination);
        setDist(d);
        if (d < 120) setArrived(true);
      }

      // Sync location to server every 12 seconds
      const nowMs = Date.now();
      if (nowMs - lastPostRef.current > 12_000) {
        lastPostRef.current = nowMs;
        if (signedIn && trip.serverBackup) {
          api('/trips/location', { tripId: trip.id, location: loc }).catch(() => undefined);
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      // First quick fetch
      currentFix().then((l) => {
        if (l) {
          setLiveLoc(l);
          if (trip.destination) setDist(distanceM(l, trip.destination));
        }
      });

      // Continuous watchPosition for precise live movement
      try {
        watchId = navigator.geolocation.watchPosition(
          handlePosition,
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      } catch {
        /* fallback to interval */
      }
    }

    // Interval fallback
    const interval = setInterval(() => {
      currentFix().then((l) => {
        if (l) {
          setLiveLoc(l);
          if (trip.destination) {
            const d = distanceM(l, trip.destination);
            setDist(d);
            if (d < 120) setArrived(true);
          }
        }
      });
    }, 10_000);

    return () => {
      if (watchId != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(interval);
    };
  }, [trip.destination, signedIn, trip.serverBackup, trip.id]);

  const [liveRoute, setLiveRoute] = useState<[number, number][] | null>(trip.route ?? null);

  // Dynamically recalculate route as vehicle moves
  useEffect(() => {
    const origin = liveLoc ?? trip.pickup;
    if (!origin || !trip.destination) return;
    tripRoute(origin, trip.destination, trip.travelMode || 'driving')
      .then((r) => {
        if (r && r.line && r.line.length > 1) setLiveRoute(r.line);
        if (r.distance != null) setDist(r.distance);
      })
      .catch(() => undefined);
  }, [liveLoc?.latitude, liveLoc?.longitude, trip.pickup, trip.destination, trip.travelMode]);

  const total = Date.parse(trip.dueAt) - Date.parse(trip.startedAt);
  const left = Date.parse(trip.dueAt) - now;
  const overdue = left <= 0;
  const pct = Math.max(0, Math.min(1, 1 - left / total));
  const ring = useMemo(() => 2 * Math.PI * 54, []);

  async function finish(status: 'arrived' | 'checked_in' | 'cancelled') {
    if (!demo) {
      if (hasNative()) invoke('tripEnd', { tripId: trip.id, status });
      if (signedIn && trip.serverBackup) {
        await api('/trips/update', { tripId: trip.id, action: status }).catch(() => undefined);
      }
    }
    saveTrip(null);
    if (status === 'cancelled') {
      setTrip(null);
    } else {
      setArrived(true);
      setTimeout(() => setTrip(null), 2500);
    }
  }

  async function extend() {
    const dueAt = new Date(Math.max(Date.now(), Date.parse(trip.dueAt)) + 15 * 60_000).toISOString();
    const t = { ...trip, dueAt };
    if (!demo) {
      if (hasNative()) invoke('tripExtend', { tripId: trip.id, dueAt });
      if (signedIn && trip.serverBackup) {
        await api('/trips/update', { tripId: trip.id, action: 'extend', minutes: 15 }).catch(() => undefined);
      }
    }
    saveTrip(t);
    setTrip(t);
  }

  // Live ride sharing link
  // Compact live ride sharing link
  const shareUrl = useMemo(() => {
    const base = 'https://shevolution-ideathon.web.app';
    const params = new URLSearchParams();
    if (trip.id) params.set('id', trip.id.slice(0, 10));
    if (trip.pickup) {
      params.set('p', `${trip.pickup.latitude.toFixed(5)},${trip.pickup.longitude.toFixed(5)}`);
      if (trip.pickup.name) params.set('pn', trip.pickup.name.replace(/^📍\s*/, '').slice(0, 30));
    }
    if (trip.destination) {
      params.set('d', `${trip.destination.latitude.toFixed(5)},${trip.destination.longitude.toFixed(5)}`);
      if (trip.destination.name) params.set('dn', trip.destination.name.slice(0, 30));
    }
    if (trip.label) params.set('n', trip.label);
    return `${base}/trip?${params.toString()}`;
  }, [trip]);

  const shareText = useMemo(() => {
    const fromName = trip.pickup?.name ? trip.pickup.name.replace(/^📍\s*/, '') : 'My Location';
    const toName = trip.destination?.name ?? 'Destination';
    const loc = liveLoc ?? (trip.pickup ? { latitude: trip.pickup.latitude, longitude: trip.pickup.longitude, accuracy: 10 } : null);
    
    const gmapsSection = loc
      ? `🗺️ Google Maps: https://maps.google.com/?q=${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}\n📍 GPS: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (±${Math.round(loc.accuracy ?? 10)}m)`
      : '';
    const speedSection = liveLoc?.speed != null && liveLoc.speed > 0.5
      ? `\n🛵 Speed: ${Math.round(liveLoc.speed * 3.6)} km/h`
      : '';

    return `🛡️ Shevolution Safe Ride Live Track\nTraveling: ${fromName} ➔ ${toName}\n\n${gmapsSection}${speedSection}\n\n🔴 Live Moving Map Tracker:\n${shareUrl}`;
  }, [trip, shareUrl, liveLoc]);

  async function broadcastLiveTripToAll() {
    setBroadcasting(true);
    const selected = trip.contactIds && trip.contactIds.length > 0
      ? contacts.filter((c) => trip.contactIds.includes(c.id))
      : contacts;
    const withPhone = selected.filter((c) => c.phone);
    if (!demo && hasNative()) {
      // 1. Direct SMS
      if (withPhone.length > 0) {
        invoke('smsSend', {
          to: withPhone.map((c) => ({ id: c.id, phone: c.phone })),
          body: shareText,
          tag: 'trip_share',
        });
      }
      // 2. Direct WhatsApp
      withPhone.forEach((c) => {
        if (c.phone) invoke('whatsapp', { phone: c.phone, text: shareText });
      });
      // 3. Direct Email
      const emailTargets = selected.filter((c) => c.email).map((c) => c.email!);
      if (emailTargets.length > 0) {
        invoke('email', {
          to: emailTargets,
          subject: `🛡️ Track My Live Ride in Real Time — ${trip.label}`,
          body: shareText,
        });
      }
    } else if (!demo) {
      if (withPhone.length > 0) {
        window.location.href = `sms:${withPhone.map((c) => c.phone).join(',')}?body=${encodeURIComponent(shareText)}`;
      }
    }
    setBroadcastDone(true);
    setBroadcasting(false);
    setTimeout(() => setBroadcastDone(false), 5000);
  }

  function shareWhatsApp(phone?: string | null) {
    if (hasNative()) {
      invoke('whatsapp', { phone: phone || '', text: shareText });
    } else if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  }

  function shareSms(phone?: string | null) {
    if (hasNative()) {
      if (phone) {
        invoke('smsSend', { to: [{ id: 'direct', phone }], body: shareText, tag: 'trip_share' });
      } else {
        invoke('smsCompose', { body: shareText });
      }
    } else {
      window.location.href = `sms:${phone ? phone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(shareText)}`;
    }
  }

  function shareEmail(emailTarget?: string | null) {
    if (hasNative()) {
      invoke('email', { to: emailTarget ? [emailTarget] : [], subject: `🛡️ Track My Live Ride in Real Time — ${trip.label}`, body: shareText });
    } else {
      window.location.href = `mailto:${emailTarget || ''}?subject=${encodeURIComponent(`🛡️ Track My Live Ride in Real Time — ${trip.label}`)}&body=${encodeURIComponent(shareText)}`;
    }
  }

  function shareNative() {
    if (hasNative()) {
      invoke('share', { subject: `🛡️ Track My Live Ride: ${trip.label}`, text: shareText });
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: `🛡️ Safe Ride Track: ${trip.label}`, text: shareText, url: shareUrl }).catch(() => undefined);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const mapPoints = useMemo(() => {
    const pts: { id: string; latitude: number; longitude: number; label: string; kind: 'pickup' | 'destination' }[] = [];
    if (!liveLoc && trip.pickup) {
      pts.push({ id: 'pickup', latitude: trip.pickup.latitude, longitude: trip.pickup.longitude, label: trip.pickup.name || 'Pick-up', kind: 'pickup' });
    }
    if (trip.destination) {
      pts.push({ id: 'dest', latitude: trip.destination.latitude, longitude: trip.destination.longitude, label: trip.destination.name || 'Destination', kind: 'destination' });
    }
    return pts;
  }, [liveLoc, trip.pickup, trip.destination]);

  const mm = Math.floor(Math.abs(left) / 60000);
  const ss = Math.floor((Math.abs(left) % 60000) / 1000);

  return (
    <div className="space-y-4">
      {/* Live Ride Navigation Status Header */}
      <div className="rounded-3xl bg-gradient-to-r from-ink to-ink-soft p-4 text-white shadow-soft flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-pink-300">Live Journey Tracking</span>
          </div>
          <p className="mt-1 text-lg font-black">{trip.label}</p>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-sos-500 px-3.5 py-2 text-xs font-bold text-white shadow-glow hover:bg-sos-600 active:scale-95 transition-all"
        >
          <span>📲</span> Share Ride
        </button>
      </div>

      {/* Prominent Live Rapido / Uber Map */}
      <div className="h-80 sm:h-96 overflow-hidden rounded-4xl border border-line bg-white shadow-soft relative">
        <MapView
          className="h-full w-full"
          me={liveLoc ?? (trip.pickup ? { latitude: trip.pickup.latitude, longitude: trip.pickup.longitude, accuracy: 10, altitude: null, speed: null, heading: null, timestamp: new Date().toISOString() } : null)}
          meLabel="You (Moving)"
          route={liveRoute ?? trip.route ?? undefined}
          points={mapPoints}
          follow={true}
          showRecenter={true}
        />
      </div>

      {/* Ride Metrics HUD Card */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-blush-50 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Distance</span>
            <p className="text-base font-black text-sos-600">{dist != null ? fmtDistance(dist) : 'Tracking…'}</p>
          </div>
          <div className="rounded-2xl bg-blush-50 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Speed</span>
            <p className="text-base font-black text-ink">{speedKmh != null && speedKmh > 1 ? `${speedKmh} km/h` : 'Moving'}</p>
          </div>
          <div className="rounded-2xl bg-blush-50 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Check In</span>
            <p className={cn('text-base font-black', overdue ? 'text-warn-600 animate-pulse' : 'text-ink')}>
              {mm}:{String(ss).padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Locations summary */}
        <div className="mt-3 space-y-1.5 border-t border-line/60 pt-3 text-xs w-full min-w-0">
          {trip.pickup && (
            <div className="flex items-center gap-2 w-full min-w-0">
              <span className="font-bold text-emerald-600 shrink-0">🟢 From:</span>
              <span className="font-semibold text-ink truncate flex-1 min-w-0">{trip.pickup.name}</span>
            </div>
          )}
          {trip.destination && (
            <div className="flex items-center gap-2 w-full min-w-0">
              <span className="font-bold text-sos-600 shrink-0">🏁 To:</span>
              <span className="font-semibold text-ink truncate flex-1 min-w-0">{trip.destination.name}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Big Share Ride Action Bar */}
      <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="text-xs font-bold text-emerald-950">Safety Live Sharing is Active</p>
              <p className="text-[11px] text-emerald-700">Send your live moving map to your contacts.</p>
            </div>
          </div>
          <Button variant="white" className="!min-h-[38px] px-3 text-xs" onClick={() => setShareOpen(true)}>
            Options
          </Button>
        </div>
        <Button
          big
          variant="safe"
          className="w-full !min-h-[44px] text-xs font-extrabold"
          disabled={broadcasting}
          onClick={broadcastLiveTripToAll}
        >
          {broadcasting ? 'Broadcasting live ride…' : broadcastDone ? 'Broadcasted to Circle! ✓ (SMS + WhatsApp + Email)' : '⚡ 1-Tap Broadcast Ride to Circle (SMS + WhatsApp + Email)'}
        </Button>
      </div>

      {/* Arrival Announcement */}
      <AnimatePresence>
        {arrived && !overdue && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-emerald-500 p-5 text-white text-center shadow-soft">
            <E3d name="home" size={56} className="mx-auto" />
            <h2 className="mt-2 text-xl font-black">You have arrived safely!</h2>
            <p className="text-xs text-white/90">Confirm so your emergency circle knows you reached.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue Warning */}
      {overdue && (
        <Card className="border-warn-500/50 bg-warn-50 p-4 text-left">
          <p className="text-lg font-black text-warn-900">Are you safe?</p>
          <p className="text-xs text-warn-800">
            {trip.autoEscalate
              ? 'If you do not confirm safe within 5 minutes, your emergency circle will be automatically alerted with your live location.'
              : 'Trip check-in time has elapsed.'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button big variant="safe" onClick={() => finish('checked_in')}>
              I&apos;m Safe
            </Button>
            <Button big onClick={onSos}>
              SOS Help
            </Button>
          </div>
        </Card>
      )}

      {/* Controls */}
      <div className="grid gap-2">
        <Button big variant="safe" onClick={() => finish(trip.kind === 'trip' ? 'arrived' : 'checked_in')}>
          {trip.kind === 'trip' ? "I've arrived safely" : "I'm safe — stop timer"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="white" onClick={extend}>
            + 15 minutes
          </Button>
          <Button variant="soft" onClick={onSos}>
            🚨 Trigger SOS
          </Button>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-blush-50 border border-line py-2.5 px-4 text-xs font-bold text-ink hover:bg-blush-100 active:scale-95 transition-all mt-1"
          onClick={() => finish('cancelled')}
        >
          <span>🔄</span> End & Start Fresh Ride from Current Location (GPS)
        </button>
        <button type="button" className="py-1 text-xs font-semibold text-ink-muted hover:text-sos-600" onClick={() => finish('cancelled')}>
          Cancel ride
        </button>
      </div>

      {/* Share Ride Sheet */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Share Live Ride with Contacts">
        <div className="space-y-4 pt-2">
          <p className="text-xs text-ink-soft">
            Contacts can view your live vehicle movement, heading, and route in real time without needing to log in.
          </p>

          <Button
            big
            variant="safe"
            className="w-full !min-h-[46px] text-sm font-extrabold"
            disabled={broadcasting}
            onClick={broadcastLiveTripToAll}
          >
            {broadcasting ? 'Broadcasting to Circle…' : broadcastDone ? 'Broadcasted to Circle! ✓ (SMS + WhatsApp + Email)' : '⚡ 1-Tap Broadcast to ALL Circle Contacts'}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => shareWhatsApp()}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-3 font-bold text-white shadow-soft hover:opacity-95 text-xs"
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => shareSms()}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink px-3 py-3 font-bold text-white shadow-soft hover:opacity-95 text-xs"
            >
              <span>✉️</span> SMS
            </button>
            <button
              type="button"
              onClick={() => shareEmail()}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-600 px-3 py-3 font-bold text-white shadow-soft hover:opacity-95 text-xs"
            >
              <span>📧</span> Email
            </button>
          </div>

          <button
            type="button"
            onClick={shareNative}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-line p-2.5 text-xs font-bold text-ink shadow-sm hover:bg-blush-50 active:scale-95 transition-all"
          >
            <span>📲</span> Open System Share Sheet (Any App)
          </button>

          <div className="rounded-2xl border border-line bg-blush-50/60 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Live Tracking Link</span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <input readOnly value={shareUrl} className="w-full bg-transparent text-xs text-ink font-mono truncate outline-none" />
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink border border-line shadow-sm hover:bg-blush-50"
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick share to saved circle contacts */}
          {contacts.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted mb-2">Send Directly to Contacts:</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-white p-2 border border-line gap-2">
                    <span className="text-xs font-bold text-ink truncate flex-1 min-w-0">{c.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.phone && (
                        <button
                          type="button"
                          onClick={() => shareWhatsApp(c.phone)}
                          className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200"
                        >
                          WhatsApp
                        </button>
                      )}
                      {c.phone && (
                        <button
                          type="button"
                          onClick={() => shareSms(c.phone)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-200"
                        >
                          SMS
                        </button>
                      )}
                      {c.email && (
                        <button
                          type="button"
                          onClick={() => shareEmail(c.email)}
                          className="rounded-lg bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-200"
                        >
                          Email
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

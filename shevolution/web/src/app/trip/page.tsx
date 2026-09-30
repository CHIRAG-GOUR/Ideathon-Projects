'use client';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { EmergencyLocation, SafetyTrip } from '@shared/types';
import { ago, fmtDistance } from '@shared/geo';
import { db, loadConfig } from '@/lib/firebase';
import { api } from '@/lib/api';
import { Button, Card, E3d, Logo, Pill, Spinner, cn } from '@/components/ui';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-blush-100" />,
});

interface SharedTripData extends Omit<SafetyTrip, 'kind'> {
  kind: 'trip' | 'activity' | 'sos';
  ownerName?: string;
  ownerPhone?: string | null;
  updatedAt?: string;
}

export default function SharedTripPage() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center"><Spinner /></div>}>
      <SharedTripContent />
    </Suspense>
  );
}

function SharedTripContent() {
  const [tripId, setTripId] = useState<string>('');
  const [trip, setTrip] = useState<SharedTripData | null | undefined>(undefined);
  const [isSos, setIsSos] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || window.location.pathname.split('/')[2] || 'ride';
    const sosParam = params.get('sos') === '1' || params.get('sos') === 'true' || id.toLowerCase().startsWith('sos');
    setTripId(id);
    setIsSos(sosParam);

    // Extract compact and standard coordinate parameters
    let pLat = 0, pLng = 0;
    if (params.get('p')) {
      const parts = decodeURIComponent(params.get('p')!).split(',');
      pLat = Number(parts[0]);
      pLng = Number(parts[1]);
    } else if (params.get('pLat')) {
      pLat = Number(params.get('pLat'));
      pLng = Number(params.get('pLng'));
    } else if (params.get('lat')) {
      pLat = Number(params.get('lat'));
      pLng = Number(params.get('lng'));
    }

    let dLat = 0, dLng = 0;
    if (params.get('d')) {
      const parts = decodeURIComponent(params.get('d')!).split(',');
      dLat = Number(parts[0]);
      dLng = Number(parts[1]);
    } else if (params.get('dLat')) {
      dLat = Number(params.get('dLat'));
      dLng = Number(params.get('dLng'));
    }

    const pName = params.get('pn') || params.get('pName') || (sosParam ? 'Emergency Location' : 'Pick-up Location');
    const dName = params.get('dn') || params.get('dName') || 'Destination';
    const rider = params.get('n') || params.get('name') || (sosParam ? 'Shevolution User' : 'Shevolution Rider');

    const hasCoords = (pLat !== 0 && pLng !== 0) || (dLat !== 0 && dLng !== 0);

    // If coordinates or locations are in URL, IMMEDIATELY load the live trip / SOS view
    if (hasCoords) {
      setTrip({
        id,
        kind: sosParam ? 'sos' : 'trip',
        label: sosParam ? `${rider}'s Emergency Live Location` : `${rider}'s Safe Ride`,
        ownerName: rider,
        pickup: pLat && pLng ? { name: pName, latitude: pLat, longitude: pLng } : null,
        destination: dLat && dLng ? { name: dName, latitude: dLat, longitude: dLng } : null,
        route: null,
        startedAt: new Date().toISOString(),
        dueAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        status: 'active',
        autoEscalate: true,
        contactIds: [],
        lastLocation: pLat && pLng 
          ? { latitude: pLat, longitude: pLng, accuracy: 10, altitude: null, speed: 0, heading: null, timestamp: new Date().toISOString() } 
          : (dLat && dLng ? { latitude: dLat, longitude: dLng, accuracy: 10, altitude: null, speed: 0, heading: null, timestamp: new Date().toISOString() } : null),
        overdueAt: null,
        endedAt: null,
      });
      setError(null);
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        if (!id || id === 'ride' || id === 'live') return;
        if (await loadConfig()) {
          const tripRef = doc(db(), 'sharedTrips', id);
          unsubscribe = onSnapshot(
            tripRef,
            (snap) => {
              if (snap.exists()) {
                setTrip(snap.data() as SharedTripData);
                setError(null);
              }
            },
            () => {
              /* ignore Firestore errors silently when coords are present */
            }
          );
        }
      } catch (e) {
        if (!hasCoords) {
          setError('Unable to load live ride data right now.');
        }
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const active = trip && ['active', 'overdue', 'escalated'].includes(trip.status);
  const arrived = trip && trip.status === 'arrived';
  const cancelled = trip && trip.status === 'cancelled';

  const userLocation: EmergencyLocation | null = useMemo(() => {
    if (!trip?.lastLocation) {
      if (trip?.pickup) {
        return {
          latitude: trip.pickup.latitude,
          longitude: trip.pickup.longitude,
          accuracy: 10,
          altitude: null,
          speed: 0,
          heading: null,
          timestamp: trip.startedAt,
        };
      }
      return null;
    }
    return trip.lastLocation;
  }, [trip]);

  const mapPoints = useMemo(() => {
    const pts: { id: string; latitude: number; longitude: number; label: string; kind: 'pickup' | 'destination' }[] = [];
    if (trip?.pickup) {
      pts.push({
        id: 'pickup',
        latitude: trip.pickup.latitude,
        longitude: trip.pickup.longitude,
        label: isSos ? `SOS Location: ${trip.pickup.name}` : `Pick-up: ${trip.pickup.name}`,
        kind: 'pickup',
      });
    }
    if (trip?.destination) {
      pts.push({
        id: 'dest',
        latitude: trip.destination.latitude,
        longitude: trip.destination.longitude,
        label: `Destination: ${trip.destination.name}`,
        kind: 'destination',
      });
    }
    return pts;
  }, [trip, isSos]);

  // Calculate distance remaining
  const distRemaining = useMemo(() => {
    if (!userLocation || !trip?.destination) return null;
    const lat1 = userLocation.latitude * (Math.PI / 180);
    const lon1 = userLocation.longitude * (Math.PI / 180);
    const lat2 = trip.destination.latitude * (Math.PI / 180);
    const lon2 = trip.destination.longitude * (Math.PI / 180);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, [userLocation, trip?.destination]);

  const speedKmh = useMemo(() => {
    if (!userLocation?.speed) return null;
    return Math.round(userLocation.speed * 3.6);
  }, [userLocation?.speed]);

  return (
    <main className="mx-auto max-w-xl px-4 pb-12 pt-4">
      {/* Brand Header */}
      <header className="mb-4 flex items-center justify-between">
        <Logo size={32} />
        {isSos ? (
          <span className="flex items-center gap-1.5 rounded-full bg-sos-50 px-3 py-1 text-xs font-black text-sos-700 border border-sos-300 animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-sos-600 animate-ping" />
            EMERGENCY SOS ACTIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Ride Track
          </span>
        )}
      </header>

      {/* Loading state */}
      {trip === undefined && !error && (
        <div className="grid h-72 place-items-center rounded-3xl bg-white p-8 text-ink-muted shadow-soft border border-line">
          <span className="inline-flex items-center gap-2 font-semibold text-sm">
            <Spinner /> Connecting to live tracking…
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-4xl border border-line bg-white p-8 text-center shadow-soft">
          <E3d name="lock" size={56} className="mx-auto" />
          <h2 className="mt-3 text-xl font-extrabold text-ink">Tracking Not Available</h2>
          <p className="mt-1 text-sm text-ink-muted">{error}</p>
          <a
            href="tel:112"
            className="mt-5 inline-flex min-h-[50px] items-center rounded-2xl bg-sos-500 px-6 font-bold text-white shadow-glow hover:bg-sos-600"
          >
            Emergency 112
          </a>
        </div>
      )}

      {/* Completed / Safe state */}
      {arrived && (
        <div className="rounded-4xl border border-emerald-200 bg-emerald-50/70 p-7 text-center shadow-soft mb-4">
          <E3d name="home" size={72} className="mx-auto" />
          <h2 className="mt-2 text-2xl font-extrabold text-emerald-950">Arrived Safely!</h2>
          <p className="mt-1 text-sm text-emerald-800">
            {trip.ownerName ?? 'The user'} has reached safety.
          </p>
        </div>
      )}

      {/* Cancelled state */}
      {cancelled && (
        <div className="rounded-4xl border border-line bg-white p-7 text-center shadow-soft mb-4">
          <E3d name="bell" size={60} className="mx-auto" />
          <h2 className="mt-2 text-xl font-extrabold text-ink">Session Concluded</h2>
          <p className="mt-1 text-sm text-ink-muted">This live sharing session has ended.</p>
        </div>
      )}

      {/* Active Trip / SOS Content */}
      {trip && (
        <div className="space-y-4">
          {/* Header Card */}
          <div
            className={cn(
              'overflow-hidden rounded-3xl p-5 text-white shadow-soft transition-all',
              isSos
                ? 'bg-gradient-to-br from-sos-600 via-rose-700 to-ink ring-2 ring-sos-400'
                : 'bg-gradient-to-br from-ink to-ink-soft'
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-black uppercase tracking-wider', isSos ? 'text-amber-200' : 'text-pink-300')}>
                {isSos ? '🚨 EMERGENCY SOS BROADCAST' : 'Shevolution Protected Ride'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                <span className={cn('h-2 w-2 rounded-full', active ? (isSos ? 'bg-amber-300 animate-ping' : 'bg-emerald-400 animate-ping') : 'bg-white/60')} />
                {active ? 'LIVE ON MAP' : 'COMPLETED'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black">
              {isSos ? `🆘 ${trip.ownerName || 'User'} needs HELP` : (trip.ownerName ? `${trip.ownerName}'s Journey` : trip.label)}
            </h1>
            <p className="mt-1 text-xs text-white/90">
              {isSos ? 'Live GPS beacon active' : `Started ${ago(trip.startedAt, now)}`}
              {userLocation?.timestamp && ` · Location updated ${ago(userLocation.timestamp, now)}`}
            </p>
          </div>

          {/* Live Google Map */}
          <div className="h-80 sm:h-96 overflow-hidden rounded-4xl border border-line bg-white shadow-soft relative">
            <MapView
              className="h-full w-full"
              me={userLocation}
              meLabel={isSos ? `${trip.ownerName || 'User'} (SOS GPS)` : `${trip.ownerName || 'Rider'} (Moving)`}
              route={trip.route ?? undefined}
              points={mapPoints}
              follow={true}
              showRecenter={true}
            />
          </div>

          {/* Live Stats HUD */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {isSos ? (
                <>
                  <div className="rounded-2xl bg-sos-50/80 border border-sos-100 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sos-700">Alert Status</span>
                    <p className="mt-0.5 text-base font-black text-sos-600 animate-pulse">EMERGENCY</p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">GPS Accuracy</span>
                    <p className="mt-0.5 text-base font-black text-ink">
                      {userLocation?.accuracy ? `±${Math.round(userLocation.accuracy)}m` : 'High Precision'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Movement</span>
                    <p className="mt-0.5 text-base font-black text-ink">
                      {speedKmh != null && speedKmh > 1 ? `${speedKmh} km/h` : 'Live Fixed'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Broadcast Time</span>
                    <p className="mt-0.5 text-xs font-black text-ink truncate">
                      {new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Distance to go</span>
                    <p className="mt-0.5 text-lg font-black text-sos-600">
                      {distRemaining != null ? fmtDistance(distRemaining) : 'Calculating…'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Speed</span>
                    <p className="mt-0.5 text-lg font-black text-ink">
                      {speedKmh != null && speedKmh > 1 ? `${speedKmh} km/h` : 'Stationary'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status</span>
                    <p className="mt-0.5 text-sm font-black text-emerald-600">
                      {active ? 'In Transit' : arrived ? 'Arrived' : 'Completed'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blush-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Due by</span>
                    <p className="mt-0.5 text-sm font-black text-ink">
                      {new Date(trip.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Locations breakdown */}
            <div className="mt-4 space-y-2.5 border-t border-line/60 pt-3 text-sm">
              {userLocation && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-sos-700 shadow-sm">
                    {isSos ? '🚨' : '🛵'}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-ink-muted">{isSos ? 'Live SOS GPS Position' : 'Rider\'s Live GPS Position'}</span>
                    <p className="font-bold text-ink leading-tight">
                      {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                      <span className="ml-1.5 text-xs font-medium text-ink-muted">({userLocation.accuracy ? `±${Math.round(userLocation.accuracy)}m` : 'GPS fix'})</span>
                    </p>
                  </div>
                </div>
              )}
              {trip.pickup && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 shadow-sm">
                    {isSos ? '📍' : '🟢'}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-ink-muted">{isSos ? 'Reported Location / Area' : 'Pick-up Location'}</span>
                    <p className="font-bold text-ink leading-tight">{trip.pickup.name}</p>
                  </div>
                </div>
              )}
              {trip.destination && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sos-100 text-xs font-bold text-sos-700 shadow-sm">
                    🏁
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-ink-muted">Destination</span>
                    <p className="font-bold text-ink leading-tight">{trip.destination.name}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {userLocation ? (
              <a
                href={`https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="col-span-1 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-3 font-bold text-ink border border-line shadow-soft hover:bg-blush-50 text-xs sm:text-sm text-center active:scale-[0.98] transition-all"
              >
                <span>🗺️</span> Open Google Maps
              </a>
            ) : trip.destination ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${trip.destination.latitude},${trip.destination.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="col-span-1 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-3 font-bold text-ink border border-line shadow-soft hover:bg-blush-50 text-xs sm:text-sm text-center active:scale-[0.98] transition-all"
              >
                <span>🧭</span> Route on Maps
              </a>
            ) : null}
            <a
              href="tel:112"
              className="col-span-1 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-sos-500 px-4 font-bold text-white shadow-glow hover:bg-sos-600 text-sm active:scale-[0.98] transition-all"
            >
              <span>🚨</span> Call 112
            </a>
          </div>

          {isSos && (
            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:1091"
                className="col-span-1 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-ink px-3 font-bold text-white shadow-soft hover:bg-ink-soft text-xs active:scale-[0.98] transition-all"
              >
                <span>👮‍♀️</span> Helpline 1091
              </a>
              <a
                href="tel:100"
                className="col-span-1 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-ink px-3 font-bold text-white shadow-soft hover:bg-ink-soft text-xs active:scale-[0.98] transition-all"
              >
                <span>🚔</span> Police 100
              </a>
            </div>
          )}

          <p className="text-center text-xs text-ink-muted">
            {isSos ? 'Shevolution Emergency Protection Network · Immediate Assistance' : 'Shevolution Live Ride Shield · Tracking active while trip is in progress'}
          </p>
        </div>
      )}
    </main>
  );
}

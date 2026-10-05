'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { LocateFixed, Loader2, Navigation } from 'lucide-react';
import type { GeoFix, RoadHazard } from '@/types';
import { watchHazards, toMarkers } from '@/lib/hazards';
import { getFix } from '@/lib/geo';
import { ModeBadge } from '@/components/Chips';
import { SEVERITY } from '@/lib/meta';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-full animate-pulse bg-paper-200" /> });

type Filter = 'all' | 'vehicle' | 'citizen' | 'near';

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapPage() {
  const [all, setAll] = useState<RoadHazard[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [me, setMe] = useState<GeoFix | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial immediate fetch from /api/hazards (includes auto-seeded Jaipur dataset)
  useEffect(() => {
    fetch('/api/hazards')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.hazards) && data.hazards.length > 0) {
          setAll(data.hazards);
        }
      })
      .catch(() => undefined);
  }, []);

  // 2. Realtime subscription to new hazards
  useEffect(() => {
    let un: (() => void) | undefined;
    watchHazards({ max: 1000 }, (hazards) => {
      if (hazards && hazards.length > 0) {
        setAll(hazards);
      }
    }, () => undefined).then((u) => (un = u));
    return () => un?.();
  }, []);

  async function handleNearMe() {
    setLocating(true);
    setError(null);
    try {
      const fix = await getFix();
      setMe(fix);
      setFilter('near');
      setMapCenter([fix.latitude, fix.longitude]);
      setMapZoom(16);
    } catch {
      setError('Could not access GPS location. Please ensure location permissions are enabled on your device.');
    } finally {
      setLocating(false);
    }
  }

  const shown = useMemo(() => {
    const list = all ?? [];
    if (filter === 'all') return list;
    if (filter === 'vehicle') return list.filter((h) => h.source === 'vehicle');
    if (filter === 'citizen') return list.filter((h) => h.source === 'citizen');
    if (filter === 'near' && me) {
      // Return hazards sorted by distance from user
      return [...list].sort((a, b) => {
        const da = calcDistanceKm(me.latitude, me.longitude, a.latitude, a.longitude);
        const db = calcDistanceKm(me.latitude, me.longitude, b.latitude, b.longitude);
        return da - db;
      });
    }
    return list;
  }, [all, filter, me]);

  const markers = useMemo(() => toMarkers(shown), [shown]);

  return (
    <div className="page py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Map</p>
          <h1 className="display mt-1 text-3xl">Road hazards</h1>
          <p className="mt-1 text-sm text-graphite-muted">
            Live municipal & sensor reports. {all ? `${shown.length} hazards recorded across Jaipur` : 'Loading…'}
          </p>
        </div>
        <ModeBadge mode="live" />
      </div>

      {/* 2 × 2 Filter Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            setFilter('all');
            setMapCenter(undefined);
            setMapZoom(undefined);
          }}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition shadow-sm ring-1 ring-inset',
            filter === 'all'
              ? 'bg-graphite text-white ring-graphite shadow-md'
              : 'bg-white text-graphite-soft ring-paper-300 hover:bg-paper-50 active:scale-[0.98]'
          )}
          data-testid="filter-all"
        >
          <span className="text-base">🌐</span> All Hazards
        </button>

        <button
          onClick={() => {
            setFilter('vehicle');
            setMapCenter(undefined);
            setMapZoom(undefined);
          }}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition shadow-sm ring-1 ring-inset',
            filter === 'vehicle'
              ? 'bg-graphite text-white ring-graphite shadow-md'
              : 'bg-white text-graphite-soft ring-paper-300 hover:bg-paper-50 active:scale-[0.98]'
          )}
          data-testid="filter-vehicle"
        >
          <span className="text-base">🚗</span> Vehicle Detections
        </button>

        <button
          onClick={() => {
            setFilter('citizen');
            setMapCenter(undefined);
            setMapZoom(undefined);
          }}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition shadow-sm ring-1 ring-inset',
            filter === 'citizen'
              ? 'bg-graphite text-white ring-graphite shadow-md'
              : 'bg-white text-graphite-soft ring-paper-300 hover:bg-paper-50 active:scale-[0.98]'
          )}
          data-testid="filter-citizen"
        >
          <span className="text-base">📱</span> Citizen Reports
        </button>

        <button
          onClick={handleNearMe}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition shadow-sm ring-1 ring-inset',
            filter === 'near' && me
              ? 'bg-blue-600 text-white ring-blue-600 shadow-md'
              : 'bg-white text-graphite ring-paper-300 hover:bg-paper-50 active:scale-[0.98]'
          )}
          data-testid="filter-near-me"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <LocateFixed className="h-4 w-4 text-blue-500" />}
          <span>{filter === 'near' && me ? '🎯 Near Me (Active)' : '🎯 Near Me'}</span>
        </button>
      </div>

      {error && <p className="mt-3 rounded-xl bg-pothole-50 p-2.5 text-xs font-semibold text-pothole-600 border border-pothole-200">{error}</p>}

      {filter === 'near' && me && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-800 border border-blue-200">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
            Live GPS Centered: {me.latitude.toFixed(5)}, {me.longitude.toFixed(5)} (±{Math.round(me.accuracy ?? 0)}m)
          </span>
          <button onClick={handleNearMe} className="text-blue-600 underline hover:text-blue-900 font-bold">
            Recenter
          </button>
        </div>
      )}

      <div className="mt-4 h-[60vh] sm:h-[65vh] overflow-hidden rounded-3xl ring-1 ring-paper-300 shadow-lg">
        <MapView
          hazards={markers}
          cluster
          user={me ? { lat: me.latitude, lon: me.longitude, accuracy: me.accuracy } : null}
          center={mapCenter}
          zoom={mapZoom}
          fitToHazards={!mapCenter}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-graphite-soft">
        {(['high', 'medium', 'low', 'unknown'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-full" style={{ background: SEVERITY[s].color }} /> {SEVERITY[s].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-blue-500" /> You
        </span>
        <span className="text-graphite-muted">Private citizen reports & fleet telemetry synced live.</span>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { LocateFixed, Loader2 } from 'lucide-react';
import type { GeoFix, RoadHazard } from '@/types';
import { watchHazards, toMarkers } from '@/lib/hazards';
import { firebaseConfigured } from '@/lib/firebase';
import { getFix } from '@/lib/geo';
import { ModeBadge } from '@/components/Chips';
import { SEVERITY } from '@/lib/meta';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-full animate-pulse bg-paper-200" /> });

type Filter = 'all' | 'vehicle' | 'citizen';

export default function MapPage() {
  const [all, setAll] = useState<RoadHazard[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [me, setMe] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return setAll([]);
    let un: (() => void) | undefined;
    watchHazards({ max: 1000 }, setAll, () => setError('Couldn’t load the map data.')).then((u) => (un = u));
    return () => un?.();
  }, []);

  const shown = useMemo(() => (all ?? []).filter((h) => filter === 'all' || h.source === filter), [all, filter]);
  const markers = useMemo(() => toMarkers(shown), [shown]);

  return (
    <div className="page py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Map</p>
          <h1 className="display mt-1 text-3xl">Road hazards</h1>
          <p className="mt-1 text-sm text-graphite-muted">
            Real reports only, updated live. {all ? `${shown.length} shown` : 'Loading…'}
          </p>
        </div>
        <ModeBadge mode="live" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', 'vehicle', 'citizen'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('chip py-2 text-sm ring-1 ring-inset', filter === f ? 'bg-graphite text-white ring-graphite' : 'bg-white text-graphite-soft ring-paper-300')} data-testid={`filter-${f}`}>
            {f === 'all' ? 'All' : f === 'vehicle' ? '🚗 Vehicle detections' : '📱 Citizen reports'}
          </button>
        ))}
        <button
          onClick={async () => {
            setLocating(true);
            try {
              setMe(await getFix());
            } catch {
              setError('Couldn’t get your location.');
            } finally {
              setLocating(false);
            }
          }}
          className="btn btn-secondary ml-auto h-10 min-h-0 text-sm"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Near me
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-pothole-600">{error}</p>}
      <div className="mt-4 h-[65vh] overflow-hidden rounded-3xl ring-1 ring-paper-300">
        <MapView hazards={markers} cluster user={me ? { lat: me.latitude, lon: me.longitude, accuracy: me.accuracy } : null} center={me ? [me.latitude, me.longitude] : undefined} zoom={me ? 15 : undefined} fitToHazards={!me} className="h-full w-full" />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-graphite-soft">
        {(['high', 'medium', 'low', 'unknown'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-full" style={{ background: SEVERITY[s].color }} /> {SEVERITY[s].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-gps-500" /> You
        </span>
        <span className="text-graphite-muted">Photos are private — only the reporter and road authorities can see them.</span>
      </div>
    </div>
  );
}

'use client';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { EmergencyLocation } from '@shared/types';
import type { RegionConfig } from '@shared/emergency';
import { directionsLink, fmtDistance } from '@shared/geo';
import { nearbyHelp, type HelpKind, type HelpPlace } from '@/lib/places';
import { currentFix, dial, openExternal } from '@/lib/native';
import { Button, Card, E3d, Spinner, cn } from '@/components/ui';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const TABS: { kind: HelpKind; label: string; icon: string }[] = [
  { kind: 'police', label: 'Police', icon: 'police' },
  { kind: 'hospital', label: 'Hospitals', icon: 'hospital' },
  { kind: 'pharmacy', label: 'Pharmacy', icon: 'pharmacy' },
  { kind: 'fire', label: 'Fire', icon: 'fire' },
  { kind: 'army', label: 'Army', icon: 'shield' },
];

export function Nearby({ region }: { region: RegionConfig }) {
  const [loc, setLoc] = useState<EmergencyLocation | null>(null);
  const [places, setPlaces] = useState<HelpPlace[] | null>(null);
  const [tab, setTab] = useState<HelpKind>('police');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const l = await currentFix();
      if (!l) return setErr('Location unavailable. Turn on Location to find help near you.');
      setLoc(l);
      try {
        setPlaces(await nearbyHelp(l.latitude, l.longitude));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const list = (places ?? []).filter((p) => p.kind === tab).slice(0, 15);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-sos-50 to-white">
        <p className="h-eyebrow">Emergency services · {region.name}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[region.primary, ...region.others].map((l) => (
            <button key={l.number + l.label} onClick={() => dial(l.number)} className={cn('rounded-2xl px-3 py-3 text-left', l === region.primary ? 'col-span-2 bg-sos-500 text-white' : 'bg-white text-ink shadow-soft')}>
              <span className="block text-2xl font-extrabold">{l.number}</span>
              <span className="text-xs font-semibold opacity-80">{l.label}</span>
            </button>
          ))}
        </div>
        {region.primary.note && <p className="mt-2 text-xs text-ink-muted">{region.primary.note}</p>}
      </Card>

      <div className="grid grid-cols-5 gap-2">
        {TABS.map((t) => (
          <button key={t.kind} onClick={() => setTab(t.kind)} className={cn('flex flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-bold', tab === t.kind ? 'bg-ink text-white' : 'bg-white text-ink-soft shadow-soft')}>
            <E3d name={t.icon} size={28} />
            {t.label}
          </button>
        ))}
      </div>

      {loc && (
        <div className="h-56 overflow-hidden rounded-4xl border border-line shadow-soft">
          <MapView className="h-full" me={loc} points={list.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, label: p.name, kind: p.kind }))} follow={false} />
        </div>
      )}

      {err && <p className="text-sm font-semibold text-sos-700">{err}</p>}
      {!places && !err && (
        <p className="flex items-center gap-2 text-ink-muted">
          <Spinner /> Finding verified places near you…
        </p>
      )}
      {places && list.length === 0 && <p className="text-sm text-ink-muted">No {tab} places found within 3 km in OpenStreetMap.</p>}
      <div className="space-y-2">
        {list.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{p.name}</p>
                  <p className="text-sm text-ink-muted">
                    {fmtDistance(p.distance)} away{p.hours ? ` · ${p.hours}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-sos-600">{fmtDistance(p.distance)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="white" className="flex-1" onClick={() => openExternal(directionsLink(p.latitude, p.longitude))}>
                  Directions
                </Button>
                {p.phone && (
                  <Button variant="soft" className="flex-1" onClick={() => dial(p.phone!.split(';')[0])}>
                    Call
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <p className="text-center text-xs text-ink-muted">Places and phone numbers from OpenStreetMap contributors. Numbers are shown only where OSM lists one.</p>
    </div>
  );
}

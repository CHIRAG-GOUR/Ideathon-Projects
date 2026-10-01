'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { EmergencyLocation } from '@shared/types';
import { fmtAccuracy } from '@shared/geo';
import { currentFix, dial, openExternal } from '@core/native';
import { nearbyHelp, type HelpKind, type HelpPlace } from '@core/places';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Eyebrow, Spinner, cx } from '@/ui/kit';
import { Icon } from '@/ui/icons';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-violet-50" /> });
const KINDS: [HelpKind | 'all', string, string][] = [['all', 'All', '📍'], ['police', 'Police', '🚓'], ['hospital', 'Hospitals', '🏥'], ['pharmacy', 'Pharmacies', '💊'], ['fire', 'Fire', '🚒']];
const EMOJI: Record<HelpKind, string> = { police: '🚓', hospital: '🏥', pharmacy: '💊', fire: '🚒' };
const dist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export function Nearby() {
  const { region, shield } = useApp();
  const [fix, setFix] = useState<EmergencyLocation | null>(shield.fix);
  const [places, setPlaces] = useState<HelpPlace[] | null>(null);
  const [state, setState] = useState<'locating' | 'loading' | 'done' | 'noloc' | 'error'>('locating');
  const [err, setErr] = useState('');
  const [kind, setKind] = useState<HelpKind | 'all'>('all');

  const load = useCallback(async () => {
    setState('locating');
    const f = shield.fix && Date.now() - Date.parse(shield.fix.timestamp) < 60_000 ? shield.fix : await currentFix();
    if (!f) return setState('noloc');
    setFix(f);
    setState('loading');
    try {
      setPlaces(await nearbyHelp(f.latitude, f.longitude));
      setState('done');
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => void load(), [load]);

  const shown = (places ?? []).filter((p) => kind === 'all' || p.kind === kind).slice(0, 40);

  return (
    <>
      <Header title="Nearby help" sub="Real places from OpenStreetMap around your location" back right={<button onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-700"><Icon name="refresh" size={18} /></button>} />
      <Page>
        <Card>
          <Eyebrow>Official numbers · {region.name}</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[region.primary, ...region.others].map((l) => (
              <button key={l.number} onClick={() => dial(l.number)} className={cx('rounded-2xl px-3 py-2.5 text-left', l === region.primary ? 'bg-alert-500 text-white' : 'bg-violet-50 text-violet-900')}>
                <span className="block text-xl font-extrabold">{l.number}</span>
                <span className={cx('block text-xs font-bold', l === region.primary ? 'text-white/85' : 'text-ink-muted')}>{l.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {KINDS.map(([k, t, e]) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-bold', kind === k ? 'bg-violet-800 text-white' : 'bg-white text-ink-soft shadow-card')}>
              <span aria-hidden>{e} </span>{t}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-72 overflow-hidden rounded-4xl border border-line shadow-card lg:h-[520px]">
            {fix ? <MapView className="h-full" me={fix} color="#7C4DDB" points={shown.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, label: p.name, emoji: EMOJI[p.kind] }))} follow={false} /> : <div className="grid h-full place-items-center bg-violet-50 text-sm font-semibold text-ink-muted">Map appears when your location is known</div>}
          </div>
          <Card className="lg:max-h-[520px] lg:overflow-y-auto">
            {fix && <p className="mb-2 text-xs font-semibold text-ink-muted">Your location {fmtAccuracy(fix.accuracy)} · {new Date(fix.timestamp).toLocaleTimeString()}</p>}
            {state === 'locating' && <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Getting your location…</p>}
            {state === 'loading' && <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Searching nearby…</p>}
            {state === 'noloc' && <p className="font-semibold text-amber-700">Location unavailable. Allow location access and try again — the official numbers above always work.</p>}
            {state === 'error' && <div><p className="font-semibold text-amber-700">{err}</p><Btn tone="soft" className="mt-3" onClick={load}>Try again</Btn></div>}
            {state === 'done' && shown.length === 0 && <p className="text-ink-muted">Nothing of this type is listed within 4 km on OpenStreetMap.</p>}
            <ul className="divide-y divide-line">
              {shown.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg" aria-hidden>{EMOJI[p.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{p.name}</p>
                    <p className="text-xs text-ink-muted">{dist(p.distance)}{p.hours ? ` · ${p.hours}` : ''}</p>
                  </div>
                  {p.phone && <button aria-label={`Call ${p.name}`} onClick={() => dial(p.phone!)} className="grid h-10 w-10 place-items-center rounded-full bg-mint-50 text-mint-600"><Icon name="phone" size={18} /></button>}
                  <button aria-label={`Directions to ${p.name}`} onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`)} className="grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-700"><Icon name="route" size={18} /></button>
                </li>
              ))}
            </ul>
            {state === 'done' && <p className="mt-2 text-[11px] text-ink-faint">Data © OpenStreetMap contributors. Phone numbers appear only when listed there. Check before travelling.</p>}
          </Card>
        </div>
      </Page>
    </>
  );
}

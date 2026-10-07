'use client';
/**
 * GEO-RADAR — see the emergency network around you. Radar view (bearing/distance, offline-capable rendering)
 * or map view (OpenStreetMap tiles), layer filters, a smart list, and a bottom sheet for each point.
 */
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { directionsLink } from '@shared/geo';
import { dial, openExternal } from '@core/native';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { BottomSheet, Btn, Honest, Kicker, Panel, StatusChip, cx } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { KIND_ICON, RadarView } from '@/components/lifeline/RadarView';
import { KIND_COLOR, KIND_LABEL, fmtEta, fmtKm, type RadarKind, type RadarPoint } from '@/services/georadar/radar';

const EmergencyMap = dynamic(() => import('@/components/lifeline/EmergencyMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-midnight-800" /> });

const LAYERS: { k: RadarKind | 'safe'; label: string }[] = [
  { k: 'ambulance', label: 'Ambulances' }, { k: 'hospital', label: 'Hospitals' }, { k: 'police', label: 'Police' }, { k: 'fire', label: 'Fire' }, { k: 'safe', label: 'Safe zones' }, { k: 'helper', label: 'Helpers' }, { k: 'pharmacy', label: 'Pharmacies' },
];

export function RadarScreen() {
  const { radar, fix, locate, locState, demo, emergency } = useApp();
  const [on, setOn] = useState<Set<string>>(new Set(['ambulance', 'hospital', 'police', 'fire', 'helper', 'pharmacy']));
  const [view, setView] = useState<'radar' | 'map'>('radar');
  const [sel, setSel] = useState<string | null>(null);
  const pts = useMemo(() => (radar.points ?? []).filter((p) => on.has(p.kind) || (on.has('safe') && p.safeZone)), [radar.points, on]);
  const picked = pts.find((p) => p.id === sel) ?? null;
  const toggle = (k: string) => setOn((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const counts = (k: string) => (radar.points ?? []).filter((p) => (k === 'safe' ? p.safeZone : p.kind === k)).length;

  return (
    <Page wide>
      <PageTitle kicker="Geo-Radar" title="See the emergency network around you." sub="Hospitals, police, fire and safe zones ranked by distance, with estimated travel time." tone="cyan"
        right={<div className="flex items-center gap-2">{demo ? <Honest kind="simulated">Demo network</Honest> : <StatusChip status="estimated" label="ETAs estimated from distance" />}</div>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel tone="command" className="p-4 sm:p-5">
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-2xl bg-white/[0.06] p-1">
              {(['radar', 'map'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className="relative h-9 rounded-xl px-4 text-[13px] font-semibold capitalize">
                  {view === v && <motion.span layoutId="rview" className="absolute inset-0 rounded-xl bg-white/15" />}
                  <span className="relative">{v}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-midnight-200">
              <span className="relative grid h-2.5 w-2.5 place-items-center"><span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-cyan-400/60" /><span className="h-2 w-2 rounded-full bg-cyan-400" /></span>
              {fix ? (demo ? 'Demo location' : `You · ±${Math.round(fix.accuracy ?? 30)} m`) : 'Location off'}
            </div>
          </div>
          <div className="relative mt-4">
            {!fix ? (
              <div className="mx-auto grid aspect-square max-w-[520px] place-items-center rounded-full bg-white/[0.03] p-10 text-center ring-1 ring-inset ring-white/10">
                <div><Icon name="radar" size={34} className="mx-auto text-cyan-300" /><p className="mt-3 text-[15px] font-semibold">Geo-Radar needs your location</p><p className="mt-1 text-[13px] text-midnight-200">Used only to find help near you. Nothing is stored unless you start an SOS.</p><Btn className="mt-4" icon="location" onClick={locate}>{locState === 'locating' ? 'Locating…' : 'Enable location'}</Btn>{locState === 'denied' && <p className="mt-3 text-[12px] text-amber-300">Location is blocked in your browser or phone settings.</p>}</div>
              </div>
            ) : view === 'radar' ? (
              radar.points ? <RadarView points={pts} selected={sel} onSelect={setSel} emergency={emergency} className="mx-auto max-w-[560px]" /> : <div className="mx-auto aspect-square max-w-[560px] animate-pulse rounded-full bg-white/[0.04]" />
            ) : (
              <div className="ll-dark h-[460px] overflow-hidden rounded-3xl ring-1 ring-white/10">
                <EmergencyMap me={fix} points={pts} selected={sel} onSelect={setSel} className="h-full w-full" />
              </div>
            )}
            {radar.error && <p className="mt-3 text-center text-[13px] text-amber-300">{radar.error}</p>}
          </div>
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {LAYERS.map((l) => (
              <button key={l.k} onClick={() => toggle(l.k)} aria-pressed={on.has(l.k)} className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset transition', on.has(l.k) ? 'bg-white/10 text-white ring-white/20' : 'text-midnight-300 ring-white/10')}>
                <span className="h-2 w-2 rounded-full" style={{ background: l.k === 'safe' ? '#3DBB7E' : KIND_COLOR[l.k as RadarKind] }} />{l.label}<span className="font-mono text-[10.5px] opacity-70">{counts(l.k)}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between"><Kicker tone="cyan">Nearest help</Kicker><span className="font-mono text-[11px] text-ink-faint">{pts.length} points</span></div>
          <ul className="mt-3 max-h-[640px] space-y-1.5 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {pts.map((p, i) => <RadarRow key={p.id} p={p} i={i} on={p.id === sel} onClick={() => setSel(p.id)} />)}
            </AnimatePresence>
            {fix && radar.points && !pts.length && <li className="text-[13.5px] text-ink-muted">Nothing on these layers within 5 km.</li>}
          </ul>
          <div className="mt-4 rounded-2xl bg-clinic-50 p-3 text-[12px] leading-snug text-ink-muted ring-1 ring-inset ring-line">
            <b className="text-ink-soft">How this works.</b> {demo ? 'Demo network: places, ambulances and helpers are fictional.' : 'Places come from OpenStreetMap. ETA = road-adjusted distance at city speed — no live traffic. Live ambulance and helper positions are not connected.'} Safe zones are staffed public places (hospitals, police, fire stations, 24×7 pharmacies).
          </div>
        </Panel>
      </div>

      <BottomSheet open={!!picked} onClose={() => setSel(null)} title={picked && <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${KIND_COLOR[picked.kind]}22`, color: KIND_COLOR[picked.kind] }}><Icon name={KIND_ICON[picked.kind]} size={21} /></span><div><p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{KIND_LABEL[picked.kind]}</p><p className="font-display text-[18px] font-semibold leading-tight">{picked.name}</p></div></div>}>
        {picked && <PointDetail p={picked} />}
      </BottomSheet>
    </Page>
  );
}

function RadarRow({ p, i, on, onClick }: { p: RadarPoint; i: number; on: boolean; onClick: () => void }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
      <button onClick={onClick} className={cx('flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition', on ? 'bg-cyan-400/10 ring-1 ring-inset ring-cyan-400/30' : 'hover:bg-clinic-50')}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${KIND_COLOR[p.kind]}1F`, color: KIND_COLOR[p.kind] === '#22D3EE' ? '#0891B2' : KIND_COLOR[p.kind] }}><Icon name={KIND_ICON[p.kind]} size={18} /></span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] text-ink">{p.name}</b>
          <span className="block truncate text-[11.5px] text-ink-muted">{KIND_LABEL[p.kind]}{p.safeZone ? ' · safe zone' : ''}{p.note ? ` · ${p.note}` : ''}</span>
        </span>
        <span className="text-right">
          <span className="block font-mono text-[12.5px] font-semibold tabular text-ink">{fmtKm(p.distance)}</span>
          <span className="block font-mono text-[11px] text-ink-faint">~{fmtEta(p.etaMin)}</span>
        </span>
      </button>
    </motion.li>
  );
}

function PointDetail({ p }: { p: RadarPoint }) {
  const { demo, toast } = useApp();
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line"><p className="text-[11px] font-semibold text-ink-muted">Distance</p><p className="font-display text-[20px] font-semibold">{fmtKm(p.distance)}</p></div>
        <div className="rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line"><p className="text-[11px] font-semibold text-ink-muted">ETA</p><p className="font-display text-[20px] font-semibold">~{fmtEta(p.etaMin)}</p></div>
        <div className="rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line"><p className="text-[11px] font-semibold text-ink-muted">Status</p><p className="font-display text-[15px] font-semibold capitalize leading-tight">{p.status === 'unknown' ? 'Not reported' : p.status}</p></div>
      </div>
      <p className="mt-3 text-[12.5px] text-ink-muted">{p.source === 'demo' ? 'Simulated demonstration data.' : 'From OpenStreetMap. ETA estimated from distance, not live traffic.'}{p.note ? ` ${p.note}.` : ''}</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Btn icon="route" onClick={() => (demo ? toast('Demo mode — directions open in the real app.') : openExternal(directionsLink(p.latitude, p.longitude)))}>Directions</Btn>
        {p.phone ? <Btn tone="white" icon="phone" onClick={() => dial(p.phone!)}>Call {p.phone}</Btn> : <Btn tone="white" disabled icon="phone">No phone listed</Btn>}
      </div>
    </div>
  );
}

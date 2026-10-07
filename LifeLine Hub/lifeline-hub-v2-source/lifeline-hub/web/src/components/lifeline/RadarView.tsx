'use client';
/**
 * RadarView — the Geo-Radar visualisation: the user at the centre, the emergency network plotted by true bearing
 * and distance on range rings, a rotating sweep, glowing markers, ETA chips and a route line to the selected
 * point. In emergency mode the search radius pulses outward.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { Icon, type IconName } from '@/ui/icons';
import { cx } from '@/ui/kit';
import { KIND_COLOR, fmtEta, fmtKm, type RadarKind, type RadarPoint } from '@/services/georadar/radar';

export const KIND_ICON: Record<RadarKind, IconName> = { hospital: 'hospital', police: 'police', fire: 'fire', pharmacy: 'pill', ambulance: 'ambulance', helper: 'helper', safe: 'safe' };

const niceRange = (m: number) => [500, 1000, 1500, 2000, 3000, 4000, 5000].find((r) => r >= m) ?? 5000;

export function RadarView({ points, selected, onSelect, emergency, compact, className, maxPoints = 18, label }: {
  points: RadarPoint[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  emergency?: boolean;
  compact?: boolean;
  className?: string;
  maxPoints?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const shown = useMemo(() => points.slice(0, maxPoints), [points, maxPoints]);
  const range = niceRange(Math.max(400, ...shown.map((p) => p.distance)) * 1.05);
  const R = 46; // viewBox radius
  const pos = (p: RadarPoint) => {
    const r = (Math.min(p.distance, range) / range) * R;
    const a = (p.bearing * Math.PI) / 180;
    return { x: 50 + Math.sin(a) * r, y: 50 - Math.cos(a) * r };
  };
  const sel = shown.find((p) => p.id === selected);
  const accent = emergency ? '#DA1E2C' : '#0B8A57';

  return (
    <div className={cx('relative aspect-square w-full select-none', className)} role="img" aria-label={label ?? `Geo-Radar: ${shown.length} points of help within ${fmtKm(range)}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="rv-bg" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".75" stopColor={emergency ? '#FFF4F4' : '#F1F8F4'} /><stop offset="1" stopColor={emergency ? '#FFE6E7' : '#E2F1E8'} /></radialGradient>
          <linearGradient id="rv-sweep" x1="0" x2="1"><stop offset="0" stopColor={accent} stopOpacity="0" /><stop offset="1" stopColor={accent} stopOpacity=".35" /></linearGradient>
          <radialGradient id="rv-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="50" cy="50" r="49.5" fill="url(#rv-bg)" stroke="#DCE8E1" strokeWidth=".4" />
        {/* range rings + crosshair + compass */}
        {[0.25, 0.5, 0.75, 1].map((k) => <circle key={k} cx="50" cy="50" r={R * k} fill="none" stroke={accent} strokeOpacity={k === 1 ? 0.35 : 0.18} strokeWidth=".25" strokeDasharray={k === 1 ? undefined : '0.8 1.2'} />)}
        <path d="M50 4v92M4 50h92" stroke={accent} strokeOpacity=".12" strokeWidth=".25" />
        {Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * Math.PI * 2; const r1 = i % 6 ? 47.6 : 46.6; return <line key={i} x1={50 + Math.sin(a) * r1} y1={50 - Math.cos(a) * r1} x2={50 + Math.sin(a) * 48.4} y2={50 - Math.cos(a) * 48.4} stroke={accent} strokeOpacity=".35" strokeWidth=".2" />; })}
        {!compact && ['N', 'E', 'S', 'W'].map((d, i) => <text key={d} x={50 + Math.sin((i * Math.PI) / 2) * 43.2} y={50 - Math.cos((i * Math.PI) / 2) * 43.2 + 1.1} textAnchor="middle" fontSize="2.6" fill="#5A6B65" fontFamily="JetBrains Mono Variable, monospace">{d}</text>)}
        {!compact && [0.5, 1].map((k) => <text key={k} x={50 + 1.2} y={50 - R * k + 2.6} fontSize="2.2" fill="#93A39D" fontFamily="JetBrains Mono Variable, monospace">{fmtKm(range * k)}</text>)}
        {/* sweep */}
        {!reduce && (
          <g style={{ transformOrigin: '50px 50px', animation: `spin ${emergency ? 2.4 : 5}s linear infinite` }}>
            <path d={`M50 50 L50 ${50 - R} A${R} ${R} 0 0 1 ${50 + Math.sin(0.7) * R} ${50 - Math.cos(0.7) * R} Z`} fill="url(#rv-sweep)" />
            <line x1="50" y1="50" x2="50" y2={50 - R} stroke={accent} strokeOpacity=".7" strokeWidth=".35" />
          </g>
        )}
        {/* emergency search radius */}
        {emergency && !reduce && [0, 1].map((i) => (
          <motion.circle key={i} cx="50" cy="50" fill="none" stroke="#DA1E2C" strokeWidth=".5" initial={{ r: 4, opacity: 0.8 }} animate={{ r: R, opacity: 0 }} transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }} />
        ))}
        {/* route to selection */}
        {sel && (() => { const p = pos(sel); return <motion.path key={sel.id} d={`M50 50 Q${(50 + p.x) / 2 + (p.y - 50) * 0.18} ${(50 + p.y) / 2 - (p.x - 50) * 0.18} ${p.x} ${p.y}`} fill="none" stroke={KIND_COLOR[sel.kind]} strokeWidth=".7" strokeDasharray="1.6 1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />; })()}
        {/* you */}
        <circle cx="50" cy="50" r="9" fill="url(#rv-glow)" />
        {!reduce && <motion.circle cx="50" cy="50" fill="none" stroke={accent} strokeWidth=".4" initial={{ r: 2, opacity: 0.9 }} animate={{ r: 9, opacity: 0 }} transition={{ duration: 2, repeat: Infinity }} />}
        <circle cx="50" cy="50" r="2.2" fill={accent} stroke="#fff" strokeWidth=".7" />
      </svg>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* markers (HTML for crisp icons and labels) */}
      <AnimatePresence>
        {shown.map((p, i) => {
          const { x, y } = pos(p);
          const on = p.id === selected;
          const c = KIND_COLOR[p.kind];
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: on ? 1.18 : 1, left: `${x}%`, top: `${y}%` }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 26 }}
              onClick={() => onSelect?.(p.id)}
              aria-label={`${p.name}, ${fmtKm(p.distance)}, about ${fmtEta(p.etaMin)}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="relative grid place-items-center rounded-full ring-1" style={{ width: compact ? 22 : 30, height: compact ? 22 : 30, background: '#FFFFFF', boxShadow: `0 4px 12px -4px ${c}99`, color: c, borderColor: c, ['--tw-ring-color' as string]: `${c}AA` }}>
                {(p.status === 'responding') && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: `${c}55` }} />}
                <Icon name={KIND_ICON[p.kind]} size={compact ? 12 : 15} strokeWidth={2} />
              </span>
              {!compact && (on || i < 3) && (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink ring-1 ring-line">
                  {fmtEta(p.etaMin)}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

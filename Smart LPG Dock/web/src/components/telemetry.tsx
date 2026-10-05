import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState, type ReactNode } from 'react';
import { CONFIG, fmtClock, type Sample, type SimState } from '@engine/engine';
import { LEVEL_TEXT, SAFETY_TEXT, levelTone, safetyTone, sensorLevel, type Tone } from '@/safety/labels';
import { IconCylinder, IconDock, IconGas, IconShield, IconTemp, IconTilt, IconUsage } from '@/assets/art';
import { Status, cx } from './ui';

/** Single-series sparkline: 2px line, ~10% area wash, end dot with surface ring. No legend (the card title names it). */
export function Sparkline({ data, max, warn, color = '#2563B0', className }: { data: number[]; max: number; warn?: number; color?: string; className?: string }) {
  const w = 120, h = 34;
  if (data.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden />;
  const lo = Math.min(...data, warn ?? Infinity) * 0.98;
  const hi = Math.max(max, ...data);
  const y = (v: number) => h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 6) + 1, y(v)] as const);
  const d = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${yy.toFixed(1)}`).join('');
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden preserveAspectRatio="none">
      {warn !== undefined && warn < hi && <line x1="0" x2={w} y1={y(warn)} y2={y(warn)} stroke="#E6DFD2" strokeWidth="1" />}
      <path d={`${d}L${ex},${h}L1,${h}Z`} fill={color} opacity=".1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r="4" fill={color} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

const trend = (h: Sample[], k: 'gas' | 'temp' | 'tilt' | 'flow') => {
  if (h.length < 4) return 'steady';
  const a = h[h.length - 4][k], b = h[h.length - 1][k];
  const eps = k === 'gas' ? 0.005 : k === 'flow' ? 0.02 : 0.1;
  return b - a > eps ? 'rising' : a - b > eps ? 'falling' : 'steady';
};
const ARROW = { rising: '↑ rising', falling: '↓ falling', steady: '→ steady' } as const;

function TCard({ icon, title, value, unit, status, tone, spark, foot, live, compact }: { icon: ReactNode; title: string; value: string; unit?: string; status: string; tone: Tone; spark?: ReactNode; foot: string; live?: boolean; compact?: boolean }) {
  const chip = <Status tone={tone} pulse={live && (tone === 'warn' || tone === 'danger')} className="shrink-0">{status}</Status>;
  return (
    <motion.div layout className={cx('flex min-w-0 flex-col rounded-xl2 bg-white shadow-card ring-1', compact ? 'p-3' : 'p-4', tone === 'danger' ? 'ring-danger-100' : tone === 'warn' ? 'ring-safety-100' : 'ring-line')}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-graphite-soft">
          <span className={cx('grid shrink-0 place-items-center rounded-lg bg-lpg-50 text-lpg-600', compact ? 'h-7 w-7' : 'h-8 w-8')}>{icon}</span>
          <span className="truncate">{title}</span>
        </span>
        {!compact && chip}
      </div>
      <div className={cx('flex items-end justify-between gap-2', compact ? 'mt-2' : 'mt-3')}>
        <p className={cx('font-mono font-bold leading-none tabular-nums text-graphite', compact ? 'text-[22px]' : 'text-[28px]')} aria-live="polite">
          {value}
          {unit && <span className="ml-1 text-xs font-semibold text-graphite-muted">{unit}</span>}
        </p>
        {spark && <div className={cx('shrink-0', compact ? 'h-7 w-16' : 'h-9 w-28')}>{spark}</div>}
      </div>
      {compact ? <div className="mt-2">{chip}</div> : <p className="mt-2 font-mono text-[11px] text-graphite-faint">{foot}</p>}
    </motion.div>
  );
}

/** The seven telemetry cards, all from the same engine state. */
export function TelemetryCards({ s, compact = false }: { s: SimState; compact?: boolean }) {
  const h = s.history.slice(-60);
  const at = `t+${fmtClock(s.t)}`;
  const truth = s.dock === 'NOT_INSTALLED';
  const g = sensorLevel(s, 'gas'), tp = sensorLevel(s, 'temp'), tl = sensorLevel(s, 'tilt');
  const usageTone: Tone = s.usage === 'ABNORMAL' ? (s.levels.usage >= 2 ? 'warn' : 'info') : s.usage === 'HIGH' ? 'info' : 'ok';
  const pct = Math.round((s.cylinderKg / CONFIG.baseline.cylinderCapacityKg) * 100);
  const foot = (k: 'gas' | 'temp' | 'tilt' | 'flow') => `${at} · ${ARROW[trend(h, k)]}${truth ? ' · no sensor (simulated truth)' : ''}`;
  return (
    <div className={cx('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
      <TCard compact={compact} icon={<IconGas size={18} />} title="Gas detection" value={s.gas.toFixed(2)} unit="ppm" status={LEVEL_TEXT[g]} tone={levelTone(g)} live spark={<Sparkline data={h.map((x) => x.gas)} max={CONFIG.thresholds.gas.critical} warn={CONFIG.thresholds.gas.warning} className="h-full w-full" />} foot={foot('gas')} />
      <TCard compact={compact} icon={<IconTemp size={18} />} title="Temperature" value={s.temp.toFixed(1)} unit="°C" status={LEVEL_TEXT[tp]} tone={levelTone(tp)} live spark={<Sparkline data={h.map((x) => x.temp)} max={CONFIG.thresholds.temp.anomaly} warn={CONFIG.thresholds.temp.warning} className="h-full w-full" />} foot={foot('temp')} />
      <TCard compact={compact} icon={<IconTilt size={18} />} title="Cylinder tilt" value={s.tilt.toFixed(1)} unit="°" status={LEVEL_TEXT[tl]} tone={levelTone(tl)} live spark={<Sparkline data={h.map((x) => x.tilt)} max={CONFIG.thresholds.tilt.anomaly} warn={CONFIG.thresholds.tilt.warning} className="h-full w-full" />} foot={foot('tilt')} />
      <TCard compact={compact} icon={<IconUsage size={18} />} title="Usage" value={s.flow.toFixed(2)} unit="kg/h" status={s.usage} tone={usageTone} live spark={<Sparkline data={h.map((x) => x.flow)} max={CONFIG.thresholds.usage.abnormalFlow} className="h-full w-full" />} foot={foot('flow')} />
      {!compact && (
        <>
          <TCard icon={<IconCylinder size={18} />} title="Cylinder" value={CONFIG.cylinderId} status={s.supply === 'ISOLATED' ? 'ISOLATED' : s.timers.incidentAt >= 0 ? 'DAMAGED (SIM)' : 'CONNECTED'} tone={s.supply === 'ISOLATED' ? 'isolated' : s.timers.incidentAt >= 0 ? 'danger' : 'ok'} foot={`${s.cylinderKg.toFixed(2)} kg LPG remaining · ${pct}% of ${CONFIG.baseline.cylinderCapacityKg} kg`} />
          <TCard icon={<IconDock size={18} />} title="Dock" value={s.dock === 'CONNECTED' ? CONFIG.dockId : '—'} status={s.dock === 'CONNECTED' ? 'CONNECTED' : 'NOT INSTALLED'} tone={s.dock === 'CONNECTED' ? 'ok' : 'neutral'} foot={s.dock === 'CONNECTED' ? `Supply valve: ${s.supply} · simulated actuator` : 'Scenario without Smart Dock — nothing is monitored'} />
          <TCard icon={<IconShield size={18} />} title="Safety state" value={SAFETY_TEXT[s.safety]} status={s.phase} tone={safetyTone(s.safety)} live foot={`${at} · alarm ${s.alarm === 'none' ? 'off' : s.alarm}`} />
        </>
      )}
    </div>
  );
}

/** Gas over time with the dock's thresholds; crosshair + tooltip on hover/touch. One series → no legend. */
export function GasChart({ s, height = 220 }: { s: SimState; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = s.history;
  const W = 640, H = height, L = 44, R = 12, T = 12, B = 26;
  const tMax = Math.max(30, data.at(-1)?.t ?? 0);
  const gMax = Math.max(0.3, ...data.map((d) => d.gas)) * 1.1;
  const x = (t: number) => L + (t / tMax) * (W - L - R);
  const y = (g: number) => T + (1 - g / gMax) * (H - T - B);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${y(d.gas).toFixed(1)}`).join('');
  const th = CONFIG.thresholds.gas;
  const lines = [
    { v: th.warning, label: `warning ${th.warning}` },
    { v: th.critical, label: `critical ${th.critical}` },
  ].filter((l) => l.v < gMax);
  const ticks = useMemo(() => {
    const step = gMax > 0.6 ? 0.2 : 0.1;
    return Array.from({ length: Math.floor(gMax / step) + 1 }, (_, i) => +(i * step).toFixed(2));
  }, [gMax]);
  const hv = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Gas concentration over time, now ${s.gas.toFixed(2)} ppm (simulated)`}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const t = (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * tMax;
          let best = 0;
          data.forEach((d, i) => Math.abs(d.t - t) < Math.abs(data[best].t - t) && (best = i));
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#EEF1F4" />
            <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#5E6977" fontFamily="JetBrains Mono Variable, monospace">{g.toFixed(1)}</text>
          </g>
        ))}
        {lines.map((l) => (
          <g key={l.v}>
            <line x1={L} x2={W - R} y1={y(l.v)} y2={y(l.v)} stroke="#98A1AD" strokeWidth="1" />
            <text x={W - R} y={y(l.v) - 4} textAnchor="end" fontSize="10" fill="#5E6977">{l.label}</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40, 50, 60].filter((t) => t <= tMax).map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5E6977" fontFamily="JetBrains Mono Variable, monospace">{fmtClock(t)}</text>
        ))}
        <path d={`${path}L${x(data.at(-1)!.t)},${y(0)}L${x(0)},${y(0)}Z`} fill="#2563B0" opacity=".1" />
        <path d={path} fill="none" stroke="#2563B0" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(data.at(-1)!.t)} cy={y(data.at(-1)!.gas)} r="4.5" fill="#2563B0" stroke="#fff" strokeWidth="2" />
        <text x={x(data.at(-1)!.t) + 8} y={y(data.at(-1)!.gas) - 6} fontSize="11" fontWeight="700" fill="#1F2733">{data.at(-1)!.gas.toFixed(2)} ppm</text>
        {hv && (
          <g>
            <line x1={x(hv.t)} x2={x(hv.t)} y1={T} y2={H - B} stroke="#1F2733" strokeWidth="1" opacity=".4" />
            <circle cx={x(hv.t)} cy={y(hv.gas)} r="5" fill="#2563B0" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hv && (
        <div className="pointer-events-none absolute top-2 rounded-lg bg-graphite px-2.5 py-1.5 font-mono text-[11px] text-white shadow-card" style={{ left: `min(calc(${(x(hv.t) / W) * 100}% + 8px), calc(100% - 150px))` }}>
          t {fmtClock(hv.t)} · gas {hv.gas.toFixed(2)} ppm<br />temp {hv.temp.toFixed(1)} °C · tilt {hv.tilt.toFixed(1)}°
        </div>
      )}
    </div>
  );
}

/** Live event feed, generated by the engine (never hand-written). */
export function Timeline({ s, startedAt, max = 40, dense }: { s: SimState; startedAt: number; max?: number; dense?: boolean }) {
  const evs = s.events.slice(-max).reverse();
  const clock = (t: number) => new Date(startedAt + t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const TONE: Record<string, string> = { success: 'bg-ok-500', warning: 'bg-safety-500', critical: 'bg-danger-500', notice: 'bg-lpg-500', info: 'bg-steel-400' };
  if (!evs.length) return <p className="text-sm text-graphite-muted">No events yet — start the simulation.</p>;
  return (
    <ol className={cx('relative space-y-2.5 border-l-2 border-line pl-4', dense && 'space-y-1.5')} aria-live="polite">
      <AnimatePresence initial={false}>
        {evs.map((e) => (
          <motion.li key={e.seq} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative">
            <span className={cx('absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', TONE[e.level])} />
            <p className="font-mono text-[11px] text-graphite-faint">
              {clock(e.t)} <span className="text-graphite-muted">· sim {fmtClock(e.t)}</span>
            </p>
            <p className={cx('text-sm font-semibold', e.level === 'critical' ? 'text-danger-700' : e.level === 'warning' ? 'text-safety-700' : e.level === 'success' ? 'text-ok-700' : 'text-graphite')}>{e.text}</p>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

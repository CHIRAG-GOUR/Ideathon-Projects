// Custom charts in the retail palette. One data hue (forest green), status colours only for state (safety = golden
// yellow, stock-out = red), text in ink tokens, hover readouts and a text alternative on every chart.
// Motion: lines draw in once, then glide to new values when the data changes.
import { animate, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fmt1 } from '../engine/analyze';
import { shortDate, weekday } from '../engine/dates';
import { cx } from '../ui/kit';

function useWidth(initial = 600) {
  const [w, setW] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [w, ref] as const;
}

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/** Tweens an array of numbers toward new values (used for chart lines, so paths morph smoothly). */
function useTweened(target: number[]): number[] {
  const reduce = useReducedMotion();
  const [cur, setCur] = useState(target);
  const from = useRef(target);
  const key = target.join(',');
  useEffect(() => {
    const start = from.current.length === target.length ? from.current : target;
    if (reduce) {
      from.current = target;
      setCur(target);
      return;
    }
    const c = animate(0, 1, {
      duration: 0.55, ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (t) => {
        const v = target.map((x, i) => start[i] + (x - start[i]) * t);
        from.current = v;
        setCur(v);
      },
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduce]);
  return cur.length === target.length ? cur : target;
}

/** Units sold per day (last 14 complete days). Days before tracking began are shown as gaps. */
export function DemandBars({ history, average, height = 172 }: { history: { date: string; units: number | null }[]; average: number; height?: number }) {
  const [w, ref] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const h = height, top = 16, bottom = 24, left = 2, right = 2;
  const max = Math.max(1, ...history.map((x) => x.units ?? 0), average) * 1.22;
  const bw = (w - left - right) / history.length;
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const summary = history.filter((x) => x.units !== null).map((x) => `${shortDate(x.date)}: ${x.units}`).join(', ');
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={h} role="img" aria-label={`Units sold per day over the last 14 days. Average ${fmt1(average)} per day. ${summary}`}>
        {history.map((d, i) => {
          const recent = i >= history.length - 7;
          const bh = d.units ? Math.max(3, y(0) - y(d.units)) : 0;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={left + i * bw} y={top} width={bw} height={h - top - bottom} fill="transparent" />
              {d.units === null ? <rect x={left + i * bw + 3} y={y(0) - 2} width={Math.max(2, bw - 6)} height={2} rx={1} className="fill-line" /> : (
                <motion.rect x={left + i * bw + 3} width={Math.max(2, bw - 6)} rx={Math.min(5, bw / 4)} initial={{ y: y(0), height: 0 }} animate={{ y: y(0) - bh, height: bh }} transition={{ ...spring, delay: i * 0.015 }}
                  className={recent ? 'fill-green' : 'fill-green-mint'} opacity={hover === null || hover === i ? 1 : 0.55} />
              )}
              {(w > 520 || i % 2 === 1) && <text x={left + i * bw + bw / 2} y={h - 7} textAnchor="middle" className="fill-ink-faint text-[10px] font-semibold">{weekday(d.date).slice(0, 2)}</text>}
            </g>
          );
        })}
        {average > 0 && (
          <g>
            <motion.line x1={left} x2={w - right} initial={false} animate={{ y1: y(average), y2: y(average) }} className="stroke-ink" strokeOpacity={0.45} strokeDasharray="4 4" />
            <motion.text x={left + 4} initial={false} animate={{ y: y(average) - 6 }} className="fill-ink text-[11px] font-bold" style={{ paintOrder: 'stroke' }} stroke="rgb(var(--smart-surface))" strokeWidth={4}>avg {fmt1(average)}/day</motion.text>
          </g>
        )}
        <line x1={left} x2={w - right} y1={y(0)} y2={y(0)} className="stroke-line-strong" />
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[11.5px] font-semibold text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green" />Last 7 days</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-mint" />Previous 7 days</span>
      </div>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-3 rounded-lg bg-green-deep px-2.5 py-1.5 text-[12px] font-bold text-white shadow-lift" style={{ left: Math.min(w - 130, Math.max(0, left + hover * bw - 30)) }}>
          {weekday(history[hover].date)} {shortDate(history[hover].date)} · {history[hover].units === null ? 'not tracked' : `${history[hover].units} sold`}
        </div>
      )}
    </div>
  );
}

/**
 * Projected units on hand for the next 7 days: inventory line, safety level, the below-safety band, the stock-out
 * point and zone, and the expiry day. The shelf cannot go below empty, so the line floors at zero.
 */
export function ForecastChart({ forecast, safety, stockoutAt, expiryDay, height = 236 }: { forecast: { date: string; label: string; stock: number }[]; safety: number; stockoutAt: number | null; expiryDay: number | null; height?: number }) {
  const [w, ref] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const h = height, top = 26, bottom = 28, left = 34, right = 14;
  const target = forecast.map((f) => Math.max(0, f.stock));
  const n = forecast.length - 1;
  const maxV = Math.max(safety * 1.5, ...target, 4);
  const shown = useTweened(target);
  const x = (i: number) => left + ((w - left - right) * i) / n;
  const y = (v: number) => top + (h - top - bottom) * (1 - v / maxV);
  const line = shown.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const so = stockoutAt !== null && stockoutAt <= n ? stockoutAt : null;
  const ticks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxV / 4 / 5) * 5);
    return Array.from({ length: Math.floor(maxV / step) + 1 }, (_, i) => i * step);
  }, [maxV]);
  const label = `Projected stock for the next 7 days: ${forecast.map((f) => `${f.label} ${Math.max(0, Math.round(f.stock))}`).join(', ')}. Safety level ${safety}.${so !== null ? ` Projected to run out in about ${fmt1(so)} days.` : ''}`;
  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={h} role="img" aria-label={label}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(Math.max(0, Math.min(n, Math.round(((e.clientX - r.left - left) / (w - left - right)) * n))));
        }}>
        <defs>
          <linearGradient id="fc-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgb(var(--smart-green))" stopOpacity=".22" /><stop offset="1" stopColor="rgb(var(--smart-green))" stopOpacity="0" /></linearGradient>
          <pattern id="fc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgb(var(--smart-red-soft))" /><line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--smart-red))" strokeOpacity=".25" strokeWidth="2" /></pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeOpacity={t === 0 ? 1 : 0.6} />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[10.5px] font-semibold tabular-nums">{t}</text>
          </g>
        ))}
        <motion.rect x={left} width={w - left - right} initial={false} animate={{ y: y(safety), height: Math.max(0, y(0) - y(safety)) }} transition={spring} className="fill-yellow" fillOpacity={0.12} />
        {so !== null && <motion.rect initial={false} animate={{ x: x(so), width: Math.max(0, w - right - x(so)) }} y={top} height={y(0) - top} transition={spring} fill="url(#fc-hatch)" />}
        {expiryDay !== null && expiryDay >= 0 && expiryDay <= n && (
          <g>
            <line x1={x(expiryDay)} x2={x(expiryDay)} y1={top - 6} y2={h - bottom} className="stroke-orange" strokeWidth={1.5} strokeDasharray="3 3" />
            <path d={`M${x(expiryDay)} ${top - 14}h28l-5 6 5 6h-28z`} className="fill-orange" />
            <text x={x(expiryDay) + 4} y={top - 4.5} className="fill-white text-[9.5px] font-extrabold">EXP</text>
          </g>
        )}
        <motion.line x1={left} x2={w - right} initial={false} animate={{ y1: y(safety), y2: y(safety) }} transition={spring} className="stroke-yellow" strokeWidth={2} strokeDasharray="6 5" />
        <motion.text x={w - right} initial={false} animate={{ y: y(safety) - 7 }} transition={spring} textAnchor="end" className="fill-yellow-ink text-[11px] font-extrabold">Safety level {safety}</motion.text>
        <path d={area} fill="url(#fc-area)" />
        <motion.path d={line} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} fill="none" className="stroke-green" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {shown.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === 0 ? 6 : 3.5} className={i === 0 ? 'fill-green' : target[i] <= 0 ? 'fill-red' : 'fill-surface stroke-green'} strokeWidth={2} />)}
        {so !== null && (
          <motion.g initial={false} animate={{ x: x(so), y: y(0) }} transition={spring}>
            <circle r={13} className="fill-red" opacity={0.18} />
            <circle r={7.5} className="fill-red stroke-surface" strokeWidth={3} />
            <text x={x(so) > w - 150 ? -12 : 12} y={-12} textAnchor={x(so) > w - 150 ? 'end' : 'start'} className="fill-red-ink text-[12px] font-extrabold" style={{ paintOrder: 'stroke' }} stroke="rgb(var(--smart-surface))" strokeWidth={4}>Stock-out ≈ {fmt1(so)} days</text>
          </motion.g>
        )}
        {forecast.map((f, i) => (w >= 460 || i % 2 === 0) && <text key={f.date} x={x(i)} y={h - 8} textAnchor={i === 0 ? 'start' : i === n ? 'end' : 'middle'} className={cx('text-[10.5px] font-semibold', i === 0 ? 'fill-ink font-extrabold' : 'fill-ink-faint')}>{w < 460 && i === 1 ? 'Tmrw' : f.label}</text>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={h - bottom} className="stroke-ink" strokeOpacity={0.25} />}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-green-deep px-2.5 py-1.5 text-[12px] font-bold text-white shadow-lift" style={{ left: Math.min(w - 160, Math.max(0, x(hover) - 60)) }}>
          {forecast[hover].label}: {forecast[hover].stock > 0 ? `${Math.round(forecast[hover].stock)} units` : `out of stock${forecast[hover].stock < 0 ? ` · short ${Math.round(-forecast[hover].stock)}` : ''}`}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-semibold text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-green" />Projected stock</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-yellow" />Safety level</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red" />Stock-out</span>
        {expiryDay !== null && expiryDay >= 0 && expiryDay <= n && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange" />Expiry</span>}
      </div>
    </div>
  );
}

/** Store health ring: each status as an arc segment, drawn in on mount. */
export function HealthRing({ pct, parts, size = 150 }: { pct: number; parts: { value: number; cls: string }[]; size?: number }) {
  const r = 58, c = 2 * Math.PI * r, total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label={`${pct}% of products healthy`}>
      <circle cx="75" cy="75" r={r} fill="none" strokeWidth="14" className="stroke-white/10" />
      {parts.filter((p) => p.value > 0).map((p, i) => {
        const len = (p.value / total) * c;
        const start = acc;
        acc += len;
        return <motion.circle key={i} cx="75" cy="75" r={r} fill="none" strokeWidth="14" className={p.cls} strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
          initial={{ strokeDashoffset: -start + len }} animate={{ strokeDashoffset: -start }} transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }} transform="rotate(-90 75 75)" />;
      })}
    </svg>
  );
}

/** Tiny stock projection line for cards. */
export function Sparkline({ values, safety, width = 96, height = 30 }: { values: number[]; safety: number; width?: number; height?: number }) {
  const shown = values.map((v) => Math.max(0, v));
  const max = Math.max(safety, ...shown, 1);
  const x = (i: number) => (width * i) / (shown.length - 1);
  const y = (v: number) => 3 + (height - 6) * ((max - v) / max);
  return (
    <svg width={width} height={height} aria-hidden="true">
      <line x1={0} x2={width} y1={y(safety)} y2={y(safety)} className="stroke-yellow" strokeDasharray="3 3" />
      <polyline points={shown.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" className="stroke-green" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

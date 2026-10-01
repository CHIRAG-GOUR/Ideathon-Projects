import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CONFIG, fmtClock, type SimState } from '@engine/engine';
import { compare } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { go } from '@/hooks/useRoute';
import { KitchenView } from '@/three/KitchenView';
import { Btn, Card, PageHeader, SimBadge, cx } from '@/components/ui';
import { Transport } from '@/components/controls';
import { Narration, Outcome, StatusLine } from '@/components/scenario';

const ROWS: { label: string; left: string[]; right: string[] }[] = [
  { label: 'Cooking begins', left: ['cooking_started'], right: ['cooking_started'] },
  { label: 'Leak introduced', left: ['leak_introduced'], right: ['leak_introduced'] },
  { label: 'Gas detected / rising', left: ['gas_rising'], right: ['anomaly'] },
  { label: 'Warning threshold', left: [], right: ['warning'] },
  { label: 'Safety response', left: [], right: ['shutoff'] },
  { label: 'Supply isolated', left: [], right: ['isolated'] },
  { label: 'Chef leaves', left: ['chef_fleeing'], right: ['burner_off'] },
  { label: 'Outcome', left: ['incident'], right: ['contained'] },
];

export default function Compare({ params }: { params: URLSearchParams }) {
  const L = useSim(compare.left, 10);
  const R = useSim(compare.right, 10);
  useEffect(() => {
    if (params.get('autostart') === '1') compare.restart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = Math.max(L.t, R.t);
  const find = (s: SimState, kinds: string[]) => s.events.find((e) => kinds.includes(e.kind));

  return (
    <div>
      <PageHeader
        title="Compare: without vs. with Smart Dock"
        sub="Same kitchen, same chef, same simulated leak at 00:08 — two engines on one clock."
        right={params.get('from') === 'present' ? <Btn tone="secondary" size="sm" onClick={() => go('present', { ch: params.get('ch') ?? '0' })}>← Back to presentation</Btn> : <SimBadge />}
      />
      <div className="sticky top-[57px] z-20 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl2 bg-white/95 p-3 shadow-card ring-1 ring-line backdrop-blur lg:top-2">
        <Transport running={compare.running} onStart={() => compare.start()} onPause={() => compare.pause()} onRestart={() => compare.restart()} speed={compare.left.speed} onSpeed={(x) => compare.setSpeed(x)} />
        <p className="font-mono text-lg font-bold tabular-nums text-graphite" aria-live="off">SIM CLOCK {fmtClock(t)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[L, R].map((s, i) => (
          <section key={i} className={cx('min-w-0 overflow-hidden rounded-xl2 bg-white shadow-card ring-2', i === 0 ? 'ring-burnt/30' : 'ring-lpg-200')} aria-label={i === 0 ? 'Without Smart Dock' : 'With Smart Dock'}>
            <header className={cx('flex items-center justify-between gap-2 px-4 py-2.5 text-white', i === 0 ? 'bg-graphite' : 'bg-lpg-600')}>
              <h2 className="font-mono text-[13px] font-bold tracking-[0.12em]">{i === 0 ? 'WITHOUT SMART DOCK' : 'WITH SMART DOCK'}</h2>
              <span className="font-mono text-[12px] font-bold">{s.outcome === 'ESCALATION' ? 'INCIDENT ESCALATION' : s.outcome === 'CONTAINED' ? 'INCIDENT CONTAINED' : s.phase}</span>
            </header>
            <KitchenView sim={i === 0 ? compare.left : compare.right} compact className="h-[34vh] min-h-[230px] w-full rounded-none lg:h-[380px]" label={i === 0 ? 'Without Smart Dock' : 'With Smart Dock'} />
            <div className="space-y-3 p-4">
              <StatusLine s={s} />
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[['Gas', `${s.gas.toFixed(2)}`, 'ppm'], ['Temp', s.temp.toFixed(1), '°C'], ['Tilt', s.tilt.toFixed(1), '°']].map(([k, v, u]) => (
                  <div key={k} className="rounded-xl bg-cream-100 px-3 py-2 ring-1 ring-line">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-muted">{k}</p>
                    <p className="text-lg font-bold tabular-nums text-graphite">{v}<span className="ml-0.5 text-[11px] text-graphite-muted">{u}</span></p>
                  </div>
                ))}
              </div>
              <Narration s={s} />
              <Outcome s={s} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Synchronised event timeline">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-wider text-graphite-muted">
                  <th className="py-1.5 pr-2 font-bold">Milestone</th>
                  <th className="py-1.5 pr-2 font-bold">Without dock</th>
                  <th className="py-1.5 font-bold">With Smart Dock</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const a = find(L, r.left), b = find(R, r.right);
                  return (
                    <tr key={r.label} className="border-t border-line">
                      <td className="py-2 pr-2 font-semibold text-graphite">{r.label}</td>
                      <Cell e={a} empty={r.left.length ? 'not yet' : 'no dock → none'} bad={r.label === 'Outcome'} />
                      <Cell e={b} empty="not yet" good={r.label === 'Outcome'} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Simulated gas concentration · both runs">
          <CompareChart a={L} b={R} />
        </Card>
      </div>
    </div>
  );
}

function Cell({ e, empty, good, bad }: { e?: { t: number; text: string }; empty: string; good?: boolean; bad?: boolean }) {
  if (!e) return <td className="py-2 pr-2 font-mono text-[12px] text-graphite-faint">{empty}</td>;
  return (
    <td className="py-2 pr-2">
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cx('font-mono text-[12px] font-bold', good ? 'text-ok-700' : bad ? 'text-danger-700' : 'text-graphite')}>
        {fmtClock(e.t)}
      </motion.span>
      <span className="ml-1.5 hidden text-[11px] text-graphite-muted sm:inline">{good ? 'contained' : bad ? 'simulated incident' : ''}</span>
    </td>
  );
}

/** Two series, one axis. Legend always present; direct labels at line ends; crosshair tooltip. */
function CompareChart({ a, b }: { a: SimState; b: SimState }) {
  const [hx, setHx] = useState<number | null>(null);
  const W = 620, H = 230, Lp = 40, Rp = 70, T = 12, B = 26;
  const tMax = Math.max(32, a.t, b.t);
  const gMax = Math.max(0.9, ...a.history.map((h) => h.gas)) * 1.05;
  const x = (t: number) => Lp + (t / tMax) * (W - Lp - Rp);
  const y = (g: number) => T + (1 - g / gMax) * (H - T - B);
  const path = (s: SimState) => s.history.map((h, i) => `${i ? 'L' : 'M'}${x(h.t).toFixed(1)},${y(h.gas).toFixed(1)}`).join('');
  const series = [
    { s: a, c: '#C2410C', name: 'Without dock' },
    { s: b, c: '#2563B0', name: 'With Smart Dock' },
  ];
  const at = (s: SimState, t: number) => s.history.reduce((p, h) => (Math.abs(h.t - t) < Math.abs(p.t - t) ? h : p), s.history[0]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-[12px] font-semibold text-graphite-soft">
        {series.map((x) => (
          <span key={x.name} className="inline-flex items-center gap-2"><span className="h-0.5 w-5 rounded" style={{ background: x.c }} />{x.name}</span>
        ))}
        <span className="inline-flex items-center gap-2"><span className="h-px w-5 bg-graphite-faint" />dock warning {CONFIG.thresholds.gas.warning} ppm</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={`Gas without dock ${a.gas.toFixed(2)} ppm, with dock ${b.gas.toFixed(2)} ppm (simulated)`}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            setHx(Math.max(0, Math.min(tMax, ((((e.clientX - r.left) / r.width) * W - Lp) / (W - Lp - Rp)) * tMax)));
          }}
          onPointerLeave={() => setHx(null)}
        >
          {[0, 0.2, 0.4, 0.6, 0.8].filter((g) => g <= gMax).map((g) => (
            <g key={g}>
              <line x1={Lp} x2={W - Rp} y1={y(g)} y2={y(g)} stroke="#EEF1F4" />
              <text x={Lp - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#5E6977" fontFamily="monospace">{g.toFixed(1)}</text>
            </g>
          ))}
          <line x1={Lp} x2={W - Rp} y1={y(CONFIG.thresholds.gas.warning)} y2={y(CONFIG.thresholds.gas.warning)} stroke="#98A1AD" />
          {[0, 8, 16, 24, 32, 40].filter((t) => t <= tMax).map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5E6977" fontFamily="monospace">{fmtClock(t)}</text>
          ))}
          {series.map(({ s, c, name }) => {
            const last = s.history.at(-1)!;
            return (
              <g key={name}>
                <path d={path(s)} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
                <circle cx={x(last.t)} cy={y(last.gas)} r="4.5" fill={c} stroke="#fff" strokeWidth="2" />
                <text x={x(last.t) + 8} y={y(last.gas) + 4} fontSize="11" fontWeight="700" fill="#1F2733">{last.gas.toFixed(2)}</text>
              </g>
            );
          })}
          {hx != null && <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} stroke="#1F2733" opacity=".35" />}
        </svg>
        {hx != null && (
          <div className="pointer-events-none absolute top-2 rounded-lg bg-graphite px-2.5 py-1.5 font-mono text-[11px] text-white shadow-card" style={{ left: `min(calc(${(x(hx) / W) * 100}% + 8px), calc(100% - 170px))` }}>
            t {fmtClock(hx)}
            {series.map(({ s, c, name }) => (
              <span key={name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{name}: {at(s, hx).gas.toFixed(2)} ppm</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

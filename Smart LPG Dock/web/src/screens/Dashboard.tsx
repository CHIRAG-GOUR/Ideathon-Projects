import { motion } from 'framer-motion';
import { useState } from 'react';
import { CONFIG, headline } from '@engine/engine';
import { compare, main } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { go } from '@/hooks/useRoute';
import { SAFETY_TEXT, safetyTone, type Tone } from '@/safety/labels';
import { DockIllustration, IconCompare, IconCube, IconPlay, IconShield } from '@/assets/art';
import { Btn, Card, SimBadge, Status, cx } from '@/components/ui';
import { TelemetryCards, Timeline } from '@/components/telemetry';
import { HowItWorks } from '@/components/HowItWorks';

const BIG: Record<Tone, string> = { ok: 'text-ok-600', warn: 'text-safety-600', danger: 'text-danger-600', info: 'text-lpg-600', isolated: 'text-lpg-700', neutral: 'text-graphite-muted' };
const RING: Record<Tone, string> = { ok: '#1E9A58', warn: '#E8730C', danger: '#D92D20', info: '#2563B0', isolated: '#2563B0', neutral: '#98A1AD' };

export function Dashboard() {
  const s = useSim(main, 8);
  const tone = safetyTone(s.safety);
  const [imgOk, setImgOk] = useState(true);
  const status = s.safety === 'NORMAL' ? 'SYSTEM NORMAL' : s.safety === 'SAFE' ? 'SYSTEM SAFE' : s.safety === 'UNMONITORED' ? 'NOT MONITORED' : SAFETY_TEXT[s.safety];
  const rows: [string, string][] = [
    ['Gas', `${s.gas.toFixed(2)} ppm`],
    ['Temp', `${s.temp.toFixed(1)} °C`],
    ['Tilt', `${s.tilt.toFixed(1)}°`],
    ['Usage', s.usage === 'IDLE' ? 'Idle' : s.usage[0] + s.usage.slice(1).toLowerCase()],
    ['Dock', s.dock === 'CONNECTED' ? 'Connected' : 'Not installed'],
    ['Cylinder', CONFIG.cylinderId],
  ];

  const runDemo = () => {
    main.restart('with', 'scripted', true);
    go('simulation', { demo: '1' });
  };
  const compareBoth = () => {
    compare.restart(true);
    go('compare');
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.4rem] bg-white shadow-card ring-1 ring-line">
        <div className="absolute inset-0 bg-grid opacity-70" aria-hidden />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-lpg-700">Smart LPG Safety Dock</h1>
              <SimBadge />
            </div>
            <motion.p key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx('mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl', BIG[tone])} aria-live="polite">
              <span className="relative inline-flex h-4 w-4">
                <span className={cx('absolute inset-0 rounded-full', s.alarm !== 'none' && 'animate-ping')} style={{ background: RING[tone], opacity: 0.5 }} />
                <span className="relative inline-flex h-4 w-4 rounded-full" style={{ background: RING[tone] }} />
              </span>
              {status}
            </motion.p>
            <p className="mt-1 text-sm font-semibold text-graphite-muted">{headline(s)} · scenario {s.scenario === 'with' ? 'WITH Smart Dock' : 'WITHOUT Smart Dock'}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-1.5">
                  <dt className="text-sm font-semibold text-graphite-muted">{k}</dt>
                  <dd className="font-mono text-[15px] font-bold tabular-nums text-graphite">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn size="lg" onClick={() => (main.start(), go('simulation'))}><IconPlay size={18} />Start simulation</Btn>
              <Btn size="lg" tone="warn" onClick={runDemo}>Run leak demo</Btn>
              <Btn size="lg" tone="secondary" onClick={() => go('dock')}><IconCube size={18} />Open 3D view</Btn>
            </div>
          </div>
          <div className="relative grid min-h-[260px] place-items-center">
            <motion.div className="absolute h-64 w-64 rounded-full blur-3xl" style={{ background: RING[tone], opacity: 0.18 }} animate={{ scale: s.alarm !== 'none' ? [1, 1.15, 1] : 1 }} transition={{ duration: 1.2, repeat: s.alarm !== 'none' ? Infinity : 0 }} />
            {imgOk ? (
              <img src="/img/dock-closeup.jpg" alt="Rendered concept of the Smart LPG Dock under a blue LPG cylinder" onError={() => setImgOk(false)} className="relative w-full max-w-md rounded-2xl object-cover shadow-card ring-1 ring-line" />
            ) : (
              <DockIllustration status={RING[tone]} className="relative h-64 w-auto" />
            )}
            <span className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-graphite-muted ring-1 ring-line">Concept render · prototype</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Demo mode — no sign-in needed" action={<Status tone="info">FOR JUDGES</Status>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={runDemo} className="group rounded-xl2 bg-lpg-600 p-4 text-left text-white shadow-lift transition hover:bg-lpg-700">
              <IconShield size={26} />
              <p className="mt-3 text-lg font-extrabold">Run full safety demo</p>
              <p className="text-sm text-lpg-100">Kitchen → chef cooking → leak → detection → simulated shutoff → contained → back to safe.</p>
            </button>
            <button onClick={compareBoth} className="group rounded-xl2 bg-graphite p-4 text-left text-white shadow-card transition hover:bg-graphite-soft">
              <IconCompare size={26} />
              <p className="mt-3 text-lg font-extrabold">Compare both</p>
              <p className="text-sm text-steel-200">Same kitchen, same leak — without vs. with the Smart Dock, side by side.</p>
            </button>
          </div>
        </Card>
        <Card title="Live events" action={<button onClick={() => go('events')} className="text-[13px] font-bold text-lpg-700">All events →</button>}>
          <Timeline s={s} startedAt={main.startedAtWall} max={5} dense />
        </Card>
      </div>

      <Card title="Live telemetry · simulated" action={<button onClick={() => go('telemetry')} className="text-[13px] font-bold text-lpg-700">Telemetry →</button>}>
        <TelemetryCards s={s} />
      </Card>

      <Card title="How the dock works" action={<button onClick={() => go('dock')} className="text-[13px] font-bold text-lpg-700">Inspect in 3D →</button>}>
        <HowItWorks s={s} compact />
      </Card>
    </div>
  );
}

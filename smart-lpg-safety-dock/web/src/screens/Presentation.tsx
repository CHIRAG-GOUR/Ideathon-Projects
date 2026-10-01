import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CONFIG, fmtClock, runScenario } from '@engine/engine';
import { main } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { go } from '@/hooks/useRoute';
import { KitchenView } from '@/three/KitchenView';
import { savePresentation } from '@/services/sessions';
import { Btn, cx } from '@/components/ui';
import { GasChart, TelemetryCards } from '@/components/telemetry';
import { HowItWorks } from '@/components/HowItWorks';
import { Narration, Outcome, PhaseStepper } from '@/components/scenario';
import { DockIllustration, IconAlert, IconBack, IconCylinder, IconGas, IconNext, IconPlay, IconTemp, IconTilt, IconUsage, Logo } from '@/assets/art';

function Img({ src, alt, fallback }: { src: string; alt: string; fallback: ReactNode }) {
  const [ok, setOk] = useState(true);
  return ok ? <img src={src} alt={alt} onError={() => setOk(false)} className="h-full w-full rounded-2xl object-cover shadow-card ring-1 ring-line" /> : <>{fallback}</>;
}

function LiveScene({ scenario, ch }: { scenario: 'with' | 'without'; ch: number }) {
  const s = useSim(main, 8);
  const mine = s.scenario === scenario;
  return (
    <div className="space-y-3">
      <KitchenView sim={main} className="h-[42vh] min-h-[260px] w-full" />
      <div className="flex flex-wrap items-center gap-2">
        <Btn tone={scenario === 'with' ? 'primary' : 'dark'} onClick={() => main.restart(scenario, 'scripted', true)}><IconPlay size={16} />Run live demo</Btn>
        <Btn tone="secondary" onClick={() => (main.restart(scenario, 'scripted', true), go('simulation', { from: 'present', ch: String(ch) }))}>Open full simulation</Btn>
      </div>
      {mine && s.t > 0 ? (
        <div className="space-y-2 rounded-xl2 bg-white p-3 ring-1 ring-line">
          <Narration s={s} />
          <PhaseStepper s={s} />
          <Outcome s={s} />
        </div>
      ) : (
        <p className="text-sm text-graphite-muted">Press “Run live demo” — this is the real simulation, not a recording.</p>
      )}
    </div>
  );
}

function WhyEarly() {
  // Computed by the engine from the same configuration — not hand-written numbers.
  const r = useMemo(() => {
    const w = runScenario('with', 40), o = runScenario('without', 40);
    const at = (s: typeof w, k: string) => s.events.find((e) => e.kind === k)?.t ?? NaN;
    return { warn: at(w, 'warning'), iso: at(w, 'isolated'), contained: at(w, 'contained'), danger: at(o, 'danger'), incident: at(o, 'incident'), leak: CONFIG.script.leakAtSec };
  }, []);
  const rows = [
    { k: 'Leak starts', a: r.leak, b: r.leak },
    { k: 'First warning to the chef', a: r.danger, b: r.warn, note: 'without the dock, the chef only notices at DANGER' },
    { k: 'Gas supply stops', a: NaN, b: r.iso },
    { k: 'Outcome', a: r.incident, b: r.contained, la: 'simulated incident', lb: 'contained' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl2 bg-graphite p-4 text-white"><p className="font-mono text-[11px] text-steel-300">WITHOUT DOCK · first notice</p><p className="text-4xl font-extrabold">{fmtClock(r.danger)}</p><p className="text-sm text-steel-200">{(r.danger - r.leak).toFixed(1)} s after the leak starts — already at DANGER</p></div>
        <div className="rounded-xl2 bg-lpg-600 p-4 text-white"><p className="font-mono text-[11px] text-lpg-100">WITH DOCK · early warning</p><p className="text-4xl font-extrabold">{fmtClock(r.warn)}</p><p className="text-sm text-lpg-100">{(r.warn - r.leak).toFixed(1)} s after the leak starts — {(r.danger - r.warn).toFixed(1)} s earlier, supply isolated at {fmtClock(r.iso)}</p></div>
      </div>
      <table className="w-full text-left text-[14px]">
        <thead className="font-mono text-[11px] uppercase text-graphite-muted"><tr><th className="py-1">In this simulation</th><th>Without dock</th><th>With dock</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.k} className="border-t border-line"><td className="py-2 font-semibold">{x.k}</td><td className="font-mono">{Number.isFinite(x.a) ? fmtClock(x.a) : '— never'}{'la' in x && <span className="ml-1.5 font-sans text-[12px] text-danger-700">{x.la}</span>}</td><td className="font-mono font-bold text-lpg-700">{fmtClock(x.b)}{'lb' in x && <span className="ml-1.5 font-sans text-[12px] font-semibold text-ok-700">{x.lb}</span>}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-graphite-muted">Times come from the simulation’s illustrative model and thresholds (shared/dock-config.json). They show the principle — earlier detection buys time — not measured real-world performance.</p>
      <Btn onClick={() => go('compare', { autostart: '1', from: 'present', ch: '8' })}>Compare both live</Btn>
    </div>
  );
}

function Live({ kind }: { kind: 'cards' | 'chart' }) {
  const s = useSim(main, 8);
  return (
    <div className="space-y-3">
      {kind === 'cards' ? <TelemetryCards s={s} compact /> : <div className="rounded-xl2 bg-white p-3 ring-1 ring-line"><GasChart s={s} height={240} /></div>}
      <Btn onClick={() => main.restart('with', 'scripted', true)}><IconPlay size={16} />Run live demo</Btn>
    </div>
  );
}

const SENSORS = [
  { i: <IconGas />, t: 'Gas', d: `Anomaly ${CONFIG.thresholds.gas.anomaly} · warning ${CONFIG.thresholds.gas.warning} · critical ${CONFIG.thresholds.gas.critical} ppm` },
  { i: <IconTemp />, t: 'Temperature', d: `${CONFIG.thresholds.temp.anomaly} / ${CONFIG.thresholds.temp.warning} / ${CONFIG.thresholds.temp.critical} °C near the cylinder` },
  { i: <IconTilt />, t: 'Tilt', d: `${CONFIG.thresholds.tilt.anomaly}° / ${CONFIG.thresholds.tilt.warning}° / ${CONFIG.thresholds.tilt.critical}° lean` },
  { i: <IconUsage />, t: 'Usage', d: `Flow above ${CONFIG.thresholds.usage.abnormalFlow} kg/h for ${CONFIG.thresholds.usage.abnormalSustainSec} s` },
];

type Chapter = { kicker: string; title: string; body: ReactNode; visual: (ch: number) => ReactNode };
const CHAPTERS: Chapter[] = [
  {
    kicker: '01 · The problem', title: 'Gas leaks are invisible — and people notice late.',
    body: <ul className="space-y-2"><li>• LPG cooks food in homes, dhabas and restaurant kitchens every day.</li><li>• A leak at the regulator or hose gives no warning on its own.</li><li>• By the time someone smells it, the safe window may already be gone.</li></ul>,
    visual: () => <Img src="/img/kitchen-without.jpg" alt="Simulated restaurant kitchen with a chef cooking next to an LPG cylinder" fallback={<DockIllustration className="h-72" />} />,
  },
  {
    kicker: '02 · LPG safety risk', title: 'Four things that go wrong around a cylinder.',
    body: <p>Leaks, heat near the cylinder, a tipped cylinder straining the regulator, and gas flowing when nobody is cooking. Each can be watched for — continuously — by something sitting right under the cylinder.</p>,
    visual: () => (
      <div className="grid grid-cols-2 gap-3">
        {[[<IconGas key="g" />, 'Leak at regulator / hose'], [<IconTemp key="t" />, 'Heat near the cylinder'], [<IconTilt key="i" />, 'Cylinder tipped'], [<IconUsage key="u" />, 'Flow with no cooking']].map(([i, t], k) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * k }} className="rounded-xl2 bg-white p-4 ring-1 ring-line"><span className="text-safety-600">{i}</span><p className="mt-2 font-extrabold text-graphite">{t}</p></motion.div>
        ))}
      </div>
    ),
  },
  {
    kicker: '03 · Smart Dock', title: 'A dock under the cylinder that never stops watching.',
    body: <p>No change to the cylinder or the stove. The dock carries the sensors, a status ring, a buzzer/beacon and a shutoff actuator on the regulator. <b>Smart. Safe. Secure.</b></p>,
    visual: () => <Img src="/img/dock-closeup.jpg" alt="Concept render of the Smart LPG Dock" fallback={<DockIllustration className="h-72" />} />,
  },
  {
    kicker: '04 · Sensor system', title: 'Four sensors, one safety engine.',
    body: <p>Readings feed a deterministic safety engine with three levels — anomaly, warning, critical. The thresholds below are the simulation’s configured values.</p>,
    visual: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        {SENSORS.map((x) => (
          <div key={x.t} className="rounded-xl2 bg-white p-4 ring-1 ring-line"><span className="text-lpg-600">{x.i}</span><p className="mt-2 font-extrabold text-graphite">{x.t}</p><p className="font-mono text-[12px] text-graphite-muted">{x.d}</p></div>
        ))}
      </div>
    ),
  },
  { kicker: '05 · Live monitoring', title: 'Every value, live — from one engine.', body: <p>These cards are running right now. Start the demo and watch them change: gas, temperature, tilt and usage, with trends and status in words — not colour alone.</p>, visual: () => <Live kind="cards" /> },
  { kicker: '06 · Leak detection', title: 'Detect at 0.08 ppm. Warn at 0.12. Act within a second.', body: <p>The dock confirms a warning for {CONFIG.dock.confirmSec} s, then the simulated actuator isolates the supply ({CONFIG.dock.valveTravelSec} s travel). The exhaust clears the remaining gas.</p>, visual: () => <Live kind="chart" /> },
  { kicker: '07 · Without Smart Dock', title: 'Leak → no warning → late notice → simulated incident.', body: <p>Same kitchen, same chef, same leak. Nobody is measuring the gas. The chef notices only at DANGER and gets out. The incident that follows is a <b>simulated educational visualisation</b>.</p>, visual: (ch) => <LiveScene scenario="without" ch={ch} /> },
  { kicker: '08 · With Smart Dock', title: 'Leak → early warning → simulated shutoff → contained.', body: <p>The dock warns the chef within seconds, isolates the supply, and the gas clears. The chef walks out calmly — and breathes out. <b>No simulated blast occurs.</b></p>, visual: (ch) => <LiveScene scenario="with" ch={ch} /> },
  { kicker: '09 · Why early detection matters', title: 'Seconds of warning change the outcome.', body: <p>Both runs start from identical conditions. The only difference is whether something is watching.</p>, visual: () => <WhyEarly /> },
  {
    kicker: '10 · Prototype → hardware', title: 'From simulator to a real dock.',
    body: (
      <ol className="space-y-2">
        <li><b>Today:</b> interactive prototype — web + Android, one simulation engine, honest labels.</li>
        <li><b>Next:</b> hardware telemetry provider (load cells, gas sensor, IMU, temperature) — the app UI stays the same.</li>
        <li><b>Then:</b> bench testing, a tested shutoff actuator, and safety certification before any real-world use.</li>
      </ol>
    ),
    visual: () => <div className="rounded-xl2 bg-white p-4 ring-1 ring-line"><HowItWorks compact /></div>,
  },
];

export default function Presentation({ params }: { params: URLSearchParams }) {
  const [ch, setCh] = useState(() => Math.min(CHAPTERS.length - 1, Math.max(0, Number(params.get('ch') ?? 0) || 0)));
  const viewed = useRef(new Set<number>([ch]));
  const started = useRef(Date.now());
  const n = CHAPTERS.length;
  const goTo = (i: number) => {
    const k = Math.max(0, Math.min(n - 1, i));
    viewed.current.add(k);
    setCh(k);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(ch + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(ch - 1);
      if (e.key === 'Escape') exit();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });
  const exit = () => {
    void savePresentation([...viewed.current].sort((a, b) => a - b), started.current);
    go('dashboard');
  };
  const c = CHAPTERS[ch];
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 backdrop-blur sm:px-8">
        <Logo size={30} />
        <div className="hidden items-center gap-1.5 sm:flex" role="tablist" aria-label="Chapters">
          {CHAPTERS.map((x, i) => (
            <button key={i} role="tab" aria-selected={i === ch} aria-label={x.kicker} onClick={() => goTo(i)} className={cx('h-2.5 rounded-full transition-all', i === ch ? 'w-8 bg-lpg-600' : 'w-2.5 bg-steel-300 hover:bg-steel-400')} />
          ))}
        </div>
        <Btn tone="secondary" size="sm" onClick={exit}>Exit</Btn>
      </header>
      <AnimatePresence mode="wait">
        <motion.section key={ch} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }} className="mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-lpg-600">{c.kicker}</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-graphite sm:text-5xl">{c.title}</h1>
            <div className="mt-5 max-w-xl text-[17px] leading-relaxed text-graphite-soft">{c.body}</div>
            {(ch === 6 || ch === 7) && <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] font-bold text-graphite-muted ring-1 ring-line"><IconAlert size={14} /> SIMULATION · CONCEPT / PROTOTYPE</p>}
          </div>
          <div className="min-w-0">{c.visual(ch)}</div>
        </motion.section>
      </AnimatePresence>
      <footer className="flex items-center justify-between gap-3 border-t border-line bg-white/80 px-4 py-3 sm:px-8">
        <Btn tone="secondary" onClick={() => goTo(ch - 1)} disabled={ch === 0}><IconBack size={18} />Back</Btn>
        <p className="font-mono text-[12px] font-bold text-graphite-muted">{ch + 1} / {n} · ← → keys</p>
        {ch < n - 1 ? <Btn onClick={() => goTo(ch + 1)}>Next<IconNext size={18} /></Btn> : <Btn tone="ok" onClick={exit}>Finish<IconCylinder size={18} /></Btn>}
      </footer>
    </div>
  );
}

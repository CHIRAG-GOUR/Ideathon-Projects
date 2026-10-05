import { AnimatePresence, motion } from 'framer-motion';
import { fmtClock, headline, type Phase, type SimState } from '@engine/engine';
import { phaseTone } from '@/safety/labels';
import { IconContained } from '@/assets/art';
import { Status, cx } from './ui';

const KIND_PHASE: Record<string, Phase> = { cooking_started: 'COOKING', anomaly: 'ANOMALY', warning: 'WARNING', critical: 'CRITICAL', shutoff: 'RESPONSE', contained: 'CONTAINED', leak_introduced: 'LEAK', danger: 'DANGER', incident: 'INCIDENT', recovery: 'RECOVERY' };
export const MACHINE: Record<'with' | 'without', Phase[]> = {
  with: ['IDLE', 'COOKING', 'ANOMALY', 'WARNING', 'CRITICAL', 'RESPONSE', 'CONTAINED'],
  without: ['IDLE', 'COOKING', 'LEAK', 'DANGER', 'INCIDENT', 'RECOVERY'],
};

/** The scenario's state machine with the phases actually visited (from engine events). */
export function PhaseStepper({ s }: { s: SimState }) {
  const visited = new Set<Phase>(['IDLE', ...s.events.map((e) => KIND_PHASE[e.kind]).filter(Boolean)]);
  const steps = MACHINE[s.scenario];
  const curIdx = steps.indexOf(s.phase);
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="State machine">
      {steps.map((p, i) => {
        const cur = p === s.phase;
        const done = visited.has(p) && !cur;
        const skipped = !visited.has(p) && i < curIdx;
        return (
          <li key={p} className="flex items-center gap-1.5">
            <span
              className={cx(
                'rounded-lg px-2 py-1 font-mono text-[10.5px] font-bold tracking-wide ring-1',
                cur ? (phaseTone(p) === 'danger' ? 'bg-danger-600 text-white ring-danger-600' : phaseTone(p) === 'warn' ? 'bg-safety-500 text-white ring-safety-500' : phaseTone(p) === 'ok' ? 'bg-ok-600 text-white ring-ok-600' : 'bg-lpg-600 text-white ring-lpg-600') : done ? 'bg-lpg-50 text-lpg-700 ring-lpg-100' : 'bg-white text-graphite-faint ring-line',
                skipped && 'line-through',
              )}
              aria-current={cur ? 'step' : undefined}
              title={skipped ? 'Not reached in this run' : undefined}
            >
              {p}
            </span>
            {i < steps.length - 1 && <span className="text-graphite-faint" aria-hidden>→</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** The five demonstration steps from the brief, chosen from the live engine state. */
export function narration(s: SimState): { step: number; title: string; text: string } {
  const ev = (k: string) => s.events.some((e) => e.kind === k);
  if (s.scenario === 'with') {
    if (s.outcome === 'CONTAINED') return { step: 5, title: 'INCIDENT CONTAINED', text: s.chef.action === 'relieved' ? 'Gas back to baseline, supply isolated, chef safe — and relieved.' : 'Readings are back to normal. No simulated blast occurred.' };
    if (ev('chef_exited') || s.chef.action === 'walking') return { step: 4, title: 'CHEF RESPONSE', text: 'Warned early, the chef turns off the burner and calmly leaves the cooking area.' };
    if (ev('shutoff')) return { step: 3, title: 'SAFETY RESPONSE', text: s.supply === 'ISOLATED' ? 'LPG SUPPLY ISOLATED — simulated automatic shutoff complete.' : 'SIMULATED AUTOMATIC SHUTOFF — the actuator is closing the supply.' };
    if (ev('warning')) return { step: 2, title: 'EARLY WARNING', text: 'NORMAL → WARNING. Beacon, sound and app alert — long before the gas gets dangerous.' };
    if (ev('leak_introduced') || ev('anomaly')) return { step: 1, title: ev('anomaly') ? 'GAS ANOMALY DETECTED' : 'LEAK BEGINS', text: ev('anomaly') ? 'The dock’s gas sensor sees the rise within seconds.' : 'A simulated leak starts at the regulator. The dock is watching.' };
    return { step: 0, title: 'PROTECTED', text: 'Chef cooking normally. Smart Dock active and monitoring.' };
  }
  if (s.phase === 'RECOVERY') return { step: 5, title: 'INCIDENT ESCALATION', text: 'Without early detection the simulated leak escalated. Simulation frozen.' };
  if (ev('incident')) return { step: 5, title: 'SIMULATED INCIDENT', text: 'For demonstration only — not a prediction of real LPG behaviour.' };
  if (ev('chef_fleeing')) return { step: 4, title: 'CHEF LEAVES', text: 'The chef gets out of the immediate kitchen zone — with seconds to spare.' };
  if (ev('danger')) return { step: 3, title: 'DANGER — NO EARLY WARNING', text: 'Nothing warned the chef. They only notice once it is already dangerous.' };
  if (ev('leak_introduced')) return { step: 2, title: 'LEAK BEGINS', text: 'Gas concentration slowly rises. Nobody is measuring it.' };
  return { step: 1, title: 'NORMAL', text: 'Chef cooking normally. No monitoring installed.' };
}

export function Narration({ s }: { s: SimState }) {
  const n = narration(s);
  const tone = s.scenario === 'with' ? (n.step >= 5 ? 'ok' : n.step >= 2 ? 'warn' : 'info') : n.step >= 3 ? 'danger' : n.step === 2 ? 'warn' : 'info';
  return (
    <AnimatePresence mode="wait">
      <motion.div key={n.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
        <span className={cx('grid h-9 min-w-9 place-items-center rounded-lg px-2 font-mono text-xs font-bold text-white', tone === 'ok' ? 'bg-ok-600' : tone === 'warn' ? 'bg-safety-500' : tone === 'danger' ? 'bg-danger-600' : 'bg-lpg-600')}>{n.step ? `STEP ${n.step}` : 'START'}</span>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-tight text-graphite">{n.title}</p>
          <p className="text-[13px] text-graphite-muted">{n.text}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function StatusLine({ s }: { s: SimState }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Status tone={phaseTone(s.phase)} pulse={s.alarm !== 'none' || s.phase === 'DANGER'}>{s.phase}</Status>
      <span className="font-mono text-[13px] font-bold tabular-nums text-graphite">t {fmtClock(s.t)}</span>
      <span className="truncate text-[13px] font-semibold text-graphite-muted">{headline(s)}</span>
    </div>
  );
}

export function Outcome({ s }: { s: SimState }) {
  if (s.outcome === 'NONE') return null;
  if (s.outcome === 'CONTAINED')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl2 bg-ok-50 p-4 ring-1 ring-ok-100">
        <p className="flex items-center gap-2 text-lg font-extrabold text-ok-700"><IconContained />INCIDENT CONTAINED</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[13px] sm:grid-cols-5">
          {[['Gas', `${s.gas.toFixed(2)} ppm`], ['Temperature', `${s.temp.toFixed(1)} °C`], ['Tilt', `${s.tilt.toFixed(1)}°`], ['Dock', 'SAFE'], ['Cylinder', 'ISOLATED']].map(([k, v]) => (
            <div key={k}><dt className="text-[11px] text-ok-700/80">{k}</dt><dd className="font-bold text-graphite">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-2 font-mono text-[12px] font-bold tracking-wide text-ok-700">NO SIMULATED BLAST OCCURRED</p>
      </motion.div>
    );
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl2 bg-danger-50 p-4 ring-1 ring-danger-100">
      <p className="text-lg font-extrabold text-danger-700">INCIDENT ESCALATION</p>
      <p className="text-[13px] text-graphite-soft">Leak → late notice → simulated incident. Peak simulated gas {Math.max(...s.history.map((h) => h.gas)).toFixed(2)} ppm with no alarm.</p>
      <p className="mt-1 font-mono text-[11px] font-bold text-danger-700">SIMULATED INCIDENT — FOR DEMONSTRATION ONLY</p>
    </motion.div>
  );
}

import type { SimController } from '@/simulation/controller';
import { settings, useSettings } from '@/services/settings';
import { IconAlert, IconGas, IconPause, IconPlay, IconRestart, IconTemp, IconTilt, IconUsage } from '@/assets/art';
import { Btn, cx } from './ui';

export const SPEEDS = [0.5, 1, 2] as const;

export function Transport({ running, onStart, onPause, onRestart, speed, onSpeed, compact }: { running: boolean; onStart: () => void; onPause: () => void; onRestart: () => void; speed: number; onSpeed: (x: number) => void; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Simulation controls">
      {running ? (
        <Btn tone="dark" onClick={onPause} aria-label="Pause simulation"><IconPause size={16} />Pause</Btn>
      ) : (
        <Btn onClick={onStart} aria-label="Start simulation"><IconPlay size={16} />Start</Btn>
      )}
      <Btn tone="secondary" onClick={onRestart} aria-label="Restart simulation"><IconRestart size={16} />{!compact && 'Restart'}</Btn>
      <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-line" role="radiogroup" aria-label="Simulation speed">
        {SPEEDS.map((x) => (
          <button key={x} role="radio" aria-checked={speed === x} onClick={() => (onSpeed(x), settings.set({ speed: x }))} className={cx('min-h-[34px] min-w-[44px] rounded-lg px-2 font-mono text-[12px] font-bold', speed === x ? 'bg-lpg-600 text-white' : 'text-graphite-soft hover:bg-cream-100')}>
            {x}×
          </button>
        ))}
      </div>
    </div>
  );
}

export function FaultPanel({ sim }: { sim: SimController }) {
  useSettings();
  const done = sim.state.outcome !== 'NONE';
  const F = [
    { f: 'leak' as const, label: 'Gas leak', hint: 'Start / increase a simulated leak', icon: <IconGas size={18} /> },
    { f: 'heat' as const, label: 'Temperature rise', hint: 'Heat near the cylinder', icon: <IconTemp size={18} /> },
    { f: 'tilt' as const, label: 'Cylinder tilt', hint: 'Tip the cylinder', icon: <IconTilt size={18} /> },
    { f: 'usage' as const, label: 'Unusual usage', hint: 'High flow, no cooking', icon: <IconUsage size={18} /> },
  ];
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-graphite-muted">
        <IconAlert size={14} /> Simulation controls · fault injection
      </p>
      <div className="grid grid-cols-2 gap-2">
        {F.map((x) => (
          <button key={x.f} disabled={done} onClick={() => sim.inject(x.f)} className="flex items-start gap-2 rounded-xl bg-cream-100 p-2.5 text-left ring-1 ring-line transition hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lpg-200 disabled:opacity-45">
            <span className="mt-0.5 text-safety-600">{x.icon}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-graphite">{x.label}</span>
              <span className="block text-[11px] leading-snug text-graphite-muted">{x.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <button disabled={done} onClick={() => sim.clear()} className="mt-2 w-full rounded-xl py-2 text-[13px] font-bold text-lpg-700 hover:bg-lpg-50 disabled:opacity-45">Clear faults</button>
      <p className="mt-1 text-[11px] text-graphite-faint">These change the simulation only. They are not instructions for real LPG equipment.</p>
    </div>
  );
}

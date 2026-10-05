import { useEffect } from 'react';
import { main } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { go } from '@/hooks/useRoute';
import { KitchenView } from '@/three/KitchenView';
import { Btn, Card, PageHeader, SimBadge, cx } from '@/components/ui';
import { FaultPanel, Transport } from '@/components/controls';
import { TelemetryCards, Timeline } from '@/components/telemetry';
import { Narration, Outcome, PhaseStepper, StatusLine } from '@/components/scenario';
import { IconCompare } from '@/assets/art';

export default function Simulation({ params }: { params: URLSearchParams }) {
  const s = useSim(main, 10);
  useEffect(() => {
    const sc = params.get('scenario');
    if (sc === 'with' || sc === 'without') main.restart(sc, 'scripted', params.get('autostart') === '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setScenario = (sc: 'with' | 'without') => main.restart(sc, main.mode);
  const setMode = (m: 'scripted' | 'free') => main.restart(main.scenario, m);
  const demo = params.get('demo') === '1' || params.get('from') === 'present';

  return (
    <div>
      <PageHeader
        title={s.scenario === 'with' ? 'WITH SMART LPG DOCK' : 'WITHOUT SMART DOCK'}
        sub="Interactive kitchen simulation — one deterministic engine drives the scene, telemetry, events and sound."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {params.get('from') === 'present' && <Btn tone="secondary" size="sm" onClick={() => go('present', { ch: params.get('ch') ?? '0' })}>← Back to presentation</Btn>}
            <Btn tone="secondary" size="sm" onClick={() => go('compare')}><IconCompare size={16} />Compare</Btn>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Seg value={s.scenario} onChange={setScenario} options={[['without', 'Without dock'], ['with', 'With Smart Dock']]} label="Scenario" />
        <Seg value={s.mode} onChange={setMode} options={[['scripted', 'Scripted leak at 00:08'], ['free', 'Free play']]} label="Mode" />
        <SimBadge />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <KitchenView sim={main} className="h-[52vh] min-h-[300px] w-full sm:h-[58vh] xl:h-[560px]" />
          <div className="sticky bottom-[68px] z-20 rounded-xl2 bg-white/95 p-3 shadow-card ring-1 ring-line backdrop-blur lg:static">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Transport running={main.running} onStart={() => main.start()} onPause={() => main.pause()} onRestart={() => main.restart()} speed={main.speed} onSpeed={(x) => main.setSpeed(x)} />
              <StatusLine s={s} />
            </div>
          </div>
          <Card>
            <div className="space-y-3">
              {(demo || s.mode === 'scripted') && <Narration s={s} />}
              <PhaseStepper s={s} />
              <Outcome s={s} />
            </div>
          </Card>
        </div>
        <aside className="min-w-0 space-y-4">
          <Card title="Live telemetry"><TelemetryCards s={s} compact /></Card>
          <Card><FaultPanel sim={main} /></Card>
          <Card title="Event timeline"><div className="max-h-[420px] overflow-y-auto pr-1"><Timeline s={s} startedAt={main.startedAtWall} /></div></Card>
        </aside>
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-line" role="radiogroup" aria-label={label}>
      {options.map(([v, t]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cx('min-h-[36px] rounded-lg px-3 text-[13px] font-bold transition-colors', value === v ? 'bg-graphite text-white' : 'text-graphite-soft hover:bg-cream-100')}>
          {t}
        </button>
      ))}
    </div>
  );
}

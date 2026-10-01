import { useMemo } from 'react';
import { CONFIG, fmtClock } from '@engine/engine';
import { main } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { FutureHardwareTelemetryProvider, SimulationTelemetryProvider } from '@/telemetry/provider';
import { settings, useSettings } from '@/services/settings';
import { Btn, Card, PageHeader, SimBadge, Status } from '@/components/ui';
import { GasChart, TelemetryCards } from '@/components/telemetry';
import { go } from '@/hooks/useRoute';
import { Seg } from './Simulation';

export default function Telemetry() {
  const s = useSim(main, 8);
  const st = useSettings();
  const providers = useMemo(() => ({ simulation: new SimulationTelemetryProvider(main, CONFIG.cylinderId), hardware: new FutureHardwareTelemetryProvider() }), []);
  const p = providers[st.telemetrySource];
  const status = p.status();
  const reading = p.read();
  return (
    <div className="space-y-4">
      <PageHeader title="Telemetry" sub="Every value below comes through a TelemetryProvider — the UI does not know whether it is simulated or real." right={<SimBadge />} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seg value={st.telemetrySource} onChange={(v) => settings.set({ telemetrySource: v })} options={[['simulation', 'Simulation provider'], ['hardware', 'Hardware provider (future)']]} label="Telemetry source" />
          <Status tone={status.connected ? 'ok' : 'neutral'}>{status.connected ? 'CONNECTED' : 'NOT CONNECTED'}</Status>
        </div>
        <p className="mt-2 text-[13px] text-graphite-muted">{p.label} — {status.detail}</p>
      </Card>
      {reading.source === 'hardware' ? (
        <Card>
          <p className="text-lg font-extrabold text-graphite">No dock hardware paired</p>
          <p className="mt-1 text-sm text-graphite-muted">Readings would appear here from a physical Smart Dock. Nothing is invented while no device is connected — every value is “—”.</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
            {['Gas', 'Temperature', 'Tilt', 'Flow'].map((k) => (
              <div key={k} className="rounded-xl bg-cream-100 p-3 ring-1 ring-line"><dt className="text-[11px] text-graphite-muted">{k}</dt><dd className="text-xl font-bold text-graphite-faint">—</dd></div>
            ))}
          </dl>
          <Btn className="mt-3" tone="secondary" onClick={() => settings.set({ telemetrySource: 'simulation' })}>Switch back to simulation</Btn>
        </Card>
      ) : (
        <>
          <TelemetryCards s={s} />
          <Card title="Gas concentration · simulated · dock thresholds" action={<Btn size="sm" tone="secondary" onClick={() => (main.restart('with', 'scripted', true))}>Run leak demo</Btn>}>
            <GasChart s={s} />
          </Card>
          <Card title="Data table (last 20 samples)">
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[480px] text-right font-mono text-[12px]">
                <thead className="sticky top-0 bg-white text-graphite-muted">
                  <tr><th className="py-1 text-left">t</th><th>gas ppm</th><th>temp °C</th><th>tilt °</th><th>flow kg/h</th></tr>
                </thead>
                <tbody>
                  {s.history.slice(-20).reverse().map((h) => (
                    <tr key={h.t} className="border-t border-line"><td className="py-1 text-left">{fmtClock(h.t)}</td><td>{h.gas.toFixed(3)}</td><td>{h.temp.toFixed(2)}</td><td>{h.tilt.toFixed(2)}</td><td>{h.flow.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {!main.running && s.t === 0 && <p className="text-sm text-graphite-muted">The simulation is idle. <button className="font-bold text-lpg-700" onClick={() => (main.start(), go('simulation'))}>Start it</button> to see live values.</p>}
        </>
      )}
    </div>
  );
}

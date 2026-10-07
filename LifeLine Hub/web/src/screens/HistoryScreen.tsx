'use client';
/** EMERGENCY HISTORY — past SOS events and Health Vault access. */
import { ago } from '@shared/geo';
import { useMyEvents } from '@core/data';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Kicker, Panel, StatusChip } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { AccessLogList, useLogs } from '@/components/lifeline/HealthVault';

export function HistoryScreen() {
  const { uid, demo } = useApp();
  const events = useMyEvents(demo ? null : uid, 30);
  const logs = useLogs();
  return (
    <Page>
      <PageTitle kicker="Emergency history" title="What happened, and who saw what." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <Kicker tone="coral">SOS events</Kicker>
          <ul className="mt-3 space-y-2">
            {demo && <li className="text-[13.5px] text-ink-muted">Demo mode keeps no history.</li>}
            {!demo && events === undefined && <li className="skeleton h-14" />}
            {!demo && events?.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral-50 text-coral-500"><Icon name="sos" size={18} /></span>
                <span className="min-w-0 flex-1"><b className="block text-[14px] text-ink">{new Date(e.startedAt).toLocaleString()}</b><span className="block text-[12px] text-ink-muted">{ago(e.startedAt)}{e.trailDeleted ? ' · trail deleted (retention)' : ''}</span></span>
                <StatusChip status={e.status === 'active' ? 'active' : e.status === 'safe' ? 'ready' : 'off'} label={e.status === 'safe' ? 'Safe' : e.status === 'cancelled' ? 'Cancelled' : 'Active'} />
              </li>
            ))}
            {!demo && events && !events.length && <li className="text-[13.5px] text-ink-muted">No SOS events.</li>}
          </ul>
        </Panel>
        <Panel className="p-5">
          <Kicker>Health Vault access</Kicker>
          <div className="mt-3"><AccessLogList logs={logs} /></div>
        </Panel>
      </div>
    </Page>
  );
}

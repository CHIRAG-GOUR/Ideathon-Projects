'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { SosEvent } from '@shared/types';
import { fmtAccuracy, fmtCoord } from '@shared/geo';
import { useCheckLog, useMyEvents } from '@core/data';
import { Header, Page, useApp } from '@/ctx';
import { LOG_TEXT as CHECK_TEXT } from '@/checkui';
import { Card, Chip, Spinner, cx } from '@/ui/kit';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false });
const TRIGGER = { sos: 'SOS', discreet: 'Silent SOS', check: 'SOS after missed check-ins' } as const;
const SMS_TEXT: Record<string, string> = { submitted: 'SMS sent', delivered: 'SMS delivered', failed: 'SMS failed', not_configured: 'Not texted automatically', not_permitted: 'SMS not allowed', skipped: 'No SMS channel', queued: 'Waiting to send', pending: 'Pending' };
const dur = (a: string, b: string | null) => {
  if (!b) return 'ongoing';
  const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export function History() {
  const { uid, demo } = useApp();
  const [tab, setTab] = useState<'checks' | 'sos'>('checks');
  return (
    <>
      <Header title="History" sub="Every check-in, missed check-in, escalation and emergency" />
      <Page>
        <div className="flex gap-2" role="tablist">
          {(['checks', 'sos'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('rounded-full px-4 py-2 text-sm font-semibold', tab === t ? 'bg-cobalt-600 text-white' : 'bg-white text-ink-soft shadow-soft')}>
              {{ checks: 'Check-ins', sos: 'Emergencies' }[t]}
            </button>
          ))}
        </div>
        {demo || !uid ? (
          <Card><p className="text-ink-muted">History is saved to your account. Demo mode keeps nothing.</p></Card>
        ) : tab === 'sos' ? (
          <Alerts uid={uid} />
        ) : (
          <Checks uid={uid} />
        )}
      </Page>
    </>
  );
}

function Alerts({ uid }: { uid: string }) {
  const events = useMyEvents(uid);
  const [open, setOpen] = useState<string | null>(null);
  if (!events) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!events.length) return <Card><p className="text-ink-muted">No emergencies recorded. Each SOS is kept here with its location and who was alerted.</p></Card>;
  return (
    <div className="space-y-3">
      {events.map((e: SosEvent & { trailDeleted?: boolean }) => {
        const alerts = Object.values(e.alerts ?? {});
        const sent = alerts.filter((a) => a.sms.status === 'submitted' || a.sms.status === 'delivered').length;
        const isOpen = open === e.id;
        return (
          <Card key={e.id} className="!p-0">
            <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
              <span className={cx('mt-1 h-3 w-3 shrink-0 rounded-full', e.status === 'active' || e.status === 'responding' ? 'bg-coral-500' : 'bg-cobalt-300')} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{TRIGGER[e.trigger ?? 'sos']}</p>
                <p className="text-sm text-ink-muted">{new Date(e.startedAt).toLocaleString()} · {dur(e.startedAt, e.endedAt)}</p>
                {e.area && <p className="truncate text-sm text-ink-soft">{e.area}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Chip tone={e.status === 'safe' ? 'teal' : e.status === 'cancelled' ? 'gray' : 'coral'}>{{ active: 'Active', responding: 'Responding', safe: 'Safe', cancelled: 'Cancelled' }[e.status]}</Chip>
                <span className="text-xs font-semibold text-ink-muted">{sent}/{alerts.length} texted · {e.responderCount ?? 0} responded</span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                  <div className="space-y-3 p-4">
                    {e.lastLocation ? (
                      <>
                        <div className="h-48 overflow-hidden rounded-2xl"><MapView className="h-full" me={e.lastLocation} color="#2347D9" /></div>
                        <p className="text-sm tabular-nums text-ink-soft">Last location {fmtCoord(e.lastLocation.latitude)}, {fmtCoord(e.lastLocation.longitude)} · {fmtAccuracy(e.lastLocation.accuracy)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">No location was recorded.</p>
                    )}
                    <ul className="divide-y divide-line">
                      {alerts.map((a) => (
                        <li key={a.contactId} className="flex justify-between gap-2 py-2 text-sm">
                          <span className="font-bold">{a.name}</span>
                          <span className="text-right text-ink-muted">{SMS_TEXT[a.sms.status] ?? a.sms.status}{a.sms.via === 'provider' ? ' (server)' : ''}{a.live === 'shared' ? ' · live link' : ''}</span>
                        </li>
                      ))}
                    </ul>
                    {e.trailDeleted && <p className="text-xs text-ink-muted">The location trail was deleted by your retention setting.</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}


function Checks({ uid }: { uid: string }) {
  const log = useCheckLog(uid);
  if (!log) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!log.length) return <Card><p className="text-ink-muted">No check-ins yet. Start a schedule in the Check Network.</p></Card>;
  const n = (t: string) => log.filter((l) => l.type === t).length;
  return (
    <Card>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {([['Checked in', n('confirmed'), 'text-teal-600 bg-teal-50'], ['Missed', n('missed') + n('warning'), 'text-amber-700 bg-amber-50'], ['Escalations', n('escalated') + n('sos'), 'text-coral-700 bg-coral-50']] as const).map(([t, v, c]) => (
          <div key={t} className={cx('rounded-3xl py-3', c)}><p className="text-2xl font-bold">{v}</p><p className="text-xs font-semibold">{t}</p></div>
        ))}
      </div>
      <ol className="space-y-3 border-l-2 border-cobalt-100 pl-4">
        {log.map((c) => (
          <li key={c.id} className="relative">
            <span className={cx('absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white', ['missed', 'escalated', 'sos'].includes(c.type) ? 'bg-coral-500' : c.type === 'confirmed' ? 'bg-teal-500' : c.type === 'warning' ? 'bg-amber-400' : 'bg-cobalt-400')} />
            <p className="font-bold text-ink">{CHECK_TEXT[c.type]}</p>
            <p className="text-xs text-ink-muted">{new Date(c.at).toLocaleString()}{c.note ? ` · ${c.note}` : ''}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}


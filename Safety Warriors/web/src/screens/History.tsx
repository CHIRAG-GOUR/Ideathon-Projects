'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { SosEvent } from '@shared/types';
import { fmtAccuracy, fmtCoord } from '@shared/geo';
import { useMyEvents } from '@core/data';
import { Header, Page, useApp } from '@/ctx';
import { Card, Tag, Spinner, cx } from '@/ui/kit';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false });
const TRIGGER = { sos: 'SOS', discreet: 'Silent SOS', check: 'SOS' } as const;
const SMS_TEXT: Record<string, string> = { submitted: 'SMS sent', delivered: 'SMS delivered', failed: 'SMS failed', not_configured: 'Not texted automatically', not_permitted: 'SMS not allowed', skipped: 'No SMS channel', queued: 'Waiting to send', pending: 'Pending' };
const dur = (a: string, b: string | null) => {
  if (!b) return 'ongoing';
  const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export function History() {
  const { uid, demo } = useApp();
  return (
    <>
      <Header title="Emergency history" sub="Every SOS, where it happened and who was alerted" back />
      <Page>{demo || !uid ? <Card><p className="text-ink-muted">History is saved to your account. Demo mode keeps nothing.</p></Card> : <Alerts uid={uid} />}</Page>
    </>
  );
}

function Alerts({ uid }: { uid: string }) {
  const events = useMyEvents(uid);
  const [open, setOpen] = useState<string | null>(null);
  if (!events) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!events.length) return <Card><p className="text-ink-muted">No alerts yet. When you use SOS or a silent SOS, it is recorded here with its location and who was alerted.</p></Card>;
  return (
    <div className="space-y-3">
      {events.map((e: SosEvent & { trailDeleted?: boolean }) => {
        const alerts = Object.values(e.alerts ?? {});
        const sent = alerts.filter((a) => a.sms.status === 'submitted' || a.sms.status === 'delivered').length;
        const isOpen = open === e.id;
        return (
          <Card key={e.id} className="!p-0">
            <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
              <span className={cx('mt-1 h-3 w-3 shrink-0 rounded-full', e.status === 'active' || e.status === 'responding' ? 'bg-sos-500' : 'bg-teal-300')} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{TRIGGER[e.trigger ?? 'sos']}</p>
                <p className="text-sm text-ink-muted">{new Date(e.startedAt).toLocaleString()} · {dur(e.startedAt, e.endedAt)}</p>
                {e.area && <p className="truncate text-sm text-ink-soft">{e.area}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Tag tone={e.status === 'safe' ? 'emerald' : e.status === 'cancelled' ? 'gray' : 'sos'}>{{ active: 'Active', responding: 'Responding', safe: 'Safe', cancelled: 'Cancelled' }[e.status]}</Tag>
                <span className="text-xs font-semibold text-ink-muted">{sent}/{alerts.length} texted · {e.responderCount ?? 0} responded</span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                  <div className="space-y-3 p-4">
                    {e.lastLocation ? (
                      <>
                        <div className="h-48 overflow-hidden rounded-2xl"><MapView className="h-full" me={e.lastLocation} color="#0E9F8E" /></div>
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


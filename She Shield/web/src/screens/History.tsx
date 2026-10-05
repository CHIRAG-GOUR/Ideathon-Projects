'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { limit, orderBy, query } from 'firebase/firestore';
import type { SosEvent } from '@shared/types';
import { fmtAccuracy, fmtCoord } from '@shared/geo';
import { useCheckLog, useList, useMyEvents } from '@core/data';
import { Header, Page, useApp } from '@/ctx';
import { Card, Pill, Spinner, cx } from '@/ui/kit';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false });
const TRIGGER = { sos: 'SOS', discreet: 'Discreet alert', check: 'Missed protection check' } as const;
const SMS_TEXT: Record<string, string> = { submitted: 'SMS sent', delivered: 'SMS delivered', failed: 'SMS failed', not_configured: 'Not texted automatically', not_permitted: 'SMS not allowed', skipped: 'No SMS channel', queued: 'Waiting to send', pending: 'Pending' };
const dur = (a: string, b: string | null) => {
  if (!b) return 'ongoing';
  const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export function History() {
  const { uid, demo } = useApp();
  const [tab, setTab] = useState<'sos' | 'checks' | 'shield'>('sos');
  return (
    <>
      <Header title="History" sub="Your alerts and protection activity" />
      <Page>
        <div className="flex gap-2" role="tablist">
          {(['sos', 'checks', 'shield'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('rounded-full px-4 py-2 text-sm font-bold', tab === t ? 'bg-violet-800 text-white' : 'bg-white text-ink-soft shadow-card')}>
              {{ sos: 'Alerts', checks: 'Protection checks', shield: 'Shield Mode' }[t]}
            </button>
          ))}
        </div>
        {demo || !uid ? (
          <Card><p className="text-ink-muted">History is saved to your account. Demo mode keeps nothing.</p></Card>
        ) : tab === 'sos' ? (
          <Alerts uid={uid} />
        ) : tab === 'checks' ? (
          <Checks uid={uid} />
        ) : (
          <ShieldLog uid={uid} />
        )}
      </Page>
    </>
  );
}

function Alerts({ uid }: { uid: string }) {
  const events = useMyEvents(uid);
  const [open, setOpen] = useState<string | null>(null);
  if (!events) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!events.length) return <Card><p className="text-ink-muted">No alerts yet. When you use SOS or a discreet alert, it is recorded here with its location and who was alerted.</p></Card>;
  return (
    <div className="space-y-3">
      {events.map((e: SosEvent & { trailDeleted?: boolean }) => {
        const alerts = Object.values(e.alerts ?? {});
        const sent = alerts.filter((a) => a.sms.status === 'submitted' || a.sms.status === 'delivered').length;
        const isOpen = open === e.id;
        return (
          <Card key={e.id} className="!p-0">
            <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
              <span className={cx('mt-1 h-3 w-3 shrink-0 rounded-full', e.status === 'active' || e.status === 'responding' ? 'bg-alert-500' : 'bg-violet-300')} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink">{TRIGGER[e.trigger ?? 'sos']}</p>
                <p className="text-sm text-ink-muted">{new Date(e.startedAt).toLocaleString()} · {dur(e.startedAt, e.endedAt)}</p>
                {e.area && <p className="truncate text-sm text-ink-soft">{e.area}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Pill tone={e.status === 'safe' ? 'mint' : e.status === 'cancelled' ? 'gray' : 'alert'}>{{ active: 'Active', responding: 'Responding', safe: 'Safe', cancelled: 'Cancelled' }[e.status]}</Pill>
                <span className="text-xs font-semibold text-ink-muted">{sent}/{alerts.length} texted · {e.responderCount ?? 0} responded</span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                  <div className="space-y-3 p-4">
                    {e.lastLocation ? (
                      <>
                        <div className="h-48 overflow-hidden rounded-2xl"><MapView className="h-full" me={e.lastLocation} color="#7C4DDB" /></div>
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

const CHECK_TEXT = { started: 'Protection check started', confirmed: 'You confirmed you were safe', warning: 'Reminder — no answer yet', missed: 'Check missed', escalated: 'Escalated to your contacts', stopped: 'Protection check stopped', sos: 'SOS started from a missed check' } as const;

function Checks({ uid }: { uid: string }) {
  const log = useCheckLog(uid);
  if (!log) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!log.length) return <Card><p className="text-ink-muted">No protection checks yet.</p></Card>;
  return (
    <Card>
      <ol className="space-y-3 border-l-2 border-violet-100 pl-4">
        {log.map((c) => (
          <li key={c.id} className="relative">
            <span className={cx('absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white', ['missed', 'escalated', 'sos'].includes(c.type) ? 'bg-alert-500' : c.type === 'confirmed' ? 'bg-mint-500' : c.type === 'warning' ? 'bg-amber-400' : 'bg-violet-400')} />
            <p className="font-bold text-ink">{CHECK_TEXT[c.type]}</p>
            <p className="text-xs text-ink-muted">{new Date(c.at).toLocaleString()}{c.note ? ` · ${c.note}` : ''}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ShieldLog({ uid }: { uid: string }) {
  const log = useList<{ id: string; type: 'on' | 'off'; at: string }>(`users/${uid}/shieldLog`, (c) => query(c, orderBy('at', 'desc'), limit(60)), [uid]);
  if (!log) return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>;
  if (!log.length) return <Card><p className="text-ink-muted">Shield Mode hasn&apos;t been used yet.</p></Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {log.map((l) => (
          <li key={l.id} className="flex items-center justify-between py-2.5">
            <span className="font-bold">{l.type === 'on' ? 'Turned on' : 'Turned off'}</span>
            <span className="text-sm text-ink-muted">{new Date(l.at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

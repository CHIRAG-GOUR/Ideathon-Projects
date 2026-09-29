'use client';
import { orderBy, query, limit } from 'firebase/firestore';
import type { CheckIn, SafetyTrip, SosEvent } from '@shared/types';
import { myEventsQuery, useList } from '@/lib/data';
import { Card, E3d, Pill } from '@/components/ui';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const STATUS: Record<string, { label: string; tone: 'red' | 'safe' | 'neutral' | 'warn' }> = {
  active: { label: 'SOS ACTIVE', tone: 'red' },
  responding: { label: 'HELP RESPONDING', tone: 'red' },
  safe: { label: 'SAFE', tone: 'safe' },
  cancelled: { label: 'SOS CANCELLED', tone: 'neutral' },
  arrived: { label: 'ARRIVED', tone: 'safe' },
  checked_in: { label: 'CHECKED IN', tone: 'safe' },
  overdue: { label: 'OVERDUE', tone: 'warn' },
  escalated: { label: 'CIRCLE ALERTED', tone: 'warn' },
};

export function History({ uid }: { uid: string }) {
  const events = useList<SosEvent & { trailDeleted?: boolean }>('sosEvents', myEventsQuery(uid), [uid]);
  const trips = useList<SafetyTrip>(`users/${uid}/safetyTrips`, (c) => query(c, orderBy('startedAt', 'desc'), limit(30)));
  const checks = useList<CheckIn>(`users/${uid}/checkIns`, (c) => query(c, orderBy('at', 'desc'), limit(30)));
  const empty = events?.length === 0 && trips?.length === 0 && checks?.length === 0;

  return (
    <div className="space-y-6">
      {empty && (
        <Card className="text-center">
          <E3d name="shield" size={64} className="mx-auto" />
          <p className="mt-2 font-bold">Nothing here yet</p>
          <p className="text-sm text-ink-muted">SOS events, trips and check-ins will appear here.</p>
        </Card>
      )}
      {!!events?.length && (
        <section>
          <h3 className="mb-2 font-extrabold">SOS events</h3>
          <div className="space-y-2">
            {events.map((e) => {
              const alerts = Object.values(e.alerts ?? {});
              const sent = alerts.filter((a) => a.sms.status === 'submitted' || a.sms.status === 'delivered').length;
              return (
                <Card key={e.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{fmt(e.startedAt)}</p>
                    <Pill tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label ?? e.status}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {sent}/{alerts.length} contacts texted · {e.responderCount} responded · ended {fmt(e.endedAt)}
                  </p>
                  {e.trailDeleted && <p className="mt-1 text-xs text-ink-faint">Location trail deleted by your retention setting.</p>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {!!trips?.length && (
        <section>
          <h3 className="mb-2 font-extrabold">Safe trips & timers</h3>
          <div className="space-y-2">
            {trips.map((t) => (
              <Card key={t.id}>
                <div className="flex items-center justify-between">
                  <p className="font-bold">{t.label}</p>
                  <Pill tone={STATUS[t.status]?.tone}>{STATUS[t.status]?.label ?? t.status.toUpperCase()}</Pill>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {fmt(t.startedAt)} · due {fmt(t.dueAt)}
                  {t.destination ? ` · to ${t.destination.name}` : ''}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
      {!!checks?.length && (
        <section>
          <h3 className="mb-2 font-extrabold">Check-ins</h3>
          <div className="space-y-2">
            {checks.map((c) => (
              <Card key={c.id}>
                <p className="font-bold">“{c.message}”</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {fmt(c.at)} · {c.contactIds.length} contact{c.contactIds.length === 1 ? '' : 's'}
                  {c.location ? ' · with location' : ''}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

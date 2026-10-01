'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { confirmPlan, startPlan } from '@shared/checks';
import { checks } from '@core/checks';
import { useCheckLog } from '@core/data';
import { Header, Page, useApp, type Screen } from '@/ctx';
import { Btn, Card, Chip, Dot, Label, Spinner, cx } from '@/ui/kit';
import { CountdownRing, Logo, NetworkArt } from '@/ui/art';
import { Icon, type IconName } from '@/ui/icons';
import { LOG_TEXT, LOG_TONE, STATE_LABEL, STATE_TONE, clock, useCheckView } from '@/checkui';

export function Home() {
  const { profile, user, plan, setLocalPlan, contacts, nav, readiness, demo, uid, toast } = useApp();
  const v = useCheckView(plan);
  const [busy, setBusy] = useState(false);
  const name = (profile?.name || user?.displayName || '').split(' ')[0];
  const on = v.state !== 'OFF';

  const checkIn = async () => {
    setBusy(true);
    try {
      setLocalPlan(demo ? confirmPlan(plan!) : await checks.confirm(plan!));
      toast('Checked in. Timer reset.');
    } catch (e) {
      toast(`Check-in not saved: ${(e as Error).message}`);
    }
    setBusy(false);
  };
  const quickStart = async () => {
    if (!contacts.length) return nav.go('circle');
    setBusy(true);
    try {
      const input = { label: 'Regular check-in', intervalMin: 30, graceMin: 5, policy: 'notify' as const, contactIds: contacts.filter((c) => c.role !== 'emergency').map((c) => c.id) };
      setLocalPlan(demo ? startPlan(input) : await checks.start(input));
      toast('Check-ins on — every 30 minutes.');
    } catch (e) {
      toast(`Could not start: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  return (
    <>
      <Header title={name ? `Hi, ${name}` : 'Welcome'} sub={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} right={<span className="lg:hidden"><Logo word={false} /></span>} />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card glass className={cx('relative overflow-hidden !p-6', on && v.state !== 'WAITING' && '!border-coral-100')}>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <CountdownRing progress={v.progress} tone={STATE_TONE[v.state]} size={210}>
                {on ? (
                  <>
                    <p className="text-xs font-semibold text-ink-muted">{v.nextLabel}</p>
                    <p className="text-4xl font-bold tabular-nums text-cobalt-900" aria-live="polite">{v.state === 'ESCALATED' ? '—' : clock(v.left)}</p>
                    <Chip tone={v.state === 'WAITING' ? 'teal' : 'coral'} className="mt-1">{STATE_LABEL[v.state]}</Chip>
                  </>
                ) : (
                  <>
                    <Icon name="clock" size={36} className="mx-auto text-cobalt-300" />
                    <p className="mt-1 text-sm font-semibold text-ink-muted">Check-ins off</p>
                  </>
                )}
              </CountdownRing>
              <div className="flex-1 text-center sm:text-left">
                <Label>Safety Check Network</Label>
                <h2 className="mt-1 text-2xl font-bold text-cobalt-900">
                  {!on ? 'No one is expecting a check-in' : v.state === 'WAITING' ? `${plan!.label}` : v.state === 'ESCALATED' ? 'Your circle has been alerted' : 'Are you OK? Check in now'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {!on ? 'Start check-ins and Fortiva will ask you on a schedule. If you stop answering, your circle hears about it.' : `Every ${plan!.intervalMin} min · ${plan!.graceMin} min to answer · then ${plan!.policy === 'sos' ? 'full SOS' : 'text your circle'}`}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {on ? (
                    <Btn big tone={v.state === 'WAITING' ? 'cobalt' : 'teal'} disabled={busy} onClick={checkIn}>{busy ? <Spinner /> : <Icon name="check" />}I&apos;m OK — check in</Btn>
                  ) : (
                    <Btn big disabled={busy} onClick={quickStart}>{busy && <Spinner />}{contacts.length ? 'Start · every 30 min' : 'Add your circle first'}</Btn>
                  )}
                  <Btn big tone="white" onClick={() => nav.go('checks')}>{on ? 'Details' : 'Customise'}</Btn>
                </div>
              </div>
            </div>
          </Card>

          <Card onClick={() => nav.go('circle')} className="flex items-center gap-4">
            <NetworkArt size={140} people={contacts.map((c) => ({ name: c.name, role: c.role }))} live={on} />
            <div className="min-w-0">
              <Label>Trusted Circle</Label>
              <p className="mt-1 text-xl font-bold text-cobalt-900">{contacts.length ? `${contacts.length} ${contacts.length === 1 ? 'person' : 'people'}` : 'Nobody yet'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(['primary', 'family', 'friend', 'emergency'] as const).map((r) => {
                  const n = contacts.filter((c) => c.role === r).length;
                  return n ? <Chip key={r} tone={r === 'primary' ? 'cobalt' : r === 'family' ? 'teal' : r === 'friend' ? 'lav' : 'coral'}>{n} {r}</Chip> : null;
                })}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['emergency', 'Emergency Center', 'SOS, 112, readiness', 'alert', 'from-coral-400 to-coral-600'],
              ['circle', 'Trusted Circle', 'Roles & channels', 'network', 'from-cobalt-400 to-cobalt-600'],
              ['nearby', 'Nearby Help', 'Real places near you', 'pin', 'from-teal-400 to-teal-600'],
              ['journal', 'Incident Journal', 'Private dated notes', 'book', 'from-lav-400 to-lav-600'],
            ] as [Screen, string, string, IconName, string][]
          ).map(([s, t, d, ic, g], i) => (
            <motion.button key={s} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileTap={{ scale: 0.97 }} onClick={() => nav.go(s)} className="rounded-4xl border border-line bg-white p-4 text-left shadow-soft">
              <span className={cx('grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white', g)}><Icon name={ic} /></span>
              <p className="mt-3 font-bold text-ink">{t}</p>
              <p className="text-xs text-ink-muted">{d}</p>
            </motion.button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <Label>Safety readiness</Label>
              <span className="text-sm font-semibold text-ink-muted">{readiness.score}/{readiness.total}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {readiness.items.map((i) => (
                <span key={i.key} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft" title={i.detail}>
                  <Dot state={i.state} />{i.key === 'battery' ? `Battery ${i.detail.includes('%') ? i.detail.split(' ·')[0] : '?'}` : i.label.replace(' permission', '')}
                </span>
              ))}
            </div>
            <button onClick={() => nav.go('emergency')} className="mt-3 text-sm font-semibold text-cobalt-700">Fix in Emergency Center →</button>
          </Card>
          {uid && <RecentChecks uid={uid} />}
        </div>
      </Page>
    </>
  );
}

function RecentChecks({ uid }: { uid: string }) {
  const log = useCheckLog(uid, 5);
  const { nav } = useApp();
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Label>Recent check-ins</Label>
        <button onClick={() => nav.go('history')} className="text-sm font-semibold text-cobalt-700">History →</button>
      </div>
      {!log?.length ? (
        <p className="mt-2 text-sm text-ink-muted">No check-ins yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {log.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2">
              <Dot state={LOG_TONE[l.type] === 'teal' ? 'ok' : LOG_TONE[l.type] === 'coral' ? 'failed' : LOG_TONE[l.type] === 'amber' ? 'warn' : 'available'} />
              <span className="flex-1 text-sm font-medium">{LOG_TEXT[l.type]}</span>
              <span className="text-xs text-ink-muted">{new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

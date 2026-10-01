'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { CheckState, EscalationPolicy } from '@shared/types';
import { confirmPlan, startPlan, stopPlan } from '@shared/checks';
import { checks } from '@core/checks';
import { useCheckLog } from '@core/data';
import { hasNative } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Chip, Field, Label, Segmented, Spinner, cx, inputCls } from '@/ui/kit';
import { CountdownRing, roleColor } from '@/ui/art';
import { Icon } from '@/ui/icons';
import { LOG_TEXT, LOG_TONE, STATE_LABEL, STATE_TONE, clock, useCheckView } from '@/checkui';

const PRESETS = ['Working late', 'Home alone', 'Meeting someone new', 'Night out', 'Feeling unwell'];
const STEPS: { s: CheckState; t: string; d: string }[] = [
  { s: 'WAITING', t: 'On schedule', d: 'Timer running. Check in any time to reset it.' },
  { s: 'DUE', t: 'Are you OK?', d: 'Fortiva asks you to check in.' },
  { s: 'WARNING', t: 'Reminder', d: 'No answer — asked again, louder.' },
  { s: 'ESCALATED', t: 'Circle alerted', d: 'Still no answer — your chosen people are alerted.' },
];

export function CheckNetwork() {
  const { plan, uid } = useApp();
  const v = useCheckView(plan);
  return (
    <>
      <Header title="Safety Check Network" sub="Scheduled check-ins. Silence becomes a signal to your circle." back />
      <Page>
        <AnimatePresence mode="wait" initial={false}>
          {v.state === 'OFF' ? <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Setup /></motion.div> : <motion.div key="live" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Live /></motion.div>}
        </AnimatePresence>
        {uid && <Timeline uid={uid} />}
      </Page>
    </>
  );
}

function Setup() {
  const { contacts, demo, setLocalPlan, toast, nav } = useApp();
  const [label, setLabel] = useState(PRESETS[0]);
  const [interval, setIntervalMin] = useState(30);
  const [grace, setGrace] = useState(5);
  const [policy, setPolicy] = useState<EscalationPolicy>('notify');
  const [ids, setIds] = useState<string[]>(() => contacts.filter((c) => c.role === 'primary' || c.role === 'family').map((c) => c.id));
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const chosen = ids.length ? ids : contacts.map((c) => c.id);
    if (!chosen.length) return toast('Add someone to your Trusted Circle first.');
    setBusy(true);
    try {
      const input = { label: label.trim().slice(0, 60) || 'Check-in', intervalMin: interval, graceMin: grace, policy, contactIds: chosen };
      setLocalPlan(demo ? startPlan(input) : await checks.start(input));
      toast(`Check-ins on — every ${interval} min.`);
    } catch (e) {
      toast(`Could not start: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <Label>New check-in schedule</Label>
        <fieldset className="mt-3">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">What&apos;s it for?</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={label === p} onClick={() => setLabel(p)} className={cx('rounded-full px-3.5 py-2 text-sm font-semibold', label === p ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700')}>{p}</button>
            ))}
          </div>
          <div className="mt-3"><Field label="Or name it"><input className={inputCls} maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} /></Field></div>
        </fieldset>
        <Segmented label="Ask me every" value={interval} onChange={setIntervalMin} options={[[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], [120, '2 h'], [240, '4 h']]} />
        <Segmented label="Time to answer (then a reminder, then escalation)" value={grace} onChange={setGrace} options={[[2, '2 min'], [5, '5 min'], [10, '10 min'], [15, '15 min']]} />
        <Segmented label="If I still don't answer" value={policy} onChange={setPolicy} options={[['notify', 'Text my circle'], ['sos', 'Start a full SOS']]} />
        {policy === 'sos' && !hasNative() && <p className="mt-2 text-xs font-medium text-amber-700">A full SOS can only start on the Android app. From a browser, Fortiva&apos;s server texts your circle instead (if server SMS is set up).</p>}
      </Card>
      <Card>
        <Label>Who gets alerted</Label>
        {contacts.length === 0 ? (
          <div className="mt-3">
            <p className="text-sm text-ink-muted">Your Trusted Circle is empty.</p>
            <Btn className="mt-3" onClick={() => nav.go('circle')}>Add people</Btn>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {contacts.map((c) => {
              const on = ids.includes(c.id);
              return (
                <li key={c.id}>
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => setIds(on ? ids.filter((x) => x !== c.id) : [...ids, c.id])} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: roleColor(c.role) }}>{c.name.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.name}</span><span className="text-xs capitalize text-ink-muted">{c.role}{c.channels.sms ? ' · SMS' : ''}</span></span>
                    <span className={cx('grid h-6 w-6 place-items-center rounded-full border-2', on ? 'border-teal-500 bg-teal-500 text-white' : 'border-line')}>{on && <Icon name="check" size={14} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">Escalation texts include your last known location. Only people you tick are messaged.</p>
        <Btn big className="mt-4 w-full" disabled={busy || !contacts.length} onClick={start}>{busy && <Spinner />}Start check-ins</Btn>
      </Card>
    </div>
  );
}

function Live() {
  const { plan, setLocalPlan, demo, toast, contacts } = useApp();
  const v = useCheckView(plan);
  const [busy, setBusy] = useState<string | null>(null);
  const run = (k: string, fn: () => Promise<unknown>, ok: string) => async () => {
    setBusy(k);
    try {
      await fn();
      toast(ok);
    } catch (e) {
      toast(`Not saved: ${(e as Error).message}`);
    }
    setBusy(null);
  };
  const confirm = run('c', async () => setLocalPlan(demo ? confirmPlan(plan!) : await checks.confirm(plan!)), 'Checked in. Timer reset.');
  const stop = run('s', async () => setLocalPlan(demo ? stopPlan(plan!) : await checks.stop(plan!)), 'Check-ins stopped.');
  const idx = STEPS.findIndex((s) => s.s === v.state);
  const who = contacts.filter((c) => plan!.contactIds.includes(c.id));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card glass className="flex flex-col items-center !p-6 text-center">
        <Chip tone="lav">{plan!.label}</Chip>
        <div className="my-4">
          <CountdownRing progress={v.progress} tone={STATE_TONE[v.state]} size={240}>
            <p className="text-sm font-semibold text-ink-muted">{v.nextLabel}</p>
            <p className="text-5xl font-bold tabular-nums text-cobalt-900" aria-live="polite">{v.state === 'ESCALATED' ? '—' : clock(v.left)}</p>
            <p className={cx('mt-1 text-sm font-bold', v.state === 'WAITING' ? 'text-teal-600' : 'text-coral-600')}>{STATE_LABEL[v.state]}</p>
          </CountdownRing>
        </div>
        <Btn big tone={v.state === 'WAITING' ? 'cobalt' : 'teal'} className="w-full max-w-sm" disabled={!!busy} onClick={confirm}>{busy === 'c' ? <Spinner /> : <Icon name="check" />}I&apos;m OK — check in</Btn>
        <button onClick={stop} disabled={!!busy} className="mt-3 text-sm font-semibold text-ink-muted">Stop check-ins</button>
        {plan!.escalatedBy && <p className="mt-2 text-xs font-semibold text-coral-600">Escalated by {plan!.escalatedBy === 'server' ? "Fortiva's server (your phone did not report in)" : 'your phone'}.</p>}
      </Card>
      <Card>
        <Label>How it works now</Label>
        <ol className="mt-3 space-y-1">
          {STEPS.map((s, i) => (
            <li key={s.s} className={cx('flex gap-3 rounded-3xl p-3 transition-colors', i === idx && (i === 0 ? 'bg-teal-50' : 'bg-coral-50'))}>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold', i < idx ? 'bg-ink-faint text-white' : i === idx ? (i === 0 ? 'bg-teal-500 text-white' : 'bg-coral-500 text-white') : 'bg-paper-200 text-ink-muted')}>{i + 1}</span>
              <span>
                <span className="block font-semibold text-ink">{s.t}</span>
                <span className="block text-sm text-ink-muted">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
          <p>Every <b>{plan!.intervalMin} min</b> · <b>{plan!.graceMin} min</b> to answer · then <b>{plan!.policy === 'sos' ? 'full SOS' : 'text circle'}</b></p>
          <p className="mt-1">Alerts: {who.length ? who.map((c) => c.name).join(', ') : 'nobody selected'}</p>
          <p className="mt-2 text-xs text-ink-muted">{hasNative() ? 'Your phone runs this schedule even offline; prompts appear as notifications. Fortiva’s server is the backup if your phone goes silent.' : 'In a browser, Fortiva’s server keeps this schedule and escalates by server SMS if it is set up. For prompts and SMS from your own SIM, use the Android app.'}</p>
        </div>
      </Card>
    </div>
  );
}

function Timeline({ uid }: { uid: string }) {
  const log = useCheckLog(uid, 40);
  return (
    <Card>
      <Label>Check-in timeline</Label>
      {!log ? (
        <p className="mt-2 flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>
      ) : !log.length ? (
        <p className="mt-2 text-sm text-ink-muted">Your check-ins will appear here.</p>
      ) : (
        <ol className="relative mt-4 space-y-4 pl-6 before:absolute before:bottom-1 before:left-[7px] before:top-1 before:w-0.5 before:bg-cobalt-100">
          {log.map((l, i) => (
            <motion.li key={l.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="relative">
              <span className={cx('absolute -left-6 top-1 h-4 w-4 rounded-full border-[3px] border-white', { teal: 'bg-teal-500', amber: 'bg-amber-400', coral: 'bg-coral-500', cobalt: 'bg-cobalt-500', gray: 'bg-ink-faint' }[LOG_TONE[l.type]])} />
              <p className="font-semibold text-ink">{LOG_TEXT[l.type]}{(l as { by?: string }).by === 'server' && <span className="ml-2 text-xs font-medium text-ink-muted">by server</span>}</p>
              <p className="text-xs text-ink-muted">{new Date(l.at).toLocaleString()}{l.note ? ` · ${l.note}` : ''}</p>
            </motion.li>
          ))}
        </ol>
      )}
    </Card>
  );
}

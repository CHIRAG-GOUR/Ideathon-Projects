'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { limit, orderBy, query } from 'firebase/firestore';
import type { CheckState, EscalationPolicy } from '@shared/types';
import { checkState, confirmPlan, nextTransition, startPlan, stopPlan } from '@shared/checks';
import { fmtAccuracy } from '@shared/geo';
import { checks } from '@core/checks';
import { useCheckLog, useList } from '@core/data';
import { hasNative } from '@core/native';
import { nearbyHelp, type HelpPlace } from '@core/places';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Dot, Eyebrow, Pill, Spinner, cx } from '@/ui/kit';
import { ShieldRings } from '@/ui/art';
import { HoldPill } from '@/ui/HoldPill';
import { Icon } from '@/ui/icons';

const STATE_TEXT: Record<CheckState, string> = { OFF: 'Off', WAITING: 'On schedule', DUE: 'Are you safe? Answer now', WARNING: 'Second reminder — answer now', ESCALATED: 'Missed — your contacts were alerted' };
const KIND_EMOJI: Record<HelpPlace['kind'], string> = { police: '🚓', hospital: '🏥', pharmacy: '💊', fire: '🚒' };

function useNow(ms = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => set(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function ShieldMode() {
  const { shield, readiness, contacts, startSos, nav, uid } = useApp();
  const fixAge = shield.fix ? Date.now() - Date.parse(shield.fix.timestamp) : null;
  const ch = (k: 'sms' | 'whatsapp' | 'live') => contacts.filter((c) => c.channels[k]).length;

  return (
    <>
      <Header title="Shield Mode" sub="Proactive protection — ready before you need it" back />
      <Page>
        <Card className={cx('relative overflow-hidden !p-6', shield.on ? 'bg-gradient-to-br from-violet-800 via-violet-700 to-plum-600 !border-transparent text-white' : '')}>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className={cx('rounded-full', shield.on && 'bg-white/10')}><ShieldRings on={shield.on} size={170} /></div>
            <div className="flex-1 text-center sm:text-left">
              <p className={cx('text-[11px] font-extrabold uppercase tracking-[0.16em]', shield.on ? 'text-white/70' : 'text-violet-600')}>Protection state</p>
              <h2 className="mt-1 text-3xl font-extrabold">{shield.on ? 'Shield is on' : 'Shield is off'}</h2>
              <p className={cx('mt-1.5 text-sm', shield.on ? 'text-white/85' : 'text-ink-muted')}>
                {hasNative()
                  ? 'Keeps GPS warm and She Shield running with a protection notification, so an SOS sends a precise location instantly — even from the notification.'
                  : 'Keeps your location ready while this page is open, so an SOS sends a precise location instantly. For background protection use the Android app.'}
              </p>
              <Btn big tone={shield.on ? 'white' : 'violet'} className="mt-4 w-full sm:w-auto" onClick={() => shield.set(!shield.on)}>
                <Icon name="shield" />
                {shield.on ? 'Turn off Shield Mode' : 'Turn on Shield Mode'}
              </Btn>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Eyebrow>Readiness right now</Eyebrow>
            <ul className="mt-2 divide-y divide-line">
              <Row state={contacts.length ? 'ok' : 'off'} label="Contacts" detail={contacts.length ? `${contacts.length} · SMS ${ch('sms')} · WhatsApp ${ch('whatsapp')} · live link ${ch('live')}` : 'None — add a trusted contact'} onFix={!contacts.length ? () => nav.go('contacts') : undefined} />
              <Row
                state={shield.fix ? ((shield.fix.accuracy ?? 999) <= 50 && (fixAge ?? 0) < 120_000 ? 'ok' : 'warn') : shield.on ? 'unknown' : 'off'}
                label="Location"
                detail={shield.fix ? `${fmtAccuracy(shield.fix.accuracy)} · ${Math.round((fixAge ?? 0) / 1000)} s ago` : shield.on ? 'Waiting for a fix…' : 'Kept ready when Shield Mode is on'}
              />
              {readiness.items.filter((i) => ['gps', 'network', 'battery', 'sms', 'notifications'].includes(i.key)).map((i) => (
                <Row key={i.key} state={i.state} label={i.label} detail={i.detail} />
              ))}
            </ul>
            <button onClick={() => nav.go('ready')} className="mt-2 text-sm font-bold text-violet-700">Fix readiness issues →</button>
          </Card>

          <div className="space-y-4">
            <Card>
              <Eyebrow>Quick shield</Eyebrow>
              <div className="mt-3 grid gap-3">
                <Btn big tone="alert" className="w-full" onClick={() => startSos('sos')}>
                  <Icon name="alert" /> Start SOS now
                </Btn>
                <p className="-mt-1 text-xs text-ink-muted">One tap from Shield Mode — you already chose protection. Siren, location and alerts start immediately.</p>
                <HoldPill label="Discreet alert" hint="Hold 2 s · silent — no siren or sound" onComplete={() => startSos('discreet')} />
                {hasNative() && <p className="text-xs text-ink-muted">Tip: with the app open, press volume-down 4 times quickly to send a discreet alert (turn it on in Settings).</p>}
              </div>
            </Card>
            <ProtectionCheck />
          </div>
        </div>

        <NearbyPreview />
        {uid && <Activity uid={uid} />}
      </Page>
    </>
  );
}

function Row({ state, label, detail, onFix }: { state: 'ok' | 'warn' | 'off' | 'unknown'; label: string; detail: string; onFix?: () => void }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Dot state={state} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{detail}</p>
      </div>
      {onFix && <button onClick={onFix} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-800">Fix</button>}
    </li>
  );
}

/** "Are you safe?" every N minutes; no answer → reminder → the chosen escalation. */
function ProtectionCheck() {
  const { plan, setLocalPlan, contacts, demo, toast } = useApp();
  const now = useNow();
  const [interval, setIntervalMin] = useState(30);
  const [grace, setGrace] = useState(5);
  const [policy, setPolicy] = useState<EscalationPolicy>('notify');
  const [busy, setBusy] = useState(false);
  const state = checkState(plan, now);
  const next = plan ? nextTransition(plan, now) : null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message || 'Could not update the protection check.');
    }
    setBusy(false);
  };
  const start = () =>
    run(async () => {
      if (!contacts.length) throw new Error('Add a trusted contact first — escalation needs someone to alert.');
      const input = { label: 'Protection check', intervalMin: interval, graceMin: grace, policy, contactIds: contacts.map((c) => c.id) };
      setLocalPlan(demo ? startPlan(input) : await checks.start(input));
      toast(`Protection check on — every ${interval} min.`);
    });
  const confirm = () => run(async () => (setLocalPlan(demo ? confirmPlan(plan!) : await checks.confirm(plan!)), toast('Thanks — timer reset.')));
  const stop = () => run(async () => setLocalPlan(demo ? stopPlan(plan!) : await checks.stop(plan!)));

  return (
    <Card className={cx(state === 'DUE' || state === 'WARNING' ? '!border-alert-500 ring-4 ring-alert-50' : '')}>
      <div className="flex items-center justify-between">
        <Eyebrow>Protection check</Eyebrow>
        <Pill tone={state === 'OFF' ? 'gray' : state === 'WAITING' ? 'mint' : 'alert'}>{STATE_TEXT[state]}</Pill>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {state === 'OFF' ? (
          <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="mt-2 text-sm text-ink-muted">She Shield asks “Are you safe?” on a schedule. If you don&apos;t answer, it reminds you once, then acts.</p>
            <Choice label="Ask me every" value={interval} set={setIntervalMin} options={[[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']]} />
            <Choice label="Time to answer" value={grace} set={setGrace} options={[[2, '2 min'], [5, '5 min'], [10, '10 min']]} />
            <Choice label="If I still don't answer" value={policy} set={setPolicy} options={[['notify', 'Text my contacts'], ['sos', 'Start a full SOS']]} />
            <Btn className="mt-4 w-full" onClick={start} disabled={busy}>{busy && <Spinner />}Start protection check</Btn>
          </motion.div>
        ) : (
          <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold text-ink-muted">{state === 'WAITING' ? 'Next check in' : state === 'ESCALATED' ? 'Escalated' : next?.state === 'WARNING' ? 'Reminder in' : 'Escalation in'}</p>
                <p className="text-4xl font-extrabold tabular-nums text-violet-900" aria-live="polite">{state === 'ESCALATED' ? '—' : next ? mmss((state === 'WAITING' ? Date.parse(plan!.nextDueAt!) : next.at) - now) : '—'}</p>
              </div>
              <p className="text-right text-xs text-ink-muted">Every {plan!.intervalMin} min · {plan!.graceMin} min to answer<br />Then: {plan!.policy === 'sos' ? 'full SOS' : 'text contacts'}</p>
            </div>
            <Btn big tone={state === 'WAITING' ? 'soft' : 'mint'} className="mt-4 w-full" onClick={confirm} disabled={busy}>
              <Icon name="check" /> {state === 'WAITING' ? "I'm safe — reset timer" : "I'm safe"}
            </Btn>
            <button onClick={stop} disabled={busy} className="mt-2 w-full py-2 text-sm font-bold text-ink-muted">Stop protection check</button>
            {plan!.escalatedBy && <p className="text-xs font-semibold text-alert-600">Escalated by {plan!.escalatedBy === 'server' ? 'the She Shield server (phone did not report)' : 'your phone'}.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Choice<T extends string | number>({ label, value, set, options }: { label: string; value: T; set: (v: T) => void; options: [T, string][] }) {
  return (
    <fieldset className="mt-3">
      <legend className="mb-1.5 text-xs font-bold text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, t]) => (
          <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => set(v)} className={cx('rounded-full px-3.5 py-2 text-sm font-bold transition-colors', v === value ? 'bg-violet-800 text-white' : 'bg-violet-50 text-violet-800')}>
            {t}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function NearbyPreview() {
  const { shield, nav } = useApp();
  const [places, setPlaces] = useState<HelpPlace[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fix = shield.fix;
  useEffect(() => {
    if (!fix || places) return;
    nearbyHelp(fix.latitude, fix.longitude, 3000).then((p) => setPlaces(p.slice(0, 3)), (e: Error) => setErr(e.message));
  }, [fix, places]);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Nearby resources</Eyebrow>
        <button onClick={() => nav.go('nearby')} className="text-sm font-bold text-violet-700">See all →</button>
      </div>
      {!fix ? (
        <p className="mt-2 text-sm text-ink-muted">{shield.on ? 'Waiting for your location…' : 'Turn on Shield Mode or open Nearby help to load places around you.'}</p>
      ) : err ? (
        <p className="mt-2 text-sm font-semibold text-amber-700">{err}</p>
      ) : !places ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Spinner /> Finding places from OpenStreetMap…</p>
      ) : places.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">No police, hospital or pharmacy listed within 3 km on OpenStreetMap.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {places.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="text-xl" aria-hidden>{KIND_EMOJI[p.kind]}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
              <span className="text-sm font-semibold text-ink-muted">{p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1)} km`}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Activity({ uid }: { uid: string }) {
  const shieldLog = useList<{ id: string; type: 'on' | 'off'; at: string }>(`users/${uid}/shieldLog`, (c) => query(c, orderBy('at', 'desc'), limit(6)), [uid]);
  const checkLog = useCheckLog(uid, 6);
  const items = [
    ...(shieldLog ?? []).map((s) => ({ id: s.id, at: s.at, text: s.type === 'on' ? 'Shield Mode turned on' : 'Shield Mode turned off', tone: 'violet' })),
    ...(checkLog ?? []).map((c) => ({ id: c.id, at: c.at, text: { started: 'Protection check started', confirmed: 'You confirmed you were safe', warning: 'Reminder sent', missed: 'Check missed', escalated: 'Escalated to your contacts', stopped: 'Protection check stopped', sos: 'SOS started from a check' }[c.type], tone: ['missed', 'escalated', 'sos'].includes(c.type) ? 'alert' : 'mint' })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  return (
    <Card>
      <Eyebrow>Recent activity</Eyebrow>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nothing yet.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l-2 border-violet-100 pl-4">
          {items.map((i) => (
            <li key={i.id} className="relative">
              <span className={cx('absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white', i.tone === 'alert' ? 'bg-alert-500' : i.tone === 'mint' ? 'bg-mint-500' : 'bg-violet-500')} />
              <p className="font-bold text-ink">{i.text}</p>
              <p className="text-xs text-ink-muted">{new Date(i.at).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

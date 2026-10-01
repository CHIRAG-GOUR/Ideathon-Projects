'use client';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ChannelState, SosMachine } from '@shared/sos';
import type { EmergencyContact } from '@shared/types';
import type { RegionConfig } from '@shared/emergency';
import { accuracyLabel, fmtAccuracy, fmtCoord } from '@shared/geo';
import { dial, hasNative, onNative, openEmail, openWhatsApp, smsUrl } from '@core/native';
import { Btn, Card, Dot, Eyebrow, Sheet, cx } from '@/ui/kit';
import { SosControl } from '@/ui/SosControl';
import { ShieldRings } from '@/ui/art';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-violet-50" /> });

interface Props {
  sos: SosMachine;
  trigger: 'sos' | 'discreet' | 'check';
  region: RegionConfig;
  contacts: EmergencyContact[];
  demo: boolean;
  messageFor: (contactId?: string) => string;
  onEndHold: () => void;
  onKeep: () => void;
  onResolve: (o: 'safe' | 'cancelled') => void;
  onSilence: () => void;
  onDone: () => void;
}

const MARK: Record<ChannelState, string> = { ok: '✓', pending: '…', failed: '✕', queued: '○', available: '○', off: '–' };

export function Emergency(p: Props) {
  const { sos, region, contacts, demo } = p;
  const [opened, setOpened] = useState<Record<string, string>>({});
  useEffect(() => onNative((e) => e.type === 'sos_whatsapp' && e.state === 'queued' && setOpened((o) => ({ ...o, [`wa-${e.id}`]: 'WhatsApp opened' }))), []);
  const loc = sos.location;
  const q = accuracyLabel(loc);
  const alerted = sos.contacts.filter((c) => c.state === 'ok').length;
  const discreet = p.trigger === 'discreet';

  if (sos.phase === 'SAFE' || sos.phase === 'CANCELLED') {
    return (
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-screen place-items-center bg-pearl px-6 text-center">
        <div>
          <ShieldRings on size={200} />
          <h1 className="mt-2 text-3xl font-extrabold text-violet-900">{sos.phase === 'SAFE' ? "You're safe" : 'SOS cancelled'}</h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-muted">Live location sharing has stopped. {alerted > 0 && 'Contacts who were texted are being told.'}</p>
          <Btn big className="mt-8 w-full max-w-xs" onClick={p.onDone}>Back to She Shield</Btn>
        </div>
      </motion.main>
    );
  }

  const rows: { label: string; state: ChannelState; text: string }[] = [
    { label: discreet ? 'Silent alert' : 'SOS', state: 'ok', text: 'ACTIVE' },
    { label: 'Location', state: loc ? (q === 'good' ? 'ok' : 'queued') : sos.locationState === 'failed' ? 'failed' : 'pending', text: loc ? (q === 'last_known' ? 'LAST KNOWN' : q === 'limited' ? `APPROXIMATE ${fmtAccuracy(loc.accuracy)}` : `LIVE ${fmtAccuracy(loc.accuracy)}`) : sos.locationState === 'failed' ? 'UNAVAILABLE' : 'LOCATING…' },
    ...sos.contacts.map((c) => ({ label: c.name, state: c.state, text: c.detail.toUpperCase() })),
    { label: 'Live location link', state: sos.live, text: sos.live === 'ok' ? 'SHARING' : sos.live === 'queued' ? 'WAITING FOR NETWORK' : sos.live === 'off' ? 'OFF' : sos.live === 'failed' ? 'NOT SHARED' : 'STARTING…' },
    { label: 'Cloud', state: sos.cloud, text: sos.cloud === 'ok' ? 'SYNCED' : sos.cloud === 'queued' ? 'SAVED ON PHONE · WILL SYNC' : sos.cloud === 'off' ? 'NOT SIGNED IN' : sos.cloud === 'failed' ? 'FAILED · RETRYING' : 'SYNCING…' },
  ];
  const phones = contacts.filter((c) => c.phone);
  const emails = contacts.filter((c) => c.email && c.channels.email).map((c) => c.email!);

  return (
    <main className={cx('min-h-screen pb-14', discreet ? 'bg-pearl' : 'bg-gradient-to-b from-alert-50 via-pearl to-pearl')}>
      <motion.header initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }} className={cx('rounded-b-4xl px-5 pb-6 pt-[max(env(safe-area-inset-top),1.2rem)]', discreet ? 'bg-violet-50 text-violet-900' : 'bg-gradient-to-br from-alert-500 via-alert-600 to-violet-800 text-white shadow-alert')}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <motion.span className={cx('h-2.5 w-2.5 rounded-full', discreet ? 'bg-violet-600' : 'bg-white')} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            {sos.network === 'offline' ? 'OFFLINE — PHONE ACTIONS CONTINUE' : 'LIVE'}
          </span>
          {!discreet && <button onClick={p.onSilence} className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">Silence siren</button>}
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight" aria-live="assertive">{discreet ? 'Silent alert active' : p.trigger === 'check' ? 'SOS — missed check' : 'SOS ACTIVE'}</h1>
        <p className={cx('mt-1.5 font-semibold', discreet ? 'text-ink-muted' : 'text-white/90')}>
          {alerted > 0 ? `${alerted} contact${alerted > 1 ? 's' : ''} alerted.` : sos.phase === 'LOCATING' ? 'Getting your location…' : sos.phase === 'OFFLINE' ? 'No internet — texts go out by SMS.' : 'Alerting your contacts…'}
        </p>
        <AnimatePresence>
          {sos.responders.length > 0 && (
            <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 rounded-2xl bg-white px-4 py-2.5 font-bold text-mint-600">
              {sos.responders.join(', ')} {sos.responders.length > 1 ? 'are' : 'is'} responding.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <Btn big tone="dark" className="w-full !min-h-[64px] text-xl" onClick={() => !demo && dial(region.primary.number)}>Call {region.primary.number}</Btn>

        <Card>
          <Eyebrow>{q === 'last_known' ? 'Last known location' : 'Your location'}</Eyebrow>
          {loc ? (
            <div className="mt-2 grid grid-cols-2 gap-3 tabular-nums">
              {[['Latitude', fmtCoord(loc.latitude)], ['Longitude', fmtCoord(loc.longitude)], ['Accuracy', fmtAccuracy(loc.accuracy)], ['Time', new Date(loc.timestamp).toLocaleTimeString()]].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{k}</p>
                  <p className={cx('text-xl font-extrabold', k === 'Accuracy' && q !== 'good' ? 'text-amber-600' : 'text-ink')}>{v}</p>
                </div>
              ))}
              {q === 'limited' && <p className="col-span-2 text-sm font-semibold text-amber-600">Location is approximate — using the best available position.</p>}
              {q === 'last_known' && <p className="col-span-2 text-sm font-semibold text-amber-600">Last known position, not current. Still trying for a fresh one.</p>}
            </div>
          ) : (
            <p className="mt-2 font-semibold text-ink-muted">{sos.locationState === 'failed' ? 'Location unavailable. Turn on Location — the phone keeps trying.' : 'Getting the best available location…'}</p>
          )}
        </Card>

        {loc && (
          <div className="h-56 overflow-hidden rounded-4xl border border-line shadow-card">
            <MapView className="h-full" me={loc} color="#7C4DDB" pulse />
          </div>
        )}

        <Card>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 font-bold text-ink"><Dot state={r.state} />{r.label}</span>
                <span className="text-right text-[11px] font-extrabold tracking-wide text-ink-soft"><span aria-hidden>{MARK[r.state]} </span>{r.text}</span>
              </li>
            ))}
          </ul>
          {demo && <p className="mt-2 text-xs font-bold text-ink">DEMONSTRATION ONLY — nothing was sent.</p>}
        </Card>

        {(phones.length > 0 || emails.length > 0) && (
          <Card>
            <p className="font-extrabold text-ink">Send from your own apps</p>
            <p className="text-xs text-ink-muted">{hasNative() ? 'SMS goes automatically. WhatsApp and email open ready — tap Send.' : 'In a browser, each opens ready to send — tap Send.'}</p>
            <ul className="mt-2 divide-y divide-line">
              {phones.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="font-bold">{c.name}</span>
                  <span className="flex gap-2">
                    {!hasNative() && <a href={smsUrl([c.phone!], p.messageFor(c.id))} className="rounded-full bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-800">Text</a>}
                    <button disabled={demo} onClick={() => (openWhatsApp(c.phone!, p.messageFor(c.id)), setOpened((o) => ({ ...o, [`wa-${c.id}`]: 'WhatsApp opened' })))} className={cx('rounded-full px-3 py-2 text-xs font-extrabold', opened[`wa-${c.id}`] ? 'bg-mint-50 text-mint-600' : 'bg-[#25D366] text-white')}>
                      {opened[`wa-${c.id}`] ? 'WhatsApp opened ✓' : 'WhatsApp'}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {emails.length > 0 && (
              <Btn tone="white" className="mt-2 w-full" disabled={demo} onClick={() => (openEmail(emails, '🆘 SOS — I need help', p.messageFor()), setOpened((o) => ({ ...o, email: '1' })))}>
                {opened.email ? 'Email opened ✓ — tap Send' : `Email ${emails.length} contact${emails.length > 1 ? 's' : ''}`}
              </Btn>
            )}
          </Card>
        )}

        <div className="flex flex-col items-center pt-3">
          <SosControl tone="dark" label="END" sub="Hold 3 s to end" size={150} onComplete={p.onEndHold} />
          <p className="mt-1 text-center text-sm text-ink-muted">Ending needs a 3-second hold, so it can&apos;t happen by accident.</p>
        </div>
        <p className="text-center text-xs text-ink-muted">She Shield has not contacted the police for you. Call {region.primary.number} for emergency services.</p>
      </div>

      <Sheet open={sos.phase === 'RESOLVING'} onClose={p.onKeep} title="Are you safe?">
        <div className="grid gap-3">
          <Btn big tone="mint" onClick={() => p.onResolve('safe')}>I&apos;m safe</Btn>
          <Btn big tone="alert" onClick={p.onKeep}>Keep SOS active</Btn>
          <button className="py-2 text-sm font-bold text-ink-muted" onClick={() => p.onResolve('cancelled')}>It was a false alarm — cancel</button>
        </div>
      </Sheet>
    </main>
  );
}


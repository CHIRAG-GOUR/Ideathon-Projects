'use client';
/**
 * EmergencyCommandCenter — the whole interface after SOS: a focused command center. A pulse travels
 * SOS → Location → Health → Response; status tiles morph as real results arrive; contacts, broadcast channels,
 * radar, medical context, guidance and emergency services are one screen away. Navigation is hidden.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dial, hasNative, openWhatsApp, smsUrl } from '@core/native';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { BottomSheet, Btn, Honest, StatusChip, cx, type Status } from '@/ui/kit';
import { Mark } from '@/ui/brand';
import { useNow, fmtEta, fmtKm } from '@/services/georadar/radar';
import { DEFAULT_SCOPE, createVaultLink } from '@/services/health/vault';
import { sound } from '@/services/sound';
import { RadarView } from './RadarView';
import { BroadcastStatus } from './BroadcastStatus';
import { EmergencyTimeline, type TimelineItem } from './EmergencyTimeline';
import { MedicalAccessToken, MedicalSummary } from './HealthVault';
import { AIGuidance } from './AIGuidance';
import { EmergencyServicesList } from './EmergencyServices';

const hhmmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function EmergencyCommandCenter({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const { sos, demo, contacts, radar, medical, lines, prefs, toast } = app;
  const s = sos.state;
  const reduce = useReducedMotion();
  const now = useNow(1000);
  const [sheet, setSheet] = useState<'guidance' | 'vault' | 'services' | null>(null);
  const [wa, setWa] = useState<Record<string, boolean>>({});
  const [vaultLink, setVaultLink] = useState<boolean>(() => { try { return !!sessionStorage.getItem('lifelinehub.vaultLink'); } catch { return false; } });
  const elapsed = s.startedAt ? now - Date.parse(s.startedAt) : 0;
  const ended = s.phase === 'SAFE' || s.phase === 'CANCELLED';

  // SOS start: emergency tone; optional automatic responder link (setting).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !s.sosId) return;
    started.current = true;
    sound.unlock();
    sound.activate();
    if (prefs.autoVaultLink && !demo && !vaultLink) {
      createVaultLink(DEFAULT_SCOPE, prefs.vaultLinkMinutes, 'sos')
        .then((r) => { try { sessionStorage.setItem('lifelinehub.vaultLink', JSON.stringify(r)); } catch { /* */ } setVaultLink(true); })
        .catch(() => undefined);
    }
  }, [s.sosId, prefs, demo, vaultLink]);

  const okContacts = s.contacts.filter((c) => c.state === 'ok').length;
  const hosp = radar.points?.find((p) => p.kind === 'hospital');
  const amb = radar.points?.find((p) => p.kind === 'ambulance');
  const helper = radar.points?.find((p) => p.kind === 'helper' && p.status === 'responding');
  const locLocked = s.locationState === 'ok' && !!s.location;

  // the pulse chain: SOS → Location → Health → Response
  const chain: { k: string; label: string; icon: IconName; on: boolean }[] = [
    { k: 'sos', label: 'SOS', icon: 'sos', on: true },
    { k: 'loc', label: 'Location', icon: 'location', on: locLocked },
    { k: 'health', label: 'Health', icon: 'vault', on: !!medical },
    { k: 'resp', label: 'Response', icon: 'ambulance', on: okContacts > 0 },
  ];

  const tiles: { k: string; icon: IconName; label: string; value: string; status: Status; statusLabel: string; onClick?: () => void; simulated?: boolean }[] = [
    { k: 'loc', icon: 'location', label: 'Location', value: locLocked ? `±${Math.round(s.location!.accuracy ?? 20)} m` : s.locationState === 'failed' ? 'Unavailable' : 'Acquiring…', status: locLocked ? 'locked' : s.locationState === 'failed' ? 'failed' : 'scanning', statusLabel: locLocked ? 'Locked' : s.locationState === 'failed' ? 'Failed' : 'Acquiring' },
    { k: 'contacts', icon: 'family', label: 'Emergency contacts', value: `${okContacts}/${s.contacts.length}`, status: okContacts && okContacts === s.contacts.length ? 'notified' : s.contacts.some((c) => c.state === 'pending') ? 'pending' : okContacts ? 'notified' : 'failed', statusLabel: okContacts === s.contacts.length && okContacts ? 'Notified' : s.contacts.some((c) => c.state === 'pending') ? 'Sending' : okContacts ? 'Partly' : 'Action needed', simulated: demo },
    { k: 'services', icon: 'services', label: 'Emergency services', value: lines[0]?.number ?? '112', status: 'ready', statusLabel: 'Available', onClick: () => setSheet('services') },
    { k: 'vault', icon: 'vault', label: 'Health Vault', value: medical?.bloodGroup ?? 'Ready', status: 'ready', statusLabel: vaultLink ? 'Link active' : 'Ready for access', onClick: () => setSheet('vault') },
    { k: 'radar', icon: 'radar', label: 'Geo-Radar', value: hosp ? `${fmtKm(hosp.distance)}` : 'Scanning', status: hosp ? 'nearby' : 'scanning', statusLabel: hosp ? 'Care found' : 'Scanning', simulated: demo },
    { k: 'ai', icon: 'ai', label: 'AI Guidance', value: 'Step by step', status: 'ready', statusLabel: 'Ready', onClick: () => setSheet('guidance') },
  ];

  const timeline: TimelineItem[] = useMemo(() => {
    const t0 = s.startedAt ? Date.parse(s.startedAt) : now;
    const at = (ms: number) => hhmmss(ms);
    const items: TimelineItem[] = [
      { key: 'sos', label: 'SOS activated', detail: demo ? 'Demo mode · nothing is sent' : 'Hold confirmed', state: 'done', at: at(0), icon: 'sos' },
      { key: 'loc', label: locLocked ? 'Location locked' : 'Locating you', detail: locLocked ? `GPS · ±${Math.round(s.location!.accuracy ?? 20)} m` : s.locationState === 'failed' ? 'No fix — last known location used if any' : 'GPS', state: locLocked ? 'done' : s.locationState === 'failed' ? 'failed' : 'active', icon: 'location' },
      { key: 'contacts', label: okContacts ? `Family alerted · ${okContacts}/${s.contacts.length}` : 'Alerting contacts', detail: s.contacts.map((c) => `${c.name}: ${c.detail}`).join(' · ') || 'No contacts set', state: okContacts === s.contacts.length && okContacts ? 'done' : okContacts ? 'active' : s.contacts.some((c) => c.state === 'failed') ? 'failed' : 'active', icon: 'family', simulated: demo },
      { key: 'live', label: 'Live location sharing', detail: s.live === 'ok' ? 'Private link per contact' : s.live === 'failed' ? 'Unavailable · coordinates are in the SMS' : 'Starting', state: s.live === 'ok' ? 'done' : s.live === 'failed' ? 'failed' : 'active', icon: 'broadcast', simulated: demo },
      { key: 'vault', label: vaultLink ? 'Responder access active' : 'Health Vault ready', detail: vaultLink ? 'Temporary link · show the QR to responders' : 'Show the QR to responders when they arrive', state: vaultLink ? 'done' : 'pending', icon: 'vault' },
      { key: 'radar', label: hosp ? 'Nearest care identified' : 'Scanning for nearby care', detail: hosp ? `${hosp.name} · ${fmtKm(hosp.distance)} · ~${fmtEta(hosp.etaMin)}${radar.live ? ' (estimated)' : ''}` : 'Geo-Radar', state: hosp ? 'done' : 'active', icon: 'hospital', simulated: demo },
    ];
    if (demo && amb) items.push({ key: 'amb', label: 'Response identified', detail: `${amb.name} · ETA ${fmtEta(amb.etaMin)}`, state: 'active', icon: 'ambulance', simulated: true });
    if (s.responders.length) items.push({ key: 'resp', label: `${s.responders.join(', ')} responding`, state: 'done', icon: 'helper' });
    void t0;
    return items;
  }, [s, demo, locLocked, okContacts, vaultLink, hosp, amb, radar.live, now]);

  if (ended) return <Outcome onDone={onDone} />;

  const callNow = () => (demo ? toast(`Demo mode — would call ${lines[0]?.number}.`) : dial(lines[0]?.number ?? '112'));
  return (
    <div className="relative min-h-screen surface-emergency text-white">
      <div className="grid-lines pointer-events-none fixed inset-0 opacity-40" />
      {/* the moment the interface turns: a coral flash that settles into the command center */}
      {!reduce && <motion.div className="pointer-events-none fixed inset-0 z-50" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} style={{ background: 'radial-gradient(circle at 50% 45%, rgba(255,90,100,.85), rgba(208,32,53,.6) 40%, rgba(7,13,26,.95) 80%)' }} />}
      {/* ---------------- top bar ---------------- */}
      <header className="sticky top-0 z-30 border-b border-coral-500/20 bg-[#070D1A]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Mark size={30} />
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            <span className="relative grid h-3 w-3 place-items-center"><span className="absolute h-3 w-3 animate-ping rounded-full bg-coral-400" /><span className="h-2.5 w-2.5 rounded-full bg-coral-500" /></span>
            <span className="font-display text-[18px] font-bold tracking-[0.06em] sm:text-[20px]">SOS ACTIVE</span>
          </motion.div>
          <span className="font-mono text-[14px] tabular text-coral-200">{hhmmss(elapsed)}</span>
          {demo && <span className="hidden rounded-full bg-violet-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] sm:inline">Demo · nothing sent</span>}
          <div className="ml-auto flex items-center gap-2">
            {!online(app) && <StatusChip status="offline" label="Offline" />}
            <Btn tone="outline" size="sm" onClick={sos.requestEnd}>I’m safe</Btn>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-32 pt-5 sm:px-6 lg:pb-10">
        {/* ---------------- pulse chain ---------------- */}
        <div className="relative mx-auto mb-5 flex max-w-3xl items-center justify-between">
          <div className="absolute inset-x-6 top-5 h-[2px] bg-white/10" />
          {!reduce && <motion.div className="absolute top-[14px] h-3 w-16 rounded-full bg-gradient-to-r from-transparent via-coral-400 to-transparent blur-[2px]" initial={{ left: '0%' }} animate={{ left: ['0%', '92%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />}
          {chain.map((c, i) => (
            <motion.div key={c.k} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 300, damping: 22 }} className="relative z-10 flex flex-col items-center gap-1.5">
              <span className={cx('grid h-10 w-10 place-items-center rounded-full ring-2 transition-colors', c.on ? 'bg-coral-500 text-white ring-coral-300/60' : 'bg-midnight-800 text-midnight-300 ring-white/10')}>
                <Icon name={c.icon} size={18} />
              </span>
              <span className={cx('font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]', c.on ? 'text-white' : 'text-midnight-300')}>{c.label}</span>
            </motion.div>
          ))}
        </div>

        {/* ---------------- status tiles ---------------- */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t, i) => (
            <motion.button key={t.k} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.08 }} onClick={t.onClick} disabled={!t.onClick}
              className="group min-w-0 rounded-3xl bg-white/[0.05] p-3.5 text-left ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08] disabled:cursor-default">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/[0.07] text-cyan-200"><Icon name={t.icon} size={16} /></span>
                <StatusChip status={t.status} label={t.statusLabel} />
              </div>
              <p className="mt-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-midnight-200">{t.label}</p>
              <AnimatePresence mode="wait">
                <motion.p key={t.value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-display text-[22px] font-semibold leading-tight">{t.value}</motion.p>
              </AnimatePresence>
              {t.simulated && <Honest dark kind="simulated" className="mt-1" />}
            </motion.button>
          ))}
        </div>

        {/* ---------------- main grid ---------------- */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
          {/* contacts + broadcast */}
          <section className="space-y-4">
            <Block title="Emergency contacts" kicker="Family alerted">
              <ul className="space-y-2">
                {s.contacts.map((c) => {
                  const contact = contacts.find((x) => x.id === c.id);
                  return (
                    <li key={c.id} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-midnight-700 font-display text-[15px] font-semibold">{c.name[0]}</span>
                        <span className="min-w-0 flex-1"><b className="block text-[14px]">{c.name}</b><span className="block truncate text-[11.5px] text-midnight-200">{c.detail}</span></span>
                        <StatusChip status={c.state === 'ok' ? 'notified' : c.state === 'pending' ? 'pending' : c.state === 'failed' ? 'failed' : 'pending'} label={c.state === 'ok' ? (demo ? 'Simulated' : 'Notified') : c.state === 'pending' ? 'Sending' : c.state === 'failed' ? 'Failed' : 'Action'} />
                      </div>
                      {contact?.phone && (
                        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                          <button disabled={demo} onClick={() => { openWhatsApp(contact.phone!, sos.messageFor(c.id)); setWa((w) => ({ ...w, [c.id]: true })); }} className={cx('h-9 rounded-xl text-[12px] font-semibold disabled:opacity-40', wa[c.id] ? 'bg-vital-500/20 text-vital-300' : 'bg-[#25D366] text-white')}>{wa[c.id] ? 'Opened' : 'WhatsApp'}</button>
                          {hasNative() ? <span className="grid h-9 place-items-center rounded-xl bg-white/[0.06] text-[12px] text-midnight-200">SMS auto</span> : <a aria-disabled={demo} href={demo ? undefined : smsUrl([contact.phone], sos.messageFor(c.id))} className={cx('grid h-9 place-items-center rounded-xl bg-white/10 text-[12px] font-semibold', demo && 'pointer-events-none opacity-40')}>Text</a>}
                          <button disabled={demo} onClick={() => dial(contact.phone!)} className="h-9 rounded-xl bg-white/10 text-[12px] font-semibold disabled:opacity-40">Call</button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!s.contacts.length && <li className="text-[13px] text-amber-200">No emergency contacts — call emergency services directly.</li>}
              </ul>
            </Block>
            <BroadcastStatus whatsappOpened={wa} />
          </section>

          {/* radar + response */}
          <section className="space-y-4">
            <Block title="Scanning nearby help" kicker="Geo-Radar" right={demo ? <Honest dark kind="simulated" /> : <StatusChip status="estimated" dark label="ETA estimated" />}>
              {radar.points ? <RadarView points={radar.points} emergency className="mx-auto max-w-[420px]" /> : <div className="mx-auto aspect-square max-w-[420px] animate-pulse rounded-full bg-white/[0.04]" />}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-midnight-200">{demo && amb ? 'Response ETA' : 'Nearest hospital'}</p>
                  <p className="font-display text-[26px] font-semibold tabular leading-tight">{demo && amb ? hhmmss(((amb.distance * 1.35) / (32 / 3.6)) * 1000) : hosp ? `~${fmtEta(hosp.etaMin)}` : '—'}</p>
                  <p className="text-[11px] text-midnight-300">{demo ? 'Simulated ETA' : hosp ? `${fmtKm(hosp.distance)} · drive estimate` : 'Needs location'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-midnight-200">{helper ? 'LifeLine Helper' : 'Helpers'}</p>
                  <p className="font-display text-[20px] font-semibold leading-tight">{helper ? `${helper.name} · ${fmtKm(helper.distance)}` : demo ? 'Searching' : 'Pilot'}</p>
                  <p className="text-[11px] text-midnight-300">{helper ? `Responding · ETA ${fmtEta(helper.etaMin)} (simulated)` : demo ? 'Simulated network' : 'Not live in your area'}</p>
                </div>
              </div>
            </Block>
          </section>

          {/* medical + timeline */}
          <section className="space-y-4">
            <Block title="Health Vault" kicker="Ready for authorized access" right={<Btn size="sm" tone="outline" icon="qr" onClick={() => setSheet('vault')}>Responder QR</Btn>}>
              <MedicalSummary m={medical} dark compact />
            </Block>
            <Block title="Response timeline" kicker="Live">
              <EmergencyTimeline items={timeline} />
            </Block>
          </section>
        </div>

        <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-[1fr_auto]">
          <button onClick={() => setSheet('guidance')} className="flex items-center gap-3 rounded-3xl bg-violet-500/15 p-4 text-left ring-1 ring-inset ring-violet-300/25 hover:bg-violet-500/20">
            <Icon name="ai" size={22} className="text-violet-200" /><span><b className="block text-[15px]">AI Guidance</b><span className="text-[12.5px] text-violet-100/80">Know what to do while help is coming — step by step</span></span>
          </button>
          <Btn tone="coral" size="lg" icon="phone" onClick={callNow} className="h-auto px-8">Call {lines[0]?.number}</Btn>
        </div>
      </main>

      {/* ---------------- mobile action bar ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-coral-500/20 bg-[#070D1A]/90 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl lg:hidden">
        <Btn tone="coral" icon="phone" onClick={callNow}>{lines[0]?.number}</Btn>
        <Btn tone="outline" icon="ai" onClick={() => setSheet('guidance')}>Guide</Btn>
        <Btn tone="outline" icon="qr" onClick={() => setSheet('vault')}>Medical</Btn>
      </nav>

      <BottomSheet dark open={sheet === 'guidance'} onClose={() => setSheet(null)}><AIGuidance compact /></BottomSheet>
      <BottomSheet dark open={sheet === 'vault'} onClose={() => setSheet(null)}><MedicalAccessToken compact /></BottomSheet>
      <BottomSheet dark open={sheet === 'services'} onClose={() => setSheet(null)} title={<p className="font-display text-[18px] font-semibold">Emergency services</p>}>
        <EmergencyServicesList dark compact />
        <p className="mt-3 text-[12px] text-midnight-300">LifeLine Hub does not dispatch services. These numbers open your phone’s dialer.</p>
      </BottomSheet>
      <BottomSheet dark open={s.phase === 'RESOLVING'} onClose={sos.keepActive} title={<p className="font-display text-[20px] font-semibold">Are you safe?</p>}>
        <p className="text-[14px] text-midnight-200">Ending SOS tells your contacts you’re safe and stops live location sharing.</p>
        <div className="mt-4 grid gap-2">
          <Btn size="lg" tone="primary" icon="check" onClick={() => sos.resolve('safe')}>I’m safe — end SOS</Btn>
          <Btn size="lg" tone="coral" onClick={sos.keepActive}>Keep SOS active</Btn>
          <button onClick={() => sos.resolve('cancelled')} className="py-2 text-[13px] font-semibold text-midnight-200">It was a false alarm — cancel</button>
        </div>
      </BottomSheet>
    </div>
  );
}

const online = (a: { online: boolean; sos: { state: { network: string } } }) => a.online && a.sos.state.network !== 'offline';

function Block({ title, kicker, right, children }: { title: string; kicker: string; right?: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-4xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-coral-300">{kicker}</p><h3 className="font-display text-[17px] font-semibold">{title}</h3></div>
        {right}
      </div>
      {children}
    </motion.div>
  );
}

function Outcome({ onDone }: { onDone: () => void }) {
  const { sos, demo } = useApp();
  const safe = sos.state.phase === 'SAFE';
  return (
    <div className="grid min-h-screen place-items-center surface-command px-5 text-white">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
        <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className={cx('mx-auto grid h-20 w-20 place-items-center rounded-full', safe ? 'bg-vital-500' : 'bg-midnight-600')}>
          <Icon name={safe ? 'check' : 'x'} size={36} strokeWidth={2.4} />
        </motion.span>
        <h1 className="mt-5 font-display text-[32px] font-semibold tracking-tight">{safe ? 'You’re safe.' : 'SOS cancelled.'}</h1>
        <p className="mt-2 text-[15px] text-midnight-200">{demo ? 'Demo mode — nothing was sent.' : safe ? 'Your SOS has ended and live location sharing has stopped. Your contacts’ links now show that you are safe.' : 'Your SOS was cancelled and live location sharing has stopped.'}</p>
        <Btn size="lg" className="mt-6" onClick={onDone}>Back to LifeLine Hub</Btn>
      </motion.div>
    </div>
  );
}

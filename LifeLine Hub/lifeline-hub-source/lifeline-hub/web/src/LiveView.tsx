'use client';
/** What an emergency contact sees from their private live link. No account needed; it ends with the SOS. */
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EmergencyNumberService } from '@shared/emergency';
import { accuracyLabel, directionsLink, fmtAccuracy, fmtCoord } from '@shared/geo';
import { tokenFromPath, useLive } from '@core/live';
import { currentFix, dial, openExternal } from '@core/native';
import { Logo } from '@/ui/brand';
import { Icon } from '@/ui/icons';
import { Btn, Kicker, StatusChip, cx, inputCls } from '@/ui/kit';

const EmergencyMap = dynamic(() => import('@/components/lifeline/EmergencyMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-midnight-800" /> });

export default function LiveView() {
  const [token] = useState(() => tokenFromPath('/live/'));
  const { snap, error, updatedAt, respond, message } = useLive(token);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  if (!token || (error && !snap && error.status !== 0))
    return <Shell><div className="mt-16 rounded-4xl bg-white/[0.05] p-8 text-center ring-1 ring-inset ring-white/10"><Icon name="lock" size={36} className="mx-auto text-cyan-300" /><h1 className="mt-3 font-display text-[24px] font-semibold">This link is not active</h1><p className="mt-2 text-midnight-200">{!token ? 'The link is incomplete. Open it exactly as it was sent.' : 'The SOS has ended or the link has expired. If you are still worried, call them directly.'}</p></div></Shell>;
  if (!snap) return <Shell><p className="mt-20 text-center text-midnight-200">{error?.message ?? 'Loading live location…'}</p></Shell>;

  const r = EmergencyNumberService.forRegion(snap.region);
  const active = snap.status === 'active' || snap.status === 'responding';
  const loc = snap.lastLocation;
  const q = accuracyLabel(loc);
  const since = updatedAt ? Math.round((Date.now() - updatedAt) / 1000) : null;
  const first = snap.ownerName.split(' ')[0];
  const doRespond = async (on: boolean) => {
    setBusy('r'); setNote(null);
    try { const l = on ? await currentFix().catch(() => null) : null; await respond(on, l); setNote(on ? `${first} can see you are responding.` : 'Marked as not responding.'); } catch (e) { setNote(`Unable to update: ${(e as Error).message}`); }
    setBusy(null);
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy('m');
    try { await message(text.trim()); setText(''); } catch (err) { setNote(`Message not sent: ${(err as Error).message}`); }
    setBusy(null);
  };
  return (
    <Shell emergency={active}>
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cx('rounded-4xl p-5', active ? 'bg-coral-500 shadow-coral' : 'bg-vital-500')}>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] opacity-90">{active ? 'LifeLine SOS · live' : 'SOS ended'}</p>
        <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight">{active ? `${first} needs help` : `${first} ${snap.status === 'safe' ? 'is safe' : 'cancelled the SOS'}`}</h1>
        <p className="mt-1 text-[13.5px] opacity-90">Started {new Date(snap.startedAt).toLocaleTimeString()}{snap.endedAt ? ` · ended ${new Date(snap.endedAt).toLocaleTimeString()}` : ''}{since != null && active ? ` · updated ${since}s ago` : ''}</p>
      </motion.header>
      {active && (
        <div className="grid grid-cols-2 gap-2">
          {snap.ownerPhone && <Btn size="lg" tone="white" icon="phone" onClick={() => dial(snap.ownerPhone!)}>Call {first}</Btn>}
          <Btn size="lg" tone="coral" icon="phone" className={cx(!snap.ownerPhone && 'col-span-2')} onClick={() => dial(r.primary.number)}>Call {r.primary.number}</Btn>
        </div>
      )}
      <div className="overflow-hidden rounded-4xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
        <div className="ll-dark h-72">{loc ? <EmergencyMap me={{ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy }} points={[]} className="h-full w-full" /> : <div className="grid h-full place-items-center text-midnight-200">Waiting for location…</div>}</div>
        {loc && (
          <div className="space-y-1 p-4">
            <p className="font-mono text-[13.5px] font-semibold tabular">{fmtCoord(loc.latitude)}, {fmtCoord(loc.longitude)} · {fmtAccuracy(loc.accuracy)}</p>
            <StatusChip status={q === 'good' ? 'locked' : 'pending'} label={q === 'last_known' ? 'Last known — not current' : q === 'limited' ? 'Approximate' : 'Precise'} dark />
            {snap.area && <p className="text-[13px] text-midnight-200">Near {snap.area} (approx.)</p>}
            <Btn tone="outline" className="mt-2 w-full" icon="route" onClick={() => openExternal(directionsLink(loc.latitude, loc.longitude))}>Directions</Btn>
          </div>
        )}
      </div>
      {active && (
        <div className="rounded-4xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10">
          <Kicker tone="cyan">Are you going to help?</Kicker>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn tone={snap.you.responding ? 'primary' : 'outline'} disabled={busy === 'r'} onClick={() => doRespond(true)}>{snap.you.responding ? 'Responding' : 'I’m on my way'}</Btn>
            <Btn tone="outline" disabled={busy === 'r' || !snap.you.responding} onClick={() => doRespond(false)}>I can’t help</Btn>
          </div>
          {note && <p role="status" className="mt-2 text-[13px] text-cyan-200">{note}</p>}
        </div>
      )}
      <div className="rounded-4xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10">
        <Kicker tone="cyan">Messages</Kicker>
        <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
          {snap.messages.length === 0 && <li className="text-[13px] text-midnight-200">No messages yet.</li>}
          {snap.messages.map((m) => <li key={m.id} className={cx('max-w-[85%] rounded-2xl px-3 py-2 text-[13.5px]', m.from === 'owner' ? 'bg-white/10' : 'ml-auto bg-teal-500')}><span className="block text-[11px] font-bold opacity-70">{m.name}</span>{m.text}</li>)}
        </ul>
        {active && <form onSubmit={send} className="mt-3 flex gap-2"><input className={`${inputCls} !bg-white/10 !text-white !border-white/10`} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${first}`} /><Btn type="submit" disabled={busy === 'm' || !text.trim()}>Send</Btn></form>}
      </div>
      {snap.profile && (
        <div className="rounded-4xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10">
          <Kicker tone="cyan">Medical details shared by {first}</Kicker>
          <ul className="mt-2 space-y-1 text-[13.5px] text-midnight-100">
            {snap.profile.bloodGroup && <li>Blood group {snap.profile.bloodGroup}</li>}
            {snap.profile.allergies && <li>Allergies: {snap.profile.allergies}</li>}
            {snap.profile.medicalNotes && <li>Medical: {snap.profile.medicalNotes}</li>}
          </ul>
        </div>
      )}
      <p className="pb-8 text-center text-[12px] text-midnight-300">LifeLine Hub has not contacted emergency services. If {first} is in danger, call {r.primary.number}.</p>
    </Shell>
  );
}

function Shell({ children, emergency }: { children: React.ReactNode; emergency?: boolean }) {
  return (
    <main className={cx('min-h-screen px-4 pb-6 pt-[max(env(safe-area-inset-top),1rem)] text-white', emergency ? 'surface-emergency' : 'surface-command')}>
      <div className="mx-auto max-w-lg space-y-3">
        <div className="py-2"><Logo light size={28} /></div>
        {children}
      </div>
    </main>
  );
}

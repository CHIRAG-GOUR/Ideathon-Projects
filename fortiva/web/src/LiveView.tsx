'use client';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EmergencyNumberService } from '@shared/emergency';
import { accuracyLabel, fmtAccuracy, fmtCoord } from '@shared/geo';
import { tokenFromPath, useLive } from '@core/live';
import { currentFix, dial, openExternal } from '@core/native';
import { Btn, Card, Label, Spinner, cx, inputCls } from '@/ui/kit';
import { Logo } from '@/ui/art';
import { Icon } from '@/ui/icons';

const MapView = dynamic(() => import('@core/MapView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-cobalt-50" /> });

/** What a trusted contact sees from their private link. No account needed; the link stops working when the alert ends. */
export default function LiveView() {
  const [token] = useState(() => tokenFromPath('/live/'));
  const { snap, error, updatedAt, respond, message } = useLive(token);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!token || (error && !snap && error.status !== 0))
    return (
      <Shell>
        <Card className="mt-10 text-center">
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-cobalt-50 text-cobalt-300"><Icon name="lock" size={40} /></span>
          <h1 className="mt-2 text-2xl font-bold text-cobalt-900">This link is not active</h1>
          <p className="mt-2 text-ink-muted">{!token ? 'The link is incomplete. Open it exactly as it was sent.' : 'The alert has ended or the link has expired. If you are still worried, call them directly.'}</p>
        </Card>
      </Shell>
    );
  if (!snap) return <Shell><p className="mt-16 flex items-center justify-center gap-2 text-ink-muted"><Spinner /> {error?.message ?? 'Loading live location…'}</p></Shell>;

  const r = EmergencyNumberService.forRegion(snap.region);
  const active = snap.status === 'active' || snap.status === 'responding';
  const loc = snap.lastLocation;
  const q = accuracyLabel(loc);
  const ago = updatedAt ? Math.round((Date.now() - updatedAt) / 1000) : null;
  const locAge = loc ? Math.round((Date.now() - Date.parse(loc.timestamp)) / 1000) : null;

  const doRespond = async (on: boolean) => {
    setBusy('r');
    setNote(null);
    try {
      const l = on ? await currentFix().catch(() => null) : null;
      await respond(on, l);
      setNote(on ? `${snap.ownerName} can see you are responding${l ? ' and where you are' : ''}.` : 'Marked as not responding.');
    } catch (e) {
      setNote(`Unable to update: ${(e as Error).message}`);
    }
    setBusy(null);
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy('m');
    try {
      await message(text.trim());
      setText('');
    } catch (err) {
      setNote(`Message not sent: ${(err as Error).message}`);
    }
    setBusy(null);
  };

  return (
    <Shell>
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cx('rounded-5xl p-5', active ? 'bg-gradient-to-br from-coral-500 via-coral-600 to-cobalt-800 text-white shadow-alert' : 'bg-teal-50 text-ink')}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{active ? (snap.trigger === 'discreet' ? 'Silent alert' : snap.trigger === 'check' ? 'Missed safety check-ins' : 'SOS') : 'Alert ended'}</p>
        <h1 className="mt-1 text-3xl font-bold">{active ? `${snap.ownerName} needs help` : `${snap.ownerName} ${snap.status === 'safe' ? 'is safe' : 'cancelled the alert'}`}</h1>
        <p className="mt-1 text-sm opacity-90">Started {new Date(snap.startedAt).toLocaleTimeString()}{snap.endedAt ? ` · ended ${new Date(snap.endedAt).toLocaleTimeString()}` : ''}{ago != null && active ? ` · updated ${ago}s ago` : ''}</p>
        {active && snap.trigger === 'discreet' && <p className="mt-3 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold">They may not be able to talk. Text first — a ringing phone could put them at risk.</p>}
      </motion.header>

      {active && (
        <div className="grid grid-cols-2 gap-3">
          {snap.ownerPhone && <Btn big tone="dark" onClick={() => dial(snap.ownerPhone!)}>Call {snap.ownerName.split(' ')[0]}</Btn>}
          <Btn big tone="coral" className={cx(!snap.ownerPhone && 'col-span-2')} onClick={() => dial(r.primary.number)}>Call {r.primary.number}</Btn>
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="h-72">
          {loc ? <MapView className="h-full" me={loc} meLabel={snap.ownerName} trail={snap.trail} pulse={active} color="#E8432C" points={snap.responders.filter((x) => x.location).map((x) => ({ id: x.id, latitude: x.location!.latitude, longitude: x.location!.longitude, label: `${x.name} (responding)`, emoji: '🧡' }))} /> : <div className="grid h-full place-items-center bg-cobalt-50 text-ink-muted">Waiting for location…</div>}
        </div>
        {loc && (
          <div className="space-y-1 p-4">
            <p className="text-sm font-bold tabular-nums">{fmtCoord(loc.latitude)}, {fmtCoord(loc.longitude)} · {fmtAccuracy(loc.accuracy)}</p>
            <p className={cx('text-xs font-semibold', q === 'good' ? 'text-teal-600' : 'text-amber-700')}>{q === 'last_known' ? 'Last known position — not current' : q === 'limited' ? 'Approximate position' : 'Precise position'} · {locAge != null && locAge < 120 ? `${locAge}s old` : new Date(loc.timestamp).toLocaleTimeString()}</p>
            {snap.area && <p className="text-sm text-ink-soft">Near {snap.area} (approx.)</p>}
            <Btn tone="soft" className="mt-2 w-full" onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`)}>Directions</Btn>
          </div>
        )}
      </Card>

      {active && (
        <Card>
          <Label>Are you going to help?</Label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn tone={snap.you.responding ? 'teal' : 'cobalt'} disabled={busy === 'r'} onClick={() => doRespond(true)}>{snap.you.responding ? "✓ I'm responding" : "I'm on my way"}</Btn>
            <Btn tone="white" disabled={busy === 'r' || !snap.you.responding} onClick={() => doRespond(false)}>I can&apos;t help</Btn>
          </div>
          {snap.responders.length > 0 && <p className="mt-2 text-sm text-ink-muted">Responding: {snap.responders.filter((x) => x.responding).map((x) => x.name).join(', ') || 'no one yet'}</p>}
          {note && <p role="status" className="mt-2 text-sm font-semibold text-cobalt-800">{note}</p>}
        </Card>
      )}

      <Card>
        <Label>Messages</Label>
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {snap.messages.length === 0 && <li className="text-sm text-ink-muted">No messages yet.</li>}
          {snap.messages.map((m) => (
            <li key={m.id} className={cx('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.from === 'owner' ? 'bg-cobalt-50' : 'ml-auto bg-cobalt-800 text-white')}>
              <span className="block text-[11px] font-bold opacity-70">{m.name} · {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {m.text}
            </li>
          ))}
        </ul>
        {active && (
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input className={inputCls} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${snap.ownerName.split(' ')[0]}`} />
            <Btn type="submit" disabled={busy === 'm' || !text.trim()}>Send</Btn>
          </form>
        )}
      </Card>

      {(snap.battery != null || snap.profile) && (
        <Card>
          <Label>Details shared by {snap.ownerName.split(' ')[0]}</Label>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {snap.battery != null && <li>Phone battery {snap.battery}%{snap.network ? ` · ${snap.network}` : ''}</li>}
            {snap.profile?.bloodGroup && <li>Blood group {snap.profile.bloodGroup}</li>}
            {snap.profile?.allergies && <li>Allergies: {snap.profile.allergies}</li>}
            {snap.profile?.medicalNotes && <li>Medical: {snap.profile.medicalNotes}</li>}
          </ul>
        </Card>
      )}
      <p className="pb-8 text-center text-xs text-ink-muted">Fortiva has not contacted emergency services. If {snap.ownerName.split(' ')[0]} is in danger, call {r.primary.number}.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper bg-mesh px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="py-2"><Logo /></div>
        {children}
      </div>
    </main>
  );
}

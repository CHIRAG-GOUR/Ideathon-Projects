'use client';
/** First launch: the four pillars in four calm screens, then the permissions an emergency needs (each optional). */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { hasNative, requestPermission } from '@core/native';
import { Icon, type IconName } from '@/ui/icons';
import { Logo } from '@/ui/brand';
import { Btn, StatusChip, cx } from '@/ui/kit';

const SLIDES: { icon: IconName; k: string; t: string; d: string; c: string }[] = [
  { icon: 'sos', k: 'SOS Push', t: 'Start the response.', d: 'Hold for three seconds. Your contacts are alerted with your live location — by WhatsApp and SMS.', c: '#DA1E2C' },
  { icon: 'vault', k: 'Health Vault', t: 'Give responders the context.', d: 'Blood group, allergies, medications and conditions — shared only through temporary links you control.', c: '#22B8B0' },
  { icon: 'radar', k: 'Geo-Radar', t: 'Find the fastest path to help.', d: 'Hospitals, police, fire and safe zones around you, ranked by distance with estimated travel time.', c: '#0B8A57' },
  { icon: 'ai', k: 'AI Guidance', t: 'Know what to do while help is coming.', d: 'Calm, step-by-step first-aid guidance that works offline — and always puts calling for help first.', c: '#8C7CF3' },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [perm, setPerm] = useState<Record<string, boolean | null>>({ location: null, notifications: null, sms: null });
  const last = i === SLIDES.length;
  const ask = async (k: 'location' | 'notifications' | 'sms') => {
    const ok = await requestPermission(k);
    setPerm((p) => ({ ...p, [k]: ok }));
  };
  const s = SLIDES[Math.min(i, SLIDES.length - 1)];
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden surface-clinical px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.25rem)] text-ink">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <Logo light />
          {!last && <button onClick={() => setI(SLIDES.length)} className="px-2 py-2 text-[13px] font-semibold text-ink-muted">Skip</button>}
        </div>
        <AnimatePresence mode="wait">
          {!last ? (
            <motion.section key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex flex-1 flex-col justify-center py-8">
              <div className="relative mx-auto grid h-56 w-56 place-items-center">
                {[0, 1, 2].map((r) => <motion.span key={r} className="absolute inset-0 rounded-full border" style={{ borderColor: s.c }} initial={{ scale: 0.4, opacity: 0.7 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: 2.8, repeat: Infinity, delay: r * 0.9 }} />)}
                <span className="absolute inset-12 rounded-full" style={{ background: `radial-gradient(closest-side, ${s.c}44, transparent)` }} />
                <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="grid h-24 w-24 place-items-center rounded-[28px] glass ring-1" style={{ color: s.c, ['--tw-ring-color' as string]: `${s.c}66` }}><Icon name={s.icon} size={44} /></motion.span>
              </div>
              <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: s.c }}>{String(i + 1).padStart(2, '0')} · {s.k}</p>
              <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.05] tracking-tight">{s.t}</h1>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{s.d}</p>
            </motion.section>
          ) : (
            <motion.section key="perm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col justify-center py-8">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">Emergency readiness</p>
              <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Ready in 30 seconds</h1>
              <p className="mt-2 text-ink-muted">Allow what you’re comfortable with. Change it any time in Settings.</p>
              <div className="mt-6 space-y-2.5">
                {([
                  ['location', 'Location', 'So SOS and Geo-Radar know where you are.', 'location'],
                  ['notifications', 'Notifications', 'For SOS status and alerts.', 'info'],
                  ...(hasNative() ? [['sms', 'Send SMS', 'So alerts text your contacts from your SIM — even offline.', 'sms']] : []),
                ] as ['location' | 'notifications' | 'sms', string, string, IconName][]).map(([k, t, d, ic]) => (
                  <div key={k} className="flex items-center gap-3 rounded-3xl bg-clinic-50 p-4 ring-1 ring-inset ring-line">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600"><Icon name={ic} size={19} /></span>
                    <div className="min-w-0 flex-1"><p className="font-semibold">{t}</p><p className="text-[13px] text-ink-muted">{d}</p></div>
                    {perm[k] ? <StatusChip status="ready" label="Allowed" /> : <Btn size="sm" tone="outline" onClick={() => ask(k)}>{perm[k] === false ? 'Retry' : 'Allow'}</Btn>}
                  </div>
                ))}
              </div>
              {Object.values(perm).includes(false) && <p className="mt-3 text-[13px] font-semibold text-amber-700">Not allowed. If no prompt appears, enable it in your phone or browser settings.</p>}
            </motion.section>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden>{[...SLIDES, null].map((_, n) => <span key={n} className={cx('h-1.5 rounded-full transition-all', n === i ? 'w-7 bg-cyan-400' : 'w-1.5 bg-clinic-200')} />)}</div>
          <Btn size="lg" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Continue' : 'Next'}</Btn>
        </div>
      </div>
    </main>
  );
}

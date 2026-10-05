'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { hasNative, requestPermission } from '@core/native';
import { Btn, cx } from '@/ui/kit';
import { Logo, SceneAlert, SceneProtect, SceneReady } from '@/ui/art';

const SLIDES = [
  { art: <SceneProtect />, title: 'Protection that stays switched on', text: 'Shield Mode keeps your location, contacts and SOS ready before you need them — not after.' },
  { art: <SceneAlert />, title: 'Help in one hold — or silently', text: 'Hold SOS for 3 seconds, or send a discreet alert with no siren. Your trusted people get your exact location.' },
  { art: <SceneReady />, title: 'Always know you are ready', text: 'She Shield checks the things that matter in an emergency: location, network, battery and contacts.' },
];

/** First install only: three short screens, then the permissions an SOS needs (each explained, each optional). */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [perm, setPerm] = useState<Record<string, boolean | null>>({ location: null, notifications: null, sms: null });
  const last = i === SLIDES.length;

  const ask = async (k: 'location' | 'notifications' | 'sms') => {
    const ok = await requestPermission(k);
    setPerm((p) => ({ ...p, [k]: ok }));
  };

  return (
    <main className="flex min-h-screen flex-col bg-pearl bg-weave px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <Logo />
          {!last && <button onClick={() => setI(SLIDES.length)} className="px-2 py-2 text-sm font-bold text-ink-muted">Skip</button>}
        </div>
        <AnimatePresence mode="wait">
          {!last ? (
            <motion.section key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col justify-center py-6">
              {SLIDES[i].art}
              <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-violet-900">{SLIDES[i].title}</h1>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-muted">{SLIDES[i].text}</p>
            </motion.section>
          ) : (
            <motion.section key="perm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col justify-center py-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-violet-900">Get ready in 30 seconds</h1>
              <p className="mt-2 text-ink-muted">Allow what you are comfortable with. You can change these any time in Settings.</p>
              <div className="mt-6 space-y-3">
                {(
                  [
                    ['location', 'Location', 'So an SOS can share exactly where you are.'],
                    ['notifications', 'Notifications', 'For “Are you safe?” checks and SOS status.'],
                    ...(hasNative() ? [['sms', 'Send SMS', 'So alerts text your contacts from your SIM automatically, even offline.']] : []),
                  ] as ['location' | 'notifications' | 'sms', string, string][]
                ).map(([k, t, d]) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl2 border border-line bg-white p-4 shadow-card">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-ink">{t}</p>
                      <p className="text-sm text-ink-muted">{d}</p>
                    </div>
                    {perm[k] ? (
                      <span className="rounded-full bg-mint-50 px-3 py-1.5 text-xs font-extrabold text-mint-600">✓ Allowed</span>
                    ) : (
                      <Btn tone="soft" onClick={() => ask(k)}>{perm[k] === false ? 'Try again' : 'Allow'}</Btn>
                    )}
                  </div>
                ))}
              </div>
              {Object.values(perm).includes(false) && <p className="mt-3 text-sm font-semibold text-amber-700">Not allowed. If no prompt appears, enable it in your phone&apos;s app settings.</p>}
            </motion.section>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden>
            {[...SLIDES, null].map((_, n) => <span key={n} className={cx('h-2 rounded-full transition-all', n === i ? 'w-6 bg-violet-700' : 'w-2 bg-violet-200')} />)}
          </div>
          <Btn big onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Continue' : 'Next'}</Btn>
        </div>
      </div>
    </main>
  );
}

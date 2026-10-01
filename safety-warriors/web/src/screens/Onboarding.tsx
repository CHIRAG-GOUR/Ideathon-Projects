'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { hasNative, requestPermission } from '@core/native';
import { Btn, cx } from '@/ui/kit';
import { Logo, SceneChecklist, ScenePlaybook, SceneToolkit } from '@/ui/art';

const SLIDES = [
  { art: <SceneToolkit />, title: 'Your safety toolkit', text: 'Practical know-how for streets, transport, online life and emergencies — ready before you need it.' },
  { art: <ScenePlaybook />, title: 'A playbook for every situation', text: 'Being followed, harassment, a medical emergency — clear steps, with real emergency actions one tap away.' },
  { art: <SceneChecklist />, title: 'Prepared, not scared', text: 'A live checklist of your phone, location and contacts, and a real SOS that reaches the people you trust.' },
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
    <main className="flex min-h-screen flex-col bg-cream bg-geo px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <Logo />
          {!last && <button onClick={() => setI(SLIDES.length)} className="px-2 py-2 text-sm font-bold text-ink-muted">Skip</button>}
        </div>
        <AnimatePresence mode="wait">
          {!last ? (
            <motion.section key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col justify-center py-6">
              {SLIDES[i].art}
              <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-indigo-800">{SLIDES[i].title}</h1>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-muted">{SLIDES[i].text}</p>
            </motion.section>
          ) : (
            <motion.section key="perm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col justify-center py-6">
              <h1 className="text-3xl font-bold tracking-tight text-indigo-800">Gear up in 30 seconds</h1>
              <p className="mt-2 text-ink-muted">Allow what you are comfortable with. You can change these any time in Settings.</p>
              <div className="mt-6 space-y-3">
                {(
                  [
                    ['location', 'Location', 'So an SOS can share exactly where you are.'],
                    ['notifications', 'Notifications', 'For SOS status and alerts.'],
                    ...(hasNative() ? [['sms', 'Send SMS', 'So alerts text your contacts from your SIM automatically, even offline.']] : []),
                  ] as ['location' | 'notifications' | 'sms', string, string][]
                ).map(([k, t, d]) => (
                  <div key={k} className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4 shadow-tile">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{t}</p>
                      <p className="text-sm text-ink-muted">{d}</p>
                    </div>
                    {perm[k] ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">✓ Allowed</span>
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
            {[...SLIDES, null].map((_, n) => <span key={n} className={cx('h-2 rounded-full transition-all', n === i ? 'w-6 bg-teal-700' : 'w-2 bg-teal-100')} />)}
          </div>
          <Btn big onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Continue' : 'Next'}</Btn>
        </div>
      </div>
    </main>
  );
}

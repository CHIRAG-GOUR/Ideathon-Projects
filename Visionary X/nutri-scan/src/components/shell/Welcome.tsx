'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Camera } from 'lucide-react';
import { useKitchen } from '@/features/food/store';
import { GRADE_META } from '@/lib/nutrition/score';
import { feedback } from '@/lib/feedback';
import { cn } from '@/lib/utils';
import { Emoji3D } from '@/components/ui/Emoji3D';

/** First-run welcome: three quick cards, shown once, always skippable. */
const SLIDES = [
  { key: 'snap', title: 'Snap any food', text: 'Point your camera at a meal, a fruit or a packet and tap capture.' },
  { key: 'inside', title: 'See what’s inside', text: 'Calories, protein, sugar, allergens and a simple nutri score — read from the label or estimated by AI.' },
  { key: 'first', title: 'Use it before it’s gone', text: 'Save it to My Food. We’ll tell you what to use first, so less ends up in the bin.' },
] as const;

export function Welcome() {
  const onboarded = useKitchen((s) => s.onboarded);
  const hydrated = useKitchen((s) => s.hydrated);
  const setOnboarded = useKitchen((s) => s.setOnboarded);
  const router = useRouter();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  if (!hydrated || onboarded) return null;

  const go = (n: number) => {
    if (n < 0 || n >= SLIDES.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const finish = (scan: boolean) => {
    setOnboarded();
    if (scan) {
      feedback.success();
      router.push('/scan');
    }
  };
  const s = SLIDES[i];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#8C94B8]/25 backdrop-blur-[3px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Welcome to Nutri Scan" data-testid="welcome">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="w-full max-w-md overflow-hidden rounded-t-[32px] bg-cloud-50 pb-[max(20px,env(safe-area-inset-bottom))] shadow-lift sm:rounded-[32px]">
        <div className="flex justify-end px-4 pt-4">
          <button onClick={() => finish(false)} className="btn btn-ghost min-h-[36px] px-3 text-sm" data-testid="welcome-skip">
            Skip
          </button>
        </div>
        <div className="relative h-[250px] overflow-hidden">
          <AnimatePresence custom={dir} mode="popLayout" initial={false}>
            <motion.div
              key={s.key}
              custom={dir}
              initial={{ x: dir * 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => (info.offset.x < -60 ? go(i + 1) : info.offset.x > 60 ? go(i - 1) : undefined)}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Illustration kind={s.key} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="px-7 text-center">
          <h2 className="h-display text-3xl">{s.title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">{s.text}</p>
          <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Welcome steps">
            {SLIDES.map((x, n) => (
              <button key={x.key} role="tab" aria-selected={n === i} aria-label={`Step ${n + 1}`} onClick={() => go(n)} className={cn('h-2 rounded-full transition-all', n === i ? 'w-7 bg-aqua-600' : 'w-2 bg-cloud-300')} />
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            {i < SLIDES.length - 1 ? (
              <button onClick={() => go(i + 1)} className="btn btn-primary btn-lg" data-testid="welcome-next">
                Next <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button onClick={() => finish(true)} className="btn btn-primary btn-lg" data-testid="welcome-start">
                  <Camera className="h-5 w-5" /> Start scanning
                </button>
                <button onClick={() => finish(false)} className="btn btn-ghost">
                  Explore first
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Illustration({ kind }: { kind: (typeof SLIDES)[number]['key'] }) {
  if (kind === 'snap') {
    return (
      <div className="relative h-52 w-52">
        <div className="absolute inset-0 rounded-[40px] bg-lilac-100" />
        <div className="absolute inset-6 rounded-[28px] border-[5px] border-dashed border-aqua-400" />
        <motion.span className="absolute inset-0 flex items-center justify-center text-8xl" initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <Emoji3D emoji="🥗" size={112} eager />
        </motion.span>
        <motion.span className="absolute left-8 right-8 h-1 rounded-full bg-aqua-500 shadow-[0_0_14px_rgba(79,211,191,0.9)]" animate={{ top: ['22%', '78%', '22%'] }} transition={{ duration: 2.2, repeat: 1 }} />
      </div>
    );
  }
  if (kind === 'inside') {
    return (
      <div className="w-64 rounded-[28px] bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Emoji3D emoji="🍎" size={56} eager />
          <div className="text-left">
            <p className="text-xl font-extrabold text-ink">Apple</p>
            <p className="text-xs font-bold text-ink-muted">1 medium · 94 kcal</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1">
          {(['A', 'B', 'C', 'D', 'E'] as const).map((g, n) => (
            <motion.span
              key={g}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: g === 'A' ? 1.15 : 1, opacity: g === 'A' ? 1 : 0.35 }}
              transition={{ delay: 0.1 + n * 0.08, type: 'spring', stiffness: 400, damping: 14 }}
              className="flex h-10 w-9 items-center justify-center rounded-lg text-lg font-extrabold"
              style={{ background: GRADE_META[g].color, color: GRADE_META[g].ink }}
            >
              {g}
            </motion.span>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-1.5 text-[11px] font-bold">
          <span className="chip bg-aqua-100 text-aqua-800">✓ Low fat</span>
          <span className="chip bg-aqua-100 text-aqua-800">✓ Fibre</span>
        </div>
      </div>
    );
  }
  return (
    <div className="w-64">
      <div className="grid grid-cols-3 gap-2">
        {['🥛', '🍞', '🍚'].map((e, n) => (
          <motion.div
            key={e}
            layout
            initial={{ y: n === 0 ? 0 : 0 }}
            animate={n === 0 ? { y: [0, -18, 118], x: [0, 0, 78] } : {}}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeInOut' }}
            className="flex aspect-square items-center justify-center rounded-2xl bg-white text-4xl shadow-soft"
          >
            <Emoji3D emoji={e} size={48} eager />
          </motion.div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl bg-gradient-to-b from-peach-200 to-peach-300 p-3 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-peach-600">Use First tray</div>
    </div>
  );
}

'use client';

import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { useCalmMotion } from '@/lib/motion';
import { Camera, Check, Sparkles } from 'lucide-react';
import { sampleResult } from '@/features/recognition/samples';
import { NutriScoreStrip } from '@/features/recognition/Nutrition';
import { STATUS_META } from '@/lib/expiry';
import { CountUp } from '@/components/ui/CountUp';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { cn } from '@/lib/utils';

const CHAPTERS = [
  { tag: 'Point', title: 'Just point and tap.', short: 'Back camera, one tap — or upload a photo. Meals, fruit and packets all work.', text: 'Back camera, one tap. Or upload a photo you already took. No barcode needed — a meal, a fruit or a packet all work.' },
  { tag: 'Recognize', title: 'It knows what it’s looking at.', short: 'Gemini names the food and how sure it is. Not sure? It asks.', text: 'Gemini names the food and tells you how sure it is. Not sure? It asks. Scan your phone and it will kindly remind you that’s not a snack.' },
  { tag: 'Understand', title: 'Nutrition you can actually read.', short: 'Calories, macros, allergens and a Nutri score — from the label or clearly marked as an estimate.', text: 'Calories, macros, allergens and a Nutri score from A to E. Read from the label when there is one — clearly marked as an estimate when there isn’t.' },
  { tag: 'Remember', title: 'Then it keeps an eye on it.', short: 'Save it to My Food and it’s sorted by what to use first.', text: 'Save it to My Food and Nutri Scan sorts your kitchen by what to use first — so less ends up in the bin.' },
];

export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  useMotionValueEvent(scrollYProgress, 'change', (p) => setStep(Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(p * CHAPTERS.length * 0.999)))));

  return (
    <section id="story" ref={ref} className="relative bg-gradient-to-b from-lilac-50 via-[#EEF6FF] to-aqua-50 text-ink" style={{ height: `${CHAPTERS.length * 90 + 60}svh` }} data-testid="story">
      <div className="sticky top-16 h-[calc(100svh-4rem-76px)] overflow-hidden lg:h-[calc(100svh-4rem)]">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-aqua-200/60 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lilac-200/60 blur-3xl" />

        <div className="page relative flex h-full flex-col gap-4 py-5 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16 lg:py-0">
          {/* Chapter text */}
          <div className="min-w-0 flex-none">
            <p className="hidden text-xs font-extrabold uppercase tracking-[0.18em] text-lilac-500 sm:block">One photo · four answers</p>
            {/* Progress rail */}
            <div className="flex gap-1.5 sm:mt-4" aria-hidden>
              {CHAPTERS.map((c, i) => (
                <span key={c.tag} className="relative h-1 flex-1 overflow-hidden rounded-full bg-lilac-100">
                  <motion.span className="absolute inset-0 origin-left bg-gradient-to-r from-aqua-300 to-lilac-300" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.4 }} />
                </span>
              ))}
            </div>

            {/* Desktop: all chapters listed, active one lit */}
            <ol className="mt-8 hidden space-y-6 lg:block">
              {CHAPTERS.map((c, i) => (
                <motion.li key={c.tag} animate={{ opacity: i === step ? 1 : 0.32 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm font-extrabold text-lilac-500">
                    0{i + 1} · {c.tag}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight xl:text-4xl">{c.title}</p>
                  <motion.div initial={false} animate={{ height: i === step ? 'auto' : 0, opacity: i === step ? 1 : 0 }} className="overflow-hidden">
                    <p className="max-w-md pt-2 text-lg leading-relaxed text-ink-soft">{c.text}</p>
                  </motion.div>
                </motion.li>
              ))}
            </ol>

            {/* Mobile: one chapter at a time */}
            <div className="mt-3 min-h-[104px] lg:hidden" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                  <p className="text-sm font-extrabold text-lilac-500">
                    0{step + 1} · {CHAPTERS[step].tag}
                  </p>
                  <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight">{CHAPTERS[step].title}</p>
                  <p className="mt-1 text-sm leading-snug text-ink-soft">{CHAPTERS[step].short}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Phone */}
          <div className="flex min-h-0 flex-1 justify-center lg:flex-none">
            <Phone step={step} />
          </div>
        </div>
        <motion.span aria-hidden className="absolute bottom-0 left-0 h-1 w-full origin-left bg-gradient-to-r from-aqua-300 to-lilac-300" style={{ scaleX: progress }} />
      </div>
    </section>
  );
}

/* ---------------- The phone and its four screens ---------------- */

function Phone({ step }: { step: number }) {
  return (
    <div className="relative h-full max-h-[560px] w-full max-w-[340px] rounded-[36px] bg-white p-2 shadow-[0_40px_80px_-24px_rgba(98,84,180,0.35)] ring-1 ring-lilac-200 lg:aspect-[9/18.5] lg:h-[min(600px,calc(100svh-8rem))] lg:max-h-none lg:w-auto lg:max-w-none lg:rounded-[44px] lg:p-2.5">
      <div className="absolute left-1/2 top-3 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-cloud-300 lg:top-3.5 lg:h-5 lg:w-20" />
      <div className="relative h-full w-full overflow-hidden rounded-[29px] bg-cloud-100 text-ink lg:rounded-[36px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && <CameraScreen />}
            {step === 1 && <RecognizeScreen />}
            {step === 2 && <NutritionScreen />}
            {step === 3 && <MyFoodScreen />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const bread = sampleResult('bread');
const breadFood = bread.type === 'food' ? bread : null;

function CameraScreen() {
  const reduce = useCalmMotion();
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#EAF8FF] via-aqua-50 to-lilac-100 text-ink">
      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute inset-[18%_14%] rounded-3xl">
          {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-aqua-400 ${c}`} />
          ))}
          {!reduce && <span className="absolute inset-x-3 h-0.5 animate-sweep rounded-full bg-aqua-400 shadow-[0_0_14px_3px_rgba(79,211,191,0.6)]" />}
        </div>
        <motion.div animate={reduce ? undefined : { rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4 }}>
          <Emoji3D emoji="🍞" size={120} eager />
        </motion.div>
        <span className="absolute top-12 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-ink shadow-soft">Point at food</span>
      </div>
      <div className="flex items-center justify-around pb-7 pt-3">
        <span className="h-10 w-10 rounded-2xl bg-white/80 shadow-soft" />
        <motion.span animate={reduce ? undefined : { scale: [1, 0.9, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-aqua-300 bg-white/60">
          <span className="h-12 w-12 rounded-full bg-gradient-to-br from-aqua-200 to-[#BFE6FF]" />
        </motion.span>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-aqua-700 shadow-soft">
          <Camera className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function RecognizeScreen() {
  const conf = Math.round((breadFood?.confidence ?? 0.9) * 100);
  return (
    <div className="flex h-full flex-col gap-2.5 p-3.5 pt-9 lg:gap-3 lg:p-4 lg:pt-10">
      <div className="flex min-h-[72px] flex-1 items-center justify-center rounded-3xl bg-gradient-to-br from-peach-100 to-lemon-100 lg:max-h-[34%]">
        <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <Emoji3D emoji="🍞" size={96} eager />
        </motion.div>
      </div>
      <div>
        <span className="chip bg-aqua-100 text-aqua-800">
          <Check className="h-3 w-3" /> FOOD
        </span>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-1 text-xl font-extrabold leading-tight">
          {breadFood?.product.name}
        </motion.p>
        <p className="text-xs font-semibold text-ink-muted">Bakery · {breadFood?.product.nutrition?.servingSize}</p>
      </div>
      <div className="rounded-2xl bg-white p-3 ring-1 ring-cloud-300">
        <div className="flex justify-between text-xs font-bold">
          <span>Confidence</span>
          <span className="text-aqua-700">{conf}% · High</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cloud-200">
          <motion.div className="h-full rounded-full bg-aqua-500" initial={{ width: 0 }} animate={{ width: `${conf}%` }} transition={{ delay: 0.2, duration: 0.8 }} />
        </div>
      </div>
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2.5 rounded-2xl bg-coral-50 p-2.5 ring-1 ring-coral-100">
        <Emoji3D emoji="📱" size={34} eager />
        <p className="text-[11px] font-semibold leading-snug text-coral-700">
          <b>Phone?</b> Absolutely zero calories. Also zero nutrition. 😄
        </p>
      </motion.div>
    </div>
  );
}

function NutritionScreen() {
  const n = breadFood?.product.nutrition?.perServing;
  const macros = [
    { k: 'Carbs', v: n?.carbs ?? 0, max: 40, c: 'bg-lemon-400' },
    { k: 'Protein', v: n?.protein ?? 0, max: 40, c: 'bg-aqua-500' },
    { k: 'Fat', v: n?.fat ?? 0, max: 40, c: 'bg-coral-400' },
    { k: 'Fibre', v: n?.fiber ?? 0, max: 40, c: 'bg-lilac-400' },
  ];
  return (
    <div className="flex h-full flex-col gap-2.5 p-3.5 pt-9 lg:gap-3 lg:p-4 lg:pt-10">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Nutri score</p>
      {breadFood?.score && <NutriScoreStrip score={breadFood.score} />}
      <div className="rounded-2xl bg-white p-3 ring-1 ring-cloud-300">
        <div className="flex items-end gap-1.5">
          <CountUp value={n?.calories ?? 0} className="num text-4xl font-extrabold tracking-tight" />
          <span className="pb-1 text-sm font-bold text-ink-muted">kcal</span>
        </div>
        <p className="text-[11px] font-semibold text-ink-muted">per {breadFood?.product.nutrition?.servingSize}</p>
        <div className="mt-3 space-y-2">
          {macros.map((m, i) => (
            <div key={m.k} className="flex items-center gap-2 text-xs font-bold">
              <span className="w-11 text-ink-soft">{m.k}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-cloud-200">
                <motion.span className={cn('block h-full rounded-full', m.c)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.v / m.max) * 100)}%` }} transition={{ delay: 0.15 + i * 0.08, duration: 0.7 }} />
              </span>
              <span className="num w-14 whitespace-nowrap text-right">{m.v} g</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(breadFood?.product.allergens ?? []).map((a) => (
          <motion.span key={a} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="chip bg-lemon-50 capitalize text-lemon-700 ring-1 ring-inset ring-lemon-200">
            ⚠ {a}
          </motion.span>
        ))}
        <span className="chip bg-lemon-100 text-lemon-700">
          <Sparkles className="h-3 w-3" /> AI estimate
        </span>
      </div>
    </div>
  );
}

function MyFoodScreen() {
  const rows = [
    { e: '🥛', n: 'Milk', s: 'use_first' as const, d: 'Tomorrow' },
    { e: '🍞', n: 'Bread', s: 'use_soon' as const, d: '3 days left', fresh: true },
    { e: '🍌', n: 'Bananas', s: 'use_soon' as const, d: '4 days left' },
    { e: '🍚', n: 'Rice', s: 'fresh' as const, d: '6 months left' },
  ];
  return (
    <div className="flex h-full flex-col p-3.5 pt-9 lg:p-4 lg:pt-10">
      <p className="text-xl font-extrabold">My Food</p>
      <p className="text-[11px] font-semibold text-ink-muted">Sorted by what to use first</p>
      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <motion.div
            key={r.n}
            initial={r.fresh ? { opacity: 0, x: 60, scale: 0.9 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ delay: r.fresh ? 0.45 : i * 0.06, type: 'spring', stiffness: 220, damping: 20 }}
            className={cn('flex items-center gap-2.5 rounded-2xl bg-white p-2 ring-1', r.fresh ? 'ring-2 ring-aqua-400' : 'ring-cloud-300')}
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cloud-100">
              <Emoji3D emoji={r.e} size={30} eager />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">{r.n}</p>
              <p className="text-[10px] font-bold" style={{ color: STATUS_META[r.s].ink }}>
                {r.d}
              </p>
            </div>
            <span className="chip flex-none text-[9px]" style={{ background: STATUS_META[r.s].soft, color: STATUS_META[r.s].ink }}>
              {STATUS_META[r.s].short}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-auto rounded-2xl bg-aqua-50 p-2.5 text-center text-[11px] font-bold text-aqua-800">
        ✓ Added · we’ll nudge you before it goes off
      </motion.p>
    </div>
  );
}

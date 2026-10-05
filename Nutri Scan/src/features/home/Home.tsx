'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useInView, useScroll, useSpring } from 'framer-motion';
import { useCalmMotion } from '@/lib/motion';
import { ArrowRight, ChefHat, Leaf, ScanLine, Sparkles } from 'lucide-react';
import type { ScanResult } from '@/types';
import { useActiveFoods, useKitchen } from '@/features/food/store';
import { getExpiryStatus, sortByUrgency } from '@/lib/expiry';
import { GRADE_META } from '@/lib/nutrition/score';
import { ProductCard } from '@/features/inventory/MyFood';
import { NutriScoreStrip } from '@/features/recognition/Nutrition';
import { SAMPLE_KEYS, SAMPLE_LABEL, sampleResult, type SampleKey } from '@/features/recognition/samples';
import { cn } from '@/lib/utils';
import { Welcome } from '@/components/shell/Welcome';
import { JourneyStrip } from '@/features/insights/Journey';
import { CountUp } from '@/components/ui/CountUp';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { Hero } from './Hero';
import { ScrollStory } from './ScrollStory';
import { TimeMachine } from './TimeMachine';

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
} as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function Home() {
  const [hello, setHello] = useState('Hello');
  useEffect(() => setHello(greeting()), []);

  return (
    <div className="overflow-x-clip">
      <Welcome />
      <ScrollProgress />
      <Hero hello={hello} />
      <NeedsAttention />
      <JourneyStrip />
      <ScanStrip />
      <ScrollStory />
      <ScanAnything />
      <TimeMachine />
      <FoodWaste />
      <HowDoesItKnow />
      <SimulationTeaser />
      <FinalCta />
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-lilac-400 via-aqua-500 to-lemon-400" style={{ scaleX }} />;
}

/* ---------------- Needs attention + quick scan (app part) ---------------- */

function NeedsAttention() {
  const foods = useActiveFoods();
  const hydrated = useKitchen((s) => s.hydrated);
  if (!hydrated) return null;
  const urgent = sortByUrgency(foods).filter((f) => ['use_first', 'use_soon', 'expired'].includes(getExpiryStatus(f.expiryDate)));
  if (!urgent.length) return null;
  return (
    <section className="page pb-6" data-testid="needs-attention">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-extrabold text-ink">Needs Attention</h2>
        <Link href="/food" className="text-sm font-bold text-aqua-700">
          My Food →
        </Link>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {urgent.slice(0, 4).map((f) => (
          <Link key={f.id} href="/food" className="block">
            <ProductCard food={f} />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- "Scan anything" marquee ---------------- */

const STRIP: { e: string; name: string; food: boolean; note: string }[] = [
  { e: '🥛', name: 'Milk', food: true, note: 'Nutri B' },
  { e: '📱', name: 'Phone', food: false, note: '0 calories' },
  { e: '🍌', name: 'Banana', food: true, note: '105 kcal' },
  { e: '🐶', name: 'Dog', food: false, note: 'Very good boy' },
  { e: '🍞', name: 'Bread', food: true, note: 'Nutri A' },
  { e: '👟', name: 'Sneaker', food: false, note: 'Not a snack' },
  { e: '🥕', name: 'Carrot', food: true, note: '25 kcal' },
  { e: '💻', name: 'Laptop', food: false, note: 'Crunchy? No.' },
  { e: '🍎', name: 'Apple', food: true, note: 'Nutri A' },
  { e: '📚', name: 'Book', food: false, note: 'Food for thought' },
  { e: '🧀', name: 'Paneer', food: true, note: 'High protein' },
  { e: '🫓', name: 'Aloo Paratha', food: true, note: 'Meal breakdown' },
  { e: '🍱', name: 'Veg Thali', food: true, note: 'Item by item' },
  { e: '🐱', name: 'Cat', food: false, note: 'Absolutely not' },
];

function ScanStrip() {
  const reduce = useCalmMotion();
  return (
    <section aria-label="Things people scan" className="overflow-hidden border-y border-cloud-300/70 bg-white/70 py-4">
      <div className={cn('flex w-max gap-3', !reduce && 'animate-marquee hover:[animation-play-state:paused]')}>
        {[...STRIP, ...STRIP].map((it, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-full bg-cloud-100 py-1.5 pl-1.5 pr-4 ring-1 ring-inset ring-cloud-300" aria-hidden={i >= STRIP.length}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <Emoji3D emoji={it.e} size={30} />
            </span>
            <span className="text-sm font-extrabold text-ink">{it.name}</span>
            <span className={cn('chip text-[10px]', it.food ? 'bg-aqua-100 text-aqua-800' : 'bg-coral-50 text-coral-700')}>{it.food ? 'FOOD' : 'NOT FOOD'}</span>
            <span className="whitespace-nowrap text-xs font-semibold text-ink-muted">{it.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Scan anything demo ---------------- */

function ScanAnything() {
  const reduce = useCalmMotion();
  const [key, setKey] = useState<SampleKey>('phone');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(() => sampleResult('phone'));
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const pick = (k: SampleKey) => {
    setKey(k);
    setScanning(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(sampleResult(k));
      setScanning(false);
    }, reduce ? 150 : 900);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <section id="scan-anything" className="py-16 sm:py-24">
      <div className="page grid items-center gap-10 lg:grid-cols-2">
        <motion.div {...reveal}>
          <p className="eyebrow">Try it · no camera needed</p>
          <h2 className="h-display mt-2 text-3xl sm:text-5xl">Challenge the scanner.</h2>
          <p className="mt-3 text-lg text-ink-soft">Pick anything below. Food gets the full breakdown — everything else gets an honest (and slightly cheeky) answer.</p>
          <div className="mt-6 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Sample items">
            {SAMPLE_KEYS.map((k, i) => (
              <motion.button
                key={k}
                role="radio"
                aria-checked={key === k}
                onClick={() => pick(k)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={reduce ? undefined : { y: -4 }}
                whileTap={{ scale: 0.94 }}
                className={cn('flex flex-col items-center gap-1 rounded-3xl py-3 text-xs font-bold ring-1 ring-inset transition-colors', key === k ? 'bg-gradient-to-b from-aqua-100 to-aqua-200 text-aqua-900 ring-aqua-300 shadow-lift' : 'bg-white text-ink-soft ring-cloud-300')}
                data-testid={`sample-${k}`}
              >
                <Emoji3D emoji={SAMPLE_LABEL[k].emoji} size={44} />
                {SAMPLE_LABEL[k].label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div {...reveal} className="relative mx-auto w-full max-w-md">
          <div className="relative min-h-[380px] overflow-hidden rounded-5xl bg-white p-6 shadow-lift ring-1 ring-cloud-300" aria-live="polite" data-testid="sample-result">
            <span className="absolute right-4 top-4 chip bg-cloud-200 text-ink-muted">Sample result</span>
            <AnimatePresence mode="wait">
              {scanning ? (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-[330px] flex-col items-center justify-center">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-4xl bg-cloud-100">
                    <Emoji3D emoji={SAMPLE_LABEL[key].emoji} size={104} />
                    {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
                      <span key={c} className={`absolute h-7 w-7 border-aqua-500 ${c}`} />
                    ))}
                    {!reduce && <span className="absolute inset-x-4 h-0.5 animate-sweep rounded-full bg-aqua-400 shadow-[0_0_12px_2px_rgba(79,211,191,0.6)]" />}
                  </div>
                  <p className="mt-4 font-bold text-ink-soft">Looking closely…</p>
                </motion.div>
              ) : (
                <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SampleCard result={result} onTryFood={() => pick('apple')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SampleCard({ result, onTryFood }: { result: ScanResult; onTryFood: () => void }) {
  if (result.type === 'food') {
    const n = result.product.nutrition?.perServing ?? result.product.nutrition?.per100;
    return (
      <div className="pt-4">
        <div className="flex items-center gap-3">
          <motion.span initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
            <Emoji3D emoji={result.emoji} size={64} />
          </motion.span>
          <div className="min-w-0">
            <span className="chip bg-aqua-100 text-aqua-800">FOOD · {Math.round(result.confidence * 100)}% sure</span>
            <p className="text-2xl font-extrabold text-ink">{result.product.name}</p>
            <p className="text-sm font-semibold text-ink-muted">{result.product.nutrition?.servingSize}</p>
          </div>
        </div>
        {result.score && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-3xl p-3" style={{ background: GRADE_META[result.score.grade].soft }}>
            <span className="text-sm font-extrabold text-ink">{GRADE_META[result.score.grade].label}</span>
            <NutriScoreStrip score={result.score} size="sm" />
          </div>
        )}
        {n && (
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {(
              [
                ['kcal', n.calories],
                ['protein', n.protein],
                ['carbs', n.carbs],
                ['fat', n.fat],
              ] as const
            ).map(([k, v], i) => (
              <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="rounded-2xl bg-cloud-100 py-2">
                {v === null ? <p className="num text-lg font-extrabold text-ink">—</p> : <CountUp value={v} decimals={Number.isInteger(v) ? 0 : 1} className="num block text-lg font-extrabold text-ink" />}
                <p className="text-[10px] font-bold uppercase text-ink-muted">{k}</p>
              </motion.div>
            ))}
          </div>
        )}
        {result.product.allergens && result.product.allergens.length > 0 && <p className="mt-3 text-sm font-semibold text-lemon-700">⚠ Allergens: {result.product.allergens.join(', ')}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Sparkles className="h-3.5 w-3.5" /> Typical values — a real scan reads the label when it can.
        </p>
      </div>
    );
  }
  if (result.type === 'non_food') {
    return (
      <div className="flex flex-col items-center pt-6 text-center">
        <motion.span initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: [0.4, 1.15, 1], rotate: [-12, 8, 0] }} transition={{ duration: 0.55 }}>
          <Emoji3D emoji={result.emoji} size={96} />
        </motion.span>
        <p className="mt-2 text-2xl font-extrabold text-ink">{result.object}</p>
        <span className="chip mt-2 bg-coral-50 text-coral-700">NOT FOOD</span>
        <p className="mt-4 text-lg font-extrabold text-ink">{result.funTitle}</p>
        <p className="mt-1 text-ink-soft">{result.funMessage}</p>
        <button onClick={onTryFood} className="btn btn-soft mt-5">
          Try Food <Emoji3D emoji="🍎" size={22} />
        </button>
      </div>
    );
  }
  return null;
}

/* ---------------- Food waste ---------------- */

function InViewCount({ value, prefix = '', className }: { value: number; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  return (
    <span ref={ref} className={className}>
      {prefix}
      {seen ? <CountUp value={value} duration={1.4} /> : '0'}
    </span>
  );
}

function FoodWaste() {
  return (
    <section className="py-16 sm:py-24">
      <div className="page">
        <motion.div {...reveal} className="relative grid items-center gap-8 overflow-hidden rounded-5xl bg-white p-6 shadow-soft ring-1 ring-inset ring-cloud-300 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Leaf className="h-4 w-4" /> Food waste
            </p>
            <h2 className="h-display mt-2 text-3xl sm:text-5xl">See how much you save.</h2>
            <p className="mt-3 max-w-lg text-lg text-ink-soft">
              Every time you finish something before it expires, it counts as saved. Add what you paid and Insights shows an estimated value — we don’t make up numbers.
            </p>
            <Link href="/insights" className="btn btn-secondary mt-6">
              Open Insights <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative rounded-4xl bg-aqua-50 p-6">
            <motion.span aria-hidden className="absolute -right-3 -top-6" initial={{ rotate: -20, scale: 0 }} whileInView={{ rotate: 8, scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', delay: 0.3 }}>
              <Emoji3D emoji="🥗" size={84} />
            </motion.span>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-aqua-700">Example month</p>
            <InViewCount value={6} className="num mt-2 block text-6xl font-extrabold text-ink" />
            <p className="text-ink-soft">products used before expiry</p>
            <InViewCount value={340} prefix="₹" className="num mt-4 block text-4xl font-extrabold text-ink" />
            <p className="text-sm text-ink-soft">estimated value, from prices entered</p>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white" aria-hidden>
              <motion.span className="bg-aqua-500" initial={{ width: 0 }} whileInView={{ width: '86%' }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.2 }} />
              <motion.span className="bg-coral-400" initial={{ width: 0 }} whileInView={{ width: '14%' }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1.3 }} />
            </div>
            <p className="mt-1.5 flex justify-between text-[11px] font-bold text-ink-muted">
              <span>Used in time</span>
              <span>Wasted</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- AI honesty ---------------- */

function HowDoesItKnow() {
  const cards = [
    { e: '🏷️', title: 'Read from the label', text: 'Nutrition table, ingredients or a printed date in the photo? Gemini reads it and we mark it “from label”.', tint: 'bg-aqua-50 ring-aqua-100' },
    { e: '✨', title: 'AI estimate', text: 'No label (an apple, a plate of dal)? You get typical values for that food — clearly marked as an estimate.', tint: 'bg-lemon-50 ring-lemon-100' },
    { e: '🔒', title: 'Private by default', text: 'Your photo is sent for analysis and thrown away. People in photos are never identified — just “Human”.', tint: 'bg-cloud-100 ring-cloud-300' },
  ];
  return (
    <section className="bg-white/60 py-16 sm:py-24">
      <div className="page">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">How does it know?</p>
          <h2 className="h-display mt-2 text-3xl sm:text-5xl">Honest about what it sees.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Nutri Scan sends your photo to Google’s Gemini AI. If it isn’t sure, it asks you to confirm — and it never invents an expiry date.
          </p>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div key={c.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} whileHover={{ y: -6 }} className={cn('rounded-4xl p-6 ring-1 ring-inset', c.tint)}>
              <Emoji3D emoji={c.e} size={56} />
              <p className="mt-3 text-xl font-extrabold text-ink">{c.title}</p>
              <p className="mt-1 text-ink-soft">{c.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink-muted">Not medical or dietary advice. If you have an allergy, always check the actual label.</p>
      </div>
    </section>
  );
}

/* ---------------- Simulation teaser + CTA ---------------- */

function SimulationTeaser() {
  const reduce = useCalmMotion();
  const items = [
    { e: '🥛', urgent: true },
    { e: '🧀', urgent: true },
    { e: '🍞', urgent: false },
    { e: '🍌', urgent: false },
    { e: '🧃', urgent: false },
    { e: '🍚', urgent: false },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className="page">
        <motion.div {...reveal} className="grid items-center gap-8 overflow-hidden rounded-5xl bg-gradient-to-br from-peach-100 via-[#FFF3EC] to-lilac-100 p-6 ring-1 ring-inset ring-peach-200 sm:p-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> Mini game
            </p>
            <h2 className="h-display mt-2 text-3xl sm:text-5xl">Play the Smart Kitchen.</h2>
            <p className="mt-3 text-lg text-ink-soft">Your fridge, pantry and counter — with your real food. Tap what should be used first, build a combo and go for three stars.</p>
            <Link href="/kitchen" className="btn btn-primary btn-lg mt-6" data-testid="kitchen-teaser">
              Play now <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5" aria-hidden>
            {items.map((it, i) => (
              <motion.div
                key={it.e}
                initial={{ y: 24, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 200, damping: 16 }}
                whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.4 } }}
                className={cn('relative flex aspect-square items-center justify-center rounded-3xl shadow-soft', it.urgent ? 'bg-white ring-2 ring-coral-300' : 'bg-white/80')}
              >
                <motion.span animate={reduce || !it.urgent ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}>
                  <Emoji3D emoji={it.e} size={64} />
                </motion.span>
                {it.urgent && <span className="absolute -top-2 right-2 rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-extrabold text-coral-700 ring-1 ring-coral-200">USE FIRST</span>}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCta() {
  const reduce = useCalmMotion();
  const floaters = [
    { e: '🍎', c: 'left-[6%] top-[18%]', s: 64 },
    { e: '🥕', c: 'left-[12%] bottom-[14%]', s: 52 },
    { e: '🍌', c: 'right-[7%] top-[16%]', s: 70 },
    { e: '🥛', c: 'right-[13%] bottom-[12%]', s: 56 },
  ];
  return (
    <section className="pb-16">
      <div className="page">
        <motion.div {...reveal} className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-aqua-200 via-[#C9EEFF] to-lilac-200 px-6 py-14 text-center text-ink ring-1 ring-inset ring-white/70 sm:py-20">
          {!reduce && <span aria-hidden className="pointer-events-none absolute inset-x-0 h-24 animate-sweep bg-gradient-to-b from-transparent via-white/40 to-transparent" />}
          {floaters.map((f, i) => (
            <motion.span
              key={f.e}
              aria-hidden
              className={cn('absolute hidden md:block', f.c)}
              animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, i % 2 ? 6 : -6, 0] }}
              transition={{ repeat: Infinity, duration: 4 + i * 0.5, ease: 'easeInOut' }}
            >
              <Emoji3D emoji={f.e} size={f.s} />
            </motion.span>
          ))}
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Scan anything. Understand your food. Waste less.</h2>
          <Link href="/scan" className="btn btn-lg relative mt-8 bg-white text-aqua-800 shadow-lift hover:bg-cloud-50">
            <ScanLine className="h-5 w-5" /> Scan Something
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

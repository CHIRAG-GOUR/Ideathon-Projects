'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useCalmMotion } from '@/lib/motion';
import { ArrowRight, ChevronDown, Refrigerator, ScanLine, Search } from 'lucide-react';
import type { ExpiryStatus, ScanResult } from '@/types';
import { STATUS_META } from '@/lib/expiry';
import { GRADE_META } from '@/lib/nutrition/score';
import { sampleResult, type ExtraSampleKey } from '@/features/recognition/samples';
import { Emoji3D } from '@/components/ui/Emoji3D';

/** Items on the demo table. Positions are % of the stage; values come from the real sample pipeline. */
const TABLE: { key: ExtraSampleKey; emoji: string; x: number; y: number; size: number; depth: number; status: ExpiryStatus; label: string }[] = [
  { key: 'milk', emoji: '🥛', x: 20, y: 25, size: 92, depth: 18, status: 'use_first', label: 'Opened 3 days ago' },
  { key: 'banana', emoji: '🍌', x: 76, y: 21, size: 104, depth: 26, status: 'fresh', label: 'Ripe in 2 days' },
  { key: 'bread', emoji: '🍞', x: 48, y: 52, size: 120, depth: 34, status: 'use_soon', label: 'Best before Fri' },
  { key: 'cheese', emoji: '🧀', x: 18, y: 78, size: 86, depth: 14, status: 'use_first', label: 'Use by tomorrow' },
  { key: 'apple', emoji: '🍎', x: 80, y: 76, size: 88, depth: 22, status: 'fresh', label: 'Keeps for weeks' },
  { key: 'carrot', emoji: '🥕', x: 52, y: 86, size: 72, depth: 10, status: 'fresh', label: 'In the crisper' },
];

const HEADLINE: { w: string; green?: boolean }[] = [{ w: 'Know' }, { w: 'what' }, { w: 'you’re' }, { w: 'looking', green: true }, { w: 'at.', green: true }];

export function Hero({ hello }: { hello: string }) {
  const reduce = useCalmMotion();
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-lilac-100/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-40 top-64 -z-10 h-80 w-80 rounded-full bg-lemon-100/60 blur-3xl" />
      <div className="page grid items-center gap-8 pb-10 pt-6 sm:pt-10 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pb-14">
        <div className="min-w-0">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold text-ink-soft" data-testid="greeting">
            {hello} 👋
          </motion.p>
          <h1 className="h-display mt-3 text-[2.7rem] leading-[1.02] min-[400px]:text-5xl sm:text-6xl xl:text-7xl" aria-label="Know what you’re looking at.">
            {HEADLINE.map((h, i) => (
              <span key={h.w} className="inline-block overflow-hidden pb-1 align-bottom" aria-hidden>
                <motion.span
                  className={`inline-block ${h.green ? 'text-aqua-600' : ''}`}
                  initial={reduce ? false : { y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  {h.w}
                </motion.span>
                {i < HEADLINE.length - 1 && ' '}
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
            Point your camera at any food. Get its nutrition, a health score and allergens in seconds — then Nutri Scan reminds you to eat it before it goes off.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/scan" className="btn btn-primary btn-lg" data-testid="hero-scan">
              <ScanLine className="h-5 w-5" /> Scan Something
            </Link>
            <Link href="/food" className="btn btn-secondary btn-lg">
              <Refrigerator className="h-5 w-5" /> My Food
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <DishSearch />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <ScanTable />
        </motion.div>
      </div>
      <a href="#story" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center text-xs font-bold text-ink-muted lg:flex" aria-label="Scroll to see how it works">
        See how it works
        <motion.span animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </a>
    </section>
  );
}

/** Look up a dish or a whole meal by name — opens the scanner with the search running. */
function DishSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const go = (v: string) => {
    const t = v.trim();
    if (t.length >= 2) router.push(`/scan?q=${encodeURIComponent(t.slice(0, 200))}`);
  };
  return (
    <div className="mt-5 max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        role="search"
        className="flex items-center gap-2 rounded-full bg-white/90 p-1.5 pl-4 shadow-soft ring-1 ring-inset ring-cloud-300 focus-within:ring-2 focus-within:ring-aqua-300"
      >
        <Search className="h-5 w-5 flex-none text-ink-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Or look up a meal — “2 parathas with curd”"
          aria-label="Look up a food or meal"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
          data-testid="hero-search"
        />
        <button type="submit" disabled={q.trim().length < 2} className="btn btn-primary h-9 w-9 min-h-0 flex-none p-0" aria-label="Look it up">
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-ink-muted">
        {['Veg thali', 'Rajma chawal', 'Masala dosa', 'Pasta'].map((d) => (
          <button key={d} type="button" onClick={() => go(d)} className="underline decoration-cloud-400 underline-offset-4 hover:text-aqua-700">
            {d}
          </button>
        ))}
      </p>
    </div>
  );
}

/* ---------------- The live scan table ---------------- */

function ScanTable() {
  const reduce = useCalmMotion();
  const [active, setActive] = useState(2);
  const pausedUntil = useRef(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });

  const results = useMemo(() => TABLE.map((t) => sampleResult(t.key)), []);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setActive((a) => (a + 1) % TABLE.length);
    }, 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const pick = (i: number) => {
    pausedUntil.current = Date.now() + 7000;
    setActive(i);
  };

  const item = TABLE[active];
  const res = results[active];
  const food = res.type === 'food' ? res : null;
  const kcal = food?.product.nutrition?.perServing?.calories ?? food?.product.nutrition?.per100.calories ?? null;
  const tagLeft = item.x > 55;
  const tagBelow = item.y < 40;

  return (
    <div className="mx-auto w-full max-w-[560px]">
    <div
      className="relative aspect-square w-full select-none sm:aspect-[5/4]"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      data-testid="scan-table"
    >
      {/* Table cloth */}
      <div
        className="absolute inset-0 rounded-[44px] bg-gradient-to-br from-[#FFFFFF] via-[#F1F7FF] to-[#E9F8F4] shadow-lift ring-1 ring-inset ring-white/70"
        style={{ backgroundImage: 'radial-gradient(rgba(135,105,232,0.12) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />
      <div aria-hidden className="absolute inset-x-10 top-6 h-24 rounded-full bg-white/50 blur-2xl" />

      <span className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-coral-600 shadow-soft ring-1 ring-coral-100 backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-coral-400" /> Live demo
      </span>

      {TABLE.map((t, i) => (
        <TableItem key={t.key} t={t} index={i} active={i === active} onPick={() => pick(i)} sx={sx} sy={sy} reduce={!!reduce} />
      ))}

      {/* Reticle */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10"
        initial={false}
        animate={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size + 34, height: item.size + 34 }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
        style={{ x: '-50%', y: '-50%' }}
      >
        {['left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl', 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl', 'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl', 'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl'].map((c) => (
          <span key={c} className={`absolute h-6 w-6 border-aqua-500 ${c}`} />
        ))}
        {!reduce && (
          <span className="absolute inset-2 overflow-hidden rounded-xl">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-beam bg-gradient-to-b from-transparent via-lilac-300/40 to-transparent" />
          </span>
        )}
      </motion.div>

      {/* Result tag, floating next to the item (tablet / desktop) */}
      <AnimatePresence>
        {food && (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ delay: reduce ? 0 : 0.22, type: 'spring', stiffness: 260, damping: 22 }}
            className="pointer-events-none absolute z-30 hidden w-[220px] sm:block"
            style={{
              // Next to the item, but never past the table's edge.
              left: tagLeft ? undefined : `clamp(8px, calc(${item.x}% + ${item.size / 2 + 12}px), calc(100% - 228px))`,
              right: tagLeft ? `clamp(8px, calc(${100 - item.x}% + ${item.size / 2 + 12}px), calc(100% - 228px))` : undefined,
              top: tagBelow ? `calc(${item.y}% + ${item.size / 2 - 10}px)` : undefined,
              bottom: tagBelow ? undefined : `calc(${100 - item.y}% + ${item.size / 2 - 10}px)`,
            }}
          >
            <TagCard food={food} item={item} kcal={kcal} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="absolute bottom-3 right-5 z-20 text-[10px] font-semibold text-ink-muted/80">Tap an item · sample values</p>
    </div>

    {/* Phones: the result sits under the table so it never covers the food */}
    <div className="mt-3 min-h-[118px] sm:hidden" aria-live="polite">
      <AnimatePresence mode="wait">
        {food && (
          <motion.div key={item.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ delay: reduce ? 0 : 0.25 }}>
            <TagCard food={food} item={item} kcal={kcal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

function TagCard({ food, item, kcal }: { food: Extract<ScanResult, { type: 'food' }>; item: (typeof TABLE)[number]; kcal: number | null }) {
  return (
    <div className="rounded-3xl bg-white/95 p-3 shadow-lift ring-1 ring-cloud-300 backdrop-blur" data-testid="scan-tag" data-item={item.key}>
      <div className="flex items-center justify-between gap-2">
        <span className="chip bg-aqua-100 text-[10px] text-aqua-800">FOOD · {Math.round(food.confidence * 100)}% sure</span>
        {food.score && (
          <span className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-extrabold" style={{ background: GRADE_META[food.score.grade].color, color: GRADE_META[food.score.grade].ink }} title={`Nutri score ${food.score.grade}`}>
            {food.score.grade}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-lg font-extrabold leading-tight text-ink">{food.product.name}</p>
      <p className="num text-sm font-bold text-ink-soft">
        {kcal ?? '—'} kcal <span className="font-semibold text-ink-muted">· {food.product.nutrition?.servingSize}</span>
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="chip flex-none text-[10px]" style={{ background: STATUS_META[item.status].soft, color: STATUS_META[item.status].ink }}>
          {STATUS_META[item.status].label}
        </span>
        <span className="truncate text-[11px] font-semibold text-ink-muted">{item.label}</span>
      </div>
    </div>
  );
}

function TableItem({
  t,
  index,
  active,
  onPick,
  sx,
  sy,
  reduce,
}: {
  t: (typeof TABLE)[number];
  index: number;
  active: boolean;
  onPick: () => void;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useTransform(sx, (v) => v * t.depth);
  const y = useTransform(sy, (v) => v * t.depth);
  return (
    <div className="absolute z-[5] -translate-x-1/2 -translate-y-1/2" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
    <motion.button
      type="button"
      onClick={onPick}
      aria-label={`Scan the ${t.key}`}
      aria-pressed={active}
      className="block rounded-full outline-none focus-visible:ring-4 focus-visible:ring-aqua-300"
      style={{ x, y }}
      initial={reduce ? false : { opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.08, type: 'spring', stiffness: 220, damping: 16 }}
    >
      <motion.span
        className="block"
        animate={reduce ? { scale: active ? 1.08 : 1 } : { y: [0, -7, 0], scale: active ? 1.1 : 1, rotate: active ? [0, -4, 4, 0] : 0 }}
        transition={{ y: { repeat: Infinity, duration: 3.4 + index * 0.35, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 300, damping: 15 }, rotate: { duration: 0.5 } }}
      >
        <Emoji3D emoji={t.emoji} size={t.size} eager className="drop-shadow-[0_14px_14px_rgba(62,72,120,0.2)]" />
      </motion.span>
    </motion.button>
    </div>
  );
}

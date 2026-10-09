'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Check, Flame, Play, RotateCcw, ScanLine, Sparkles, Star, Trophy } from 'lucide-react';
import { feedback as sfx } from '@/lib/feedback';
import type { FoodItem, SimulationItem } from '@/types';
import { useActiveFoods, useKitchen } from '@/features/food/store';
import { STATUS_META, daysUntil, describeDays, getExpiryStatus } from '@/lib/expiry';
import { CATEGORY_META, emojiForFood } from '@/lib/food/meta';
import { cn } from '@/lib/utils';
import { Emoji3D } from '@/components/ui/Emoji3D';

/**
 * Smart Kitchen: the user's own food (same data as My Food / the scanner) placed in a
 * fridge, pantry and on the counter. Goal: tap what should be used first, every time.
 */
function toSim(food: FoodItem): SimulationItem {
  const days = daysUntil(food.expiryDate);
  return { food, daysLeft: days, status: getExpiryStatus(food.expiryDate) };
}

export function SmartKitchen() {
  const foods = useActiveFoods();
  const hydrated = useKitchen((s) => s.hydrated);
  const loadSample = useKitchen((s) => s.loadSampleKitchen);
  const [moved, setMoved] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; id: number } | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const recordStars = useKitchen((s) => s.recordKitchenStars);
  const celebrated = useRef(false);

  const items = useMemo(() => foods.map(toSim), [foods]);
  // Playable: has a date and hasn't expired. Round goal: always pick the soonest remaining.
  const playable = items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0);
  const remaining = playable.filter((i) => !moved.includes(i.food.id)).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const urgentLeft = remaining.filter((i) => i.status === 'use_first' || i.status === 'use_soon');
  const done = playable.length > 0 && urgentLeft.length === 0 && moved.length > 0;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  useEffect(() => {
    if (!done || celebrated.current) return;
    celebrated.current = true;
    recordStars(stars);
    sfx.celebrate();
    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ['#7EE4D3', '#C5B4FF', '#FFDE5A', '#FFA59B', '#9CD8FF'], disableForReducedMotion: true });
    } catch {
      /* decorative */
    }
  }, [done, stars, recordStars]);

  const traySlots = items.filter((i) => moved.includes(i.food.id)).sort((a, b) => moved.indexOf(a.food.id) - moved.indexOf(b.food.id));

  const tap = (item: SimulationItem) => {
    if (moved.includes(item.food.id)) return;
    if (item.daysLeft === null) {
      setFeedback({ ok: false, text: `${item.food.name} has no expiry date yet — add one in My Food.`, id: Date.now() });
      return;
    }
    if (item.daysLeft < 0) {
      setFeedback({ ok: false, text: `${item.food.name} has expired. Check it before using — or throw it away.`, id: Date.now() });
      return;
    }
    const soonest = remaining[0];
    const when = describeDays(item.daysLeft).toLowerCase();
    if (soonest && (item.daysLeft ?? 0) <= (soonest.daysLeft ?? 0)) {
      setMoved((m) => [...m, item.food.id]);
      setScore((s) => s + 10 + combo * 5);
      setCombo((c) => c + 1);
      sfx.success();
      setFeedback({ ok: true, text: `${item.food.name} ${when.startsWith('expires') ? when : `— ${when}`}. Use it first!`, id: Date.now() });
    } else {
      setWrong(item.food.id);
      setTimeout(() => setWrong(null), 500);
      setMistakes((m) => m + 1);
      setCombo(0);
      sfx.unsure();
      setFeedback({ ok: false, text: `Not quite — ${item.food.name} is ${when}, but ${soonest.food.name} is ${describeDays(soonest.daysLeft).toLowerCase()}.`, id: Date.now() });
    }
  };

  const reset = () => {
    setMoved([]);
    setScore(0);
    setMistakes(0);
    setCombo(0);
    setFeedback(null);
    celebrated.current = false;
  };

  if (!hydrated) return <div className="page py-10" />;

  return (
    <div className="page py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Simulation</p>
          <h1 className="h-display mt-1 text-3xl sm:text-4xl">Smart Kitchen</h1>
          <p className="mt-1 max-w-xl text-ink-soft">Tap the food that should be used first. It slides into the Use First tray. Keep going until the urgent food is sorted.</p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {combo >= 2 && (
              <motion.span key={combo} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="chip bg-coral-50 py-2 text-sm text-coral-600" data-testid="combo">
                <Flame className="h-4 w-4" /> {combo}× combo
              </motion.span>
            )}
            <span className="chip bg-lemon-100 py-2 text-sm text-lemon-700">
              <Trophy className="h-4 w-4" /> <span className="num" data-testid="kitchen-score">{score}</span> pts
            </span>
            <button onClick={reset} className="btn btn-ghost">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 card p-8 text-center">
          <p className="text-5xl">🧑‍🍳</p>
          <p className="mt-3 text-xl font-extrabold text-ink">Your kitchen is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-ink-muted">Scan some food — it will appear here — or load a sample kitchen to try the game.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={loadSample} className="btn btn-primary" data-testid="kitchen-load-sample">
              <Sparkles className="h-4 w-4" /> Load sample kitchen
            </button>
            <Link href="/scan" className="btn btn-secondary">
              <ScanLine className="h-4 w-4" /> Scan food
            </Link>
          </div>
        </div>
      ) : (
        <LayoutGroup>
          <div className="relative mt-6 overflow-hidden rounded-5xl bg-gradient-to-br from-[#FFF6F0] to-lilac-50 p-3 shadow-lift ring-1 ring-inset ring-cloud-300 sm:p-5" data-testid="kitchen-scene">
            <AnimatePresence>
              {!started && (
                <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 p-4 backdrop-blur-[2px]" data-testid="kitchen-mission">
                  <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-4xl bg-white p-6 text-center shadow-lift">
                    <p className="eyebrow">Today’s mission</p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">Sort the kitchen</p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {urgentLeft.length > 0
                        ? `${urgentLeft.length} item${urgentLeft.length === 1 ? ' needs' : 's need'} using soon. Tap them in order — soonest expiry first.`
                        : 'Nothing is close to expiry right now — tap items in order of expiry anyway to practise.'}
                    </p>
                    <p className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-lemon-600">
                      <Star className="h-4 w-4 fill-lemon-400 text-lemon-400" /> 3 stars for a perfect run
                    </p>
                    <button onClick={() => setStarted(true)} className="btn btn-primary btn-lg mt-5 w-full" data-testid="kitchen-start">
                      <Play className="h-5 w-5" /> Start
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* wall tiles */}
            <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#e7defd 1px, transparent 1px), linear-gradient(90deg, #e7defd 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="relative grid gap-3 md:grid-cols-[1.1fr_1fr_0.9fr]">
              <Zone title="Refrigerator" icon="🧊" tone="fridge" items={items.filter((i) => i.food.storage === 'fridge' || i.food.storage === 'freezer')} moved={moved} wrong={wrong} onTap={tap} />
              <Zone title="Pantry" icon="🗄️" tone="pantry" items={items.filter((i) => i.food.storage === 'pantry')} moved={moved} wrong={wrong} onTap={tap} />
              <Zone title="Counter" icon="🧺" tone="counter" items={items.filter((i) => i.food.storage === 'counter')} moved={moved} wrong={wrong} onTap={tap} />
            </div>

            {/* Use First tray */}
            <div className="relative mt-3 rounded-4xl bg-gradient-to-b from-peach-200 to-peach-300 p-3 shadow-inner" data-testid="use-first-tray">
              <p className="mb-2 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-peach-600">
                <span className="h-2 w-2 rounded-full bg-coral-500" /> Use First tray
              </p>
              <div className="flex min-h-[76px] flex-wrap items-center gap-2 rounded-3xl bg-white/50 p-2">
                {traySlots.length === 0 && <p className="px-2 text-sm font-semibold text-peach-600/70">Tap the food that expires soonest…</p>}
                {traySlots.map((i, idx) => (
                  <motion.div key={i.food.id} layoutId={`sim-${i.food.id}`} transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft">
                    <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-coral-100 text-xs font-extrabold text-coral-700">{idx + 1}</span>
                    <Emoji3D emoji={emojiForFood(i.food.name, i.food.category)} size={28} />
                    <span className="text-sm font-bold text-ink">{i.food.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </LayoutGroup>
      )}

      <AnimatePresence mode="wait">
        {feedback && !done && (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn('mt-4 flex items-start gap-3 rounded-3xl p-4 font-bold', feedback.ok ? 'bg-aqua-50 text-aqua-800' : 'bg-lemon-50 text-lemon-700')}
            role="status"
            data-testid="kitchen-feedback"
          >
            {feedback.ok ? <Check className="mt-0.5 h-5 w-5 flex-none" /> : <span aria-hidden>🤔</span>}
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {done && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-4xl bg-gradient-to-br from-aqua-100 via-[#DDF2FF] to-lilac-100 p-6 text-center text-ink ring-1 ring-inset ring-aqua-200" data-testid="kitchen-done">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 text-2xl font-extrabold">Kitchen sorted!</p>
          <div className="mt-2 flex justify-center gap-1" aria-label={`${stars} of 3 stars`} data-testid="kitchen-stars" data-stars={stars}>
            {[1, 2, 3].map((n) => (
              <motion.span key={n} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 + n * 0.15, type: 'spring', stiffness: 400, damping: 12 }}>
                <Star className={cn('h-9 w-9', n <= stars ? 'fill-lemon-300 text-lemon-400' : 'text-cloud-400')} />
              </motion.span>
            ))}
          </div>
          <p className="text-sm text-ink-soft">
            {score} points · {mistakes === 0 ? 'no mistakes!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
          </p>
          <p className="mt-1 text-ink-soft">Use these first: {traySlots.map((i) => i.food.name).join(', ')}.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/food" className="btn btn-secondary">
              See My Food
            </Link>
            <button onClick={reset} className="btn btn-primary">
              <RotateCcw className="h-4 w-4" /> Play again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const TONES: Record<'fridge' | 'pantry' | 'counter', { shell: string; shelf: string }> = {
  fridge: { shell: 'bg-gradient-to-b from-[#F4FBFF] to-[#E4F2F8] ring-[#CFE4EE]', shelf: 'border-[#CFE4EE]' },
  pantry: { shell: 'bg-gradient-to-b from-peach-100 to-peach-200 ring-peach-200', shelf: 'border-peach-300' },
  counter: { shell: 'bg-gradient-to-b from-[#FFFBF2] to-lemon-100 ring-lemon-200', shelf: 'border-peach-300' },
};

function Zone({
  title,
  icon,
  tone,
  items,
  moved,
  wrong,
  onTap,
}: {
  title: string;
  icon: string;
  tone: 'fridge' | 'pantry' | 'counter';
  items: SimulationItem[];
  moved: string[];
  wrong: string | null;
  onTap: (i: SimulationItem) => void;
}) {
  const t = TONES[tone];
  const shelves: SimulationItem[][] = [];
  const visible = items.filter((i) => !moved.includes(i.food.id));
  for (let i = 0; i < Math.max(1, Math.ceil(visible.length / 3)); i++) shelves.push(visible.slice(i * 3, i * 3 + 3));
  return (
    <div className={cn('rounded-4xl p-3 ring-2 ring-inset', t.shell)}>
      <p className="px-1 text-xs font-extrabold uppercase tracking-[0.12em] text-ink-soft">
        {icon} {title}
      </p>
      <div className="mt-2 space-y-2">
        {shelves.map((row, r) => (
          <div key={r} className={cn('flex min-h-[92px] items-end gap-2 border-b-[6px] px-1 pb-1', t.shelf)}>
            {row.map((i) => (
              <SimFood key={i.food.id} item={i} wrong={wrong === i.food.id} onTap={() => onTap(i)} />
            ))}
            {row.length === 0 && <span className="pb-3 text-xs font-semibold text-ink-faint">Empty</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimFood({ item, wrong, onTap }: { item: SimulationItem; wrong: boolean; onTap: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const m = STATUS_META[item.status];
  return (
    <motion.button
      layoutId={`sim-${item.food.id}`}
      onClick={() => {
        setRevealed(true);
        onTap();
      }}
      animate={wrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex w-[31%] min-w-[78px] flex-col items-center rounded-2xl bg-white/85 px-1 pb-1.5 pt-2 shadow-soft"
      aria-label={`${item.food.name}${revealed ? `, ${describeDays(item.daysLeft)}` : ''}`}
      data-testid={`sim-${item.food.name}`}
    >
      <Emoji3D emoji={emojiForFood(item.food.name, item.food.category)} size={40} eager />
      <span className="mt-1 break-words text-center text-[11px] font-bold leading-tight text-ink">{item.food.name}</span>
      {revealed && (
        <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold" style={{ background: m.soft, color: m.ink }}>
          {item.daysLeft === null ? 'no date' : describeDays(item.daysLeft)}
        </motion.span>
      )}
    </motion.button>
  );
}

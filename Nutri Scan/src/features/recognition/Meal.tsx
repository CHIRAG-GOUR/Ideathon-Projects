'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Utensils } from 'lucide-react';
import type { DietType, Meal } from '@/types';
import { emojiForFood } from '@/lib/food/meta';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { CountUp } from '@/components/ui/CountUp';
import { cn } from '@/lib/utils';

export const PORTIONS = [
  { v: 0.5, label: '½' },
  { v: 1, label: '1' },
  { v: 1.5, label: '1½' },
  { v: 2, label: '2' },
] as const;

/**
 * The plate, item by item. `meal` is the original breakdown; `adjusted` is what the user says they
 * ate (items left out + portion multiplier), which drives the totals everywhere else on the page.
 */
export function MealCard({
  meal,
  adjusted,
  excluded,
  onToggle,
  multiplier,
  onMultiplier,
}: {
  meal: Meal;
  adjusted: Meal;
  excluded: ReadonlySet<number>;
  onToggle: (i: number) => void;
  multiplier: number;
  onMultiplier: (m: number) => void;
}) {
  const total = adjusted.components.reduce((a, c) => a + (c.calories ?? 0), 0);
  const maxKcal = Math.max(1, ...meal.components.map((c) => (c.calories ?? 0) * multiplier));
  return (
    <div className="rounded-3xl bg-gradient-to-br from-lilac-50 via-white to-aqua-50 p-4 ring-1 ring-inset ring-lilac-100" data-testid="meal-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-lilac-500">
            <Utensils className="h-3.5 w-3.5" /> On your plate
          </p>
          {meal.portion && <p className="mt-0.5 text-sm font-semibold text-ink-soft">{meal.portion}</p>}
        </div>
        <div className="text-right">
          <p className="num text-2xl font-extrabold leading-none text-ink">
            <CountUp value={Math.round(total)} testId="meal-total" /> <span className="text-sm font-bold text-ink-muted">kcal</span>
          </p>
          {adjusted.totalGrams ? <p className="num text-[11px] font-semibold text-ink-muted">~{adjusted.totalGrams} g</p> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink-soft">How much did you have?</p>
        <div className="flex rounded-full bg-white p-0.5 ring-1 ring-inset ring-lilac-100" role="radiogroup" aria-label="Portion size">
          {PORTIONS.map((p) => (
            <button
              key={p.v}
              role="radio"
              aria-checked={multiplier === p.v}
              aria-label={`${p.label} plate${p.v === 1 ? '' : 's'}`}
              onClick={() => onMultiplier(p.v)}
              className={cn('num min-w-[40px] rounded-full px-2.5 py-1.5 text-sm font-extrabold transition', multiplier === p.v ? 'bg-aqua-200 text-aqua-900 shadow-soft' : 'text-ink-muted')}
              data-testid={`portion-${p.v}`}
            >
              {p.label}×
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {meal.components.map((c, i) => {
          const off = excluded.has(i);
          const kcal = c.calories === null ? null : Math.round(c.calories * multiplier);
          const grams = c.grams === null ? null : Math.round(c.grams * multiplier);
          return (
            <li key={`${c.name}-${i}`}>
              <button
                type="button"
                onClick={() => onToggle(i)}
                aria-pressed={!off}
                aria-label={`${c.name}${off ? ', left out' : ''}. Tap to ${off ? 'include' : 'leave out'}.`}
                className={cn('flex w-full items-center gap-2.5 rounded-2xl bg-white/90 p-2 pr-3 text-left ring-1 ring-inset transition', off ? 'opacity-50 ring-cloud-300' : 'ring-lilac-100 hover:ring-aqua-300')}
                data-testid={`meal-item-${i}`}
                data-off={off}
              >
                <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-cloud-100">
                  <Emoji3D emoji={emojiForFood(c.name, 'prepared')} size={32} />
                  <span className={cn('absolute -right-1 -top-1 flex items-center justify-center rounded-full ring-2 ring-white', off ? 'bg-cloud-300' : 'bg-aqua-300')} style={{ width: 18, height: 18 }}>
                    {!off && <Check className="h-3 w-3 text-aqua-900" strokeWidth={3} />}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-extrabold text-ink', off && 'line-through')}>{c.name}</span>
                  <span className="block truncate text-[11px] font-semibold text-ink-muted">
                    {multiplier === 1 ? c.portion ?? (grams ? `~${grams} g` : '') : grams ? `~${grams} g` : c.portion ?? ''}
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-cloud-200">
                    <motion.span className="block h-full rounded-full bg-gradient-to-r from-aqua-300 to-lilac-300" initial={false} animate={{ width: off || kcal === null ? '0%' : `${(kcal / maxKcal) * 100}%` }} />
                  </span>
                </span>
                <span className="num flex-none text-right text-sm font-extrabold text-ink">
                  {kcal ?? '—'}
                  <span className="block text-[10px] font-bold text-ink-muted">kcal</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] font-semibold text-ink-muted">Tap an item you didn’t have to leave it out.</p>

      <AnimatePresence>
        {meal.assumptions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-2xl bg-white/80 p-3" data-testid="meal-assumptions">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
              <Info className="h-3.5 w-3.5" /> How we estimated
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
              {meal.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DIET: Record<Exclude<DietType, 'unknown'>, { label: string; mark: 'veg' | 'nonveg' | 'egg' }> = {
  vegetarian: { label: 'Likely vegetarian', mark: 'veg' },
  vegan: { label: 'Likely vegan', mark: 'veg' },
  eggetarian: { label: 'Contains egg', mark: 'egg' },
  non_vegetarian: { label: 'Non-vegetarian', mark: 'nonveg' },
};

/** Indian-style food mark (green dot = veg, brown triangle = non-veg). AI-judged, so worded as "likely". */
export function DietMark({ diet }: { diet: DietType | undefined }) {
  if (!diet || diet === 'unknown') return null;
  const d = DIET[diet];
  const color = d.mark === 'veg' ? '#1FA25A' : d.mark === 'egg' ? '#E0A100' : '#A0522D';
  return (
    <span className="chip bg-white text-ink-soft ring-1 ring-inset ring-cloud-300" data-testid="diet-mark" data-diet={diet}>
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border-[1.5px]" style={{ borderColor: color }} aria-hidden>
        {d.mark === 'nonveg' ? (
          <span className="h-0 w-0 border-x-[3.5px] border-b-[6px] border-x-transparent" style={{ borderBottomColor: color }} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        )}
      </span>
      {d.label}
    </span>
  );
}

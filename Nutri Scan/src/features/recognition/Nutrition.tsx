'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Sparkles, Tag } from 'lucide-react';
import type { Macros, NutriGrade, NutriScore, Nutrition } from '@/types';
import { GRADE_META } from '@/lib/nutrition/score';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/ui/CountUp';

const GRADES: NutriGrade[] = ['A', 'B', 'C', 'D', 'E'];

/** Nutri-Score style strip: the computed grade pops out. */
export function NutriScoreStrip({ score, size = 'lg' }: { score: NutriScore; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Nutri score ${score.grade}`} data-testid="nutri-score" data-grade={score.grade}>
      {GRADES.map((g) => {
        const active = g === score.grade;
        return (
          <motion.span
            key={g}
            initial={active ? { scale: 0.6 } : false}
            animate={active ? { scale: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.2 }}
            className={cn(
              'flex items-center justify-center rounded-lg font-extrabold',
              size === 'lg' ? (active ? 'h-12 w-10 text-2xl shadow-soft' : 'h-8 w-7 text-sm opacity-40') : active ? 'h-7 w-6 text-sm' : 'h-5 w-4 text-[10px] opacity-40'
            )}
            style={{ background: GRADE_META[g].color, color: GRADE_META[g].ink }}
          >
            {g}
          </motion.span>
        );
      })}
    </div>
  );
}

export function ScoreCard({ score }: { score: NutriScore }) {
  return (
    <div className="rounded-3xl p-4" style={{ background: GRADE_META[score.grade].soft }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Nutri score</p>
          <p className="text-lg font-extrabold text-ink">{GRADE_META[score.grade].label}</p>
        </div>
        <NutriScoreStrip score={score} />
      </div>
      {(score.highlights.length > 0 || score.cautions.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {score.highlights.map((h) => (
            <span key={h} className="chip bg-white/80 text-aqua-800">
              ✓ {h}
            </span>
          ))}
          {score.cautions.map((c) => (
            <span key={c} className="chip bg-white/80 text-coral-700">
              <AlertTriangle className="h-3 w-3" /> {c}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-snug text-ink-muted">A simplified Nutri-Score calculated from the nutrition values below. A general guide for comparing foods — not medical or diet advice.</p>
    </div>
  );
}

const ROWS: { key: keyof Macros; label: string; unit: string; sub?: boolean }[] = [
  { key: 'carbs', label: 'Carbohydrates', unit: 'g' },
  { key: 'sugar', label: 'of which sugars', unit: 'g', sub: true },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'saturatedFat', label: 'of which saturated', unit: 'g', sub: true },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

export function NutritionPanel({ nutrition, name }: { nutrition: Nutrition; name: string }) {
  const [view, setView] = useState<'serving' | '100'>(nutrition.perServing ? 'serving' : '100');
  const m = view === 'serving' && nutrition.perServing ? nutrition.perServing : nutrition.per100;
  const per = nutrition.basis === 'per_100ml' ? '100 ml' : '100 g';
  const kcalP = (m.protein ?? 0) * 4;
  const kcalC = (m.carbs ?? 0) * 4;
  const kcalF = (m.fat ?? 0) * 9;
  const total = kcalP + kcalC + kcalF || 1;

  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-cloud-300" data-testid="nutrition-panel" data-source={nutrition.source}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Nutrition</p>
        {nutrition.perServing && (
          <div className="flex rounded-full bg-cloud-200 p-0.5 text-xs font-bold" role="tablist" aria-label="Nutrition basis">
            {(
              [
                ['serving', 'Per serving'],
                ['100', `Per ${per}`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn('rounded-full px-3 py-1.5 transition', view === k ? 'bg-white text-ink shadow-soft' : 'text-ink-muted')}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        {m.calories !== null ? (
          <CountUp key={view} value={m.calories} className="num text-4xl font-extrabold tracking-tight text-ink" testId="calories" />
        ) : (
          <span className="num text-4xl font-extrabold tracking-tight text-ink" data-testid="calories">
            —
          </span>
        )}
        <span className="pb-1 text-sm font-bold text-ink-muted">kcal</span>
        <span className="ml-auto pb-1 text-right text-xs font-semibold text-ink-muted">
          {view === 'serving' && nutrition.servingSize ? nutrition.servingSize : `per ${per}`}
        </span>
      </div>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-cloud-200" aria-hidden>
        <motion.span initial={{ width: 0 }} animate={{ width: `${(kcalC / total) * 100}%` }} className="bg-lemon-400" />
        <motion.span initial={{ width: 0 }} animate={{ width: `${(kcalP / total) * 100}%` }} className="bg-aqua-500" />
        <motion.span initial={{ width: 0 }} animate={{ width: `${(kcalF / total) * 100}%` }} className="bg-coral-400" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-ink-soft">
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-lemon-400" /> Carbs {fmt(m.carbs)} g
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-aqua-500" /> Protein {fmt(m.protein)} g
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-coral-400" /> Fat {fmt(m.fat)} g
        </span>
      </div>

      <dl className="mt-4 divide-y divide-cloud-200 text-sm">
        {ROWS.map((r) => (
          <div key={r.key} className={cn('flex justify-between py-2', r.sub && 'pl-4 text-ink-muted')}>
            <dt className={r.sub ? '' : 'font-semibold text-ink-soft'}>{r.label}</dt>
            <dd className="num font-bold text-ink">{m[r.key] === null ? '—' : `${fmt(m[r.key])} ${r.unit}`}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
        {nutrition.source === 'label' ? <Tag className="mt-0.5 h-3.5 w-3.5 flex-none" /> : <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none" />}
        {nutrition.source === 'label' ? 'Read from the nutrition label in your photo. Double-check the pack.' : `AI estimate for a typical ${name.toLowerCase()} — real values vary by recipe, brand and portion.`}
      </p>
    </div>
  );
}

export function IngredientsCard({ ingredients, allergens, source }: { ingredients: string[] | null; allergens: string[] | null; source: 'label' | 'estimate' | null }) {
  if (!ingredients && !allergens) return null;
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-cloud-300" data-testid="ingredients">
      {ingredients && (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">{source === 'label' ? 'Ingredients' : 'Typical ingredients'}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{ingredients.join(', ')}</p>
        </>
      )}
      {allergens && (
        <div className={ingredients ? 'mt-3' : ''}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Allergens</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {allergens.map((a) => (
              <span key={a} className="chip bg-lemon-50 capitalize text-lemon-700 ring-1 ring-inset ring-lemon-200">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
        {source === 'label' ? 'Read from the label in your photo.' : 'Estimated by AI.'} If you have an allergy, always check the actual label.
      </p>
    </div>
  );
}

function fmt(v: number | null) {
  if (v === null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

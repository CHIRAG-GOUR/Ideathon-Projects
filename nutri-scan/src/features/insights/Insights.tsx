'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Leaf, Loader2, Sparkles, Trash2 } from 'lucide-react';
import type { RecipeIdea } from '@/types';
import { useActiveFoods, useKitchen } from '@/features/food/store';
import { daysUntil, getExpiryStatus } from '@/lib/expiry';
import { formatRupees, timeAgo, cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { suggestRecipes } from './suggestions';
import { Journey } from './Journey';

export function Insights() {
  const usage = useKitchen((s) => s.usage);
  const scans = useKitchen((s) => s.scans);
  const hydrated = useKitchen((s) => s.hydrated);
  const foods = useActiveFoods();

  const month = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const inMonth = usage.filter((u) => new Date(u.at) >= start);
    const savedIds = new Set(inMonth.filter((u) => u.kind === 'used' && u.beforeExpiry !== false).map((u) => u.foodId));
    const wastedIds = new Set(inMonth.filter((u) => u.kind === 'wasted').map((u) => u.foodId));
    const priced = inMonth.filter((u) => u.kind === 'used' && u.beforeExpiry !== false && u.value !== null);
    return { saved: savedIds.size, wasted: wastedIds.size, value: priced.reduce((s, u) => s + (u.value ?? 0), 0), hasPrices: priced.length > 0 };
  }, [usage]);

  const weeks = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 6 }, (_, i) => {
      const end = now - i * 7 * 86_400_000;
      const start = end - 7 * 86_400_000;
      const inWeek = usage.filter((u) => {
        const t = new Date(u.at).getTime();
        return t > start && t <= end;
      });
      return {
        label: i === 0 ? 'This wk' : `${i}w ago`,
        saved: new Set(inWeek.filter((u) => u.kind === 'used').map((u) => u.foodId)).size,
        wasted: new Set(inWeek.filter((u) => u.kind === 'wasted').map((u) => u.foodId)).size,
      };
    }).reverse();
  }, [usage]);
  const maxBar = Math.max(1, ...weeks.map((w) => w.saved + w.wasted));

  const urgent = foods.filter((f) => ['use_first', 'use_soon'].includes(getExpiryStatus(f.expiryDate)));
  const ideas = suggestRecipes(urgent.length ? urgent : foods);

  if (!hydrated) return <div className="page py-10" />;

  return (
    <div className="page space-y-6 py-6 sm:py-10">
      <div>
        <h1 className="h-display text-3xl sm:text-4xl">Insights</h1>
        <p className="mt-1 text-ink-soft">How your kitchen is doing this month.</p>
      </div>

      {usage.length === 0 && foods.length === 0 ? (
        <EmptyState emoji="📊" title="Add a few foods to start seeing patterns." cta="Scan something" href="/scan" />
      ) : (
        <section className="card overflow-hidden" data-testid="food-saved">
          <div className="grid gap-4 bg-aqua-50 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-aqua-700">
                <Leaf className="h-4 w-4" /> Food Saved
              </p>
              <p className="num mt-1 text-4xl font-extrabold text-ink">{month.saved}</p>
              <p className="text-sm text-ink-soft">products used before expiry this month</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-aqua-700">Estimated value</p>
              <p className="num mt-1 text-4xl font-extrabold text-ink">{month.hasPrices ? formatRupees(month.value) : '—'}</p>
              <p className="text-sm text-ink-soft">{month.hasPrices ? 'from prices you entered' : 'Add a price to foods to estimate this'}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-coral-600">
                <Trash2 className="h-4 w-4" /> Wasted
              </p>
              <p className="num mt-1 text-4xl font-extrabold text-ink">{month.wasted}</p>
              <p className="text-sm text-ink-soft">products thrown away this month</p>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-bold text-ink-soft">Last 6 weeks</p>
            <div className="mt-3 flex h-32 items-end gap-2 sm:gap-4" role="img" aria-label="Products used and wasted per week">
              {weeks.map((w, i) => (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full max-w-[44px] flex-1 flex-col justify-end overflow-hidden rounded-xl bg-cloud-100">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(w.wasted / maxBar) * 100}%` }} transition={{ delay: i * 0.05 }} className="bg-coral-300" />
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(w.saved / maxBar) * 100}%` }} transition={{ delay: i * 0.05 }} className="bg-aqua-400" />
                  </div>
                  <span className="text-[10px] font-bold text-ink-muted">{w.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs font-bold text-ink-soft">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-aqua-400" /> Used
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-coral-300" /> Wasted
              </span>
            </div>
          </div>
        </section>
      )}

      <Journey />

      <Suggestions ideas={ideas} urgent={urgent.length ? urgent.map((f) => ({ name: f.name, daysLeft: daysUntil(f.expiryDate) })) : []} />

      <section>
        <h2 className="text-xl font-extrabold text-ink">Recent Scans</h2>
        {scans.length === 0 ? (
          <p className="mt-3 rounded-3xl bg-white p-6 text-center text-ink-muted">Your scans will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cloud-200 overflow-hidden rounded-4xl bg-white ring-1 ring-inset ring-cloud-300" data-testid="recent-scans">
            {scans.slice(0, 12).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-cloud-100 text-xl">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-xs text-ink-muted">{s.detail}</p>
                </div>
                <div className="text-right">
                  <span className={cn('chip', s.type === 'food' ? 'bg-aqua-100 text-aqua-800' : s.type === 'non_food' ? 'bg-coral-50 text-coral-700' : 'bg-cloud-200 text-ink-soft')}>
                    {s.type === 'food' ? 'Food' : s.type === 'non_food' ? 'Not food' : 'Unsure'}
                  </span>
                  <p className="mt-1 text-[11px] text-ink-faint">{timeAgo(s.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Suggestions({ ideas, urgent }: { ideas: ReturnType<typeof suggestRecipes>; urgent: { name: string; daysLeft: number | null }[] }) {
  const [ai, setAi] = useState<RecipeIdea[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const getAi = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: urgent.slice(0, 8) }) });
      const body = (await res.json()) as { ok: boolean; data?: RecipeIdea[]; error?: string };
      if (!body.ok || !body.data) throw new Error(body.error);
      setAi(body.data);
      setState('idle');
    } catch (e) {
      setMsg((e as Error).message === 'not_configured' ? 'AI ideas aren’t set up yet.' : 'Couldn’t get ideas right now. Try again.');
      setState('error');
    }
  };

  return (
    <section data-testid="suggestions">
      <h2 className="text-xl font-extrabold text-ink">Use it up</h2>
      <p className="text-sm text-ink-muted">Simple recipe ideas for food that needs using soon — ideas only, not dietary advice.</p>
      {ideas.length === 0 && !ai ? (
        <p className="mt-3 rounded-3xl bg-white p-5 text-sm text-ink-muted">When something is close to expiry, ideas to use it will show up here.</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {ideas.map((r) => (
            <div key={r.title} className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-cloud-300">
              <p className="text-3xl">{r.emoji}</p>
              <p className="mt-1 font-extrabold text-ink">{r.title}</p>
              <p className="text-sm text-ink-muted">{r.uses.join(' + ')}</p>
            </div>
          ))}
        </div>
      )}
      {urgent.length > 0 && !ai && (
        <button onClick={getAi} disabled={state === 'loading'} className="btn btn-soft mt-3" data-testid="ai-recipes">
          {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {state === 'loading' ? 'Thinking up ideas…' : 'Get AI recipe ideas'}
        </button>
      )}
      {state === 'error' && <p className="mt-2 text-sm font-semibold text-lemon-700">{msg}</p>}
      {ai && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="ai-recipe-list">
          {ai.map((r) => (
            <motion.div key={r.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-lilac-50 p-4 ring-1 ring-inset ring-lilac-200">
              <p className="text-3xl">{r.emoji}</p>
              <p className="mt-1 font-extrabold text-ink">{r.title}</p>
              <p className="text-xs font-bold text-lilac-500">{r.minutes} min · {r.uses.join(', ')}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink-soft">
                {r.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </motion.div>
          ))}
          <p className="text-xs text-ink-muted sm:col-span-3">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Generated by AI — check ingredients and allergens yourself. <Link href="/food" className="underline">See My Food</Link>
          </p>
        </div>
      )}
    </section>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Plus, ScanLine, Trash2, Utensils } from 'lucide-react';
import type { ExpiryStatus, FoodItem } from '@/types';
import { useActiveFoods, useKitchen } from '@/features/food/store';
import { STATUS_META, daysUntil, describeDays, getExpiryStatus, sortByUrgency } from '@/lib/expiry';
import { CATEGORY_META, STORAGE_META, formatQuantity } from '@/lib/food/meta';
import { computeNutriScore } from '@/lib/nutrition/score';
import { formatDate, formatRupees, cn } from '@/lib/utils';
import { FoodImage } from '@/components/ui/FoodImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { FoodForm } from '@/features/food/FoodForm';
import { NutriScoreStrip, NutritionPanel } from '@/features/recognition/Nutrition';

type Filter = 'all' | ExpiryStatus;
const FILTERS: Filter[] = ['all', 'use_first', 'use_soon', 'fresh', 'expired', 'no_expiry'];
const GROUP_ORDER: ExpiryStatus[] = ['use_first', 'use_soon', 'fresh', 'no_expiry', 'expired'];

export function MyFood() {
  const foods = useActiveFoods();
  const hydrated = useKitchen((s) => s.hydrated);
  const loadSample = useKitchen((s) => s.loadSampleKitchen);
  const addFood = useKitchen((s) => s.addFood);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(() => sortByUrgency(foods), [foods]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: foods.length, use_first: 0, use_soon: 0, fresh: 0, expired: 0, no_expiry: 0 };
    foods.forEach((f) => c[getExpiryStatus(f.expiryDate)]++);
    return c;
  }, [foods]);
  const shown = filter === 'all' ? sorted : sorted.filter((f) => getExpiryStatus(f.expiryDate) === filter);
  const open = foods.find((f) => f.id === openId) ?? null;

  return (
    <div className="page py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl sm:text-4xl">My Food</h1>
          <p className="mt-1 text-ink-soft">{foods.length ? `${foods.length} item${foods.length === 1 ? '' : 's'} · sorted by what to use first` : 'Everything you scan and save lives here.'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="btn btn-secondary">
            <Plus className="h-4 w-4" /> Add
          </button>
          <Link href="/scan" className="btn btn-primary">
            <ScanLine className="h-4 w-4" /> Scan
          </Link>
        </div>
      </div>

      {foods.length > 0 && (
        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn('chip flex-none py-2 text-sm ring-1 ring-inset transition', filter === f ? 'bg-lilac-100 text-lilac-500 ring-lilac-300' : 'bg-white text-ink-soft ring-cloud-300')}
            >
              {f !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[f].color }} />}
              {f === 'all' ? 'All' : STATUS_META[f].label}
              <span className={cn('num rounded-full px-1.5 text-xs', filter === f ? 'bg-white/20' : 'bg-cloud-200')}>{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {!hydrated ? null : foods.length === 0 ? (
          <div className="space-y-3">
            <EmptyState emoji="🧺" title="Nothing here yet." text="Scan a food to see its nutrition and keep track of when to use it." cta="Scan Your First Food" href="/scan" />
            <button onClick={loadSample} className="btn btn-ghost w-full" data-testid="load-sample">
              Or load a sample kitchen to explore
            </button>
          </div>
        ) : filter === 'all' ? (
          GROUP_ORDER.map((g) => {
            const items = sorted.filter((f) => getExpiryStatus(f.expiryDate) === g);
            if (!items.length) return null;
            return (
              <section key={g} className="mb-6">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em]" style={{ color: STATUS_META[g].ink }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[g].color }} />
                  {STATUS_META[g].label}
                  <span className="text-ink-faint">· {items.length}</span>
                </h2>
                <FoodList items={items} onOpen={setOpenId} />
              </section>
            );
          })
        ) : shown.length ? (
          <FoodList items={shown} onOpen={setOpenId} />
        ) : (
          <p className="rounded-3xl bg-white p-6 text-center text-ink-muted">Nothing in this group.</p>
        )}
      </div>

      <FoodDetail food={open} onClose={() => setOpenId(null)} />

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Add food manually">
        <FoodForm
          initial={{ name: '', brand: null, category: 'other', quantity: 1, unit: 'pcs', storage: 'pantry', expiryDate: null, expirySource: null, price: null, keepPhoto: false }}
          submitLabel="Save to My Food"
          onSubmit={(v) => {
            addFood({ ...v, photo: null, nutrition: null, allergens: null, expirySource: v.expiryDate ? 'user' : null });
            setAdding(false);
            toast('Added to My Food');
          }}
        />
      </BottomSheet>
    </div>
  );
}

function FoodList({ items, onOpen }: { items: FoodItem[]; onOpen: (id: string) => void }) {
  return (
    <motion.ul layout className="grid gap-2.5 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {items.map((f) => (
          <motion.li key={f.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
            <ProductCard food={f} onOpen={() => onOpen(f.id)} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

export function ProductCard({ food, onOpen }: { food: FoodItem; onOpen?: () => void }) {
  const status = getExpiryStatus(food.expiryDate);
  const score = computeNutriScore(food.nutrition, food.category, food.name);
  return (
    <button onClick={onOpen} className="card flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lift" data-testid={`food-${food.name}`}>
      <FoodImage photo={food.photo} category={food.category} name={food.name} className="h-16 w-16 text-[28px]" rounded="rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold leading-tight text-ink">{food.name}</p>
        <p className="text-xs font-semibold text-ink-muted">
          {formatQuantity(food.quantity, food.unit)} · {STORAGE_META[food.storage].emoji} {STORAGE_META[food.storage].label}
        </p>
        <p className="mt-0.5 text-sm font-bold" style={{ color: STATUS_META[status].ink }}>
          {describeDays(daysUntil(food.expiryDate))}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <StatusBadge status={status} size="sm" />
        {score && <NutriScoreStrip score={score} size="sm" />}
      </div>
    </button>
  );
}

function FoodDetail({ food, onClose }: { food: FoodItem | null; onClose: () => void }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'use' | 'delete'>('view');
  const updateFood = useKitchen((s) => s.updateFood);
  const consumeFood = useKitchen((s) => s.consumeFood);
  const deleteFood = useKitchen((s) => s.deleteFood);
  const close = () => {
    setMode('view');
    onClose();
  };
  if (!food) return <BottomSheet open={false} onClose={close} title="" children={null} />;
  const status = getExpiryStatus(food.expiryDate);
  const score = computeNutriScore(food.nutrition, food.category, food.name);

  return (
    <BottomSheet open={Boolean(food)} onClose={close} title={mode === 'edit' ? `Edit ${food.name}` : mode === 'use' ? 'Mark as used' : food.name} testId="food-detail">
      {mode === 'view' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <FoodImage photo={food.photo} category={food.category} name={food.name} className="h-20 w-20 text-[34px]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-muted">
                {CATEGORY_META[food.category].emoji} {CATEGORY_META[food.category].label}
                {food.brand ? ` · ${food.brand}` : ''}
              </p>
              <p className="num text-2xl font-extrabold text-ink" data-testid="detail-qty">
                {formatQuantity(food.quantity, food.unit)}
              </p>
              <StatusBadge status={status} className="mt-1" />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Fact label="Expiry" value={food.expiryDate ? `${formatDate(food.expiryDate)} · ${describeDays(daysUntil(food.expiryDate))}` : 'Not set'} />
            <Fact label="Storage" value={`${STORAGE_META[food.storage].emoji} ${STORAGE_META[food.storage].label}`} />
            <Fact label="Added" value={formatDate(food.addedAt)} />
            <Fact label="Price" value={food.price !== null ? formatRupees(food.price) : '—'} />
            {food.expirySource && <Fact label="Expiry from" value={food.expirySource === 'label' ? 'Label (scanned)' : 'You'} />}
            {food.allergens && <Fact label="Allergens" value={food.allergens.join(', ')} />}
          </dl>
          {score && (
            <div className="flex items-center justify-between rounded-3xl bg-cloud-100 p-3">
              <span className="text-sm font-bold text-ink-soft">Nutri score</span>
              <NutriScoreStrip score={score} size="sm" />
            </div>
          )}
          {food.nutrition && <NutritionPanel nutrition={food.nutrition} name={food.name} />}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button className="btn btn-secondary flex-col gap-0.5 py-2" onClick={() => setMode('edit')} data-testid="detail-edit">
              <Pencil className="h-4 w-4" /> <span className="text-xs">Edit</span>
            </button>
            <button className="btn btn-primary flex-col gap-0.5 py-2" onClick={() => setMode('use')} data-testid="detail-use">
              <Utensils className="h-4 w-4" /> <span className="text-xs">Mark Used</span>
            </button>
            <button className="btn btn-danger flex-col gap-0.5 py-2" onClick={() => setMode('delete')} data-testid="detail-delete">
              <Trash2 className="h-4 w-4" /> <span className="text-xs">Delete</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <FoodForm
          initial={{
            name: food.name,
            brand: food.brand,
            category: food.category,
            quantity: food.quantity,
            unit: food.unit,
            storage: food.storage,
            expiryDate: food.expiryDate,
            expirySource: food.expirySource,
            price: food.price,
            keepPhoto: Boolean(food.photo),
          }}
          photoAvailable={Boolean(food.photo)}
          submitLabel="Save changes"
          onSubmit={(v) => {
            updateFood(food.id, {
              name: v.name,
              brand: v.brand,
              category: v.category,
              quantity: v.quantity,
              initialQuantity: Math.max(food.initialQuantity, v.quantity),
              unit: v.unit,
              storage: v.storage,
              expiryDate: v.expiryDate,
              expirySource: v.expiryDate ? v.expirySource ?? 'user' : null,
              price: v.price,
              photo: v.keepPhoto ? food.photo : null,
            });
            toast('Saved');
            setMode('view');
          }}
        />
      )}

      {mode === 'use' && (
        <UseForm
          food={food}
          onDone={(amount) => {
            const entry = consumeFood(food.id, amount, 'used');
            if (entry) toast(amount >= food.quantity ? `${food.name} used up — nice!` : `Marked ${formatQuantity(amount, food.unit)} as used`);
            if (amount >= food.quantity) close();
            else setMode('view');
          }}
        />
      )}

      {mode === 'delete' && (
        <div className="space-y-2 pb-2">
          <p className="text-ink-soft">What happened to the {food.name.toLowerCase()}?</p>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              consumeFood(food.id, food.quantity, 'used');
              toast(`${food.name} used up`);
              close();
            }}
          >
            <Check className="h-4 w-4" /> We ate / used it
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={() => {
              consumeFood(food.id, food.quantity, 'wasted');
              toast('Noted — we’ll count it as wasted', 'info');
              close();
            }}
            data-testid="delete-wasted"
          >
            It went bad — threw it away
          </button>
          <button
            className="btn btn-ghost w-full"
            onClick={() => {
              deleteFood(food.id);
              toast('Removed', 'info');
              close();
            }}
            data-testid="delete-remove"
          >
            Just remove it (added by mistake)
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

function UseForm({ food, onDone }: { food: FoodItem; onDone: (amount: number) => void }) {
  const [amount, setAmount] = useState<number>(food.quantity);
  const remaining = Math.max(0, +(food.quantity - amount).toFixed(3));
  const presets: [string, number][] = [
    ['All of it', food.quantity],
    ['Half', +(food.quantity / 2).toFixed(2)],
    ['A quarter', +(food.quantity / 4).toFixed(2)],
  ];
  return (
    <div className="space-y-4 pb-2" data-testid="use-form">
      <p className="text-ink-soft">
        You have <strong className="num text-ink">{formatQuantity(food.quantity, food.unit)}</strong> of {food.name.toLowerCase()}. How much did you use?
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map(([label, v]) => (
          <button key={label} type="button" onClick={() => setAmount(v)} className={cn('chip py-2 text-sm ring-1 ring-inset', amount === v ? 'bg-aqua-200 text-aqua-900 ring-aqua-300' : 'bg-white text-ink-soft ring-cloud-300')}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <label className="label" htmlFor="use-amt">
            Amount used ({food.unit})
          </label>
          <input id="use-amt" className="field num" type="number" inputMode="decimal" min={0} max={food.quantity} step="any" value={amount} onChange={(e) => setAmount(Math.min(food.quantity, Math.max(0, Number(e.target.value))))} />
        </div>
      </div>
      <div className="rounded-3xl bg-cloud-100 p-4">
        <p className="text-sm font-bold text-ink-muted">Remaining</p>
        <p className="num text-2xl font-extrabold text-ink" data-testid="use-remaining">
          {formatQuantity(remaining, food.unit)}
        </p>
      </div>
      <button className="btn btn-primary btn-lg w-full" disabled={!(amount > 0)} onClick={() => onDone(amount)} data-testid="use-submit">
        <Check className="h-5 w-5" /> Mark as Used
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-inset ring-cloud-300">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-bold text-ink">{value}</dd>
    </div>
  );
}

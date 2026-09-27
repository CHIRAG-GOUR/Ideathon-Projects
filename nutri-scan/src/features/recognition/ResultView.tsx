'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Keyboard, RotateCcw, ScanLine, Search, Sparkles, Tag, X } from 'lucide-react';
import type { FoodItem, Product, ScanResult } from '@/types';
import { CATEGORY_META, STORAGE_META, emojiForFood, emojiForName, parseQuantityText } from '@/lib/food/meta';
import { daysUntil, describeDays, getExpiryStatus } from '@/lib/expiry';
import { FoodImage } from '@/components/ui/FoodImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import { FoodForm, type FoodFormValues } from '@/features/food/FoodForm';
import { useKitchen } from '@/features/food/store';
import { IngredientsCard, NutritionPanel, ScoreCard } from './Nutrition';
import { DietMark, MealCard } from './Meal';
import { adjustMeal } from '@/lib/nutrition/meal';
import { computeNutriScore } from '@/lib/nutrition/score';
import { feedback } from '@/lib/feedback';
import { Emoji3D } from '@/components/ui/Emoji3D';

const rise = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export function ResultView({
  result,
  image,
  thumb,
  onScanAgain,
}: {
  result: ScanResult;
  image: string | null;
  thumb: string | null;
  onScanAgain: () => void;
}) {
  if (result.type === 'food') return <FoodResult result={result} image={image} thumb={thumb} onScanAgain={onScanAgain} />;
  if (result.type === 'non_food') return <NonFoodResult result={result} image={image} onScanAgain={onScanAgain} />;
  return <UnknownResult result={result} image={image} onScanAgain={onScanAgain} />;
}

function Hero({ image, emoji, children }: { image: string | null; emoji?: string; children?: React.ReactNode }) {
  if (!image && emoji) {
    // Typed search: no photo, so show the food itself.
    return (
      <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-b-[32px] bg-gradient-to-br from-aqua-100 via-[#E4F2FF] to-lilac-100 sm:aspect-[21/9] sm:rounded-[32px]">
        <motion.span initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
          <Emoji3D emoji={emoji} size={120} eager className="drop-shadow-[0_18px_18px_rgba(62,72,120,0.2)]" />
        </motion.span>
        {children}
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-b-[32px] bg-cloud-200 sm:rounded-[32px]">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="Your scan" className="h-full w-full object-cover" />
      )}
      {children}
    </div>
  );
}

function FoodResult({ result, image, thumb, onScanAgain }: { result: Extract<ScanResult, { type: 'food' }>; image: string | null; thumb: string | null; onScanAgain: () => void }) {
  const [confirmed, setConfirmed] = useState(result.confidenceLevel === 'high');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const addFood = useKitchen((s) => s.addFood);
  const p: Product = result.product;
  const meta = CATEGORY_META[p.category];
  const days = daysUntil(p.expiryDate);
  const fromLabel = p.nutrition?.source === 'label';
  const heroImage = image;
  // Our own artwork for a known dish name beats the model's emoji pick.
  const heroEmoji = emojiForName(p.name) ?? result.emoji ?? emojiForFood(p.name, p.category);
  const meal = p.nutrition?.meal ?? null;
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());
  const [multiplier, setMultiplier] = useState(1);
  // What the user actually had: drives the score, the nutrition panel and what gets saved.
  const nutrition = useMemo(() => (p.nutrition && meal ? adjustMeal(p.nutrition, { excluded, multiplier }) : p.nutrition), [p.nutrition, meal, excluded, multiplier]);
  const score = useMemo(() => (meal && nutrition ? computeNutriScore(nutrition, p.category, p.name) : result.score), [meal, nutrition, p.category, p.name, result.score]);
  const toggle = (i: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (!confirmed) {
    return (
      <div data-testid="result-confirm">
        <Hero image={heroImage} emoji={heroEmoji} />
        <motion.div {...rise} className="page -mt-10 relative">
          <div className="card p-6 text-center">
            <p className="text-sm font-bold text-ink-muted">Is this right?</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">
              Looks like {p.name} {result.emoji}
            </p>
            <p className="mt-2 text-sm text-ink-muted">AI estimates what it sees, so please confirm before adding it.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn btn-primary btn-lg" onClick={() => setConfirmed(true)} data-testid="confirm-yes">
                <Check className="h-5 w-5" /> Yes
              </button>
              <button className="btn btn-secondary btn-lg" onClick={onScanAgain} data-testid="confirm-no">
                <X className="h-5 w-5" /> Try Again
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const quantity = parseQuantityText(p.quantityText);
  const initial: FoodFormValues = {
    name: p.name,
    brand: p.brand,
    category: p.category,
    quantity: quantity?.quantity ?? (meal ? multiplier : 1),
    unit: quantity?.unit ?? (p.isPackaged ? 'pack' : 'pcs'),
    storage: p.storage ?? meta.storage,
    expiryDate: p.expiryDate,
    expirySource: p.expirySource,
    price: null,
    keepPhoto: false,
  };

  const onAdd = (v: FoodFormValues) => {
    const id = addFood({
      name: v.name,
      brand: v.brand,
      category: v.category,
      quantity: v.quantity,
      unit: v.unit,
      storage: v.storage,
      expiryDate: v.expiryDate,
      expirySource: v.expiryDate ? v.expirySource ?? 'user' : null,
      price: v.price,
      photo: v.keepPhoto ? thumb : null,
      nutrition,
      allergens: p.allergens,
    } satisfies Omit<FoodItem, 'id' | 'addedAt' | 'updatedAt' | 'initialQuantity' | 'deleted'>);
    setAdding(false);
    setAdded(id);
    feedback.success();
    toast('Added to My Food');
  };

  return (
    <div data-testid="result-food">
      <Hero image={heroImage} emoji={heroEmoji}>
        <span className="absolute left-4 top-4 chip bg-white/95 py-1.5 text-aqua-700 shadow-soft">
          {fromLabel ? <Tag className="h-3.5 w-3.5" /> : !heroImage ? <Search className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {fromLabel ? 'Read from the label' : !heroImage ? 'From your search · AI estimate' : 'AI estimate'}
        </span>
      </Hero>
      <motion.div {...rise} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="page relative -mt-10">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <FoodImage category={p.category} name={p.name} emoji={heroEmoji} className="h-16 w-16 text-[28px]" rounded="rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip bg-aqua-100 text-aqua-800">{p.isMeal ? 'MEAL' : 'FOOD'}</span>
                {p.cuisine && <span className="chip bg-lilac-50 text-lilac-500">{p.cuisine}</span>}
                <DietMark diet={p.dietType} />
              </div>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-ink" data-testid="result-name">
                {p.name}
              </h1>
              <p className="text-sm font-semibold text-ink-muted">
                {meta.emoji} {meta.label}
                {p.brand ? ` · ${p.brand}` : ''}
              </p>
            </div>
          </div>

          {p.description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{p.description}</p>}

          <div className="mt-4 space-y-3">
            {meal && nutrition?.meal && (
              <MealCard meal={meal} adjusted={nutrition.meal} excluded={excluded} onToggle={toggle} multiplier={multiplier} onMultiplier={setMultiplier} />
            )}
            {score && <ScoreCard score={score} />}
            {nutrition ? (
              <NutritionPanel nutrition={nutrition} name={p.name} />
            ) : (
              <p className="rounded-3xl bg-cloud-100 p-4 text-sm text-ink-muted">Nutrition couldn’t be estimated for this one.</p>
            )}
            <IngredientsCard ingredients={p.ingredients} allergens={p.allergens} source={p.ingredientsSource} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {p.isMeal ? (
              <Info label="Cuisine" value={p.cuisine ?? '—'} muted={!p.cuisine} />
            ) : (
              <Info label="Quantity" value={p.quantityText ?? 'Not visible'} muted={!p.quantityText} />
            )}
            <Info label="Storage" value={p.storage ? STORAGE_META[p.storage].label : '—'} />
          </dl>
          {p.storageTip && <p className="mt-2 px-1 text-sm text-ink-muted">💡 {p.storageTip}</p>}

          <div className="mt-3 rounded-3xl bg-cloud-100 p-4" data-testid="result-expiry">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Expiry</p>
              {p.expiryDate && <StatusBadge status={getExpiryStatus(p.expiryDate)} size="sm" />}
            </div>
            {p.expiryDate ? (
              <p className="mt-1 text-lg font-extrabold text-ink">
                {describeDays(days)} <span className="text-sm font-semibold text-ink-muted">· read from the label</span>
              </p>
            ) : (
              <p className="mt-1 text-base font-bold text-ink-soft">Expiry date not detected</p>
            )}
            {!p.expiryDate && <p className="text-xs text-ink-muted">You can add it when you save — we never guess expiry dates.</p>}
          </div>


          {added ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 rounded-3xl bg-aqua-50 p-4 text-center" data-testid="added-state">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-aqua-200 text-aqua-800">
                <Check className="h-7 w-7" />
              </motion.span>
              <p className="mt-2 font-extrabold text-aqua-800">Added to My Food</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/food" className="btn btn-secondary">
                  View My Food
                </Link>
                <button onClick={onScanAgain} className="btn btn-primary">
                  <ScanLine className="h-4 w-4" /> Scan Again
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="mt-5 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
              <button className="btn btn-primary btn-lg" onClick={() => setAdding(true)} data-testid="add-to-food">
                Add to My Food
              </button>
              <button className="btn btn-secondary btn-lg" onClick={onScanAgain} data-testid="scan-again">
                <RotateCcw className="h-5 w-5" /> Scan Again
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Add to My Food" testId="add-sheet">
        <FoodForm initial={initial} photoAvailable={Boolean(thumb)} submitLabel="Save to My Food" onSubmit={onAdd} />
      </BottomSheet>
    </div>
  );
}

function Info({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-2xl bg-cloud-50 px-3 py-2.5 ring-1 ring-inset ring-cloud-200">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 break-words font-bold ${muted ? 'text-ink-faint' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}

function NonFoodResult({ result, image, onScanAgain }: { result: Extract<ScanResult, { type: 'non_food' }>; image: string | null; onScanAgain: () => void }) {
  return (
    <div data-testid="result-nonfood" data-kind={result.kind}>
      <Hero image={image} />
      <motion.div {...rise} className="page relative -mt-12">
        <div className="card p-6 text-center">
          <motion.div
            initial={{ scale: 0.3, rotate: -12 }}
            animate={{ scale: [0.3, 1.18, 1], rotate: [-12, 6, 0] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-lilac-50 shadow-soft"
            aria-hidden
          >
            <Emoji3D emoji={result.emoji} size={68} eager />
          </motion.div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink" data-testid="result-name">
            {result.object}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="chip bg-coral-50 text-coral-700">NOT FOOD</span>
            {result.category && <span className="chip bg-cloud-200 text-ink-soft">{result.category}</span>}
          </div>
          <p className="mt-5 text-xl font-extrabold text-ink" data-testid="fun-title">
            {result.funTitle}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-base leading-relaxed text-ink-soft" data-testid="fun-message">
            {result.funMessage}
          </p>
          <div className="mt-6 grid gap-2">
            <button className="btn btn-primary btn-lg" onClick={onScanAgain} data-testid="scan-edible">
              <ScanLine className="h-5 w-5" /> {result.kind === 'person' ? 'Let’s scan something edible' : 'Scan Something Edible'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function UnknownResult({ result, image, onScanAgain }: { result: Extract<ScanResult, { type: 'unknown' }>; image: string | null; onScanAgain: () => void }) {
  const [manual, setManual] = useState(false);
  const addFood = useKitchen((s) => s.addFood);
  return (
    <div data-testid="result-unknown">
      <Hero image={image} />
      <motion.div initial={{ x: 0, opacity: 0 }} animate={{ x: [0, -10, 10, -6, 6, 0], opacity: 1 }} transition={{ duration: 0.5 }} className="page relative -mt-10">
        <div className="card p-6 text-center">
          <span className="text-5xl" aria-hidden>
            🤔
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Hmm… I’m not sure.</h1>
          <p className="mt-1 text-ink-soft">{result.reason}</p>
          <p className="mt-1 text-sm text-ink-muted">Try a clearer photo with the item filling the frame, in good light.</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button className="btn btn-primary btn-lg" onClick={onScanAgain} data-testid="try-again">
              <RotateCcw className="h-5 w-5" /> Try Again
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => setManual(true)} data-testid="enter-manually">
              <Keyboard className="h-5 w-5" /> Enter Manually
            </button>
          </div>
        </div>
      </motion.div>
      <BottomSheet open={manual} onClose={() => setManual(false)} title="Add food manually">
        <FoodForm
          initial={{ name: '', brand: null, category: 'other', quantity: 1, unit: 'pcs', storage: 'pantry', expiryDate: null, expirySource: null, price: null, keepPhoto: false }}
          submitLabel="Save to My Food"
          onSubmit={(v) => {
            addFood({ ...v, photo: null, nutrition: null, allergens: null, expirySource: v.expiryDate ? 'user' : null });
            setManual(false);
            toast('Added to My Food');
            onScanAgain();
          }}
        />
      </BottomSheet>
    </div>
  );
}

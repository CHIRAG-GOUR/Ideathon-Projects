'use client';

import React, { useState } from 'react';
import { CalendarPlus, CheckCircle2, Camera } from 'lucide-react';
import type { ExpirySource, FoodCategory, StorageLocation, Unit } from '@/types';
import { CATEGORY_META, FOOD_CATEGORIES, STORAGE_META, UNITS } from '@/lib/food/meta';
import { addDays, describeDays, daysUntil, isValidIsoDate } from '@/lib/expiry';
import { cn } from '@/lib/utils';

export interface FoodFormValues {
  name: string;
  brand: string | null;
  category: FoodCategory;
  quantity: number;
  unit: Unit;
  storage: StorageLocation;
  expiryDate: string | null;
  expirySource: ExpirySource | null;
  price: number | null;
  keepPhoto: boolean;
}

/**
 * Add / edit food. The expiry date is only ever pre-filled when it was read from the
 * label (or saved before). Otherwise it stays empty until the user sets it.
 */
export function FoodForm({
  initial,
  photoAvailable = false,
  submitLabel,
  onSubmit,
}: {
  initial: FoodFormValues;
  photoAvailable?: boolean;
  submitLabel: string;
  onSubmit: (values: FoodFormValues) => void;
}) {
  const [v, setV] = useState<FoodFormValues>(initial);
  const [showDate, setShowDate] = useState(Boolean(initial.expiryDate));
  const set = <K extends keyof FoodFormValues>(k: K, val: FoodFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const days = daysUntil(v.expiryDate);
  const valid = v.name.trim().length > 0 && v.quantity > 0 && (v.expiryDate === null || isValidIsoDate(v.expiryDate));

  const setExpiry = (date: string | null) => setV((p) => ({ ...p, expiryDate: date, expirySource: date ? (date === initial.expiryDate ? initial.expirySource : 'user') : null }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...v, name: v.name.trim(), brand: v.brand?.trim() || null });
      }}
      className="space-y-4 pb-2"
      data-testid="food-form"
    >
      <div>
        <label className="label" htmlFor="ff-name">
          Name
        </label>
        <input id="ff-name" className="field" value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Milk" maxLength={80} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ff-brand">
            Brand <span className="font-medium text-ink-faint">(optional)</span>
          </label>
          <input id="ff-brand" className="field" value={v.brand ?? ''} onChange={(e) => set('brand', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="ff-cat">
            Category
          </label>
          <select id="ff-cat" className="field" value={v.category} onChange={(e) => set('category', e.target.value as FoodCategory)}>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="label" htmlFor="ff-qty">
            Quantity
          </label>
          <input
            id="ff-qty"
            className="field num"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            value={Number.isFinite(v.quantity) ? v.quantity : ''}
            onChange={(e) => set('quantity', Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="ff-unit">
            Unit
          </label>
          <select id="ff-unit" className="field" value={v.unit} onChange={(e) => set('unit', e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Stored in</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(STORAGE_META) as StorageLocation[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => set('storage', s)}
              aria-pressed={v.storage === s}
              className={cn('rounded-2xl px-3 py-2.5 text-sm font-bold ring-1 ring-inset transition', v.storage === s ? 'bg-aqua-200 text-aqua-900 ring-aqua-300' : 'bg-white text-ink-soft ring-cloud-300')}
            >
              {STORAGE_META[s].emoji} {STORAGE_META[s].label.replace('Kitchen ', '')}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-cloud-300">
        <p className="label mb-1">Expiry date</p>
        {v.expiryDate && v.expirySource === 'label' && v.expiryDate === initial.expiryDate && (
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-aqua-700">
            <CheckCircle2 className="h-4 w-4" /> Read from the label — please double-check.
          </p>
        )}
        {!showDate ? (
          <div data-testid="expiry-missing">
            <p className="text-sm text-ink-muted">Expiry date not detected.</p>
            <button type="button" className="btn btn-soft mt-3" onClick={() => setShowDate(true)} data-testid="add-expiry">
              <CalendarPlus className="h-4 w-4" /> Add Expiry Date
            </button>
          </div>
        ) : (
          <>
            <input id="ff-exp" aria-label="Expiry date" className="field num" type="date" value={v.expiryDate ?? ''} onChange={(e) => setExpiry(e.target.value || null)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                ['Today', 0],
                ['Tomorrow', 1],
                ['+3 days', 3],
                ['+1 week', 7],
                ['+1 month', 30],
              ].map(([label, n]) => (
                <button type="button" key={label} className="chip bg-cloud-200 py-1.5 text-ink-soft hover:bg-cloud-300" onClick={() => setExpiry(addDays(n as number))}>
                  {label}
                </button>
              ))}
              {v.expiryDate && (
                <button type="button" className="chip py-1.5 text-ink-muted underline" onClick={() => setExpiry(null)}>
                  Clear
                </button>
              )}
            </div>
            {v.expiryDate && <p className="mt-2 text-sm font-bold text-ink-soft">{describeDays(days)}</p>}
          </>
        )}
      </div>

      <div>
        <label className="label" htmlFor="ff-price">
          Price paid (₹) <span className="font-medium text-ink-faint">(optional — used to estimate money saved)</span>
        </label>
        <input
          id="ff-price"
          className="field num"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={v.price ?? ''}
          onChange={(e) => set('price', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
        />
      </div>

      {photoAvailable && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-cloud-300">
          <span className="flex items-center gap-2 text-sm font-bold text-ink-soft">
            <Camera className="h-4 w-4" /> Keep a small photo with this item
          </span>
          <input type="checkbox" className="h-5 w-5 accent-aqua-600" checked={v.keepPhoto} onChange={(e) => set('keepPhoto', e.target.checked)} />
        </label>
      )}

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!valid} data-testid="food-form-submit">
        {submitLabel}
      </button>
    </form>
  );
}

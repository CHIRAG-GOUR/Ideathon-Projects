import type { Macros, Meal, MealComponent, Nutrition } from '@/types';

const MACRO_KEYS = ['calories', 'protein', 'carbs', 'sugar', 'fat', 'saturatedFat', 'fiber', 'sodium'] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Energy implied by the macros (Atwater factors). */
export function atwaterKcal(c: Pick<MealComponent, 'protein' | 'carbs' | 'fat'>): number | null {
  if (c.protein === null || c.carbs === null || c.fat === null) return null;
  return c.protein * 4 + c.carbs * 4 + c.fat * 9;
}

/**
 * Make one plate item physically consistent:
 * - sugar ≤ carbs, saturated fat ≤ fat
 * - macros can't weigh more than the portion (then the gram estimate is dropped)
 * - calories must roughly match 4·protein + 4·carbs + 9·fat; if not, we trust the macros
 */
export function fixComponent(c: MealComponent): MealComponent {
  const out: MealComponent = { ...c };
  if (out.sugar !== null && out.carbs !== null && out.sugar > out.carbs) out.sugar = out.carbs;
  if (out.saturatedFat !== null && out.fat !== null && out.saturatedFat > out.fat) out.saturatedFat = out.fat;
  const mass = (out.protein ?? 0) + (out.carbs ?? 0) + (out.fat ?? 0) + (out.fiber ?? 0);
  if (out.grams !== null && mass > out.grams * 1.05) out.grams = null;
  const implied = atwaterKcal(out);
  if (implied !== null && implied > 0) {
    if (out.calories === null || Math.abs(out.calories - implied) > Math.max(60, implied * 0.3)) {
      out.calories = Math.round(implied);
      out.caloriesCorrected = true;
    }
  }
  return out;
}

/** Sum of the plate. A total is null only if no item has that value. */
export function sumComponents(components: MealComponent[]): { totals: Macros; grams: number | null; complete: boolean } {
  const totals = {} as Macros;
  for (const k of MACRO_KEYS) {
    const vals = components.map((c) => c[k]).filter((v): v is number => v !== null);
    totals[k] = vals.length ? round1(vals.reduce((a, b) => a + b, 0)) : null;
  }
  if (totals.calories !== null) totals.calories = Math.round(totals.calories);
  if (totals.sodium !== null) totals.sodium = Math.round(totals.sodium);
  const allGrams = components.every((c) => c.grams !== null);
  const grams = allGrams && components.length ? Math.round(components.reduce((a, c) => a + (c.grams ?? 0), 0)) : null;
  return { totals, grams, complete: components.every((c) => c.calories !== null) };
}

function per100From(totals: Macros, grams: number | null): Macros | null {
  if (!grams || grams <= 0) return null;
  const f = 100 / grams;
  const out = {} as Macros;
  for (const k of MACRO_KEYS) out[k] = totals[k] === null ? null : round1(totals[k]! * f);
  if (out.calories !== null && out.calories > 950) return null; // implausible density → don't trust the grams
  return out;
}

/**
 * Build the Nutrition for a cooked dish / plate from its items. The plate totals are the
 * sums of the items (never the model's own "total"), and per-100 g values are derived from them.
 */
export function mealNutrition(meal: Meal, fallback: Nutrition | null, fruitVegPercent: number | null): Nutrition | null {
  const components = meal.components;
  if (!components.length || components.every((c) => c.calories === null)) return fallback ? { ...fallback, meal: null } : null;
  const { totals, grams } = sumComponents(components);
  const per100 = per100From(totals, grams) ?? fallback?.per100 ?? emptyMacros();
  return {
    source: 'estimate',
    basis: 'per_100g',
    per100,
    servingSize: grams ? `Whole plate (~${grams} g)` : 'Whole plate',
    servingGrams: grams,
    perServing: totals,
    fruitVegPercent: fruitVegPercent ?? fallback?.fruitVegPercent ?? null,
    meal: { ...meal, totalGrams: grams },
  };
}

/** What the user actually ate: drop items they didn't have and scale the portion. */
export function adjustMeal(n: Nutrition, opts: { excluded: ReadonlySet<number>; multiplier: number }): Nutrition {
  if (!n.meal) return n;
  const m = opts.multiplier;
  const kept = n.meal.components
    .filter((_, i) => !opts.excluded.has(i))
    .map((c) => {
      const out = { ...c };
      for (const k of MACRO_KEYS) out[k] = c[k] === null ? null : round1(c[k]! * m);
      out.grams = c.grams === null ? null : Math.round(c.grams * m);
      if (out.calories !== null) out.calories = Math.round(out.calories);
      return out;
    });
  if (!kept.length) return { ...n, perServing: emptyMacros(), servingGrams: 0, meal: { ...n.meal, components: [], totalGrams: 0 } };
  const { totals, grams } = sumComponents(kept);
  const per100 = per100From(totals, grams) ?? n.per100;
  const label = opts.excluded.size || m !== 1 ? `What you ate${grams ? ` (~${grams} g)` : ''}` : n.servingSize;
  return { ...n, per100, perServing: totals, servingGrams: grams, servingSize: label, meal: { ...n.meal, components: kept, totalGrams: grams } };
}

function emptyMacros(): Macros {
  return { calories: null, protein: null, carbs: null, sugar: null, fat: null, saturatedFat: null, fiber: null, sodium: null };
}

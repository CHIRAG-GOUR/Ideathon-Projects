import type { FoodCategory, Macros, NutriGrade, NutriScore, Nutrition } from '@/types';

/**
 * Simplified Nutri-Score (based on the published 2017 algorithm), computed from the
 * nutrition numbers — the AI never picks the grade itself. It's a general guide for
 * comparing foods, not medical or dietary advice.
 */
const pts = (value: number, thresholds: number[]) => thresholds.filter((t) => value > t).length;

const FOOD = {
  energyKj: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugar: [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45],
  satFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  sodium: [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
  fiber: [0.9, 1.9, 2.8, 3.7, 4.7],
  protein: [1.6, 3.2, 4.8, 6.4, 8.0],
};
const DRINK = {
  energyKj: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
  sugar: [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5],
};

function fruitVegPoints(pct: number, drink: boolean): number {
  if (drink) return pct > 80 ? 10 : pct > 60 ? 4 : pct > 40 ? 2 : 0;
  return pct > 80 ? 5 : pct > 60 ? 2 : pct > 40 ? 1 : 0;
}

/** Drinks use the beverage thresholds. Milk and dairy are scored as foods (as in the Nutri-Score rules). */
export function isDrink(category: FoodCategory, basis: Nutrition['basis']): boolean {
  return category === 'beverages' || (basis === 'per_100ml' && category !== 'dairy' && category !== 'other');
}

export function computeNutriScore(nutrition: Nutrition | null, category: FoodCategory, name = ''): NutriScore | null {
  if (!nutrition) return null;
  const n = nutrition.per100;
  if (n.calories === null || n.sugar === null || n.fat === null) return null;

  const drink = isDrink(category, nutrition.basis);
  const kj = n.calories * 4.184;
  const sat = n.saturatedFat ?? n.fat * 0.3;
  const sodium = n.sodium ?? 0;
  const fv = nutrition.fruitVegPercent ?? 0;
  const fiber = n.fiber ?? 0;
  const protein = n.protein ?? 0;

  if (drink && /\bwater\b/i.test(name) && n.calories < 1 && n.sugar < 0.5) {
    return { grade: 'A', points: -10, highlights: ['Plain water'], cautions: [] };
  }

  const negative = pts(kj, drink ? DRINK.energyKj : FOOD.energyKj) + pts(n.sugar, drink ? DRINK.sugar : FOOD.sugar) + pts(sat, FOOD.satFat) + pts(sodium, FOOD.sodium);
  const fvPts = fruitVegPoints(fv, drink);
  const proteinPts = negative >= 11 && fvPts < (drink ? 10 : 5) ? 0 : pts(protein, FOOD.protein);
  const points = negative - (fvPts + pts(fiber, FOOD.fiber) + proteinPts);

  let grade: NutriGrade;
  if (drink) grade = points <= 1 ? 'B' : points <= 5 ? 'C' : points <= 9 ? 'D' : 'E';
  else grade = points <= -1 ? 'A' : points <= 2 ? 'B' : points <= 10 ? 'C' : points <= 18 ? 'D' : 'E';

  return { grade, points, ...describe(n, drink, fv) };
}

function describe(n: Macros, drink: boolean, fv: number) {
  const highlights: string[] = [];
  const cautions: string[] = [];
  const sugar = n.sugar ?? 0;
  if (drink ? sugar >= 7.5 : sugar >= 22.5) cautions.push('High in sugar');
  else if (sugar <= (drink ? 2.5 : 5)) highlights.push('Low in sugar');
  if ((n.saturatedFat ?? 0) >= 5) cautions.push('High in saturated fat');
  if ((n.sodium ?? 0) >= 600) cautions.push('High in salt');
  if (!drink && (n.calories ?? 0) >= 400) cautions.push('Energy-dense');
  if (!drink && (n.protein ?? 0) >= 8) highlights.push('Good source of protein');
  if ((n.fiber ?? 0) >= 3.7) highlights.push('Good source of fibre');
  if (fv >= 60) highlights.push('Mostly fruit, veg or nuts');
  return { highlights: highlights.slice(0, 3), cautions: cautions.slice(0, 3) };
}

export const GRADE_META: Record<NutriGrade, { color: string; ink: string; soft: string; label: string }> = {
  // Light versions of the familiar Nutri-Score colours (green → red), with deep letters for contrast.
  A: { color: '#62D394', ink: '#0E5A33', soft: '#DFF7EA', label: 'Great choice' },
  B: { color: '#B2DE6E', ink: '#3E5E0E', soft: '#F0F8DE', label: 'Good choice' },
  C: { color: '#FFDE5E', ink: '#6E5400', soft: '#FFF7D3', label: 'Okay in moderation' },
  D: { color: '#FFB877', ink: '#7C4100', soft: '#FFEEDD', label: 'Treat occasionally' },
  E: { color: '#FF9084', ink: '#8C241A', soft: '#FFE6E2', label: 'Best as a rare treat' },
};

/** Scale per-100 values to a serving. */
export function scaleMacros(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  const r = (v: number | null, d = 1) => (v === null ? null : Math.round(v * f * 10 ** d) / 10 ** d);
  return {
    calories: per100.calories === null ? null : Math.round(per100.calories * f),
    protein: r(per100.protein),
    carbs: r(per100.carbs),
    sugar: r(per100.sugar),
    fat: r(per100.fat),
    saturatedFat: r(per100.saturatedFat),
    fiber: r(per100.fiber),
    sodium: per100.sodium === null ? null : Math.round(per100.sodium * f),
  };
}

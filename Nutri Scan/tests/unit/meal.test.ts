import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustMeal, fixComponent, sumComponents } from '../../src/lib/nutrition/meal';
import { parseRecognition, GEMINI_RESPONSE_SCHEMA } from '../../src/lib/recognition/schema';
import { classifyRecognition } from '../../src/lib/recognition/classify';
import { emojiForFood } from '../../src/lib/food/meta';
import type { MealComponent } from '../../src/types';

const c = (o: Partial<MealComponent>): MealComponent => ({
  name: 'x', portion: null, grams: null, calories: null, protein: null, carbs: null, sugar: null, fat: null, saturatedFat: null, fiber: null, sodium: null, ...o,
});

/** Same shape Gemini returns for a plate of aloo parathas (pickle calories deliberately wrong). */
const paratha = {
  objectType: 'food', kind: 'food', name: 'Aloo Paratha', foodCategory: 'prepared', confidence: 0.9, isEdible: true, isPackaged: false,
  expiryVisible: false, expiryDate: '2099-01-01', isMeal: true, cuisine: 'North Indian', dietType: 'vegetarian',
  nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 999, protein: 1, carbs: 1, fat: 1 }, servingGrams: 100, fruitVegPercent: 20 },
  meal: {
    portion: '2 aloo parathas with curd, pickle and butter',
    assumptions: ['About 1 tsp ghee per paratha'],
    components: [
      { name: 'Aloo paratha', portion: '2 pieces (~240 g)', grams: 240, calories: 620, protein: 12, carbs: 80, sugar: 3, fat: 27, saturatedFat: 12, fiber: 8, sodium: 700 },
      { name: 'Curd', portion: '1 katori (~150 g)', grams: 150, calories: 90, protein: 5, carbs: 7, sugar: 7, fat: 4.5, saturatedFat: 3, fiber: 0, sodium: 60 },
      { name: 'Mango pickle', portion: '1 tbsp (~15 g)', grams: 15, calories: 300, protein: 0.2, carbs: 1, sugar: 0.5, fat: 3, saturatedFat: 0.4, fiber: 0.3, sodium: 450 },
      { name: 'Butter', portion: '1 cube (~10 g)', grams: 10, calories: 72, protein: 0.1, carbs: 0, sugar: 0, fat: 8.1, saturatedFat: 5.1, fiber: 0, sodium: 64 },
      { portion: 'no name → dropped', calories: 50 },
    ],
  },
  allergens: ['gluten', 'milk'],
};

test('calories that contradict the macros are recalculated (4/4/9)', () => {
  const fixed = fixComponent(c({ calories: 300, protein: 0.2, carbs: 1, fat: 3, grams: 15 }));
  assert.equal(fixed.calories, 32);
  assert.equal(fixed.caloriesCorrected, true);
  const fine = fixComponent(c({ calories: 620, protein: 12, carbs: 80, fat: 27, grams: 240 }));
  assert.equal(fine.calories, 620);
  assert.equal(fine.caloriesCorrected, undefined);
});

test('impossible portions and parts are repaired', () => {
  const f = fixComponent(c({ grams: 20, protein: 10, carbs: 30, fat: 5, sugar: 50, saturatedFat: 9, calories: 205 }));
  assert.equal(f.grams, null, 'macros heavier than the portion → grams dropped');
  assert.equal(f.sugar, 30, 'sugar capped at carbs');
  assert.equal(f.saturatedFat, 5, 'saturated fat capped at fat');
});

test('plate totals are the sum of the items', () => {
  const { totals, grams } = sumComponents([c({ grams: 100, calories: 100, protein: 5 }), c({ grams: 50, calories: 50, protein: null })]);
  assert.equal(totals.calories, 150);
  assert.equal(totals.protein, 5);
  assert.equal(grams, 150);
  assert.equal(sumComponents([c({ grams: null, calories: 10 })]).grams, null, 'unknown grams → no total weight');
});

test('a meal photo becomes a validated, item-by-item plate', () => {
  const r = parseRecognition(paratha);
  assert.ok(r && r.nutrition?.meal);
  const m = r.nutrition.meal;
  assert.equal(m.components.length, 4, 'item without a name is dropped');
  assert.equal(r.expiryDate, null, 'no invented expiry for a cooked meal');
  assert.equal(r.isMeal, true);
  assert.equal(r.dietType, 'vegetarian');
  assert.equal(r.cuisine, 'North Indian');
  assert.equal(r.nutrition.source, 'estimate');
  assert.equal(r.nutrition.perServing?.calories, 620 + 90 + 32 + 72, 'totals use the corrected pickle calories');
  assert.equal(m.totalGrams, 415);
  assert.equal(r.nutrition.servingGrams, 415);
  assert.ok(Math.abs((r.nutrition.per100.calories ?? 0) - 196.1) < 0.2, 'per 100 g derived from the plate, not the model’s 999');
  assert.ok(m.assumptions.some((a) => /recalculated/.test(a)), 'user is told a figure was recalculated');
  const scan = classifyRecognition(r);
  assert.equal(scan.type, 'food');
  if (scan.type === 'food') assert.ok(scan.score, 'Nutri score computed for the plate');
});

test('re-validating in the browser keeps the plate intact', () => {
  const once = parseRecognition(paratha)!;
  const twice = parseRecognition(JSON.parse(JSON.stringify(once)))!;
  assert.deepEqual(twice.nutrition?.meal?.components.map((x) => x.calories), once.nutrition?.meal?.components.map((x) => x.calories));
  assert.equal(twice.nutrition?.perServing?.calories, once.nutrition?.perServing?.calories);
  assert.equal(twice.isMeal, true);
});

test('leaving items out and changing the portion updates everything', () => {
  const n = parseRecognition(paratha)!.nutrition!;
  const noPickleNoButter = adjustMeal(n, { excluded: new Set([2, 3]), multiplier: 1 });
  assert.equal(noPickleNoButter.perServing?.calories, 710);
  assert.equal(noPickleNoButter.meal?.components.length, 2);
  const double = adjustMeal(n, { excluded: new Set(), multiplier: 2 });
  assert.equal(double.perServing?.calories, 1628);
  assert.equal(double.servingGrams, 830);
  assert.ok(Math.abs((double.per100.calories ?? 0) - (n.per100.calories ?? 0)) < 0.5, 'density unchanged when scaling');
  const half = adjustMeal(n, { excluded: new Set(), multiplier: 0.5 });
  assert.equal(half.perServing?.calories, 407);
  const none = adjustMeal(n, { excluded: new Set([0, 1, 2, 3]), multiplier: 1 });
  assert.equal(none.meal?.components.length, 0);
});

test('typed searches never carry an expiry date or "from label" values', () => {
  const r = parseRecognition(
    { ...paratha, expiryVisible: true, expiryDate: '2099-05-05', nutrition: { ...paratha.nutrition, source: 'label' }, ingredientsSource: 'label', ingredients: ['Atta'] },
    { from: 'text' }
  )!;
  assert.equal(r.expiryDate, null);
  assert.equal(r.nutrition?.source, 'estimate');
  assert.equal(r.ingredientsSource, 'estimate');
});

test('a single food is not treated as a meal', () => {
  const r = parseRecognition({ objectType: 'food', kind: 'food', name: 'Banana', foodCategory: 'fruit', confidence: 0.95, isEdible: true, isPackaged: false, expiryVisible: false, nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 } } })!;
  assert.equal(r.isMeal, false);
  assert.equal(r.nutrition?.meal ?? null, null);
  assert.equal(r.dietType, 'unknown');
});

test('Gemini is asked for the plate before the totals', () => {
  const order = GEMINI_RESPONSE_SCHEMA.propertyOrdering as readonly string[];
  assert.ok(order.indexOf('meal') < order.indexOf('nutrition'));
});

test('dishes get their own artwork', () => {
  assert.equal(emojiForFood('Aloo Paratha', 'prepared'), '🫓');
  assert.equal(emojiForFood('Chicken Biryani', 'prepared'), '🍛');
  assert.equal(emojiForFood('Rajma Chawal', 'prepared'), '🫘');
  assert.equal(emojiForFood('Penne Arrabbiata', 'prepared'), '🍝');
  assert.equal(emojiForFood('Paneer', 'dairy'), '🧀');
});

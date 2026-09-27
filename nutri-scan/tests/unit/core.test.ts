import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, getExpiryStatus, isValidIsoDate, sortByUrgency, addDays } from '../../src/lib/expiry';
import { computeNutriScore } from '../../src/lib/nutrition/score';
import { parseRecognition } from '../../src/lib/recognition/schema';
import { classifyRecognition, confidenceLevel } from '../../src/lib/recognition/classify';
import { parseQuantityText } from '../../src/lib/food/meta';
import type { Nutrition } from '../../src/types';

const today = new Date(2026, 8, 26); // 26 Sep 2026

test('expiry status is computed from the date', () => {
  assert.equal(getExpiryStatus('2026-09-25', today), 'expired');
  assert.equal(getExpiryStatus('2026-09-26', today), 'use_first');
  assert.equal(getExpiryStatus('2026-09-27', today), 'use_first');
  assert.equal(getExpiryStatus('2026-09-28', today), 'use_soon');
  assert.equal(getExpiryStatus('2026-09-30', today), 'use_soon');
  assert.equal(getExpiryStatus('2026-10-01', today), 'fresh');
  assert.equal(getExpiryStatus(null, today), 'no_expiry');
  assert.equal(daysUntil('2026-10-06', today), 10);
});

test('invalid dates are rejected', () => {
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate('15/01/2027'), false);
  assert.equal(isValidIsoDate('1990-01-01'), false);
  assert.equal(isValidIsoDate('2027-01-15'), true);
});

test('sorting puts use-first before fresh and expired last', () => {
  const items = [
    { name: 'Rice', expiryDate: '2027-03-01' },
    { name: 'Old', expiryDate: '2026-09-20' },
    { name: 'Milk', expiryDate: '2026-09-27' },
    { name: 'Salt', expiryDate: null },
    { name: 'Bread', expiryDate: '2026-09-29' },
  ];
  assert.deepEqual(sortByUrgency(items, today).map((i) => i.name), ['Milk', 'Bread', 'Rice', 'Salt', 'Old']);
  assert.match(addDays(3, today), /^2026-09-29$/);
});

const nut = (per100: Partial<Nutrition['per100']>, basis: Nutrition['basis'] = 'per_100g', fruitVegPercent = 0): Nutrition => ({
  source: 'estimate',
  basis,
  per100: { calories: null, protein: null, carbs: null, sugar: null, fat: null, saturatedFat: null, fiber: null, sodium: null, ...per100 },
  servingSize: null,
  servingGrams: null,
  perServing: null,
  fruitVegPercent,
});

test('nutri score: familiar foods land where expected', () => {
  assert.equal(computeNutriScore(nut({ calories: 52, protein: 0.3, sugar: 10, fat: 0.2, saturatedFat: 0, fiber: 2.4, sodium: 1 }, 'per_100g', 100), 'fruit')?.grade, 'A'); // apple
  assert.equal(computeNutriScore(nut({ calories: 62, protein: 3.2, sugar: 4.8, fat: 3.3, saturatedFat: 2.1, fiber: 0, sodium: 45 }, 'per_100ml'), 'dairy')?.grade, 'B'); // milk
  assert.equal(computeNutriScore(nut({ calories: 535, protein: 7, sugar: 50, fat: 30, saturatedFat: 18, fiber: 3, sodium: 80 }), 'snacks')?.grade, 'E'); // chocolate
  assert.equal(computeNutriScore(nut({ calories: 42, sugar: 10.6, fat: 0, saturatedFat: 0, sodium: 10 }, 'per_100ml'), 'beverages', 'Cola')?.grade, 'E'); // soft drink
  assert.equal(computeNutriScore(nut({ calories: 0, sugar: 0, fat: 0 }, 'per_100ml'), 'beverages', 'Mineral Water')?.grade, 'A');
  assert.equal(computeNutriScore(nut({ protein: 3 }), 'other'), null); // not enough data → no score
});

test('recognition: expiry the model did not read is dropped', () => {
  const r = parseRecognition({ objectType: 'food', kind: 'food', name: 'Milk', confidence: 0.9, isEdible: true, isPackaged: true, expiryVisible: false, expiryDate: '2027-01-01' });
  assert.equal(r?.expiryDate, null);
  const ok = parseRecognition({ objectType: 'food', kind: 'food', name: 'Milk', confidence: 0.9, isEdible: true, isPackaged: true, expiryVisible: true, expiryDate: '2027-01-01' });
  assert.equal(ok?.expiryDate, '2027-01-01');
  const bad = parseRecognition({ objectType: 'food', kind: 'food', name: 'Milk', confidence: 0.9, isEdible: true, isPackaged: true, expiryVisible: true, expiryDate: 'next week' });
  assert.equal(bad?.expiryDate, null);
});

test('recognition: people are only ever "Human"', () => {
  const r = parseRecognition({ objectType: 'food', kind: 'person', name: 'Rahul, 25, smiling', confidence: 0.9, isEdible: true, isPackaged: false, expiryVisible: false, description: 'A young man', nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 100 } } });
  assert.equal(r?.name, 'Human');
  assert.equal(r?.description, null);
  assert.equal(r?.nutrition, null);
  const s = classifyRecognition(r!);
  assert.equal(s.type, 'non_food');
  if (s.type === 'non_food') assert.match(s.funMessage, /not on today’s menu/);
});

test('recognition: malformed or impossible output never passes through', () => {
  assert.equal(parseRecognition('not json'), null);
  const r = parseRecognition({ objectType: 'food', kind: 'food', name: 'Chips', confidence: 3, isEdible: true, isPackaged: true, expiryVisible: false, nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 5000, protein: 80, carbs: 90, sugar: 120, fat: 70 } } });
  assert.equal(r?.confidence, 1);
  assert.equal(r?.nutrition, null);
  const fixed = parseRecognition({ objectType: 'food', kind: 'food', name: 'Juice', confidence: 0.9, isEdible: true, isPackaged: true, expiryVisible: false, nutrition: { source: 'label', basis: 'per_100ml', per100: { calories: 45, carbs: 8, sugar: 10, fat: 1, saturatedFat: 3 }, servingGrams: 200 } });
  assert.equal(fixed?.nutrition?.per100.carbs, 10); // sugar can't exceed carbs
  assert.equal(fixed?.nutrition?.per100.saturatedFat, 1); // sat fat can't exceed fat
  assert.equal(fixed?.nutrition?.perServing?.calories, 90);
  const garbage = parseRecognition({ objectType: 'banana', kind: 'spaceship', name: '', confidence: 'high' });
  assert.equal(garbage?.objectType, 'unknown');
});

test('confidence tiers', () => {
  assert.equal(confidenceLevel(0.95), 'high');
  assert.equal(confidenceLevel(0.6), 'medium');
  assert.equal(confidenceLevel(0.2), 'low');
  const low = parseRecognition({ objectType: 'food', kind: 'food', name: 'Cheese', confidence: 0.3, isEdible: true, isPackaged: false, expiryVisible: false });
  assert.equal(classifyRecognition(low!).type, 'unknown');
  const phone = parseRecognition({ objectType: 'non_food', kind: 'phone', name: 'Mobile Phone', confidence: 0.95, isEdible: false, isPackaged: false, expiryVisible: false });
  const res = classifyRecognition(phone!);
  assert.equal(res.type === 'non_food' && res.emoji, '📱');
});

test('quantity text parsing', () => {
  assert.deepEqual(parseQuantityText('500 ml'), { quantity: 500, unit: 'ml' });
  assert.deepEqual(parseQuantityText('1 L'), { quantity: 1, unit: 'l' });
  assert.deepEqual(parseQuantityText('Net wt. 400g'), { quantity: 400, unit: 'g' });
  assert.deepEqual(parseQuantityText('6 x 50 g'), { quantity: 300, unit: 'g' });
  assert.equal(parseQuantityText('family pack'), null);
});

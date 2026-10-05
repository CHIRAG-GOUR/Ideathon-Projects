import type { ScanResult } from '@/types';
import { parseRecognition } from '@/lib/recognition/schema';
import { classifyRecognition } from '@/lib/recognition/classify';

/**
 * Sample answers for the landing-page demo (no camera needed). They go through the exact
 * same validation + classification code as real Gemini answers. Values are typical figures.
 */
const RAW: Record<string, unknown> = {
  milk: {
    objectType: 'food', kind: 'drink', name: 'Milk', foodCategory: 'dairy', confidence: 0.95, isEdible: true, isPackaged: true, expiryVisible: false,
    storageSuggestion: 'fridge', storageTip: 'Keep it cold and use within 2 days of opening.',
    nutrition: { source: 'estimate', basis: 'per_100ml', per100: { calories: 62, protein: 3.2, carbs: 4.8, sugar: 4.8, fat: 3.3, saturatedFat: 2.1, fiber: 0, sodium: 45 }, servingSize: '1 glass (250 ml)', servingGrams: 250, fruitVegPercent: 0 },
    ingredients: ['Milk'], ingredientsSource: 'estimate', allergens: ['milk'], emoji: '🥛',
  },
  bread: {
    objectType: 'food', kind: 'food', name: 'Whole Wheat Bread', foodCategory: 'bakery', confidence: 0.9, isEdible: true, isPackaged: true, expiryVisible: false,
    storageSuggestion: 'pantry', storageTip: 'Keep sealed at room temperature; freeze slices for longer.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 247, protein: 13, carbs: 41, sugar: 6, fat: 3.4, saturatedFat: 0.7, fiber: 7, sodium: 450 }, servingSize: '2 slices (60 g)', servingGrams: 60, fruitVegPercent: 0 },
    ingredients: ['Whole wheat flour', 'Water', 'Yeast', 'Sugar', 'Salt'], ingredientsSource: 'estimate', allergens: ['gluten'], emoji: '🍞',
  },
  apple: {
    objectType: 'food', kind: 'food', name: 'Apple', foodCategory: 'fruit', confidence: 0.97, isEdible: true, isPackaged: false, expiryVisible: false,
    storageSuggestion: 'fridge', storageTip: 'Apples last weeks longer in the fridge crisper.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 52, protein: 0.3, carbs: 14, sugar: 10, fat: 0.2, saturatedFat: 0, fiber: 2.4, sodium: 1 }, servingSize: '1 medium apple (180 g)', servingGrams: 180, fruitVegPercent: 100 },
    ingredients: ['Apple'], ingredientsSource: 'estimate', allergens: [], emoji: '🍎',
  },
  banana: {
    objectType: 'food', kind: 'food', name: 'Banana', foodCategory: 'fruit', confidence: 0.97, isEdible: true, isPackaged: false, expiryVisible: false,
    storageSuggestion: 'counter', storageTip: 'Keep at room temperature, away from other fruit.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 89, protein: 1.1, carbs: 22.8, sugar: 12.2, fat: 0.3, saturatedFat: 0.1, fiber: 2.6, sodium: 1 }, servingSize: '1 medium banana (118 g)', servingGrams: 118, fruitVegPercent: 100 },
    ingredients: ['Banana'], ingredientsSource: 'estimate', allergens: [], emoji: '🍌',
  },
  carrot: {
    objectType: 'food', kind: 'food', name: 'Carrot', foodCategory: 'vegetable', confidence: 0.95, isEdible: true, isPackaged: false, expiryVisible: false,
    storageSuggestion: 'fridge', storageTip: 'Store in the crisper drawer, tops removed.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 41, protein: 0.9, carbs: 9.6, sugar: 4.7, fat: 0.2, saturatedFat: 0, fiber: 2.8, sodium: 69 }, servingSize: '1 medium carrot (61 g)', servingGrams: 61, fruitVegPercent: 100 },
    ingredients: ['Carrot'], ingredientsSource: 'estimate', allergens: [], emoji: '🥕',
  },
  cheese: {
    objectType: 'food', kind: 'food', name: 'Paneer', foodCategory: 'dairy', confidence: 0.86, isEdible: true, isPackaged: true, expiryVisible: false,
    storageSuggestion: 'fridge', storageTip: 'Keep submerged in water in the fridge; use within 2–3 days.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 296, protein: 21, carbs: 3.6, sugar: 2.6, fat: 22, saturatedFat: 14, fiber: 0, sodium: 22 }, servingSize: '50 g', servingGrams: 50, fruitVegPercent: 0 },
    ingredients: ['Milk', 'Citric acid'], ingredientsSource: 'estimate', allergens: ['milk'], emoji: '🧀',
  },
  phone: { objectType: 'non_food', kind: 'phone', name: 'Mobile Phone', category: 'Electronics', confidence: 0.98, isEdible: false, isPackaged: false, expiryVisible: false },
  book: { objectType: 'non_food', kind: 'book', name: 'Book', category: 'Stationery', confidence: 0.96, isEdible: false, isPackaged: false, expiryVisible: false },
  shoe: { objectType: 'non_food', kind: 'shoe', name: 'Sneaker', category: 'Footwear', confidence: 0.95, isEdible: false, isPackaged: false, expiryVisible: false },
  dog: { objectType: 'non_food', kind: 'dog', name: 'Dog', category: 'Pet', confidence: 0.97, isEdible: false, isPackaged: false, expiryVisible: false },
  human: { objectType: 'non_food', kind: 'person', name: 'Human', confidence: 0.96, isEdible: false, isPackaged: false, expiryVisible: false },
};

export const SAMPLE_KEYS = ['milk', 'bread', 'apple', 'phone', 'book', 'shoe', 'dog', 'human'] as const;
export type SampleKey = (typeof SAMPLE_KEYS)[number];

export const SAMPLE_LABEL: Record<SampleKey, { label: string; emoji: string }> = {
  milk: { label: 'Milk', emoji: '🥛' },
  bread: { label: 'Bread', emoji: '🍞' },
  apple: { label: 'Apple', emoji: '🍎' },
  phone: { label: 'Phone', emoji: '📱' },
  book: { label: 'Book', emoji: '📚' },
  shoe: { label: 'Shoe', emoji: '👟' },
  dog: { label: 'Dog', emoji: '🐶' },
  human: { label: 'Human', emoji: '🙋' },
};

export type ExtraSampleKey = SampleKey | 'banana' | 'carrot' | 'cheese';

export function sampleResult(key: ExtraSampleKey): ScanResult {
  const parsed = parseRecognition(RAW[key]);
  if (!parsed) throw new Error(`invalid sample ${key}`);
  return classifyRecognition(parsed);
}

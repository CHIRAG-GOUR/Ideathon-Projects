import { z } from 'zod';
import type { DietType, FoodCategory, Macros, Meal, MealComponent, Nutrition, ObjectKind, RecognitionResult, StorageLocation } from '@/types';
import { isValidIsoDate } from '@/lib/expiry';
import { scaleMacros } from '@/lib/nutrition/score';
import { fixComponent, mealNutrition } from '@/lib/nutrition/meal';

export const OBJECT_KINDS = [
  'food', 'drink', 'person', 'dog', 'cat', 'other_animal', 'plant', 'phone', 'laptop', 'tablet', 'electronics',
  'book', 'shoe', 'chair', 'furniture', 'bottle', 'cup', 'toy', 'pen', 'bag', 'clothing', 'other_object', 'unknown',
] as const satisfies readonly ObjectKind[];

export const FOOD_CATEGORY_VALUES = [
  'dairy', 'bakery', 'fruit', 'vegetable', 'meat', 'seafood', 'eggs', 'grains', 'snacks', 'beverages', 'frozen',
  'condiments', 'prepared', 'other',
] as const satisfies readonly FoodCategory[];

export const STORAGE_VALUES = ['fridge', 'freezer', 'pantry', 'counter'] as const satisfies readonly StorageLocation[];

export const DIET_VALUES = ['vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'unknown'] as const satisfies readonly DietType[];

const text = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (typeof v !== 'string') return null;
      const t = v.trim().replace(/\s+/g, ' ');
      if (!t || /^(null|none|n\/a|unknown|not visible|not available)$/i.test(t)) return null;
      return t.slice(0, max);
    });

/** A number within [min, max], otherwise null (never trust out-of-range model output). */
const num = (min: number, max: number) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
    });

const textList = (maxItems: number, maxLen: number) =>
  z
    .array(z.union([z.string(), z.null()]))
    .nullable()
    .optional()
    .catch(null)
    .transform((arr) => {
      if (!arr) return null;
      const clean = [...new Set(arr.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))].map((x) => x.slice(0, maxLen)).slice(0, maxItems);
      return clean.length ? clean : null;
    });

const macrosSchema = z
  .object({
    calories: num(0, 950),
    protein: num(0, 100),
    carbs: num(0, 100),
    sugar: num(0, 100),
    fat: num(0, 100),
    saturatedFat: num(0, 100),
    fiber: num(0, 100),
    sodium: num(0, 40000),
  })
  .partial();

const nutritionSchema = z
  .object({
    source: z.enum(['label', 'estimate']).catch('estimate'),
    basis: z.enum(['per_100g', 'per_100ml']).catch('per_100g'),
    per100: macrosSchema.nullable().optional().catch(null),
    servingSize: text(60),
    servingGrams: num(1, 2000),
    fruitVegPercent: num(0, 100),
  })
  .nullable()
  .optional()
  .catch(null);

/** One item on a plate — values for the visible portion (not per 100 g), so wider ranges. */
const componentSchema = z.object({
  name: z.string().trim().min(1).max(60),
  portion: text(60),
  grams: num(1, 1500),
  calories: num(0, 2500),
  protein: num(0, 300),
  carbs: num(0, 400),
  sugar: num(0, 300),
  fat: num(0, 250),
  saturatedFat: num(0, 150),
  fiber: num(0, 100),
  sodium: num(0, 10000),
});

const mealSchema = z
  .object({
    portion: text(120),
    components: z
      .array(z.unknown())
      .max(20)
      .catch([])
      .transform((arr) =>
        arr
          .map((x) => componentSchema.safeParse(x))
          .filter((r) => r.success)
          .map((r) => r.data as MealComponent)
          .slice(0, 12)
      ),
    assumptions: textList(6, 120),
  })
  .nullable()
  .optional()
  .catch(null);

/**
 * What we accept from the model. Anything missing or malformed is coerced to a safe
 * value (null / false / "unknown") instead of being trusted.
 */
export const rawRecognitionSchema = z.object({
  objectType: z.enum(['food', 'non_food', 'unknown']).catch('unknown'),
  kind: z.enum(OBJECT_KINDS).catch('unknown'),
  name: z.string().trim().min(1).max(80).catch('Unknown'),
  category: text(60),
  foodCategory: z.enum(FOOD_CATEGORY_VALUES).nullable().optional().catch(null),
  brand: text(60),
  confidence: z.coerce.number().catch(0),
  isEdible: z.boolean().catch(false),
  isPackaged: z.boolean().catch(false),
  quantityText: text(40),
  expiryVisible: z.boolean().catch(false),
  expiryDate: text(20),
  expiryText: text(60),
  manufactureDate: text(20),
  storageSuggestion: z.enum(STORAGE_VALUES).nullable().optional().catch(null),
  storageTip: text(160),
  nutrition: nutritionSchema,
  ingredients: textList(25, 60),
  ingredientsSource: z.enum(['label', 'estimate']).nullable().optional().catch(null),
  allergens: textList(12, 40),
  description: text(200),
  emoji: text(8),
  isMeal: z.boolean().catch(false),
  cuisine: text(40),
  dietType: z.enum(DIET_VALUES).catch('unknown'),
  meal: mealSchema,
});

export type RawRecognition = z.input<typeof rawRecognitionSchema>;

function normalizeNutrition(raw: z.output<typeof nutritionSchema>): Nutrition | null {
  if (!raw || !raw.per100) return null;
  const p = raw.per100;
  const per100: Macros = {
    calories: p.calories ?? null,
    protein: p.protein ?? null,
    carbs: p.carbs ?? null,
    sugar: p.sugar ?? null,
    fat: p.fat ?? null,
    saturatedFat: p.saturatedFat ?? null,
    fiber: p.fiber ?? null,
    sodium: p.sodium ?? null,
  };
  if (per100.calories === null && per100.protein === null && per100.carbs === null && per100.fat === null) return null;
  // Physical sanity: parts can't exceed their totals, macros can't exceed 100 g per 100 g.
  if (per100.sugar !== null && per100.carbs !== null && per100.sugar > per100.carbs) per100.carbs = per100.sugar;
  if (per100.saturatedFat !== null && per100.fat !== null && per100.saturatedFat > per100.fat) per100.saturatedFat = per100.fat;
  const mass = (per100.protein ?? 0) + (per100.carbs ?? 0) + (per100.fat ?? 0) + (per100.fiber ?? 0);
  if (mass > 105) return null;
  return {
    source: raw.source,
    basis: raw.basis,
    per100,
    servingSize: raw.servingSize,
    servingGrams: raw.servingGrams,
    perServing: raw.servingGrams ? scaleMacros(per100, raw.servingGrams) : null,
    fruitVegPercent: raw.fruitVegPercent,
  };
}

/**
 * Validate + normalise model output. Enforces the product rules:
 * - never keep an expiry date unless it was actually read from the label
 * - never describe a person beyond "Human"
 * - nutrition only for food, with sane numbers; confidence clamped to 0..1
 */
export function parseRecognition(input: unknown, opts: { from?: 'photo' | 'text' } = {}): RecognitionResult | null {
  const fromText = opts.from === 'text';
  // Already-normalised results (re-validated in the browser) keep the plate under nutrition.meal.
  if (input && typeof input === 'object' && !('meal' in input) && (input as { nutrition?: { meal?: unknown } }).nutrition?.meal) {
    input = { ...input, meal: (input as { nutrition: { meal: unknown } }).nutrition.meal };
  }
  const parsed = rawRecognitionSchema.safeParse(input);
  if (!parsed.success) return null;
  const r = parsed.data;

  const confidence = Math.max(0, Math.min(1, Number.isFinite(r.confidence) ? r.confidence : 0));
  let objectType = r.objectType;
  let kind = r.kind;

  if (objectType === 'food' && !r.isEdible) objectType = 'non_food';
  if (kind === 'person' || kind === 'dog' || kind === 'cat' || kind === 'other_animal') objectType = 'non_food';
  if (objectType === 'food' && kind !== 'food' && kind !== 'drink') kind = 'food';
  if (objectType === 'non_food' && (kind === 'food' || kind === 'drink')) kind = 'other_object';
  if (objectType === 'unknown') kind = 'unknown';

  const empty = {
    brand: null, isPackaged: false, quantityText: null, expiryVisible: false, expiryDate: null, expiryText: null,
    manufactureDate: null, storageSuggestion: null, storageTip: null, nutrition: null, ingredients: null,
    ingredientsSource: null, allergens: null, foodCategory: null,
  } as const;

  if (kind === 'person') {
    // Privacy: no identity, no attributes — just "Human".
    return { ...empty, objectType: 'non_food', kind: 'person', name: 'Human', category: 'Human', confidence, isEdible: false, description: null, emoji: '👋' };
  }

  if (objectType !== 'food') {
    return { ...empty, objectType, kind, name: r.name, category: r.category, confidence, isEdible: false, description: r.description, emoji: r.emoji };
  }

  // A typed search has no label to read: never an expiry date, never "from label" values.
  const expiryDate = !fromText && r.expiryVisible && isValidIsoDate(r.expiryDate) ? r.expiryDate : null;
  let nutrition = normalizeNutrition(r.nutrition);
  if (fromText && nutrition) nutrition = { ...nutrition, source: 'estimate' };
  const components = (r.meal?.components ?? []).map(fixComponent);
  const isMeal = r.isMeal || components.length > 1;
  if (isMeal && components.length && nutrition?.source !== 'label') {
    const meal: Meal = { portion: r.meal?.portion ?? null, totalGrams: null, components, assumptions: r.meal?.assumptions ?? [] };
    if (components.some((c) => c.caloriesCorrected)) meal.assumptions = [...meal.assumptions, 'Some calorie figures were recalculated from protein, carbs and fat'].slice(0, 6);
    nutrition = mealNutrition(meal, nutrition, r.nutrition?.fruitVegPercent ?? null);
  }
  return {
    objectType: 'food',
    kind,
    name: r.name,
    category: r.category,
    foodCategory: r.foodCategory ?? 'other',
    brand: r.brand,
    confidence,
    isEdible: true,
    isPackaged: r.isPackaged,
    quantityText: r.quantityText,
    expiryVisible: Boolean(expiryDate),
    expiryDate,
    expiryText: expiryDate ? r.expiryText : null,
    manufactureDate: isValidIsoDate(r.manufactureDate) ? r.manufactureDate : null,
    storageSuggestion: r.storageSuggestion ?? null,
    storageTip: r.storageTip,
    nutrition,
    ingredients: r.ingredients,
    ingredientsSource: r.ingredients ? (fromText ? 'estimate' : (r.ingredientsSource ?? 'estimate')) : null,
    allergens: r.allergens,
    description: r.description,
    emoji: r.emoji,
    isMeal,
    cuisine: r.cuisine,
    dietType: r.dietType,
  };
}

const MACROS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    calories: { type: 'NUMBER', nullable: true, description: 'kcal' },
    protein: { type: 'NUMBER', nullable: true, description: 'grams' },
    carbs: { type: 'NUMBER', nullable: true, description: 'grams' },
    sugar: { type: 'NUMBER', nullable: true, description: 'grams' },
    fat: { type: 'NUMBER', nullable: true, description: 'grams' },
    saturatedFat: { type: 'NUMBER', nullable: true, description: 'grams' },
    fiber: { type: 'NUMBER', nullable: true, description: 'grams' },
    sodium: { type: 'NUMBER', nullable: true, description: 'milligrams' },
  },
};

/** JSON schema handed to Gemini (OpenAPI subset) so it must answer in this shape. */
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    objectType: { type: 'STRING', enum: ['food', 'non_food', 'unknown'] },
    kind: { type: 'STRING', enum: [...OBJECT_KINDS] },
    name: { type: 'STRING', description: 'Short common name, e.g. "Milk", "Masala Dosa", "Mobile Phone". For people always "Human".' },
    category: { type: 'STRING', nullable: true },
    foodCategory: { type: 'STRING', enum: [...FOOD_CATEGORY_VALUES], nullable: true },
    brand: { type: 'STRING', nullable: true, description: 'Only if clearly printed on the item.' },
    confidence: { type: 'NUMBER', description: '0 to 1. How sure you are about the name.' },
    isEdible: { type: 'BOOLEAN' },
    isPackaged: { type: 'BOOLEAN' },
    quantityText: { type: 'STRING', nullable: true, description: 'Net quantity exactly as printed, e.g. "500 ml". Else null.' },
    expiryVisible: { type: 'BOOLEAN' },
    expiryDate: { type: 'STRING', nullable: true, description: 'YYYY-MM-DD, ONLY if an expiry/best-before/use-by date is printed and readable. Never estimate.' },
    expiryText: { type: 'STRING', nullable: true, description: 'The expiry text exactly as printed.' },
    manufactureDate: { type: 'STRING', nullable: true, description: 'YYYY-MM-DD if a packed/manufactured date is printed.' },
    storageSuggestion: { type: 'STRING', enum: [...STORAGE_VALUES], nullable: true },
    storageTip: { type: 'STRING', nullable: true, description: 'One short practical storage tip.' },
    nutrition: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        source: { type: 'STRING', enum: ['label', 'estimate'], description: '"label" only if copied from a visible nutrition table.' },
        basis: { type: 'STRING', enum: ['per_100g', 'per_100ml'] },
        per100: MACROS_SCHEMA,
        servingSize: { type: 'STRING', nullable: true, description: 'Typical serving, e.g. "1 glass (250 ml)".' },
        servingGrams: { type: 'NUMBER', nullable: true, description: 'Grams or ml in that serving.' },
        fruitVegPercent: { type: 'NUMBER', nullable: true, description: 'Estimated % of fruit, vegetables, legumes and nuts.' },
      },
      required: ['source', 'basis', 'per100'],
    },
    ingredients: { type: 'ARRAY', nullable: true, items: { type: 'STRING' } },
    ingredientsSource: { type: 'STRING', enum: ['label', 'estimate'], nullable: true },
    allergens: { type: 'ARRAY', nullable: true, items: { type: 'STRING' }, description: 'Common allergens (milk, gluten, nuts, soy, egg, etc.).' },
    description: { type: 'STRING', nullable: true, description: 'One short neutral sentence. Null for people.' },
    emoji: { type: 'STRING', nullable: true, description: 'One emoji that represents the object.' },
    isMeal: { type: 'BOOLEAN', description: 'True for a cooked dish or a plate/thali of several items.' },
    cuisine: { type: 'STRING', nullable: true, description: 'e.g. "North Indian", "South Indian", "Italian". Null if not a dish.' },
    dietType: { type: 'STRING', enum: [...DIET_VALUES], description: 'From what is visible / named. "unknown" if you cannot tell.' },
    meal: {
      type: 'OBJECT',
      nullable: true,
      description: 'Only for cooked dishes and plates. Null for single raw or packaged foods.',
      properties: {
        portion: { type: 'STRING', nullable: true, description: 'The whole plate with counts, e.g. "2 aloo parathas with curd and pickle".' },
        components: {
          type: 'ARRAY',
          description: 'Every distinct item on the plate, each with nutrition for ITS visible portion (not per 100 g).',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'e.g. "Aloo paratha", "Dal tadka", "Steamed rice", "Curd".' },
              portion: { type: 'STRING', nullable: true, description: 'e.g. "2 pieces (~180 g)", "1 katori (~150 g)".' },
              grams: { type: 'NUMBER', nullable: true, description: 'Estimated grams of this item on the plate.' },
              calories: { type: 'NUMBER', nullable: true, description: 'kcal for this portion.' },
              protein: { type: 'NUMBER', nullable: true },
              carbs: { type: 'NUMBER', nullable: true },
              sugar: { type: 'NUMBER', nullable: true },
              fat: { type: 'NUMBER', nullable: true },
              saturatedFat: { type: 'NUMBER', nullable: true },
              fiber: { type: 'NUMBER', nullable: true },
              sodium: { type: 'NUMBER', nullable: true, description: 'mg' },
            },
            required: ['name', 'grams', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
        assumptions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Up to 4 short notes, e.g. "About 1 tsp ghee per paratha".' },
      },
      required: ['components'],
    },
  },
  required: ['objectType', 'kind', 'name', 'confidence', 'isEdible', 'isPackaged', 'expiryVisible'],
  propertyOrdering: [
    'objectType', 'kind', 'name', 'category', 'foodCategory', 'brand', 'confidence', 'isEdible', 'isPackaged', 'quantityText',
    'expiryVisible', 'expiryDate', 'expiryText', 'manufactureDate', 'storageSuggestion', 'storageTip', 'isMeal', 'cuisine',
    'dietType', 'meal', 'nutrition', 'ingredients', 'ingredientsSource', 'allergens', 'description', 'emoji',
  ],
} as const;

/**
 * Shared domain types. The scanner, My Food, Insights and the Smart Kitchen simulation
 * all use these — there is one data model for the whole app.
 */

export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter';

export type ExpiryStatus = 'expired' | 'use_first' | 'use_soon' | 'fresh' | 'no_expiry';

export type Unit = 'pcs' | 'pack' | 'g' | 'kg' | 'ml' | 'l';

export type FoodCategory =
  | 'dairy'
  | 'bakery'
  | 'fruit'
  | 'vegetable'
  | 'meat'
  | 'seafood'
  | 'eggs'
  | 'grains'
  | 'snacks'
  | 'beverages'
  | 'frozen'
  | 'condiments'
  | 'prepared'
  | 'other';

/** Where an expiry date came from. There is no "guessed" source on purpose. */
export type ExpirySource = 'label' | 'user';

/** Nutrients per 100 g/ml or per serving. null = not known. */
export interface Macros {
  calories: number | null; // kcal
  protein: number | null; // g
  carbs: number | null; // g
  sugar: number | null; // g
  fat: number | null; // g
  saturatedFat: number | null; // g
  fiber: number | null; // g
  sodium: number | null; // mg
}

/** Nutrition as read from the label, or estimated by AI for typical versions of this food. */
export interface Nutrition {
  source: 'label' | 'estimate';
  basis: 'per_100g' | 'per_100ml';
  per100: Macros;
  servingSize: string | null; // e.g. "1 glass (250 ml)"
  servingGrams: number | null;
  perServing: Macros | null;
  fruitVegPercent: number | null; // estimated share of fruit/veg/nuts (for the score)
  /** Cooked dishes and plates: what's on the plate, item by item (values are for that item's portion). */
  meal?: Meal | null;
}

/** One item on a plate, e.g. "Aloo paratha · 2 pieces (~180 g)". Values are for this portion, not per 100 g. */
export interface MealComponent {
  name: string;
  portion: string | null; // e.g. "2 pieces (~180 g)"
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fat: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  sodium: number | null; // mg
  /** True when the app recalculated calories because the AI's number didn't match its own macros. */
  caloriesCorrected?: boolean;
}

export interface Meal {
  portion: string | null; // the whole plate, e.g. "2 aloo parathas with curd and pickle"
  totalGrams: number | null;
  components: MealComponent[];
  assumptions: string[]; // e.g. "Cooked with ~1 tsp ghee per paratha"
}

export type DietType = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian' | 'unknown';

export type NutriGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/** Computed in the app from the nutrition numbers (simplified Nutri-Score) — never made up by the AI. */
export interface NutriScore {
  grade: NutriGrade;
  points: number;
  highlights: string[]; // e.g. "Good source of protein"
  cautions: string[]; // e.g. "High in sugar"
}

/** A food as identified by AI from a photo. */
export interface Product {
  name: string;
  brand: string | null;
  category: FoodCategory;
  quantityText: string | null;
  storage: StorageLocation | null;
  storageTip: string | null;
  expiryDate: string | null; // YYYY-MM-DD, only when read from the label
  expirySource: ExpirySource | null;
  manufactureDate: string | null;
  nutrition: Nutrition | null;
  ingredients: string[] | null;
  ingredientsSource: 'label' | 'estimate' | null;
  allergens: string[] | null;
  isPackaged: boolean;
  description: string | null;
  isMeal?: boolean;
  cuisine?: string | null;
  dietType?: DietType;
}

/** An item in the user's kitchen ("My Food"). */
export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  quantity: number;
  initialQuantity: number;
  unit: Unit;
  storage: StorageLocation;
  expiryDate: string | null;
  expirySource: ExpirySource | null;
  price: number | null; // purchase price entered by the user (₹)
  photo: string | null; // small photo, only if the user chose to keep it
  nutrition: Nutrition | null;
  allergens: string[] | null;
  addedAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp (sync conflict resolution)
  deleted?: boolean; // tombstone for sync
  sample?: boolean; // added by "Load sample kitchen"
}

/** The kinds of things the recogniser can report — drives icons and playful messages. */
export type ObjectKind =
  | 'food'
  | 'drink'
  | 'person'
  | 'dog'
  | 'cat'
  | 'other_animal'
  | 'plant'
  | 'phone'
  | 'laptop'
  | 'tablet'
  | 'electronics'
  | 'book'
  | 'shoe'
  | 'chair'
  | 'furniture'
  | 'bottle'
  | 'cup'
  | 'toy'
  | 'pen'
  | 'bag'
  | 'clothing'
  | 'other_object'
  | 'unknown';

/** Validated, normalised output of image recognition (Gemini). */
export interface RecognitionResult {
  objectType: 'food' | 'non_food' | 'unknown';
  kind: ObjectKind;
  name: string;
  category: string | null;
  foodCategory: FoodCategory | null;
  brand: string | null;
  confidence: number; // 0..1
  isEdible: boolean;
  isPackaged: boolean;
  quantityText: string | null;
  expiryVisible: boolean;
  expiryDate: string | null;
  expiryText: string | null;
  manufactureDate: string | null;
  storageSuggestion: StorageLocation | null;
  storageTip: string | null;
  nutrition: Nutrition | null;
  ingredients: string[] | null;
  ingredientsSource: 'label' | 'estimate' | null;
  allergens: string[] | null;
  description: string | null;
  emoji: string | null;
  isMeal?: boolean;
  cuisine?: string | null;
  dietType?: DietType;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** What the scanner hands to the UI — the UI never needs to know where it came from. */
export type ScanResult =
  | {
      type: 'food';
      product: Product;
      score: NutriScore | null;
      confidence: number;
      confidenceLevel: ConfidenceLevel;
      emoji: string;
    }
  | {
      type: 'non_food';
      object: string;
      kind: ObjectKind;
      category: string | null;
      confidence: number;
      funTitle: string;
      funMessage: string;
      emoji: string;
    }
  | {
      type: 'unknown';
      confidence: number;
      reason: string;
    };

export interface ScanHistoryEntry {
  id: string;
  at: string;
  type: ScanResult['type'];
  name: string;
  emoji: string;
  detail: string | null;
  confidence: number;
  /** Full result for food scans, so every scan is kept (and synced), not just the ones added to My Food. No photo. */
  food?: { product: Product; grade: NutriGrade | null; source: 'photo' | 'text' } | null;
}

export interface UsageEntry {
  id: string;
  foodId: string;
  name: string;
  at: string;
  kind: 'used' | 'wasted';
  amount: number;
  unit: Unit;
  beforeExpiry: boolean | null; // null when the item had no expiry date
  value: number | null; // only when the user entered a price
}

export interface SimulationItem {
  food: FoodItem;
  status: ExpiryStatus;
  daysLeft: number | null;
}

export interface RecipeIdea {
  title: string;
  emoji: string;
  uses: string[];
  steps: string[];
  minutes: number;
}

export type ApiErrorCode = 'not_configured' | 'timeout' | 'bad_output' | 'rate_limited' | 'invalid_request' | 'failed' | 'not_found';

export type GeminiResponse<T> = { ok: true; data: T; model: string; ms: number } | { ok: false; error: ApiErrorCode; message: string };

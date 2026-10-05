import type { FoodCategory, StorageLocation, Unit } from '@/types';

export const CATEGORY_META: Record<FoodCategory, { label: string; emoji: string; storage: StorageLocation; unit: Unit }> = {
  dairy: { label: 'Dairy', emoji: '🥛', storage: 'fridge', unit: 'ml' },
  bakery: { label: 'Bakery', emoji: '🍞', storage: 'pantry', unit: 'pcs' },
  fruit: { label: 'Fruit', emoji: '🍎', storage: 'counter', unit: 'pcs' },
  vegetable: { label: 'Vegetables', emoji: '🥕', storage: 'fridge', unit: 'g' },
  meat: { label: 'Meat', emoji: '🍗', storage: 'fridge', unit: 'g' },
  seafood: { label: 'Seafood', emoji: '🐟', storage: 'fridge', unit: 'g' },
  eggs: { label: 'Eggs', emoji: '🥚', storage: 'fridge', unit: 'pcs' },
  grains: { label: 'Grains & pulses', emoji: '🍚', storage: 'pantry', unit: 'kg' },
  snacks: { label: 'Snacks', emoji: '🍪', storage: 'pantry', unit: 'pack' },
  beverages: { label: 'Beverages', emoji: '🧃', storage: 'pantry', unit: 'ml' },
  frozen: { label: 'Frozen', emoji: '🧊', storage: 'freezer', unit: 'pack' },
  condiments: { label: 'Sauces & spreads', emoji: '🫙', storage: 'pantry', unit: 'g' },
  prepared: { label: 'Cooked food', emoji: '🍲', storage: 'fridge', unit: 'pcs' },
  other: { label: 'Food', emoji: '🍽️', storage: 'pantry', unit: 'pcs' },
};

export const STORAGE_META: Record<StorageLocation, { label: string; emoji: string }> = {
  fridge: { label: 'Refrigerator', emoji: '🧊' },
  freezer: { label: 'Freezer', emoji: '❄️' },
  pantry: { label: 'Pantry', emoji: '🗄️' },
  counter: { label: 'Kitchen counter', emoji: '🧺' },
};

export const UNITS: Unit[] = ['pcs', 'pack', 'g', 'kg', 'ml', 'l'];

export const FOOD_CATEGORIES = Object.keys(CATEGORY_META) as FoodCategory[];

export function formatQuantity(q: number, unit: Unit): string {
  const n = Number.isInteger(q) ? String(q) : q.toFixed(q < 10 ? 2 : 1).replace(/\.?0+$/, '');
  if (unit === 'pcs') return `${n} ${q === 1 ? 'piece' : 'pieces'}`;
  if (unit === 'pack') return `${n} ${q === 1 ? 'pack' : 'packs'}`;
  if (unit === 'l') return `${n} litre${q === 1 ? '' : 's'}`;
  return `${n} ${unit}`;
}

/**
 * Parse text like "1 L", "500 ml", "400g", "6 x 50 g" into a quantity + unit.
 * Returns null when it isn't clear (the user can then type it).
 */
export function parseQuantityText(text: string | null): { quantity: number; unit: Unit } | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(',', '.');
  const multi = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|ltr|litre|liter)\b/.exec(t);
  if (multi) {
    const unit = normUnit(multi[3]);
    if (unit) return { quantity: Number(multi[1]) * Number(multi[2]), unit };
  }
  const m = /(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|grams?|ml|l|ltr|litres?|liters?|pcs|pieces?|pack)\b/.exec(t);
  if (!m) return null;
  const unit = normUnit(m[2]);
  return unit ? { quantity: Number(m[1]), unit } : null;
}

function normUnit(u: string): Unit | null {
  if (['kg'].includes(u)) return 'kg';
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(u)) return 'g';
  if (['ml'].includes(u)) return 'ml';
  if (['l', 'ltr', 'litre', 'litres', 'liter', 'liters'].includes(u)) return 'l';
  if (['pcs', 'piece', 'pieces'].includes(u)) return 'pcs';
  if (u === 'pack') return 'pack';
  return null;
}

export function newId(prefix = 'f'): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

/** Keyword → artwork, so "Paneer" shows cheese and "Bananas" shows a banana (not just the category). */
const NAME_EMOJI: [RegExp, string][] = [
  // Dishes first (so "chicken biryani" is biryani, "rajma chawal" is rajma)
  [/thali|platter/i, '🍱'], [/biryani|pulao|pulav|fried rice/i, '🍛'], [/khichdi|poha|upma|curd rice|lemon rice/i, '🍚'],
  [/paratha|roti|chapati|phulka|naan|kulcha|puri|poori|bhatura|thepla|flatbread/i, '🫓'], [/dosa|uttapam|appam|chilla|cheela|pancake/i, '🥞'],
  [/idli/i, '🍙'], [/samosa|pakora|pakoda|vada|kachori|momo|dumpling/i, '🥟'], [/rajma|chole|chana|beans|lobia/i, '🫘'],
  [/pav bhaji|misal/i, '🥘'], [/pasta|penne|spaghetti|fusilli|macaroni|lasagn|ravioli|alfredo|arrabbiata|carbonara|pesto/i, '🍝'],
  [/dal|daal|sambar|rasam|kadhi|curry|masala|korma|makhani|sabzi|sabji|bhaji|stew|soup/i, '🍲'],
  [/papad|papadum/i, '🍘'], [/pickle|achar/i, '🫙'], [/raita|chutney/i, '🥣'], [/roll|wrap|frankie|kathi|burrito/i, '🌯'],
  [/falafel/i, '🧆'], [/burger/i, '🍔'], [/fries|chips/i, '🍟'], [/gulab jamun|kheer|halwa|payasam|pudding|rasgulla|jalebi|ladoo|barfi/i, '🍮'],
  [/ice cream|kulfi/i, '🍨'], [/lassi|chaas|buttermilk/i, '🥛'], [/chai|tea\b/i, '🍵'],
  [/banana/i, '🍌'], [/apple/i, '🍎'], [/orange juice|juice/i, '🧃'], [/orange|mandarin|tangerine/i, '🍊'], [/lemon|lime/i, '🍋'],
  [/grape/i, '🍇'], [/strawberr/i, '🍓'], [/mango/i, '🥭'], [/pear/i, '🍐'], [/cherr/i, '🍒'], [/peach/i, '🍑'], [/pineapple/i, '🍍'],
  [/watermelon/i, '🍉'], [/kiwi/i, '🥝'], [/blueberr/i, '🫐'], [/avocado/i, '🥑'], [/coconut/i, '🥥'],
  [/paneer|cheese|cheddar|mozzarella/i, '🧀'], [/yog(h)?urt|curd|dahi/i, '🥣'], [/butter|ghee/i, '🧈'], [/milk/i, '🥛'],
  [/egg/i, '🥚'], [/bread|loaf|toast|pav/i, '🍞'], [/croissant/i, '🥐'], [/bagel/i, '🥯'], [/rice/i, '🍚'], [/noodle|ramen|maggi/i, '🍜'],
  [/pasta|spaghetti/i, '🍝'], [/carrot/i, '🥕'], [/tomato/i, '🍅'], [/potato/i, '🥔'], [/onion/i, '🧅'], [/garlic/i, '🧄'],
  [/broccoli/i, '🥦'], [/spinach|lettuce|cabbage|palak|greens/i, '🥬'], [/cucumber/i, '🥒'], [/corn/i, '🌽'], [/mushroom/i, '🍄'],
  [/chil+i/i, '🌶️'], [/capsicum|bell pepper/i, '🫑'], [/chicken/i, '🍗'], [/fish|salmon|tuna/i, '🐟'], [/prawn|shrimp/i, '🍤'],
  [/cookie|biscuit/i, '🍪'], [/chocolate/i, '🍫'], [/cake/i, '🍰'], [/honey/i, '🍯'], [/peanut|nuts?\b/i, '🥜'], [/popcorn/i, '🍿'],
  [/pizza/i, '🍕'], [/salad/i, '🥗'], [/sandwich/i, '🥪'], [/soup|curry|dal\b/i, '🍲'], [/coffee/i, '☕'], [/tea\b/i, '🍵'], [/soda|cola/i, '🥤'],
];

/** Artwork matched from the name alone, or null. */
export function emojiForName(name: string): string | null {
  return NAME_EMOJI.find(([re]) => re.test(name))?.[1] ?? null;
}

export function emojiForFood(name: string, category: FoodCategory): string {
  return emojiForName(name) ?? CATEGORY_META[category].emoji;
}

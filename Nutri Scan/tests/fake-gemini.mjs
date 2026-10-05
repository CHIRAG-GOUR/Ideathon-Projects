// Stand-in for the Gemini REST API (generateContent) used in local tests.
// Start: node tests/fake-gemini.mjs   → http://127.0.0.1:4011
// Pick the next answer: POST /__mode {"mode":"food_label"}   Inspect last request: GET /__last
import http from 'node:http';

let mode = 'food_label';
let last = null;

const food = (o = {}) => ({
  objectType: 'food', kind: 'food', name: 'Milk', category: 'Dairy', foodCategory: 'dairy', brand: 'Amul', confidence: 0.94,
  isEdible: true, isPackaged: true, quantityText: '500 ml', expiryVisible: true, expiryDate: '2099-01-15', expiryText: 'USE BY 15/01/2099',
  manufactureDate: null, storageSuggestion: 'fridge', storageTip: 'Keep refrigerated below 4°C and use within 2 days of opening.',
  nutrition: { source: 'label', basis: 'per_100ml', per100: { calories: 62, protein: 3.2, carbs: 4.8, sugar: 4.8, fat: 3.3, saturatedFat: 2.1, fiber: 0, sodium: 45 }, servingSize: '1 glass (250 ml)', servingGrams: 250, fruitVegPercent: 0 },
  ingredients: ['Toned milk'], ingredientsSource: 'label', allergens: ['milk'], description: 'A pouch of toned milk.', emoji: '🥛', ...o,
});

const ANSWERS = {
  food_label: () => food(),
  food_estimate: () => food({ name: 'Masala Dosa', category: 'Prepared food', foodCategory: 'prepared', brand: null, confidence: 0.88, isPackaged: false, quantityText: null,
    expiryVisible: false, expiryDate: null, expiryText: null, storageSuggestion: 'fridge', storageTip: 'Best eaten fresh; refrigerate leftovers.',
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 168, protein: 3.9, carbs: 25.1, sugar: 1.2, fat: 5.9, saturatedFat: 1.1, fiber: 2.2, sodium: 380 }, servingSize: '1 dosa (150 g)', servingGrams: 150, fruitVegPercent: 25 },
    ingredients: ['Rice', 'Urad dal', 'Potato', 'Onion', 'Oil', 'Spices'], ingredientsSource: 'estimate', allergens: [], emoji: '🥞' }),
  hallucinated_expiry: () => food({ expiryVisible: false, expiryDate: '2099-02-02' }),
  medium: () => food({ name: 'Biscuits', foodCategory: 'snacks', confidence: 0.62, expiryVisible: false, expiryDate: null }),
  low: () => food({ name: 'Cheese', confidence: 0.3 }),
  phone: () => ({ objectType: 'non_food', kind: 'phone', name: 'Mobile Phone', category: 'Electronics', confidence: 0.97, isEdible: false, isPackaged: false, expiryVisible: false, funMessage: 'ignored', emoji: '📱' }),
  person: () => ({ objectType: 'non_food', kind: 'person', name: 'Young woman smiling', category: 'Person', confidence: 0.95, isEdible: false, isPackaged: false, expiryVisible: false, description: 'A person with long hair', emoji: '🙂' }),
  dog: () => ({ objectType: 'non_food', kind: 'dog', name: 'Dog', category: 'Animal', confidence: 0.93, isEdible: false, isPackaged: false, expiryVisible: false }),
  unknown: () => ({ objectType: 'unknown', kind: 'unknown', name: 'Unknown', confidence: 0.1, isEdible: false, isPackaged: false, expiryVisible: false }),
  bad_numbers: () => food({ nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 5000, protein: 80, carbs: 90, sugar: 120, fat: 70, saturatedFat: 90, fiber: 0, sodium: 99999 } } }),
  // A plate: 2 aloo parathas, curd, pickle, butter. The pickle's calories are wrong on purpose (300 kcal for 15 g)
  // and there's an invented expiry date — the app must fix the first and drop the second.
  meal_paratha: () => meal({
    name: 'Aloo Paratha', cuisine: 'North Indian', dietType: 'vegetarian', confidence: 0.9, expiryVisible: false, expiryDate: '2099-01-01',
    meal: { portion: '2 aloo parathas with curd, pickle and butter', assumptions: ['About 1 tsp ghee per paratha', 'Full-fat homemade curd'], components: [
      { name: 'Aloo paratha', portion: '2 pieces (~240 g)', grams: 240, calories: 620, protein: 12, carbs: 80, sugar: 3, fat: 27, saturatedFat: 12, fiber: 8, sodium: 700 },
      { name: 'Curd', portion: '1 katori (~150 g)', grams: 150, calories: 90, protein: 5, carbs: 7, sugar: 7, fat: 4.5, saturatedFat: 3, fiber: 0, sodium: 60 },
      { name: 'Mango pickle', portion: '1 tbsp (~15 g)', grams: 15, calories: 300, protein: 0.2, carbs: 1, sugar: 0.5, fat: 3, saturatedFat: 0.4, fiber: 0.3, sodium: 450 },
      { name: 'Butter', portion: '1 cube (~10 g)', grams: 10, calories: 72, protein: 0.1, carbs: 0, sugar: 0, fat: 8.1, saturatedFat: 5.1, fiber: 0, sodium: 64 },
    ] },
    allergens: ['gluten', 'milk'],
  }),
  // A thali, used for typed searches ("veg thali").
  meal_thali: () => meal({
    name: 'Veg Thali', cuisine: 'North Indian', dietType: 'vegetarian', confidence: 0.86,
    meal: { portion: '2 rotis, dal, rice, aloo gobi, raita, papad and a gulab jamun', assumptions: ['Home-style tadka with 1 tsp oil', 'Standard steel katoris (~150 g)'], components: [
      { name: 'Roti', portion: '2 pieces (~80 g)', grams: 80, calories: 244, protein: 8, carbs: 44, sugar: 1, fat: 4, saturatedFat: 0.7, fiber: 6, sodium: 300 },
      { name: 'Dal tadka', portion: '1 katori (~150 g)', grams: 150, calories: 170, protein: 9, carbs: 20, sugar: 2, fat: 6, saturatedFat: 1.5, fiber: 5, sodium: 450 },
      { name: 'Jeera rice', portion: '1 cup (~160 g)', grams: 160, calories: 212, protein: 4, carbs: 40, sugar: 0.3, fat: 4, saturatedFat: 1.8, fiber: 1, sodium: 250 },
      { name: 'Aloo gobi', portion: '1 katori (~120 g)', grams: 120, calories: 131, protein: 3, carbs: 14, sugar: 4, fat: 7, saturatedFat: 1, fiber: 4, sodium: 380 },
      { name: 'Raita', portion: '1 small bowl (~100 g)', grams: 100, calories: 68, protein: 3, carbs: 5, sugar: 4, fat: 4, saturatedFat: 2.5, fiber: 0.5, sodium: 150 },
      { name: 'Papad', portion: '1 piece (~13 g)', grams: 13, calories: 49, protein: 3, carbs: 7, sugar: 0, fat: 1, saturatedFat: 0.2, fiber: 2, sodium: 230 },
      { name: 'Gulab jamun', portion: '1 piece (~50 g)', grams: 50, calories: 175, protein: 2, carbs: 25, sugar: 20, fat: 7.5, saturatedFat: 4, fiber: 0.2, sodium: 20 },
    ] },
    allergens: ['gluten', 'milk'],
  }),
};

function meal(o) {
  return {
    objectType: 'food', kind: 'food', category: 'Prepared food', foodCategory: 'prepared', brand: null, isEdible: true, isPackaged: false,
    quantityText: null, expiryVisible: false, expiryDate: null, expiryText: null, manufactureDate: null, storageSuggestion: 'fridge',
    storageTip: 'Refrigerate within 2 hours and eat within 1–2 days.', isMeal: true,
    nutrition: { source: 'estimate', basis: 'per_100g', per100: { calories: 999, protein: 1, carbs: 1, sugar: 1, fat: 1, saturatedFat: 1, fiber: 1, sodium: 1 }, servingSize: 'ignored', servingGrams: 100, fruitVegPercent: 20 },
    ingredients: ['Wheat flour', 'Potato', 'Ghee', 'Curd', 'Spices'], ingredientsSource: 'estimate', description: 'A home-style North Indian plate.', emoji: '🫓', ...o,
  };
}

const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  if (req.url === '/__mode') { mode = JSON.parse(body).mode; res.end('ok'); return; }
  if (req.url === '/__last') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(last)); return; }
  const m = /\/models\/([^:]+):generateContent/.exec(req.url || '');
  if (!m) { res.statusCode = 404; res.end(); return; }
  const parsed = JSON.parse(body);
  const img = parsed.contents?.[0]?.parts?.find((p) => p.inlineData)?.inlineData;
  const textPart = parsed.contents?.[0]?.parts?.find((p) => typeof p.text === 'string' && p.text.includes('<query>'))?.text;
  last = { model: m[1], key: req.headers['x-goog-api-key'] ? 'present' : 'missing', imageBytes: img ? Math.round(img.data.length * 0.75) : 0, mime: img?.mimeType, hasSchema: Boolean(parsed.generationConfig?.responseSchema), query: textPart ?? null, thinking: parsed.generationConfig?.thinkingConfig ?? null, maxTokens: parsed.generationConfig?.maxOutputTokens, mode };
  if (mode === 'timeout') { await new Promise((r) => setTimeout(r, 30000)); }
  if (mode === 'error500') { res.statusCode = 500; res.end('{}'); return; }
  res.setHeader('content-type', 'application/json');
  if (mode === 'malformed') { res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Sure! It looks like milk to me :)' }] } }] })); return; }
  if (mode === 'recipes') { res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ recipes: [
    { title: 'Banana Smoothie', emoji: '🥤', uses: ['Milk', 'Bananas'], steps: ['Blend milk and bananas', 'Serve chilled'], minutes: 5 },
    { title: 'Paneer Toastie', emoji: '🥪', uses: ['Bread', 'Paneer'], steps: ['Fill bread with paneer', 'Toast until golden'], minutes: 10 },
    { title: 'Kheer', emoji: '🍚', uses: ['Milk', 'Rice'], steps: ['Simmer rice in milk', 'Sweeten and add cardamom'], minutes: 35 } ] }) }] } }] })); return; }
  const answer = (ANSWERS[mode] ?? ANSWERS.unknown)();
  res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] }, finishReason: 'STOP' }] }));
});
server.listen(4011, '127.0.0.1', () => console.log('fake gemini on 4011'));

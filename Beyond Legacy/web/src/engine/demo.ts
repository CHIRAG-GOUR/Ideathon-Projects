/**
 * The demo store: an intentional dataset for a compact urban convenience store. It is written into the user's own
 * store through the normal data layer (flagged demo: true) and analysed by the same engine as real data — nothing
 * on screen is hard-coded. Sales history is generated relative to the day the demo is loaded.
 *
 * Profile: [name, category, stock, recent units/day, previous-week units/day, expiry in days (null = none),
 *           safety stock, price ₹, case size, supplier]
 */
import { addDays, parseDate } from './dates';
import type { Category, Product } from './types';

type Profile = [string, Category, number, number, number, number | null, number, number, number, string];

export const DEMO_PROFILES: Profile[] = [
  // Beverages
  ['Cold Coffee 250ml', 'Beverages', 18, 8, 6.6, 120, 10, 45, 6, 'Brewline Beverages'],
  ['Bottled Water 1L', 'Beverages', 9, 14, 13, 300, 12, 20, 12, 'Clearspring Waters'],
  ['Cola Can 330ml', 'Beverages', 40, 9, 8.6, 150, 12, 40, 24, 'Fizzco Distributors'],
  ['Energy Drink 250ml', 'Beverages', 6, 4.6, 3.3, 200, 6, 110, 6, 'Fizzco Distributors'],
  ['Orange Juice 200ml', 'Beverages', 22, 3.1, 3.9, 25, 6, 30, 12, 'Orchard Fresh'],
  ['Lemon Soda 300ml', 'Beverages', 30, 5, 4.8, 120, 8, 35, 24, 'Fizzco Distributors'],
  ['Coconut Water 200ml', 'Beverages', 16, 2.4, 2.2, 45, 4, 40, 12, 'Orchard Fresh'],
  ['Iced Tea Lemon 500ml', 'Beverages', 34, 1.9, 2.4, 160, 6, 60, 12, 'Brewline Beverages'],
  // Dairy
  ['Milk 500ml', 'Dairy', 16, 12, 11.5, 1, 10, 30, 10, 'Morning Dairy Co-op'],
  ['Curd Cup 400g', 'Dairy', 14, 3, 3.2, 2, 4, 55, 6, 'Morning Dairy Co-op'],
  ['Paneer 200g', 'Dairy', 10, 1.2, 1.4, 3, 3, 90, 5, 'Morning Dairy Co-op'],
  ['Mango Lassi 200ml', 'Dairy', 20, 3.4, 3.1, 12, 6, 35, 12, 'Morning Dairy Co-op'],
  ['Salted Butter 100g', 'Dairy', 12, 1.4, 1.3, 40, 3, 58, 10, 'Morning Dairy Co-op'],
  ['Eggs (6 pack)', 'Dairy', 14, 2.2, 2.1, 12, 4, 48, 6, 'Green Coop Farms'],
  // Bakery
  ['Chocolate Muffin', 'Bakery', 12, 4, 4.4, 1, 3, 60, 6, 'Daybreak Bakery'],
  ['Butter Croissant', 'Bakery', 10, 2.5, 2.6, 1, 3, 70, 6, 'Daybreak Bakery'],
  ['Whole Wheat Bread', 'Bakery', 15, 6, 5.8, 2, 4, 45, 6, 'Daybreak Bakery'],
  ['Banana Cake Slice', 'Bakery', 6, 1.4, 1.3, 4, 2, 50, 6, 'Daybreak Bakery'],
  // Ready-to-Eat
  ['Veg Sandwich', 'Ready-to-Eat', 14, 5, 5.4, 1, 4, 65, 6, 'CityKitchen Foods'],
  ['Chicken Biryani Bowl', 'Ready-to-Eat', 5, 3, 2.2, 0, 2, 140, 4, 'CityKitchen Foods'],
  ['Samosa (2 pc)', 'Ready-to-Eat', 6, 7, 6.1, 1, 4, 30, 10, 'CityKitchen Foods'],
  ['Paneer Wrap', 'Ready-to-Eat', 9, 3, 2.8, 2, 3, 85, 6, 'CityKitchen Foods'],
  // Snacks
  ['Potato Chips Classic 52g', 'Snacks', 34, 6, 6.2, 120, 10, 20, 24, 'Crunchtime Snacks'],
  ['Chocolate Bar 40g', 'Snacks', 25, 7, 5.5, 200, 8, 40, 24, 'Cocoa Lane'],
  ['Chocolate Biscuit Pack', 'Snacks', 72, 4, 4.2, 210, 10, 30, 24, 'Cocoa Lane'],
  ['Packaged Cookies 200g', 'Snacks', 30, 2.6, 3, 160, 6, 55, 12, 'Cocoa Lane'],
  ['Masala Peanuts 150g', 'Snacks', 48, 1.5, 1.8, 180, 6, 35, 24, 'Crunchtime Snacks'],
  ['Nachos Cheese 150g', 'Snacks', 26, 0.8, 1.2, 140, 4, 99, 12, 'Crunchtime Snacks'],
  ['Mint Gum Pack', 'Snacks', 40, 5, 5.2, 300, 10, 10, 40, 'Cocoa Lane'],
  ['Salted Popcorn 60g', 'Snacks', 20, 2.6, 2.5, 90, 5, 30, 12, 'Crunchtime Snacks'],
  // Packaged Food
  ['Instant Noodles Masala', 'Packaged Food', 40, 9, 8, 240, 12, 15, 24, 'Pantry Wholesale'],
  ['Instant Noodles Cup', 'Packaged Food', 18, 2.8, 2.7, 200, 5, 50, 12, 'Pantry Wholesale'],
  ['Peanut Butter 340g', 'Packaged Food', 14, 0.5, 0.6, 300, 2, 199, 6, 'Pantry Wholesale'],
  ['Basmati Rice 1kg', 'Packaged Food', 12, 1.3, 1.2, 365, 3, 140, 10, 'Pantry Wholesale'],
  ['Tomato Ketchup 500g', 'Packaged Food', 10, 1.1, 1, 270, 3, 120, 6, 'Pantry Wholesale'],
  ['Masala Oats 500g', 'Packaged Food', 9, 1.2, 1.1, 180, 3, 165, 6, 'Pantry Wholesale'],
  ['Tea Bags (25)', 'Packaged Food', 11, 1.5, 1.4, 365, 3, 110, 10, 'Pantry Wholesale'],
  // Personal Care
  ['Toothpaste 100g', 'Personal Care', 18, 0.9, 1.1, null, 3, 95, 12, 'CarePlus Supplies'],
  ['Hand Sanitizer 100ml', 'Personal Care', 9, 1.5, 1.3, null, 3, 60, 12, 'CarePlus Supplies'],
  ['Soap Bar 125g', 'Personal Care', 16, 2, 2, null, 4, 45, 12, 'CarePlus Supplies'],
  ['Shampoo Sachets (10)', 'Personal Care', 12, 1.6, 1.5, null, 3, 30, 10, 'CarePlus Supplies'],
  // Household
  ['Dishwash Liquid 500ml', 'Household', 7, 1, 0.9, null, 2, 110, 6, 'HomeEssentials'],
  ['Garbage Bags (30)', 'Household', 15, 0.6, 0.7, null, 2, 99, 10, 'HomeEssentials'],
  ['Tissue Pack', 'Household', 14, 2, 1.8, null, 4, 40, 12, 'HomeEssentials'],
  ['Paper Cups (50)', 'Household', 8, 1, 1, null, 2, 75, 10, 'HomeEssentials'],
  // Other
  ['AA Batteries (4)', 'Other', 9, 0.8, 0.9, null, 2, 120, 10, 'Voltline'],
  ['Phone Charging Cable', 'Other', 6, 0.3, 0.2, null, 1, 249, 5, 'Voltline'],
];

/** Small deterministic pseudo-random sequence so the demo looks the same for everyone on a given day. */
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Splits `total` units over `days` days with a weekly rhythm and noise, summing exactly to `total`. */
function spread(total: number, dates: string[], rand: () => number): Record<string, number> {
  const w = dates.map((d) => {
    const dow = parseDate(d)!.getDay();
    return (dow === 0 || dow === 6 ? 1.25 : 1) * (0.75 + rand() * 0.5);
  });
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * total);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]]++;
  return Object.fromEntries(dates.map((d, i) => [d, out[i]]));
}

export function demoProducts(todayStr: string, now = Date.now()): Omit<Product, 'id'>[] {
  const trackingSince = addDays(todayStr, -28);
  return DEMO_PROFILES.map(([name, category, stock, recent, prior, expiry, safetyStock, unitPrice, caseSize, supplier], i) => {
    const rand = rng(i * 7919 + 17);
    const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => addDays(todayStr, from + k));
    const salesDaily = {
      ...spread(Math.round(prior * 14), days(-28, -15), rand),
      ...spread(Math.round(prior * 7), days(-14, -8), rand),
      ...spread(Math.round(recent * 7), days(-7, -1), rand),
    };
    return {
      name, category, stock, unitPrice, safetyStock, caseSize, supplier,
      expiryDate: expiry === null ? null : addDays(todayStr, expiry),
      notes: '',
      declaredDailySales: Math.round(prior),
      salesDaily, trackingSince, createdAt: now, updatedAt: now, demo: true,
    };
  });
}

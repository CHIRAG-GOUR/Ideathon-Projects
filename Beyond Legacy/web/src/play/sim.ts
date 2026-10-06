// Shelf Rush: a one-week kirana store simulation. Pure and deterministic (seeded): the same week is played twice —
// once by habit ("Legacy"), once with the app's real recommendation engine ("SmartShelf") — and the results compared.
import { addDays } from '../engine/dates';
import { analyseProduct, type Analysis } from '../engine/analyze';
import { DEFAULT_SETTINGS, type Category, type Product } from '../engine/types';

export interface SimItem {
  id: string;
  name: string;
  category: Category;
  price: number; // selling price ₹
  cost: number; // purchase price ₹
  caseSize: number;
  shelfLife: number | null; // sellable days including the delivery day; null = does not expire in a week
  base: number; // usual units/day
  festival: number; // demand multiplier on the festival day (last year's lift, known from the festival calendar)
  safety: number;
  color: string;
  start: { qty: number; expiresDay: number | null }[]; // stock on hand on Monday morning
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const FESTIVAL_DAY = 5; // Saturday: Diwali eve
const DAY_FACTOR = [0.9, 0.95, 1, 1, 1.1, 1.25, 1.2];
const festivalFactor = (it: SimItem, d: number) => (d === FESTIVAL_DAY ? it.festival : d === FESTIVAL_DAY - 1 ? 1 + (it.festival - 1) * 0.35 : 1);
export const START_DATE = '2026-11-02'; // a Monday; sales history before it drives the engine
export const DISCOUNT = 0.15; // SELL SOON = 15% off, which lifts that product's demand
const DISCOUNT_LIFT = 1.35;

export const ITEMS: SimItem[] = [
  { id: 'milk', name: 'Toned Milk 500ml', category: 'Dairy', price: 28, cost: 22, caseSize: 12, shelfLife: 2, base: 22, festival: 1.6, safety: 8, color: '#E8F1F8', start: [{ qty: 30, expiresDay: 0 }] },
  { id: 'bread', name: 'Whole Wheat Bread', category: 'Bakery', price: 45, cost: 36, caseSize: 6, shelfLife: 3, base: 8, festival: 1.1, safety: 4, color: '#C98A4B', start: [{ qty: 18, expiresDay: 1 }] },
  { id: 'paneer', name: 'Fresh Paneer 200g', category: 'Dairy', price: 90, cost: 72, caseSize: 6, shelfLife: 4, base: 5, festival: 2.6, safety: 3, color: '#F4ECD6', start: [{ qty: 6, expiresDay: 2 }] },
  { id: 'sweets', name: 'Kaju Katli Box 250g', category: 'Packaged Food', price: 260, cost: 200, caseSize: 6, shelfLife: null, base: 2, festival: 6, safety: 2, color: '#E9B949', start: [{ qty: 4, expiresDay: null }] },
  { id: 'oil', name: 'Sunflower Oil 1L', category: 'Packaged Food', price: 150, cost: 128, caseSize: 6, shelfLife: null, base: 4, festival: 2.4, safety: 3, color: '#F2C94C', start: [{ qty: 9, expiresDay: null }] },
  { id: 'atta', name: 'Chakki Atta 5kg', category: 'Packaged Food', price: 260, cost: 228, caseSize: 4, shelfLife: null, base: 3, festival: 1.5, safety: 2, color: '#D9A55B', start: [{ qty: 10, expiresDay: null }] },
  { id: 'namkeen', name: 'Aloo Bhujia 200g', category: 'Snacks', price: 55, cost: 42, caseSize: 12, shelfLife: null, base: 4, festival: 2.2, safety: 4, color: '#E07A2E', start: [{ qty: 14, expiresDay: null }] },
  { id: 'biscuits', name: 'Cream Biscuits', category: 'Snacks', price: 30, cost: 24, caseSize: 24, shelfLife: null, base: 2, festival: 1.2, safety: 4, color: '#7B4A2A', start: [{ qty: 72, expiresDay: null }] },
];

// ---------------------------------------------------------------- seeded randomness (same week both rounds)
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NOISE: Record<string, number[]> = {};
const HISTORY: Record<string, Record<string, number>> = {};
{
  const r = rng(2026);
  for (const it of ITEMS) {
    NOISE[it.id] = DAYS.map(() => 0.8 + r() * 0.4);
    HISTORY[it.id] = {};
    for (let i = 14; i >= 1; i--) {
      const dow = (7 - (i % 7)) % 7; // weekday index of that past day
      HISTORY[it.id][addDays(START_DATE, -i)] = Math.round(it.base * DAY_FACTOR[dow] * (0.8 + r() * 0.4));
    }
  }
}
/** Customers who want this product on day d (before stock limits). */
export function wanted(it: SimItem, d: number, discounted: boolean) {
  return Math.round(it.base * DAY_FACTOR[d] * festivalFactor(it, d) * NOISE[it.id][d] * (discounted ? DISCOUNT_LIFT : 1));
}

// ---------------------------------------------------------------- state
export interface Batch { qty: number; expiresDay: number | null }
export interface ItemState { batches: Batch[]; sales: Record<string, number>; discount: boolean }
export interface DayLog { day: number; sold: Record<string, number>; missed: Record<string, number>; wasted: Record<string, number>; ordered: Record<string, number>; discount: Record<string, boolean> }
export interface Totals { revenue: number; profit: number; lostSales: number; wastedValue: number; stuckValue: number; missedUnits: number; wastedUnits: number; spent: number }
export interface SimState { day: number; items: Record<string, ItemState>; log: DayLog[]; done: boolean }

export const stockOf = (s: ItemState) => s.batches.reduce((n, b) => n + b.qty, 0);
export const dateOf = (d: number) => addDays(START_DATE, d);

export function newWeek(): SimState {
  return {
    day: 0, done: false, log: [],
    items: Object.fromEntries(ITEMS.map((it) => [it.id, { batches: it.start.map((b) => ({ ...b })), sales: { ...HISTORY[it.id] }, discount: false }])),
  };
}

/** The engine's view of a simulated product (same Product shape the app stores). */
export function asProduct(it: SimItem, s: ItemState): Product {
  const exp = s.batches.filter((b) => b.qty > 0 && b.expiresDay !== null).map((b) => b.expiresDay as number);
  return {
    id: it.id, name: it.name, category: it.category, stock: stockOf(s), unitPrice: it.price,
    expiryDate: exp.length ? dateOf(Math.min(...exp)) : null, safetyStock: it.safety, caseSize: it.caseSize,
    supplier: '', notes: '', declaredDailySales: it.base, salesDaily: s.sales, trackingSince: addDays(START_DATE, -14),
    createdAt: 0, updatedAt: 0,
  };
}

export function analyse(state: SimState, it: SimItem): Analysis {
  return analyseProduct(asProduct(it, state.items[it.id]), DEFAULT_SETTINGS, dateOf(state.day), {}, 0);
}

export interface Plan { order: Record<string, number>; discount: Record<string, boolean> }

/** A SmartShelf move for one product: the engine's recommendation, plus the festival calendar for the next two days. */
export interface AiMove { action: Analysis['recommendation']['action']; order: number; discount: boolean; headline: string; why: string; festival: boolean }
export function aiMove(state: SimState, it: SimItem): AiMove {
  const a = analyse(state, it);
  const r = a.recommendation;
  if (r.action === 'SELL_SOON' || r.action === 'REMOVE') return { action: r.action, order: 0, discount: r.action === 'SELL_SOON', headline: r.headline, why: r.summary, festival: false };
  // Order sizing: the engine's rule (cover × demand + safety − stock, whole cases), with two refinements a shop needs:
  // fresh goods are never ordered beyond their shelf life, and festival days use last year's lift from the calendar.
  const cover = it.shelfLife === null ? DEFAULT_SETTINGS.orderCoverageDays : Math.min(DEFAULT_SETTINGS.orderCoverageDays, it.shelfLife);
  // Baseline demand: the engine's 7-day average, but with festival days (known from the calendar) taken out,
  // so a one-off spike does not inflate next week's orders.
  const st = state.items[it.id];
  const recent = [1, 2, 3, 4, 5, 6, 7].map((k) => state.day - k).filter((d) => d < 0 || festivalFactor(it, d) === 1);
  const base = recent.length ? recent.reduce((n, d) => n + (st.sales[dateOf(d)] ?? 0), 0) / recent.length : a.demand.daily;
  const daily = state.day > FESTIVAL_DAY - 1 ? base : a.demand.daily;
  let expected = 0, festival = false;
  for (let k = 0; k < cover; k++) {
    const d = state.day + k;
    const f = d < DAYS.length && it.festival >= 1.5 ? festivalFactor(it, d) : 1;
    if (f > 1) festival = true;
    expected += daily * f;
  }
  const stock = stockOf(state.items[it.id]);
  const need = Math.ceil(expected + it.safety - stock);
  const order = need > 0 ? Math.ceil(need / it.caseSize) * it.caseSize : 0;
  if (festival && order > 0) return { action: 'RESTOCK', order, discount: false, headline: `Restock ${order} units for the festival`, why: `Diwali eve is ${state.day === FESTIVAL_DAY ? 'today' : 'coming'} — last year this sold about ${it.festival.toFixed(1)}× a normal day.`, festival: true };
  if (r.action === 'RESTOCK' && order === 0) return { action: 'HOLD', order: 0, discount: false, headline: 'Hold — the festival rush is over', why: 'Last week’s sales include the festival spike; normal demand is covered by the stock on hand.', festival: false };
  if (r.action === 'RESTOCK') return { action: 'RESTOCK', order: Math.max(order, it.caseSize), discount: false, headline: `Restock ${Math.max(order, it.caseSize)} units`, why: r.summary + (it.shelfLife !== null && it.shelfLife < DEFAULT_SETTINGS.orderCoverageDays ? ` Sized to ${it.shelfLife} days so it sells before it expires.` : ''), festival: false };
  return { action: r.action, order: 0, discount: false, headline: r.headline, why: r.summary, festival: false };
}
export function aiPlan(state: SimState): Plan {
  const p: Plan = { order: {}, discount: {} };
  for (const it of ITEMS) {
    const m = aiMove(state, it);
    p.order[it.id] = m.order;
    p.discount[it.id] = m.discount;
  }
  return p;
}

/** The shopkeeper's habit: same daily milk & bread order, refill dry goods when the shelf looks half empty. */
export function habitPlan(state: SimState): Plan {
  const p: Plan = { order: {}, discount: {} };
  for (const it of ITEMS) {
    const stock = stockOf(state.items[it.id]);
    const par = Math.max(it.caseSize, Math.round(it.base * 4));
    let q = 0;
    if (it.shelfLife !== null && it.shelfLife <= 3) q = Math.ceil((it.base * 1.3) / it.caseSize) * it.caseSize; // "always take the usual"
    else if (stock <= par / 2) q = Math.ceil((par - stock) / it.caseSize) * it.caseSize;
    p.order[it.id] = q;
    p.discount[it.id] = false;
  }
  return p;
}

/** Morning delivery → the day's customers buy (oldest stock first) → end of day, expired stock is thrown away. */
export function playDay(prev: SimState, plan: Plan): SimState {
  const s: SimState = structuredClone(prev);
  const d = s.day;
  const log: DayLog = { day: d, sold: {}, missed: {}, wasted: {}, ordered: {}, discount: {} };
  for (const it of ITEMS) {
    const st = s.items[it.id];
    const q = Math.max(0, Math.round(plan.order[it.id] ?? 0));
    if (q > 0) st.batches.push({ qty: q, expiresDay: it.shelfLife === null ? null : d + it.shelfLife - 1 });
    st.batches.sort((a, b) => (a.expiresDay ?? 99) - (b.expiresDay ?? 99));
    st.discount = !!plan.discount[it.id];
    log.ordered[it.id] = q;
    log.discount[it.id] = st.discount;
    let want = wanted(it, d, st.discount);
    let sold = 0;
    for (const b of st.batches) {
      const take = Math.min(b.qty, want);
      b.qty -= take;
      want -= take;
      sold += take;
    }
    log.sold[it.id] = sold;
    log.missed[it.id] = want;
    st.sales[dateOf(d)] = sold;
    const waste = st.batches.filter((b) => b.expiresDay !== null && b.expiresDay <= d).reduce((n, b) => n + b.qty, 0);
    log.wasted[it.id] = waste;
    st.batches = st.batches.filter((b) => b.qty > 0 && !(b.expiresDay !== null && b.expiresDay <= d));
  }
  s.log.push(log);
  s.day = d + 1;
  s.done = s.day >= DAYS.length;
  return s;
}

export function totals(s: SimState): Totals {
  const t: Totals = { revenue: 0, profit: 0, lostSales: 0, wastedValue: 0, stuckValue: 0, missedUnits: 0, wastedUnits: 0, spent: 0 };
  for (const l of s.log) {
    for (const it of ITEMS) {
      const price = it.price * (l.discount[it.id] ? 1 - DISCOUNT : 1);
      t.revenue += l.sold[it.id] * price;
      t.profit += l.sold[it.id] * (price - it.cost);
      t.lostSales += l.missed[it.id] * it.price;
      t.missedUnits += l.missed[it.id];
      t.wastedUnits += l.wasted[it.id];
      t.wastedValue += l.wasted[it.id] * it.cost;
      t.spent += l.ordered[it.id] * it.cost;
    }
  }
  t.profit -= t.wastedValue;
  // Cash stuck: stock beyond a week of normal sales, valued at cost.
  for (const it of ITEMS) t.stuckValue += Math.max(0, stockOf(s.items[it.id]) - Math.round(it.base * 7)) * it.cost;
  return t;
}

/**
 * Beyond Legacy decision engine — deterministic, explainable, no machine learning.
 *
 *   INPUT    stock, sales history, expiry, product data (Product)
 *   ANALYSE  demand, velocity trend, stock coverage, expiry proximity        → analyseDemand(), coverage
 *   PREDICT  stock-out risk, expiry (wastage) risk, slow stock              → stockoutRisk(), expiryRisk(), isSlow
 *   ACTION   RESTOCK / SELL SOON / HOLD (+ REMOVE for expired stock)        → decide()
 *
 * Every recommendation carries the numbers it was based on and plain-language reasons built only from those numbers.
 * The engine is a pure function of (products, settings, today), so a trained forecasting model can later replace
 * analyseDemand() (or the whole module, behind the same Analysis type) without touching the UI.
 */
import { addDays, daysBetween, parseDate, relativeDay, weekday } from './dates';
import type { Action, ActionRecord, Bucket, EngineSettings, Product, Risk } from './types';

export interface Demand {
  daily: number; // estimated units/day used for every projection
  source: 'sales' | 'blended' | 'declared' | 'none';
  daysOfData: number; // complete days of recorded history in the 14-day window
  recent7: number | null; // average units/day over the last (up to) 7 complete days
  prior7: number | null; // average over the 7 days before that
  trendPct: number | null; // recent vs prior, %
  trend: 'up' | 'down' | 'flat' | 'unknown';
  history: { date: string; units: number | null }[]; // last 14 complete days (null = before tracking began)
}

export interface Reason {
  text: string;
  supports: boolean; // true = a factor behind this recommendation; false = context / counter-evidence
}

export interface Recommendation {
  action: Action;
  bucket: Bucket;
  priority: number; // 0–100, higher first
  headline: string; // "Restock 30 units"
  summary: string; // one sentence tied to the metrics
  quantity: number | null; // suggested order (RESTOCK)
  reasons: Reason[];
  impact: string[];
  ifIgnored: string;
  when: string;
  valueAtRisk: number; // ₹
}

export interface Analysis {
  product: Product;
  demand: Demand;
  coverageDays: number | null; // stock ÷ demand; null when there is no demand to measure against
  stockout: { risk: Risk; stockoutDate: string | null; belowSafety: boolean };
  expiry: { daysToExpiry: number | null; expectedSold: number; unsold: number; risk: Risk | 'EXPIRED' };
  slow: boolean;
  forecast: { date: string; label: string; stock: number }[]; // projected units on hand at the start of each day
  recommendation: Recommendation;
  handled: ActionRecord | null; // the manager has already acted on this recommendation
  flags: { stockout: boolean; expiry: boolean; slow: boolean; healthy: boolean };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const units = (n: number) => `${n} unit${n === 1 ? '' : 's'}`;
export const fmt1 = (x: number) => (Number.isInteger(round1(x)) ? String(round1(x)) : round1(x).toFixed(1));
export const rupees = (x: number) => `₹${Math.round(x).toLocaleString('en-IN')}`;

// ---------------------------------------------------------------- ANALYSE: demand

/**
 * Demand from recorded sales: the average of the last 7 complete days (today is excluded — it is not over yet).
 * With fewer than 7 days of history the sales average is blended with the owner's declared estimate in
 * proportion to the days recorded; with none, the declared estimate is used as is.
 */
export function analyseDemand(p: Product, todayStr: string): Demand {
  const start = parseDate(p.trackingSince) ? p.trackingSince : todayStr;
  const history: Demand['history'] = [];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(todayStr, -i);
    history.push({ date, units: daysBetween(start, date) >= 0 ? Math.max(0, p.salesDaily[date] ?? 0) : null });
  }
  const known = history.filter((h) => h.units !== null) as { date: string; units: number }[];
  const daysOfData = known.length;
  const recent = known.slice(-7), prior = known.slice(0, Math.max(0, known.length - 7));
  const avg = (xs: { units: number }[]) => (xs.length ? xs.reduce((s, x) => s + x.units, 0) / xs.length : null);
  const recent7 = avg(recent);
  const prior7 = prior.length >= 3 ? avg(prior) : null;
  const declared = Math.max(0, p.declaredDailySales || 0);

  let daily: number, source: Demand['source'];
  if (daysOfData === 0 || recent7 === null) {
    daily = declared;
    source = declared > 0 ? 'declared' : 'none';
  } else if (daysOfData >= 7) {
    daily = recent7;
    source = 'sales';
  } else {
    const w = daysOfData / 7;
    daily = declared > 0 ? w * recent7 + (1 - w) * declared : recent7;
    source = declared > 0 ? 'blended' : 'sales';
  }
  const trendPct = recent7 !== null && prior7 !== null && prior7 > 0 ? ((recent7 - prior7) / prior7) * 100 : null;
  const trend = trendPct === null ? 'unknown' : trendPct >= 10 ? 'up' : trendPct <= -10 ? 'down' : 'flat';
  return { daily, source, daysOfData, recent7, prior7, trendPct, trend, history };
}

// ---------------------------------------------------------------- PREDICT

export function stockoutRisk(stock: number, demand: number, safety: number, s: EngineSettings): Risk {
  if (demand <= 0) return 'NONE';
  if (stock <= 0) return 'HIGH';
  const cover = stock / demand;
  if (cover < s.highRiskDays || stock <= safety) return 'HIGH';
  if (cover < s.reorderWindowDays) return 'MEDIUM';
  return 'LOW';
}

/**
 * Expiry: units still on the shelf when the stock expires. The expiry day itself counts as a selling day,
 * so stock expiring tomorrow has two selling days (today and tomorrow).
 */
export function expiryRisk(stock: number, demand: number, expiryDate: string | null, todayStr: string, s: EngineSettings) {
  if (!expiryDate || !parseDate(expiryDate) || stock <= 0) return { daysToExpiry: expiryDate && parseDate(expiryDate) ? daysBetween(todayStr, expiryDate) : null, expectedSold: 0, unsold: 0, risk: 'NONE' as Risk | 'EXPIRED' };
  const daysToExpiry = daysBetween(todayStr, expiryDate);
  if (daysToExpiry < 0) return { daysToExpiry, expectedSold: 0, unsold: stock, risk: 'EXPIRED' as const };
  const expectedSold = Math.min(stock, demand * (daysToExpiry + 1));
  const unsold = Math.max(0, Math.round(stock - expectedSold));
  let risk: Risk = 'NONE';
  if (daysToExpiry <= s.expiryWatchDays) {
    if (unsold > 0 && daysToExpiry <= 2 && unsold >= Math.max(2, 0.15 * stock)) risk = 'HIGH';
    else if (unsold > 0) risk = 'MEDIUM';
    else risk = 'LOW';
  }
  return { daysToExpiry, expectedSold, unsold, risk };
}

export function suggestedOrder(stock: number, demand: number, safety: number, caseSize: number, s: EngineSettings): number {
  const need = Math.ceil(demand * s.orderCoverageDays + safety - stock);
  const pack = Math.max(1, Math.round(caseSize || 1));
  return need <= 0 ? 0 : Math.ceil(need / pack) * pack;
}

// ---------------------------------------------------------------- ACTION

function decide(p: Product, d: Demand, cover: number | null, so: Analysis['stockout'], ex: Analysis['expiry'], slow: boolean, s: EngineSettings): Recommendation {
  const dem = fmt1(d.daily);
  const trendText = d.trendPct !== null && Math.abs(d.trendPct) >= 10 ? `${d.trendPct > 0 ? 'up' : 'down'} ${Math.round(Math.abs(d.trendPct))}%` : null;
  const coverText = cover === null ? 'no measurable demand' : `${fmt1(cover)} days`;
  const demandBasis = d.source === 'declared' ? ' (your estimate — no sales recorded yet)' : d.source === 'blended' ? ` (${d.daysOfData} days of sales blended with your estimate)` : '';

  // 1. Expired stock on the shelf.
  if (ex.risk === 'EXPIRED' && ex.daysToExpiry !== null) {
    return {
      action: 'REMOVE', bucket: 'NOW', priority: 100,
      headline: `Remove ${units(p.stock)} from sale`,
      summary: `This stock expired ${relativeDay(ex.daysToExpiry)}. Take it off the shelf and record it as wastage, then update the expiry date for any fresh stock.`,
      quantity: null,
      reasons: [{ text: `Expiry date passed ${relativeDay(ex.daysToExpiry)}`, supports: true }, { text: `${units(p.stock)} still recorded in stock`, supports: true }],
      impact: ['Keeps expired food off the shelf', 'Makes stock counts and forecasts accurate again'],
      ifIgnored: 'Expired products may be sold to customers, and every forecast for this product stays wrong.',
      when: 'Now', valueAtRisk: p.stock * p.unitPrice,
    };
  }

  // 2. Expiry risk: units forecast to remain unsold at expiry.
  if (ex.risk === 'HIGH' || ex.risk === 'MEDIUM') {
    const dte = ex.daysToExpiry ?? 0;
    const share = p.stock > 0 ? ex.unsold / p.stock : 0;
    const high = ex.risk === 'HIGH';
    return {
      action: 'SELL_SOON', bucket: high && dte <= 1 ? 'NOW' : 'TODAY',
      priority: high ? clamp(78 + share * 12 - dte * 3, 60, 92) : clamp(50 + share * 15 - dte, 40, 65),
      headline: `Sell soon — ${units(ex.unsold)} at risk`,
      summary: `About ${units(ex.unsold)} of ${p.stock} are unlikely to sell before expiry ${relativeDay(dte).toLowerCase()} at the current ${dem} units/day. Prioritise them on the shelf today.`,
      quantity: null,
      reasons: [
        { text: `Expires ${relativeDay(dte).toLowerCase()} (${weekday(p.expiryDate!)})`, supports: true },
        { text: `Expected to sell about ${Math.round(ex.expectedSold)} of ${p.stock} by then at ${dem}/day${demandBasis}`, supports: true },
        { text: `${units(ex.unsold)} (${Math.round(share * 100)}%) projected to remain unsold`, supports: true },
        ...(so.risk === 'HIGH' ? [{ text: 'Stock is also low — reorder only fresh stock after this batch sells', supports: false }] : []),
      ],
      impact: ['Reduces wastage of perishable stock', `Recovers up to ${rupees(ex.unsold * p.unitPrice)} in sales`],
      ifIgnored: `Around ${units(ex.unsold)} (${rupees(ex.unsold * p.unitPrice)}) is likely to be written off when it expires.`,
      when: dte <= 0 ? 'Before closing today' : dte === 1 ? 'Today' : `Before ${weekday(p.expiryDate!)}`,
      valueAtRisk: ex.unsold * p.unitPrice,
    };
  }

  // 3. Stock-out risk.
  if (so.risk === 'HIGH' || so.risk === 'MEDIUM') {
    const qty = Math.max(suggestedOrder(p.stock, d.daily, p.safetyStock, p.caseSize, s), Math.max(1, Math.round(p.caseSize || 1)));
    const high = so.risk === 'HIGH';
    const reasons: Reason[] = [];
    if (p.stock <= 0) reasons.push({ text: 'Out of stock now', supports: true });
    if (so.belowSafety && p.stock > 0) reasons.push({ text: `Current stock (${p.stock}) is at or below the safety level (${p.safetyStock})`, supports: true });
    if (cover !== null && p.stock > 0) reasons.push({ text: `Estimated coverage is ${coverText} — ${cover < s.highRiskDays ? `under the ${s.highRiskDays}-day threshold` : `inside the ${s.reorderWindowDays}-day reorder window`}`, supports: true });
    if (d.trend === 'up') reasons.push({ text: `Recent demand is ${trendText} on the previous week (${fmt1(d.recent7!)} vs ${fmt1(d.prior7!)} units/day)`, supports: true });
    if (d.trend === 'down') reasons.push({ text: `Demand is ${trendText} on the previous week — the order size already reflects this`, supports: false });
    reasons.push({ text: `Stock-out risk is ${so.risk}`, supports: true });
    if (d.source !== 'sales') reasons.push({ text: `Demand of ${dem}/day is based on${demandBasis}`, supports: false });

    if (!high) {
      return {
        action: 'HOLD', bucket: 'MONITOR', priority: clamp(30 + (s.reorderWindowDays - (cover ?? s.reorderWindowDays)) * 5, 25, 45),
        headline: 'Monitor — reorder point approaching',
        summary: `${p.stock} units cover about ${coverText} at ${dem}/day. That is above the ${s.highRiskDays}-day risk threshold and the safety level, so no order is needed yet.`,
        quantity: null, reasons,
        impact: ['Avoids ordering early and tying up cash', `Becomes a restock once coverage drops below ${s.highRiskDays} days or stock reaches ${p.safetyStock}`],
        ifIgnored: so.stockoutDate ? `At the current rate stock runs out around ${weekday(so.stockoutDate)} — check again tomorrow.` : 'Check again tomorrow.',
        when: 'Check tomorrow', valueAtRisk: 0,
      };
    }
    const lostPerDay = d.daily * p.unitPrice;
    return {
      action: 'RESTOCK', bucket: 'NOW',
      priority: clamp(80 + 10 * clamp(1 - (cover ?? 0) / s.highRiskDays, 0, 1) + (p.stock <= 0 ? 8 : 0) + (d.trend === 'up' ? 2 : 0), 80, 99),
      headline: `Restock ${units(qty)}`,
      summary: p.stock <= 0
        ? `This product is out of stock while selling about ${dem} units/day. Restocking ${units(qty)} covers ${s.orderCoverageDays} days of demand plus the safety level.`
        : `${trendText ? `Sales are ${trendText} while only` : 'Only'} ${coverText} of stock remain${p.stock <= p.safetyStock ? ', below the safety level' : ''}. Restocking about ${units(qty)} should reduce the likelihood of a stock-out.`,
      quantity: qty, reasons,
      impact: [`${units(qty)} brings stock to about ${fmt1((p.stock + qty) / Math.max(d.daily, 0.01))} days of cover`, 'Lowers the probability of empty shelves before the next delivery'],
      ifIgnored: p.stock <= 0
        ? `Every day without stock misses about ${rupees(lostPerDay)} in sales.`
        : `At ${dem}/day the shelf is likely empty ${so.stockoutDate ? `by ${weekday(so.stockoutDate)}` : 'soon'}; each day out of stock misses about ${rupees(lostPerDay)} in sales.`,
      when: 'Order today', valueAtRisk: lostPerDay,
    };
  }

  // 4. Slow stock: plenty on hand relative to demand.
  if (slow) {
    const days = cover === null ? null : Math.round(cover);
    return {
      action: 'HOLD', bucket: 'MONITOR', priority: clamp(15 + (days ?? 60) / 6, 15, 25),
      headline: 'Hold — do not purchase more yet',
      summary: days === null
        ? `No sales recorded in the last ${d.daysOfData} days while ${units(p.stock)} sit on the shelf. Do not reorder; review placement or price.`
        : `${units(p.stock)} cover about ${days} days at ${dem}/day. Buying more would tie up about ${rupees(p.stock * p.unitPrice)} of stock already on the shelf.`,
      quantity: null,
      reasons: [
        days === null ? { text: `No sales in the last ${d.daysOfData} days`, supports: true } : { text: `Coverage of ~${days} days is above the ${s.slowCoverageDays}-day slow-stock threshold`, supports: true },
        ...(d.trend === 'down' ? [{ text: `Demand is ${trendText} on the previous week`, supports: true }] : []),
        { text: 'Not necessarily a bad product — it is overstocked relative to current demand', supports: false },
      ],
      impact: ['Frees cash for faster-moving products', 'Possible next step: a promotion or a placement review (not applied automatically)'],
      ifIgnored: `More orders would add to ${rupees(p.stock * p.unitPrice)} of slow-moving stock.`,
      when: 'At the next order', valueAtRisk: 0,
    };
  }

  // 5. Healthy.
  return {
    action: 'HOLD', bucket: 'MONITOR', priority: 0,
    headline: 'Hold — stock is healthy',
    summary: cover === null ? 'No demand recorded yet. Record sales to get a forecast.' : `${units(p.stock)} cover about ${coverText} at ${dem}/day — enough until the next regular order.`,
    quantity: null,
    reasons: [
      cover === null ? { text: 'No sales history or estimate yet', supports: true } : { text: `Coverage of ${coverText} is between the ${s.reorderWindowDays}-day reorder window and the ${s.slowCoverageDays}-day slow-stock threshold`, supports: true },
      ...(ex.risk === 'LOW' ? [{ text: `Expires ${relativeDay(ex.daysToExpiry!).toLowerCase()}, but expected to sell through before then`, supports: true }] : []),
    ],
    impact: ['No action needed'],
    ifIgnored: 'Nothing — this product needs no action today.',
    when: '—', valueAtRisk: 0,
  };
}

/** Whether a manager's earlier action still applies to the current recommendation. */
export function stillHandled(rec: Recommendation, p: Product, r: ActionRecord | undefined, now: number): ActionRecord | null {
  if (!r || r.action !== rec.action) return null;
  switch (r.status) {
    case 'ordered': return p.stock <= r.stockAtAction ? r : null; // until the delivery is received
    case 'prioritized': return p.expiryDate === r.expiryAtAction ? r : null; // until a new batch / expiry date
    case 'removed': return p.stock === r.stockAtAction && p.expiryDate === r.expiryAtAction ? r : null;
    default: return now - r.at < 7 * 86_400_000 ? r : null; // acknowledged: one week
  }
}

export function analyseProduct(p: Product, s: EngineSettings, todayStr: string, actions: Record<string, ActionRecord> = {}, now = Date.now()): Analysis {
  const demand = analyseDemand(p, todayStr);
  const stock = Math.max(0, Math.round(p.stock));
  const coverageDays = demand.daily > 0 ? stock / demand.daily : null;
  const risk = stockoutRisk(stock, demand.daily, p.safetyStock, s);
  const stockoutDate = demand.daily > 0 ? addDays(todayStr, Math.floor(stock / demand.daily)) : null;
  const stockout = { risk, stockoutDate, belowSafety: demand.daily > 0 && stock <= p.safetyStock };
  const expiry = expiryRisk(stock, demand.daily, p.expiryDate, todayStr, s);
  const noRecentSales = demand.source === 'sales' && demand.daily === 0 && demand.daysOfData >= 7 && stock > 0;
  const slow = (coverageDays !== null && coverageDays >= s.slowCoverageDays) || noRecentSales;
  const forecast = Array.from({ length: 8 }, (_, i) => ({
    date: addDays(todayStr, i),
    label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday(addDays(todayStr, i)),
    stock: Math.round((stock - demand.daily * i) * 10) / 10,
  }));
  const recommendation = decide({ ...p, stock }, demand, coverageDays, stockout, expiry, slow, s);
  const handled = stillHandled(recommendation, p, actions[p.id], now);
  const expiryFlag = expiry.risk === 'HIGH' || expiry.risk === 'MEDIUM' || expiry.risk === 'EXPIRED';
  const flags = { stockout: risk === 'HIGH', expiry: expiryFlag, slow: slow && !expiryFlag, healthy: false };
  flags.healthy = !flags.stockout && !flags.expiry && !flags.slow;
  return { product: p, demand, coverageDays, stockout, expiry, slow, forecast, recommendation, handled, flags };
}

// ---------------------------------------------------------------- store level

export interface StoreAnalysis {
  products: Analysis[]; // sorted by priority (open actions first)
  nextMoves: Analysis[]; // open NOW/TODAY actions, highest priority first
  health: { pct: number | null; total: number; stockout: number; expiry: number; slow: number; healthy: number };
  valueAtRisk: number;
}

export function analyseStore(products: Product[], s: EngineSettings, todayStr: string, actions: Record<string, ActionRecord> = {}, now = Date.now()): StoreAnalysis {
  const all = products.map((p) => analyseProduct(p, s, todayStr, actions, now));
  const order = (a: Analysis, b: Analysis) =>
    Number(!!a.handled) - Number(!!b.handled) || b.recommendation.priority - a.recommendation.priority || b.recommendation.valueAtRisk - a.recommendation.valueAtRisk || a.product.name.localeCompare(b.product.name);
  all.sort(order);
  const count = (f: (a: Analysis) => boolean) => all.filter(f).length;
  const healthy = count((a) => a.flags.healthy);
  return {
    products: all,
    nextMoves: all.filter((a) => !a.handled && a.recommendation.bucket !== 'MONITOR'),
    health: {
      pct: all.length ? Math.round((healthy / all.length) * 100) : null,
      total: all.length,
      stockout: count((a) => a.flags.stockout),
      expiry: count((a) => a.flags.expiry),
      slow: count((a) => a.flags.slow),
      healthy,
    },
    valueAtRisk: all.filter((a) => !a.handled).reduce((sum, a) => sum + a.recommendation.valueAtRisk, 0),
  };
}

export const ACTION_LABEL: Record<Action, string> = { RESTOCK: 'Restock', SELL_SOON: 'Sell soon', HOLD: 'Hold', REMOVE: 'Remove' };

import { describe, expect, it } from 'vitest';
import { analyseProduct, analyseStore, analyseDemand, suggestedOrder } from '../src/engine/analyze';
import { demoProducts } from '../src/engine/demo';
import { addDays } from '../src/engine/dates';
import { DEFAULT_SETTINGS, type Product } from '../src/engine/types';

const TODAY = '2026-10-05';
const S = DEFAULT_SETTINGS;

function product(over: Partial<Product> = {}, dailyUnits = 8, days = 14): Product {
  const salesDaily: Record<string, number> = {};
  for (let i = 1; i <= days; i++) salesDaily[addDays(TODAY, -i)] = dailyUnits;
  return {
    id: 'p1', name: 'Cold Coffee 250ml', category: 'Beverages', stock: 18, unitPrice: 45, expiryDate: null, safetyStock: 10, caseSize: 6,
    supplier: '', notes: '', declaredDailySales: 0, salesDaily, trackingSince: addDays(TODAY, -days), createdAt: 0, updatedAt: 0, ...over,
  };
}

describe('acceptance: Cold Coffee 250ml', () => {
  it('stock 18, demand 8/day, safety 10 → moderate risk, monitor (HOLD)', () => {
    const a = analyseProduct(product(), S, TODAY);
    expect(a.demand.daily).toBe(8);
    expect(a.coverageDays).toBeCloseTo(2.25);
    expect(a.stockout.risk).toBe('MEDIUM');
    expect(a.recommendation.action).toBe('HOLD');
    expect(a.recommendation.bucket).toBe('MONITOR');
  });
  it('stock changed to 6 → HIGH stock-out risk, RESTOCK with reasons', () => {
    const a = analyseProduct(product({ stock: 6 }), S, TODAY);
    expect(a.stockout.risk).toBe('HIGH');
    expect(a.recommendation.action).toBe('RESTOCK');
    expect(a.recommendation.bucket).toBe('NOW');
    expect(a.recommendation.quantity).toBe(30); // 8×3 + 10 − 6 = 28 → 30 (case of 6)
    const reasons = a.recommendation.reasons.map((r) => r.text).join('\n');
    expect(reasons).toContain('Current stock (6) is at or below the safety level (10)');
    expect(reasons).toContain('0.8 days');
    expect(a.forecast[1].stock).toBe(-2);
  });
});

describe('demand', () => {
  it('uses the owner estimate with no sales, blends with few days, then sales only', () => {
    expect(analyseDemand(product({ declaredDailySales: 5, salesDaily: {}, trackingSince: TODAY }), TODAY)).toMatchObject({ daily: 5, source: 'declared' });
    const blended = analyseDemand(product({ declaredDailySales: 2, trackingSince: addDays(TODAY, -3) }, 9, 3), TODAY);
    expect(blended.source).toBe('blended');
    expect(blended.daily).toBeCloseTo((3 / 7) * 9 + (4 / 7) * 2);
    expect(analyseDemand(product(), TODAY).source).toBe('sales');
  });
  it('measures the trend against the previous week', () => {
    const p = product();
    for (let i = 8; i <= 14; i++) p.salesDaily[addDays(TODAY, -i)] = 6;
    const d = analyseDemand(p, TODAY);
    expect(Math.round(d.trendPct!)).toBe(33);
    expect(d.trend).toBe('up');
  });
  it('never produces NaN or Infinity with zero sales', () => {
    const a = analyseProduct(product({ declaredDailySales: 0 }, 0), S, TODAY);
    expect(a.coverageDays).toBeNull();
    expect(a.slow).toBe(true);
    expect(JSON.stringify(a)).not.toMatch(/NaN|Infinity/);
    expect(a.recommendation.action).toBe('HOLD');
  });
});

describe('expiry', () => {
  it('SELL SOON only when units are forecast to remain unsold', () => {
    const risky = analyseProduct(product({ name: 'Veg Sandwich', stock: 14, expiryDate: addDays(TODAY, 1), safetyStock: 4 }, 5), S, TODAY);
    expect(risky.expiry.unsold).toBe(4);
    expect(risky.recommendation.action).toBe('SELL_SOON');
    expect(risky.recommendation.bucket).toBe('NOW');
    const sellsThrough = analyseProduct(product({ name: 'Milk', stock: 16, expiryDate: addDays(TODAY, 1), safetyStock: 4 }, 12), S, TODAY);
    expect(sellsThrough.expiry.risk).toBe('LOW');
    expect(sellsThrough.recommendation.action).not.toBe('SELL_SOON');
  });
  it('expired stock is removed, not sold', () => {
    const a = analyseProduct(product({ expiryDate: addDays(TODAY, -1) }), S, TODAY);
    expect(a.recommendation.action).toBe('REMOVE');
  });
});

describe('orders and handled actions', () => {
  it('rounds orders up to the case size', () => {
    expect(suggestedOrder(18, 11, 12, 6, S)).toBe(30);
    expect(suggestedOrder(100, 1, 2, 6, S)).toBe(0);
  });
  it('an order stays handled until stock is received', () => {
    const p = product({ stock: 6 });
    const rec = { productId: 'p1', action: 'RESTOCK' as const, status: 'ordered' as const, quantity: 30, at: 1, by: 'Asha', stockAtAction: 6, expiryAtAction: null, note: '' };
    expect(analyseProduct(p, S, TODAY, { p1: rec }).handled).not.toBeNull();
    expect(analyseProduct({ ...p, stock: 5 }, S, TODAY, { p1: rec }).handled).not.toBeNull();
    expect(analyseProduct({ ...p, stock: 8 }, S, TODAY, { p1: rec }).handled).toBeNull();
  });
});

describe('demo store', () => {
  it('produces a realistic mix through the same engine', () => {
    const products = demoProducts(TODAY).map((p, i) => ({ ...p, id: `d${i}` }));
    const st = analyseStore(products, S, TODAY);
    const by = (n: string) => st.products.find((a) => a.product.name === n)!;
    expect(by('Cold Coffee 250ml').recommendation.action).toBe('HOLD');
    expect(by('Cold Coffee 250ml').stockout.risk).toBe('MEDIUM');
    expect(Math.round(by('Cold Coffee 250ml').demand.daily)).toBe(8);
    expect(by('Veg Sandwich').recommendation.action).toBe('SELL_SOON');
    expect(by('Chocolate Biscuit Pack').recommendation.action).toBe('HOLD');
    expect(by('Chocolate Biscuit Pack').slow).toBe(true);
    expect(by('Bottled Water 1L').recommendation.action).toBe('RESTOCK');
    expect(st.nextMoves[0].recommendation.bucket).toBe('NOW');
    expect(st.health.pct).toBeGreaterThan(50);
    console.log(JSON.stringify(st.health), st.nextMoves.map((a) => `${a.recommendation.action} ${a.product.name} ${a.recommendation.priority.toFixed(0)}`).join(' | '));
  });
});

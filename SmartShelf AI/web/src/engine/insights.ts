// Store-level insights derived from the per-product analyses (no extra data, no extra logic for the UI to duplicate).
import type { Analysis } from './analyze';
import { CATEGORIES, type Category } from './types';

export interface CategoryInsight {
  category: Category;
  products: number;
  dailyUnits: number;
  dailyRevenue: number;
  trendPct: number | null;
  medianCoverage: number | null;
  expirySensitive: number; // products with expiry within the watch window
  atRisk: number; // products with a stock-out, expiry or slow-stock flag
  label: 'High velocity' | 'Growing' | 'Declining' | 'High expiry sensitivity' | 'Slow moving' | 'Stable';
}

export function categoryInsights(list: Analysis[]): CategoryInsight[] {
  const totalRevenue = list.reduce((s, a) => s + a.demand.daily * a.product.unitPrice, 0) || 1;
  const out: CategoryInsight[] = [];
  for (const category of CATEGORIES) {
    const xs = list.filter((a) => a.product.category === category);
    if (!xs.length) continue;
    const dailyUnits = xs.reduce((s, a) => s + a.demand.daily, 0);
    const dailyRevenue = xs.reduce((s, a) => s + a.demand.daily * a.product.unitPrice, 0);
    const recent = xs.reduce((s, a) => s + (a.demand.recent7 ?? 0), 0);
    const prior = xs.reduce((s, a) => s + (a.demand.prior7 ?? 0), 0);
    const withPrior = xs.some((a) => a.demand.prior7 !== null);
    const trendPct = withPrior && prior > 0 ? ((recent - prior) / prior) * 100 : null;
    const covers = xs.map((a) => a.coverageDays).filter((c): c is number => c !== null).sort((a, b) => a - b);
    const medianCoverage = covers.length ? covers[Math.floor(covers.length / 2)] : null;
    const expirySensitive = xs.filter((a) => a.expiry.daysToExpiry !== null && a.expiry.daysToExpiry <= 7).length;
    const atRisk = xs.filter((a) => !a.flags.healthy).length;
    const label: CategoryInsight['label'] =
      expirySensitive / xs.length >= 0.5 ? 'High expiry sensitivity'
        : dailyRevenue / totalRevenue >= 0.25 ? 'High velocity'
        : trendPct !== null && trendPct >= 10 ? 'Growing'
        : trendPct !== null && trendPct <= -10 ? 'Declining'
        : medianCoverage !== null && medianCoverage >= 14 ? 'Slow moving'
        : 'Stable';
    out.push({ category, products: xs.length, dailyUnits, dailyRevenue, trendPct, medianCoverage, expirySensitive, atRisk, label });
  }
  return out.sort((a, b) => b.dailyRevenue - a.dailyRevenue);
}

/** Products whose recent demand moved most (needs a previous week to compare against). */
export function demandMovers(list: Analysis[], n = 5) {
  const xs = list.filter((a) => a.demand.trendPct !== null && (a.demand.recent7 ?? 0) + (a.demand.prior7 ?? 0) >= 1);
  const by = (dir: 1 | -1) => xs.filter((a) => dir * a.demand.trendPct! >= 10).sort((a, b) => dir * (b.demand.trendPct! - a.demand.trendPct!)).slice(0, n);
  return { gaining: by(1), losing: by(-1) };
}

export function expiryGroups(list: Analysis[]) {
  const withExpiry = list.filter((a) => a.expiry.daysToExpiry !== null && a.product.stock > 0);
  return {
    expired: withExpiry.filter((a) => a.expiry.daysToExpiry! < 0),
    today: withExpiry.filter((a) => a.expiry.daysToExpiry === 0),
    soon: withExpiry.filter((a) => a.expiry.daysToExpiry! >= 1 && a.expiry.daysToExpiry! <= 2),
    week: withExpiry.filter((a) => a.expiry.daysToExpiry! >= 3 && a.expiry.daysToExpiry! <= 7),
  };
}

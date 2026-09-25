/**
 * Smart Stock — the single source of truth for demo products.
 *
 * Every screen (home page, scanner, My Stock, dashboard, 3D warehouse, printable
 * barcode sheet) reads products from this file. Never redefine products anywhere else.
 */

export type ZoneId = 'FRESH' | 'SELL_SOON' | 'SELL_FIRST';

export type ProductArtId = 'milk' | 'bread' | 'biscuits' | 'juice' | 'paneer' | 'rice';

export interface Product {
  id: ProductArtId;
  /** Exact value encoded in the printed barcode (Code 128). */
  barcode: string;
  name: string;
  category: string;
  pack: string;
  quantity: number;
  daysUntilExpiry: number;
  /** Estimated ₹ value that would be lost if this stock is forgotten and expires. */
  atRiskValue: number;
}

export const PRODUCTS: Product[] = [
  { id: 'milk', barcode: '890000000001', name: 'Milk', category: 'Dairy', pack: '1 L bottle', quantity: 42, daysUntilExpiry: 2, atRiskValue: 450 },
  { id: 'bread', barcode: '890000000002', name: 'Bread', category: 'Bakery', pack: '400 g loaf', quantity: 18, daysUntilExpiry: 4, atRiskValue: 240 },
  { id: 'biscuits', barcode: '890000000003', name: 'Biscuits', category: 'Snacks', pack: 'Family pack', quantity: 35, daysUntilExpiry: 30, atRiskValue: 50 },
  { id: 'juice', barcode: '890000000004', name: 'Juice', category: 'Beverages', pack: '1 L carton', quantity: 22, daysUntilExpiry: 12, atRiskValue: 120 },
  { id: 'paneer', barcode: '890000000005', name: 'Paneer', category: 'Dairy', pack: '200 g pack', quantity: 16, daysUntilExpiry: 1, atRiskValue: 360 },
  { id: 'rice', barcode: '890000000006', name: 'Rice', category: 'Staples', pack: '5 kg bag', quantity: 50, daysUntilExpiry: 180, atRiskValue: 30 },
];

export const TOTAL_AT_RISK_VALUE = PRODUCTS.reduce((sum, p) => sum + p.atRiskValue, 0);

export interface ZoneInfo {
  id: ZoneId;
  label: string;
  short: string;
  rule: string;
  description: string;
  /** Tailwind-independent colours so 3D scenes and canvases can share them. */
  color: string;
  soft: string;
  ink: string;
}

export const ZONES: Record<ZoneId, ZoneInfo> = {
  SELL_FIRST: {
    id: 'SELL_FIRST',
    label: 'Sell First',
    short: 'Sell first',
    rule: 'Expires in 2 days or less',
    description: 'Products that expire very soon. Put them at the front so they sell today.',
    color: '#E4572E',
    soft: '#FDE6DF',
    ink: '#8F2A12',
  },
  SELL_SOON: {
    id: 'SELL_SOON',
    label: 'Sell Soon',
    short: 'Sell soon',
    rule: 'Expires in 3 to 7 days',
    description: 'Products approaching expiry. Keep them in view and sell them this week.',
    color: '#F2A516',
    soft: '#FDF1D3',
    ink: '#7A4E00',
  },
  FRESH: {
    id: 'FRESH',
    label: 'Fresh',
    short: 'Fresh',
    rule: 'More than 7 days left',
    description: 'Products with plenty of shelf life. They can wait in regular storage.',
    color: '#2F8F55',
    soft: '#E1F2E4',
    ink: '#16512F',
  },
};

/** Shelf order used everywhere: most urgent first. */
export const ZONE_ORDER: ZoneId[] = ['SELL_FIRST', 'SELL_SOON', 'FRESH'];

/** The one rule the whole product is built on. */
export function getZoneForDays(days: number): ZoneId {
  if (days <= 2) return 'SELL_FIRST';
  if (days <= 7) return 'SELL_SOON';
  return 'FRESH';
}

export function getRecommendedZone(product: Product): ZoneId {
  return getZoneForDays(product.daysUntilExpiry);
}

export function getRecommendationReason(product: Product): string {
  const zone = getRecommendedZone(product);
  if (zone === 'SELL_FIRST') {
    return 'This product is close to expiry. Move it to the front shelf so it gets sold first.';
  }
  if (zone === 'SELL_SOON') {
    return 'This product has a few days left. Keep it where customers can see it and sell it this week.';
  }
  return 'This product has plenty of shelf life. Store it on the fresh shelf behind older stock.';
}

export function formatExpiry(days: number): string {
  if (days <= 0) return 'Expires today';
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

export function formatDaysLeft(days: number): string {
  if (days <= 0) return 'Expires today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

/** Shelf-life fill for the little progress bar (0 = expired, 1 = very fresh). */
export function getFreshness(days: number): number {
  // Log scale so 1, 2, 4, 12, 30 and 180 days all look visibly different.
  return Math.max(0.04, Math.min(1, Math.log(days + 1) / Math.log(181)));
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * Normalise what a camera decoder returns so small differences never break a demo:
 * whitespace, stray characters, or a UPC read reported with a leading zero.
 */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').trim();
}

export function findProductByBarcode(raw: string): Product | undefined {
  const code = normalizeBarcode(raw);
  if (!code) return undefined;
  const exact = PRODUCTS.find((p) => p.barcode === code);
  if (exact) return exact;
  const stripped = code.replace(/^0+/, '');
  return PRODUCTS.find((p) => p.barcode.replace(/^0+/, '') === stripped);
}

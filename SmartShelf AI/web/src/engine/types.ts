// Domain types shared by the engine, the data layer and the UI.

export const CATEGORIES = ['Beverages', 'Snacks', 'Dairy', 'Bakery', 'Ready-to-Eat', 'Packaged Food', 'Personal Care', 'Household', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

/** A product as stored (Firestore document or local record). Dates are local calendar dates, 'YYYY-MM-DD'. */
export interface Product {
  id: string;
  name: string;
  category: Category;
  stock: number; // units on hand
  unitPrice: number; // selling price, ₹
  expiryDate: string | null; // earliest expiry of the stock on hand; null = not perishable
  safetyStock: number; // minimum safe stock (units)
  caseSize: number; // order multiple (units per case/pack)
  supplier: string;
  notes: string;
  declaredDailySales: number; // owner's estimate, used until enough sales are recorded
  salesDaily: Record<string, number>; // units sold per day, rolling window kept by the data layer
  trackingSince: string; // sales history is complete from this date (missing days = zero sales)
  createdAt: number;
  updatedAt: number;
  demo?: boolean;
}

/** Store-level thresholds. Defaults in DEFAULT_SETTINGS; editable on the Store screen. */
export interface EngineSettings {
  highRiskDays: number; // coverage below this = HIGH stock-out risk
  reorderWindowDays: number; // coverage below this = MEDIUM (monitor; reorder point approaching)
  orderCoverageDays: number; // a suggested order brings stock up to this many days of demand + safety stock
  slowCoverageDays: number; // coverage at or above this = slow stock
  expiryWatchDays: number; // expiry within this window is analysed for unsold units
}

export const DEFAULT_SETTINGS: EngineSettings = {
  highRiskDays: 2,
  reorderWindowDays: 4,
  orderCoverageDays: 3,
  slowCoverageDays: 14,
  expiryWatchDays: 7,
};

export type Action = 'RESTOCK' | 'SELL_SOON' | 'HOLD' | 'REMOVE';
export type Bucket = 'NOW' | 'TODAY' | 'MONITOR';
export type Risk = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/** A manager's response to a recommendation (stored per product). */
export interface ActionRecord {
  productId: string;
  action: Action;
  status: 'ordered' | 'prioritized' | 'acknowledged' | 'removed';
  quantity: number | null;
  at: number; // ms
  by: string; // display name
  stockAtAction: number;
  expiryAtAction: string | null;
  note: string;
}

export interface Store {
  id: string;
  name: string;
  type: string;
  area: string;
  managerName: string;
  openTime: string; // 'HH:MM'
  closeTime: string;
  deliveryDays: string; // free text, e.g. "Daily (dairy, bakery) · Mon/Thu (packaged)"
  demo: boolean;
  createdAt: number;
}

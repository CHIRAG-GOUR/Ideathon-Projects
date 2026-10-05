// The one data-access contract. Screens never talk to Firestore or localStorage directly.
import { addDays, parseDate, today } from '../engine/dates';
import { CATEGORIES, DEFAULT_SETTINGS, type ActionRecord, type Category, type EngineSettings, type Product, type Store } from '../engine/types';

export interface InventoryEvent {
  id: string;
  productId: string;
  productName: string;
  type: 'sale' | 'receive' | 'count' | 'wastage' | 'created' | 'edited' | 'action';
  delta: number; // change in units (0 for edits/actions)
  stockAfter: number;
  note: string;
  at: number;
  by: string;
}

export interface Workspace {
  store: Store;
  settings: EngineSettings;
  products: Product[];
  actions: Record<string, ActionRecord>;
  events: InventoryEvent[]; // most recent first
}

export type ProductInput = Pick<Product, 'name' | 'category' | 'stock' | 'unitPrice' | 'expiryDate' | 'safetyStock' | 'caseSize' | 'supplier' | 'notes' | 'declaredDailySales'>;
export type StoreInput = Pick<Store, 'name' | 'type' | 'area' | 'managerName'>;
export type StockKind = 'receive' | 'count' | 'wastage';

export interface Repository {
  readonly mode: 'cloud' | 'local';
  subscribe(onData: (w: Workspace | null) => void, onError: (message: string) => void): () => void;
  /** Creates the store (optionally pre-filled with the demo products) in one atomic write. */
  createStore(input: StoreInput, opts?: { demo?: boolean }): Promise<void>;
  updateStore(patch: Partial<Store>): Promise<void>;
  updateSettings(s: EngineSettings): Promise<void>;
  addProduct(input: ProductInput): Promise<string>;
  updateProduct(id: string, input: ProductInput): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  recordSale(productId: string, units: number, date: string): Promise<void>;
  adjustStock(productId: string, kind: StockKind, value: number, note: string, expiryDate?: string | null): Promise<void>;
  setAction(r: ActionRecord): Promise<void>;
  clearAction(productId: string): Promise<void>;
  loadDemo(): Promise<void>;
  clearDemo(): Promise<void>;
}

export const SALES_WINDOW_DAYS = 35;

/** Keeps the per-product daily sales map to a rolling window. */
export function pruneSales(m: Record<string, number>, todayStr = today()): Record<string, number> {
  const cutoff = addDays(todayStr, -SALES_WINDOW_DAYS);
  return Object.fromEntries(Object.entries(m).filter(([d]) => d >= cutoff));
}

export class ValidationError extends Error {}

/** Shared validation for every write path (the Firestore rules enforce the same limits server-side). */
export function validateProduct(p: ProductInput): ProductInput {
  const name = p.name.trim();
  if (!name) throw new ValidationError('Enter a product name.');
  if (name.length > 80) throw new ValidationError('Keep the product name under 80 characters.');
  if (!CATEGORIES.includes(p.category as Category)) throw new ValidationError('Choose a category.');
  const int = (v: number, label: string, max = 100000) => {
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) throw new ValidationError(`${label} must be a whole number of 0 or more.`);
    if (v > max) throw new ValidationError(`${label} looks too large.`);
    return v;
  };
  const num = (v: number, label: string, max = 1000000) => {
    if (!Number.isFinite(v) || v < 0) throw new ValidationError(`${label} must be 0 or more.`);
    if (v > max) throw new ValidationError(`${label} looks too large.`);
    return Math.round(v * 100) / 100;
  };
  if (p.expiryDate !== null && !parseDate(p.expiryDate)) throw new ValidationError('Enter a valid expiry date, or leave it empty.');
  const caseSize = int(p.caseSize, 'Case size', 1000);
  if (caseSize < 1) throw new ValidationError('Case size must be at least 1.');
  return {
    name, category: p.category, stock: int(p.stock, 'Current stock'), unitPrice: num(p.unitPrice, 'Unit price'), expiryDate: p.expiryDate,
    safetyStock: int(p.safetyStock, 'Minimum safe stock'), caseSize, supplier: p.supplier.trim().slice(0, 80), notes: p.notes.trim().slice(0, 500),
    declaredDailySales: num(p.declaredDailySales, 'Daily sales', 10000),
  };
}

export function stockAfter(kind: StockKind, current: number, value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new ValidationError('Enter a whole number of units.');
  if (kind === 'receive') return current + value;
  if (kind === 'wastage') {
    if (value > current) throw new ValidationError(`Only ${current} units are in stock.`);
    return current - value;
  }
  return value;
}

export const emptySettings = (): EngineSettings => ({ ...DEFAULT_SETTINGS });

export function friendlyError(e: unknown): string {
  if (e instanceof ValidationError) return e.message;
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'permission-denied': 'You do not have access to this store’s data.',
    unavailable: 'Cannot reach the server. Changes are kept on this device and sync when you are back online.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account uses this email.',
    'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled for this Firebase project.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  };
  return map[code] ?? (e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
}

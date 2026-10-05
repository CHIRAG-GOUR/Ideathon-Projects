import type { ExpiryStatus, FoodItem } from '@/types';

/**
 * Expiry rules, computed from the date every time (never stored):
 *   past the date → EXPIRED · today/tomorrow → USE FIRST · 2–4 days → USE SOON · 5+ days → FRESH
 *   no date → NO EXPIRY (we never invent one)
 */
export const USE_FIRST_MAX_DAYS = 1;
export const USE_SOON_MAX_DAYS = 4;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Whole days from `today` to the expiry date (local calendar days). */
export function daysUntil(expiryDate: string | null, today: Date = new Date()): number | null {
  if (!isValidIsoDate(expiryDate)) return null;
  const [y, m, d] = expiryDate.split('-').map(Number);
  const exp = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exp.getTime() - start.getTime()) / 86_400_000);
}

export function statusForDays(days: number | null): ExpiryStatus {
  if (days === null) return 'no_expiry';
  if (days < 0) return 'expired';
  if (days <= USE_FIRST_MAX_DAYS) return 'use_first';
  if (days <= USE_SOON_MAX_DAYS) return 'use_soon';
  return 'fresh';
}

export function getExpiryStatus(expiryDate: string | null, today: Date = new Date()): ExpiryStatus {
  return statusForDays(daysUntil(expiryDate, today));
}

export const STATUS_META: Record<ExpiryStatus, { label: string; short: string; rank: number; color: string; soft: string; ink: string }> = {
  expired: { label: 'Expired', short: 'Expired', rank: 0, color: '#A9A3C9', soft: '#EFEDF8', ink: '#5A5478' },
  use_first: { label: 'Use First', short: 'Use first', rank: 1, color: '#FF7E72', soft: '#FFE4E0', ink: '#9C3029' },
  use_soon: { label: 'Use Soon', short: 'Use soon', rank: 2, color: '#FACD2C', soft: '#FFF6C9', ink: '#7A5A00' },
  fresh: { label: 'Fresh', short: 'Fresh', rank: 3, color: '#4FD3BF', soft: '#D5F7F0', ink: '#105F57' },
  no_expiry: { label: 'No expiry set', short: 'No date', rank: 4, color: '#B5BDD3', soft: '#EEF1F8', ink: '#4B5470' },
};

export function describeDays(days: number | null): string {
  if (days === null) return 'Expiry not set';
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days left`;
}

/** Sort: use-first → use-soon → fresh → no date → expired last (so it's not the first thing you see). */
export function sortByUrgency<T extends Pick<FoodItem, 'expiryDate' | 'name'>>(items: T[], today: Date = new Date()): T[] {
  const order: Record<ExpiryStatus, number> = { use_first: 0, use_soon: 1, fresh: 2, no_expiry: 3, expired: 4 };
  return [...items].sort((a, b) => {
    const sa = getExpiryStatus(a.expiryDate, today);
    const sb = getExpiryStatus(b.expiryDate, today);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    const da = daysUntil(a.expiryDate, today) ?? 9999;
    const db = daysUntil(b.expiryDate, today) ?? 9999;
    return da - db || a.name.localeCompare(b.name);
  });
}

export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toIsoDate(d);
}

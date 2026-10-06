// Calendar-date helpers. All dates are local 'YYYY-MM-DD' strings so "today" means the store's day, not UTC.

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function today(now: Date = new Date()): string {
  return isoDate(now);
}

export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null; // rejects 2026-02-31
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  if (!d) throw new Error(`Invalid date ${s}`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  const x = parseDate(a), y = parseDate(b);
  if (!x || !y) throw new Error(`Invalid date ${a} / ${b}`);
  return Math.round((y.getTime() - x.getTime()) / 86_400_000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(s: string | null): string {
  const d = s ? parseDate(s) : null;
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—';
}

export function shortDate(s: string): string {
  const d = parseDate(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '—';
}

export function weekday(s: string): string {
  const d = parseDate(s);
  return d ? DAYS[d.getDay()] : '';
}

/** "Today", "Tomorrow", "in 3 days", "2 days ago". */
export function relativeDay(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

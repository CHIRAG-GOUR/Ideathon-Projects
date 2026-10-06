// Retail-shaped components: the digital shelf label (product card), category aisle tiles and the shelf stage.
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { CategoryScene } from '../art/scenes';
import { fmt1, type Analysis } from '../engine/analyze';
import type { Category, EngineSettings } from '../engine/types';
import { isCritical } from './decision';
import { IconChevronRight } from './icons';
import { ActionBadge, cx } from './kit';

/** "Cold Coffee 250ml" → ["Cold Coffee", "250ml"] so labels can print the size the way shelf tags do. */
export function splitSize(name: string): [string, string] {
  const m = /^(.*?)[\s—-]*((?:\d+(?:\.\d+)?\s?(?:ml|l|g|kg|pc|pcs))|\(\d+[^)]*\))\s*$/i.exec(name);
  return m && m[1].trim() ? [m[1].trim(), m[2].replace(/[()]/g, '')] : [name, ''];
}

export function availability(a: Analysis): { label: string; cls: string } {
  if (a.product.stock <= 0) return { label: 'Out of stock', cls: 'bg-red text-white' };
  if (a.expiry.risk === 'EXPIRED') return { label: 'Expired', cls: 'bg-red text-white' };
  if (a.stockout.risk === 'HIGH') return { label: 'Low stock', cls: 'bg-red-soft text-red-ink' };
  if (a.flags.expiry) return { label: 'Expiring', cls: 'bg-yellow text-ink' };
  if (a.flags.slow) return { label: 'Slow mover', cls: 'bg-hold-bg text-hold-fg' };
  return { label: 'In stock', cls: 'bg-green-mint text-green' };
}

export const CATEGORY_TONE: Record<Category, string> = {
  Beverages: 'bg-green', Snacks: 'bg-red', Dairy: 'bg-green-dark', Bakery: 'bg-orange', 'Ready-to-Eat': 'bg-yellow',
  'Packaged Food': 'bg-orange', 'Personal Care': 'bg-green-mid', Household: 'bg-green-dark', Other: 'bg-hold-dot',
};

/** The digital shelf label — the product card. Deliberately four facts: name, stock, sales velocity, status.
 * Everything else (expiry, forecast, reasoning, history) lives on the product page. */
export function ShelfLabelCard({ a, quiet }: { a: Analysis; settings?: EngineSettings; quiet?: boolean }) {
  const p = a.product, r = a.recommendation;
  const [title, size] = splitSize(p.name);
  const critical = isCritical(a);
  const hold = r.action === 'HOLD';
  const chip = a.handled ? ['bg-green-mint text-green', `✓ ${a.handled.status}`]
    : !hold ? null
    : a.flags.slow ? ['bg-orange-soft text-[#9A4712]', 'Slow mover']
    : a.stockout.risk === 'MEDIUM' ? ['bg-cream-deep text-ink-2', 'Monitor']
    : ['bg-green-mint text-green', 'Healthy'];
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="h-full">
      <Link to={`/products/${p.id}`} className={cx('group flex h-full flex-col overflow-hidden rounded-xl3 bg-surface shadow-card ring-1 ring-line transition-shadow hover:shadow-lift', quiet && 'saturate-[.55]')}>
        <div className="relative flex justify-center bg-gradient-to-b from-cream to-cream-deep px-3 pb-1 pt-4">
          {p.demo && <span className="absolute right-2.5 top-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">Demo</span>}
          <ProductArt product={p} size={88} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]" />
        </div>
        <div className="h-2 bg-[#CDBB93] shelf-grain" aria-hidden />
        <div className="flex flex-1 flex-col p-3.5">
          <p className="truncate font-display text-[15px] font-extrabold leading-tight tracking-tight text-ink" title={p.name}>{title}{size && <> <span className="text-[12px] font-bold text-ink-muted">{size}</span></>}</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className={cx('font-display text-[22px] font-extrabold tabular-nums leading-none', p.stock <= 0 ? 'text-red-ink' : 'text-ink')}>{p.stock}<span className="ml-1 text-[12px] font-bold text-ink-muted">units</span></p>
            <p className="text-[13px] font-bold tabular-nums text-ink-2">{fmt1(a.demand.daily)}<span className="text-ink-muted">/day</span></p>
          </div>
          <div className="min-h-3 flex-1" />
          <div className="flex items-center justify-between gap-2 pt-1">
            {chip ? <span className={cx('rounded-lg px-2 py-1 text-[11.5px] font-extrabold', chip[0])}>{chip[1]}</span> : <ActionBadge action={r.action} size="sm" critical={critical} />}
            <IconChevronRight size={16} className="text-ink-faint transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Category aisle tile — navigation into a filtered inventory, with its own illustration. */
export function CategoryTile({ category, count, risks, to }: { category: Category; count: number; risks: number; to: string }) {
  const label = category === 'Bakery' ? 'Fresh & Bakery' : category;
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="shrink-0">
      <Link to={to} className="group relative flex h-full w-[150px] flex-col overflow-hidden rounded-xl3 bg-surface p-3 shadow-card ring-1 ring-line hover:shadow-lift sm:w-auto">
        <span className={cx('absolute inset-x-0 top-0 h-1.5', CATEGORY_TONE[category])} aria-hidden />
        <div className="flex h-[78px] items-end justify-center"><CategoryScene category={category} size={84} /></div>
        <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink">{label}</p>
        <p className="text-[12px] font-semibold text-ink-muted">{count} products{risks ? <> · <span className="text-red-ink">{risks} need action</span></> : ' · all healthy'}</p>
      </Link>
    </motion.div>
  );
}

// Retail-shaped components: the digital shelf label (product card), category aisle tiles and the shelf stage.
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { CategoryScene } from '../art/scenes';
import { fmt1, rupees, type Analysis } from '../engine/analyze';
import { relativeDay } from '../engine/dates';
import type { Category, EngineSettings } from '../engine/types';
import { isCritical } from './decision';
import { ActionBadge, cx, StockBar } from './kit';

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

/** The digital shelf label — the product card used across the app. */
export function ShelfLabelCard({ a, settings, quiet }: { a: Analysis; settings: EngineSettings; quiet?: boolean }) {
  const p = a.product, r = a.recommendation;
  const [title, size] = splitSize(p.name);
  const av = availability(a);
  const critical = isCritical(a);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="h-full">
      <Link to={`/products/${p.id}`} className={cx('group flex h-full flex-col overflow-hidden rounded-xl3 bg-surface shadow-card ring-1 ring-line transition-shadow hover:shadow-lift', quiet && 'saturate-[.55]')}>
        <div className="relative bg-gradient-to-b from-cream to-cream-deep px-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <span className={cx('rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]', av.cls)}>{av.label}</span>
            {p.demo && <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">Demo</span>}
          </div>
          <div className="flex justify-center pb-1 pt-0.5"><ProductArt product={p} size={92} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]" /></div>
          {/* shelf edge with price strip */}
          <div className="relative -mx-3 flex h-6 items-center justify-between bg-[#CDBB93] px-3 shelf-grain">
            <span className={cx('h-full w-1.5', CATEGORY_TONE[p.category])} aria-hidden />
            <span className="tag-shape rounded-l bg-yellow py-0.5 pl-1.5 pr-3 text-[11px] font-black tabular-nums text-ink">{rupees(p.unitPrice)}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <p className="truncate font-display text-[15px] font-extrabold uppercase leading-tight tracking-tight text-ink">{title}</p>
          <p className="text-[12px] font-semibold text-ink-muted">{size || p.category}{size ? ` · ${p.category}` : ''}</p>
          <div className="mt-2.5 flex items-baseline justify-between">
            <p className="font-display text-[22px] font-extrabold tabular-nums leading-none text-ink">{p.stock}<span className="ml-1 text-[12px] font-bold text-ink-muted">units</span></p>
            <p className="text-[12px] font-bold text-ink-muted">{fmt1(a.demand.daily)}/day</p>
          </div>
          <StockBar days={a.coverageDays} warnAt={settings.reorderWindowDays} critAt={settings.highRiskDays} className="mt-2" />
          <p className={cx('mt-1.5 text-[12px] font-bold', a.stockout.risk === 'HIGH' ? 'text-red-ink' : 'text-ink-2')}>
            {a.coverageDays === null ? 'No recent demand' : a.coverageDays >= 60 ? '60+ days of stock' : `${fmt1(a.coverageDays)} days remaining`}
            {a.expiry.daysToExpiry !== null && a.expiry.daysToExpiry <= 7 && <span className="text-orange"> · exp. {relativeDay(a.expiry.daysToExpiry).toLowerCase()}</span>}
          </p>
          <div className="min-h-3 flex-1" />
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-line-strong pt-2.5">
            <ActionBadge action={r.action} size="sm" critical={critical} />
            <span className="truncate text-[12px] font-bold text-ink-2">{a.handled ? `✓ ${a.handled.status}` : r.quantity ? `Suggested +${r.quantity}` : r.action === 'SELL_SOON' ? `${a.expiry.unsold} at risk` : 'Review'}</span>
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

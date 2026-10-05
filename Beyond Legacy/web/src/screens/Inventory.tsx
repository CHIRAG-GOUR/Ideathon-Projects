// Inventory: a visual shelf of digital shelf labels by default, with a compact list view for scanning.
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { InventoryShelfIllustration } from '../art/scenes';
import { PageBanner } from '../ui/page';
import { fmt1, type Analysis } from '../engine/analyze';
import { relativeDay } from '../engine/dates';
import { CATEGORIES, type Action } from '../engine/types';
import { useWorkspace } from '../state/session';
import { isCritical, TrendChip } from '../ui/decision';
import { IconSearch } from '../ui/icons';
import { ActionBadge, Button, Card, cx, Empty, Input, Kicker, Segmented, Select, StockBar } from '../ui/kit';
import { availability, ShelfLabelCard } from '../ui/shelf';
import { useSheets } from '../ui/sheets';

type RiskFilter = 'all' | 'stockout' | 'expiry' | 'slow' | 'healthy';
type Sort = 'priority' | 'name' | 'stock' | 'days' | 'expiry' | 'sales' | 'updated';

export default function Inventory() {
  const { analysis, workspace } = useWorkspace();
  const sheets = useSheets();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '', cat = sp.get('cat') ?? 'all', risk = (sp.get('risk') as RiskFilter) ?? 'all', rec = (sp.get('rec') as Action | 'all') ?? 'all', sort = (sp.get('sort') as Sort) ?? 'priority', view = sp.get('view') === 'list' ? 'list' : 'grid';
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (!v || v === 'all' || (k === 'sort' && v === 'priority') || (k === 'view' && v === 'grid')) n.delete(k);
    else n.set(k, v);
    setSp(n, { replace: true });
  };
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let xs = analysis.products.filter((a) =>
      (!term || a.product.name.toLowerCase().includes(term) || a.product.supplier.toLowerCase().includes(term)) &&
      (cat === 'all' || a.product.category === cat) &&
      (risk === 'all' || a.flags[risk]) &&
      (rec === 'all' || a.recommendation.action === rec));
    const by: Record<Sort, (a: Analysis, b: Analysis) => number> = {
      priority: () => 0,
      name: (a, b) => a.product.name.localeCompare(b.product.name),
      stock: (a, b) => a.product.stock - b.product.stock,
      days: (a, b) => (a.coverageDays ?? 1e9) - (b.coverageDays ?? 1e9),
      expiry: (a, b) => (a.expiry.daysToExpiry ?? 1e9) - (b.expiry.daysToExpiry ?? 1e9),
      sales: (a, b) => b.demand.daily - a.demand.daily,
      updated: (a, b) => b.product.updatedAt - a.product.updatedAt,
    };
    if (sort !== 'priority') xs = [...xs].sort(by[sort]);
    return xs;
  }, [analysis, q, cat, risk, rec, sort]);
  const filtered = q || cat !== 'all' || risk !== 'all' || rec !== 'all';
  const cats = CATEGORIES.filter((c) => analysis.products.some((a) => a.product.category === c));
  const units = analysis.products.reduce((s, a) => s + a.product.stock, 0);

  return (
    <div className="space-y-5">
      <PageBanner kicker="Every shelf, every product" title="Inventory" art={<InventoryShelfIllustration />}
        stats={[[String(analysis.products.length), 'products'], [units.toLocaleString('en-IN'), 'units on hand'], [String(analysis.products.filter((a) => !a.flags.healthy).length), 'need attention']]}
        actions={<><Button tone="accent" onClick={sheets.addProduct}>Add product</Button><Button tone="light" onClick={() => sheets.recordSale()}>Record sale</Button></>} />

      {/* aisle chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Category">
        {[['all', 'All aisles'] as const, ...cats.map((c) => [c, c] as const)].map(([v, l]) => {
          const on = cat === v;
          const sample = v === 'all' ? null : analysis.products.find((a) => a.product.category === v);
          return (
            <button key={v} role="radio" aria-checked={on} onClick={() => set('cat', v)}
              className={cx('flex h-12 shrink-0 items-center gap-2 rounded-2xl pl-2 pr-4 text-[13.5px] font-extrabold transition-colors', on ? 'bg-green-dark text-yellow' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-cream-deep')}>
              {sample ? <ProductArt product={sample.product} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-yellow text-[12px] font-black text-ink">{analysis.products.length}</span>}
              {l}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.6fr_repeat(3,1fr)_auto]">
        <label className="relative">
          <span className="sr-only">Search products</span>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Search products or suppliers" className="pl-10" type="search" />
        </label>
        <Select aria-label="Risk" value={risk} onChange={(e) => set('risk', e.target.value)}>
          <option value="all">All risks</option><option value="stockout">Stock-out risk</option><option value="expiry">Expiry risk</option><option value="slow">Slow stock</option><option value="healthy">Healthy</option>
        </Select>
        <Select aria-label="Recommendation" value={rec} onChange={(e) => set('rec', e.target.value)}>
          <option value="all">All recommendations</option><option value="RESTOCK">Restock</option><option value="SELL_SOON">Sell soon</option><option value="HOLD">Hold</option><option value="REMOVE">Remove</option>
        </Select>
        <Select aria-label="Sort by" value={sort} onChange={(e) => set('sort', e.target.value)}>
          <option value="priority">Sort: Priority</option><option value="name">Sort: Name</option><option value="days">Sort: Days remaining</option><option value="expiry">Sort: Expiry</option><option value="sales">Sort: Daily sales</option><option value="stock">Sort: Stock</option><option value="updated">Sort: Last updated</option>
        </Select>
        <Segmented label="View" value={view} onChange={(v) => set('view', v)} options={[['grid', 'Shelf'], ['list', 'List']]} />
      </div>
      <p className="text-[12.5px] font-semibold text-ink-muted" aria-live="polite">{rows.length} {rows.length === 1 ? 'product' : 'products'}{filtered && <> · <button className="font-extrabold text-green" onClick={() => setSp(new URLSearchParams(view === 'list' ? 'view=list' : ''), { replace: true })}>Clear filters</button></>}</p>

      {rows.length === 0 ? (
        <Card><Empty title={filtered ? 'No products match these filters' : 'No products yet'} body={filtered ? 'Try a different search or clear the filters.' : 'Add a product with its stock, sales and expiry to get recommendations.'} action={!filtered && <Button tone="primary" onClick={sheets.addProduct}>Add product</Button>} /></Card>
      ) : view === 'grid' ? (
        <LayoutGroup>
          <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence initial={false}>
              {rows.map((a) => <ShelfLabelCard key={a.product.id} a={a} settings={workspace.settings} quiet={a.flags.slow} />)}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            <li className="hidden grid-cols-[2.2fr_0.8fr_1fr_1.3fr_0.9fr_1.1fr] gap-3 bg-cream-deep/60 px-4 py-2.5 lg:grid"><Kicker>Product</Kicker><Kicker>Stock</Kicker><Kicker>Daily sales</Kicker><Kicker>Days left</Kicker><Kicker>Expiry</Kicker><Kicker>Move</Kicker></li>
            {rows.map((a) => {
              const av = availability(a);
              return (
                <motion.li layout key={a.product.id} onClick={() => nav(`/products/${a.product.id}`)} className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 hover:bg-cream lg:grid-cols-[2.2fr_0.8fr_1fr_1.3fr_0.9fr_1.1fr]">
                  <Link to={`/products/${a.product.id}`} onClick={(e) => e.stopPropagation()} className="flex min-w-0 items-center gap-3">
                    <ProductArt product={a.product} size={44} />
                    <span className="min-w-0"><span className="block truncate text-[14.5px] font-extrabold text-ink">{a.product.name}</span><span className={cx('inline-block rounded px-1.5 text-[10px] font-extrabold uppercase', av.cls)}>{av.label}</span></span>
                  </Link>
                  <span className="hidden font-display text-[16px] font-extrabold tabular-nums text-ink lg:block">{a.product.stock}</span>
                  <span className="hidden items-center gap-2 lg:flex"><span className="font-bold tabular-nums">{fmt1(a.demand.daily)}</span><TrendChip a={a} /></span>
                  <span className="hidden lg:block"><span className="text-[13px] font-bold">{a.coverageDays === null ? '—' : a.coverageDays >= 60 ? '60+ days' : `${fmt1(a.coverageDays)} days`}</span><StockBar days={a.coverageDays} warnAt={workspace.settings.reorderWindowDays} critAt={workspace.settings.highRiskDays} className="mt-1" /></span>
                  <span className={cx('hidden text-[13px] font-bold lg:block', a.expiry.daysToExpiry !== null && a.expiry.daysToExpiry <= 2 ? 'text-orange' : 'text-ink-2')}>{a.expiry.daysToExpiry === null ? '—' : relativeDay(a.expiry.daysToExpiry)}</span>
                  <span className="justify-self-end lg:justify-self-start"><ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} /></span>
                  <span className="col-span-2 text-[12px] font-semibold text-ink-muted lg:hidden">{a.product.stock} in stock · {fmt1(a.demand.daily)}/day · {a.coverageDays === null ? 'no demand' : `${fmt1(a.coverageDays)} days left`}</span>
                </motion.li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

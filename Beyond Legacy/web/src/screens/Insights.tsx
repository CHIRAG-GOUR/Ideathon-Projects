// Insights: demand & categories, the restock board, the sell-first shelf (expiry) and the quiet shelf (slow stock).
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { CategoryScene, ExpiryIllustration, ForecastIllustration, QuietShelfIllustration, RestockIllustration } from '../art/scenes';
import { fmt1, rupees, type Analysis } from '../engine/analyze';
import { formatDate, relativeDay, weekday } from '../engine/dates';
import { categoryInsights, demandMovers, expiryGroups } from '../engine/insights';
import { useWorkspace } from '../state/session';
import { isCritical, primaryLabel, TrendChip } from '../ui/decision';
import { IconTrendDown, IconTrendUp } from '../ui/icons';
import { ActionBadge, Button, Card, cx, Empty, Kicker, RiskPill, SectionTitle, Segmented, StockBar } from '../ui/kit';
import { PageBanner } from '../ui/page';
import { useSheets } from '../ui/sheets';

type Tab = 'summary' | 'restock' | 'expiry' | 'slow';

export default function Insights() {
  const { tab = 'summary' } = useParams();
  const nav = useNavigate();
  const t = (['summary', 'restock', 'expiry', 'slow'].includes(tab) ? tab : 'summary') as Tab;
  const { analysis } = useWorkspace();
  const h = analysis.health;
  const banner = {
    summary: { kicker: 'What is changing', title: 'Insights', sub: 'Which products are gaining or losing demand, and how each aisle is performing.', art: <ForecastIllustration size={128} />, tone: 'green' as const },
    restock: { kicker: 'Stock-out risk', title: 'Restock board', sub: 'Products that may become unavailable, soonest first. Beyond Legacy records your orders — it does not contact suppliers.', art: <RestockIllustration size={128} />, tone: 'green' as const },
    expiry: { kicker: 'Sell-first shelf', title: 'Expiry', sub: 'Stock approaching its expiry date, and how much of it is likely to go unsold at today’s demand.', art: <ExpiryIllustration size={128} />, tone: 'yellow' as const },
    slow: { kicker: 'The quiet shelf', title: 'Slow movers', sub: 'Products with low recent sales relative to the stock on hand.', art: <QuietShelfIllustration size={128} />, tone: 'quiet' as const },
  }[t];
  return (
    <div className="space-y-5">
      <PageBanner {...banner} />
      <Segmented label="Insight" value={t} onChange={(v) => nav(v === 'summary' ? '/insights' : `/insights/${v}`)}
        options={[['summary', 'Demand & aisles'], ['restock', 'Restock', h.stockout], ['expiry', 'Sell first', h.expiry], ['slow', 'Quiet shelf', h.slow]]} />
      {analysis.products.length === 0 ? <Card><Empty title="No data yet" body="Insights appear once you have products with stock and sales." /></Card>
        : t === 'summary' ? <Summary /> : t === 'restock' ? <Restock /> : t === 'expiry' ? <Expiry /> : <Slow />}
    </div>
  );
}

function Summary() {
  const { analysis } = useWorkspace();
  const { gaining, losing } = demandMovers(analysis.products);
  const cats = categoryInsights(analysis.products);
  const maxRev = Math.max(1, ...cats.map((c) => c.dailyRevenue));
  const Movers = ({ xs, up }: { xs: Analysis[]; up: boolean }) => (
    <Card className="p-5">
      <SectionTitle icon={up ? <IconTrendUp size={20} /> : <IconTrendDown size={20} />} title={up ? 'Gaining demand' : 'Losing demand'} sub="Last 7 days vs the 7 days before" />
      {xs.length ? (
        <ul className="space-y-1">
          {xs.map((a) => (
            <li key={a.product.id}>
              <Link to={`/products/${a.product.id}`} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-cream">
                <ProductArt product={a.product} size={46} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold text-ink">{a.product.name}</span><span className="text-[12px] font-semibold text-ink-muted">{fmt1(a.demand.prior7!)} → {fmt1(a.demand.recent7!)} units/day</span></span>
                <TrendChip a={a} />
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-[13.5px] text-ink-muted">No product {up ? 'grew' : 'fell'} by 10% or more this week.</p>}
    </Card>
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Movers xs={gaining} up /><Movers xs={losing} up={false} /></div>
      <section aria-labelledby="cat-perf">
        <div className="mb-3"><Kicker className="text-green">Category performance</Kicker><h2 id="cat-perf" className="font-display text-[22px] font-extrabold tracking-tight text-ink">How each aisle is doing</h2></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cats.map((c, i) => (
            <motion.div key={c.category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/inventory?cat=${encodeURIComponent(c.category)}`} className="flex h-full gap-3 rounded-xl3 bg-surface p-4 shadow-card ring-1 ring-line transition-shadow hover:shadow-lift">
                <div className="grid w-[86px] shrink-0 place-items-end"><CategoryScene category={c.category} size={84} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink">{c.category}</p>
                  <span className={cx('mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-extrabold', c.label === 'High expiry sensitivity' ? 'bg-yellow text-ink' : c.label === 'High velocity' || c.label === 'Growing' ? 'bg-green text-white' : c.label === 'Declining' || c.label === 'Slow moving' ? 'bg-hold-bg text-hold-fg' : 'bg-green-mint text-green')}>{c.label}</span>
                  <p className="mt-2 font-display text-[20px] font-extrabold tabular-nums text-ink">{rupees(c.dailyRevenue)}<span className="text-[12px] font-bold text-ink-muted">/day</span></p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep"><motion.div className="h-full rounded-full bg-green" initial={{ width: 0 }} animate={{ width: `${(c.dailyRevenue / maxRev) * 100}%` }} transition={{ delay: 0.1 + i * 0.03 }} /></div>
                  <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">{c.trendPct === null ? 'No trend yet' : `${c.trendPct >= 0 ? '+' : ''}${Math.round(c.trendPct)}% this week`} · {c.atRisk}/{c.products} need attention</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Restock() {
  const { analysis, workspace } = useWorkspace();
  const sheets = useSheets();
  const xs = analysis.products.filter((a) => a.stockout.risk === 'HIGH' || a.stockout.risk === 'MEDIUM').sort((a, b) => (a.coverageDays ?? 0) - (b.coverageDays ?? 0));
  if (!xs.length) return <Card><Empty title="No stock-out risk" body="Every product with demand has more than enough cover for now." /></Card>;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {xs.map((a, i) => (
        <motion.article key={a.product.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
          className={cx('relative overflow-hidden rounded-xl3 bg-surface p-4 pl-5 shadow-card ring-1', a.stockout.risk === 'HIGH' ? 'ring-red/30' : 'ring-line')}>
          <span className={cx('absolute inset-y-0 left-0 w-1.5', a.stockout.risk === 'HIGH' ? 'bg-red' : 'bg-orange')} aria-hidden />
          <div className="flex items-start gap-3">
            <ProductArt product={a.product} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><RiskPill risk={a.stockout.risk} prefix="Stock-out" />{a.handled && <span className="text-[12px] font-extrabold text-green">✓ Ordered {a.handled.quantity}</span>}</div>
              <Link to={`/products/${a.product.id}`} className="mt-1 block truncate font-display text-[18px] font-extrabold text-ink hover:text-green">{a.product.name}</Link>
              <p className="text-[12.5px] font-semibold text-ink-muted">{a.recommendation.reasons[0]?.text}</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2 text-[12px]">
            <div><dt className="font-bold text-ink-muted">Stock</dt><dd className={cx('font-display text-[17px] font-extrabold tabular-nums', a.stockout.belowSafety ? 'text-red-ink' : 'text-ink')}>{a.product.stock}</dd></div>
            <div><dt className="font-bold text-ink-muted">Demand</dt><dd className="font-display text-[17px] font-extrabold tabular-nums text-ink">{fmt1(a.demand.daily)}/d</dd></div>
            <div><dt className="font-bold text-ink-muted">Safety</dt><dd className="font-display text-[17px] font-extrabold tabular-nums text-ink">{a.product.safetyStock}</dd></div>
            <div><dt className="font-bold text-ink-muted">Runs out</dt><dd className="font-display text-[17px] font-extrabold text-red-ink">{a.stockout.stockoutDate ? weekday(a.stockout.stockoutDate) : '—'}</dd></div>
          </dl>
          <StockBar days={a.coverageDays} warnAt={workspace.settings.reorderWindowDays} critAt={workspace.settings.highRiskDays} className="mt-2" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {a.recommendation.quantity ? <span className="tag-shape rounded-l-lg bg-yellow py-1 pl-2.5 pr-5 font-display text-[15px] font-black tabular-nums text-ink">+{a.recommendation.quantity} units</span> : <span className="text-[12.5px] font-bold text-ink-muted">Monitor — no order yet</span>}
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" tone="ghost" onClick={() => sheets.why(a)}>Review</Button>
              {!a.handled && a.recommendation.action === 'RESTOCK' && <Button size="sm" tone="primary" onClick={() => sheets.act(a)}>Mark ordered</Button>}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function Expiry() {
  const { analysis } = useWorkspace();
  const sheets = useSheets();
  const g = expiryGroups(analysis.products);
  const groups: [string, Analysis[], string][] = [['Expired — remove', g.expired, 'bg-red text-white'], ['Expiring today', g.today, 'bg-red text-white'], ['Expiring in 1–2 days', g.soon, 'bg-orange text-white'], ['Expiring this week', g.week, 'bg-yellow text-ink']];
  if (groups.every(([, xs]) => !xs.length)) return <Card><Empty art={<ExpiryIllustration size={100} />} title="Nothing needs expiry attention right now" body="No stock on hand expires in the next seven days." /></Card>;
  return (
    <div className="space-y-6">
      {groups.filter(([, xs]) => xs.length).map(([title, xs, tag]) => (
        <section key={title} aria-label={title} className="rounded-xl4 bg-yellow-soft/70 p-3 ring-1 ring-yellow/30 sm:p-4">
          <div className="mb-2 flex items-center gap-2 px-1"><span className={cx('tag-shape rounded-l-md py-1 pl-2.5 pr-5 text-[12px] font-extrabold uppercase tracking-[0.1em]', tag)}>{title}</span><span className="text-[13px] font-bold text-ink-muted">{xs.length} {xs.length === 1 ? 'product' : 'products'}</span></div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {xs.map((a) => {
              const act = a.recommendation.action === 'SELL_SOON' || a.recommendation.action === 'REMOVE';
              return (
                <motion.article key={a.product.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex w-[230px] shrink-0 flex-col overflow-hidden rounded-xl3 bg-surface shadow-card ring-1 ring-line">
                  <Link to={`/products/${a.product.id}`} className="relative flex justify-center bg-gradient-to-b from-cream to-cream-deep pt-3">
                    <ProductArt product={a.product} size={100} />
                    <span className="absolute left-2 top-2 rounded-md bg-orange px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase text-white">{relativeDay(a.expiry.daysToExpiry!)}</span>
                  </Link>
                  <div className="h-2 bg-[#CDBB93] shelf-grain" aria-hidden />
                  <div className="flex flex-1 flex-col p-3">
                    <p className="truncate font-display text-[15px] font-extrabold uppercase text-ink">{a.product.name}</p>
                    <dl className="mt-1.5 grid grid-cols-2 gap-1 text-[11.5px]">
                      <div><dt className="font-bold text-ink-muted">Quantity</dt><dd className="font-extrabold tabular-nums text-ink">{a.product.stock}</dd></div>
                      <div><dt className="font-bold text-ink-muted">Expires</dt><dd className="font-extrabold text-ink">{formatDate(a.product.expiryDate).replace(/ \d{4}$/, '')}</dd></div>
                      <div><dt className="font-bold text-ink-muted">Demand</dt><dd className="font-extrabold tabular-nums text-ink">{fmt1(a.demand.daily)}/day</dd></div>
                      <div><dt className="font-bold text-ink-muted">Likely unsold</dt><dd className={cx('font-extrabold tabular-nums', a.expiry.unsold ? 'text-orange' : 'text-green')}>{a.expiry.unsold}</dd></div>
                    </dl>
                    <div className="mt-2"><RiskPill risk={a.expiry.risk === 'NONE' ? 'LOW' : a.expiry.risk} prefix="Risk" /></div>
                    <div className="min-h-2 flex-1" />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} />
                      {a.handled ? <span className="text-[12px] font-extrabold text-green">✓ {a.handled.status}</span> : act ? <Button size="sm" tone="dark" onClick={() => sheets.act(a)}>{primaryLabel(a)}</Button> : <span className="text-[11.5px] font-bold text-green">Sells through</span>}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
          <div className="mt-2 h-2.5 rounded-sm bg-[#CDBB93] shelf-grain" aria-hidden />
        </section>
      ))}
    </div>
  );
}

function Slow() {
  const { analysis, workspace } = useWorkspace();
  const sheets = useSheets();
  const xs = analysis.products.filter((a) => a.flags.slow).sort((a, b) => (b.coverageDays ?? 1e9) - (a.coverageDays ?? 1e9));
  const tied = xs.reduce((s, a) => s + a.product.stock * a.product.unitPrice, 0);
  return (
    <div className="space-y-4">
      <div className="rounded-xl3 bg-surface p-4 ring-1 ring-line">
        <p className="text-[14px] text-ink-2">These products are <b>not necessarily bad</b> — they are overstocked relative to current demand (more than {workspace.settings.slowCoverageDays} days of cover). The move is to <b>hold</b> purchasing. A promotion or placement review may help; Beyond Legacy does not apply discounts automatically.</p>
        {xs.length > 0 && <p className="mt-1.5 text-[13.5px] font-bold text-ink-muted">{rupees(tied)} of stock is resting on this shelf across {xs.length} products.</p>}
      </div>
      {xs.length === 0 ? <Card><Empty title="No slow stock" body="Every product will sell through its current stock within the slow-stock threshold." /></Card> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {xs.map((a) => (
            <motion.article key={a.product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 rounded-xl3 bg-hold-bg/60 p-3.5 ring-1 ring-line">
              <ProductArt product={a.product} size={70} className="opacity-80 saturate-50" />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${a.product.id}`} className="block truncate text-[15px] font-extrabold text-ink-2 hover:text-ink">{a.product.name}</Link>
                <dl className="mt-1 grid grid-cols-3 gap-1 text-[11.5px]">
                  <div><dt className="font-bold text-ink-muted">Stock</dt><dd className="font-extrabold tabular-nums text-ink-2">{a.product.stock}</dd></div>
                  <div><dt className="font-bold text-ink-muted">Sales</dt><dd className="font-extrabold tabular-nums text-ink-2">{fmt1(a.demand.daily)}/d</dd></div>
                  <div><dt className="font-bold text-ink-muted">To sell</dt><dd className="font-extrabold tabular-nums text-ink-2">{a.coverageDays === null ? '—' : `${Math.round(a.coverageDays)}d`}</dd></div>
                </dl>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <ActionBadge action="HOLD" size="sm" />
                  {a.handled ? <span className="text-[12px] font-extrabold text-green">✓ Acknowledged</span> : <Button size="sm" onClick={() => sheets.act(a)}>Acknowledge</Button>}
                </div>
                <p className="mt-1.5 text-[11.5px] font-semibold text-ink-faint">Possible next step: promotion / review</p>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

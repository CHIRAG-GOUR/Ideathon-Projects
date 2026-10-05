// The 8 AM command centre. Answers, in order: is my inventory healthy? what needs attention? what could go wrong
// soon? what should I do next? why?
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { AisleMarker, HealthyShelfIllustration, StoreAisleIllustration } from '../art/scenes';
import { DemandBars, HealthRing } from '../charts/charts';
import { fmt1, rupees, type Analysis } from '../engine/analyze';
import { addDays, formatDate, relativeDay, weekday } from '../engine/dates';
import { CATEGORIES, type Category } from '../engine/types';
import { friendlyError } from '../data/repo';
import { useWorkspace } from '../state/session';
import { isCritical, NextMoveCard, TrendChip } from '../ui/decision';
import { IconArrowLeft, IconArrowRight, IconChevronRight, IconDemand, IconExpiry, IconForecast, IconHealthy, IconNextMove, IconRestock, IconShelf, IconStore } from '../ui/icons';
import { ActionBadge, AnimatedNumber, Button, Card, cx, Empty, Kicker, SectionTitle, useToast } from '../ui/kit';
import { useSheets } from '../ui/sheets';
import { CategoryTile } from '../ui/shelf';

function greeting(h: number) {
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function isOpen(open: string, close: string, now: Date) {
  const m = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = open.split(':').map(Number), [ch, cm] = close.split(':').map(Number);
  const a = oh * 60 + om, b = ch * 60 + cm;
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

export default function Overview() {
  const { workspace, analysis, todayStr } = useWorkspace();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const st = workspace.store;
  const open = isOpen(st.openTime, st.closeTime, now);
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker className="text-green">{weekday(todayStr)} · {formatDate(todayStr)}</Kicker>
          <h1 className="mt-1 font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[42px]">{greeting(now.getHours())}, {st.managerName.split(' ')[0]}</h1>
          <p className="mt-1.5 text-[16px] font-medium text-ink-2">Here’s what your store needs today.</p>
        </div>
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-extrabold', open ? 'bg-green text-white' : 'bg-cream-deep text-ink-2')}>
          <span className="relative flex h-2.5 w-2.5">{open && <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-white" />}<span className={cx('relative inline-flex h-2.5 w-2.5 rounded-full', open ? 'bg-yellow' : 'bg-ink-faint')} /></span>
          {open ? 'Store open' : 'Store closed'} · {st.openTime}–{st.closeTime}
        </span>
      </div>
      {analysis.health.total === 0 ? <FirstRun /> : (
        <>
          <Hero />
          <HealthBand />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <DemandCard />
            <ExpiryCard />
            <SoonCard />
          </div>
          <Aisles />
          <Queue />
          <Story />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- hero: next move + the store
const ZONES: { key: string; cats: Category[]; x: number; y: number }[] = [
  { key: 'Beverages', cats: ['Beverages'], x: 18, y: 40 },
  { key: 'Snacks', cats: ['Snacks', 'Packaged Food', 'Personal Care', 'Household', 'Other'], x: 45.5, y: 50 },
  { key: 'Bakery', cats: ['Bakery', 'Ready-to-Eat'], x: 68, y: 63 },
  { key: 'Dairy', cats: ['Dairy'], x: 86, y: 40 },
];

function zoneMarker(xs: Analysis[]) {
  const restock = xs.filter((a) => a.flags.stockout && !a.handled).length;
  const expiry = xs.filter((a) => a.flags.expiry && !a.handled).length;
  const slow = xs.filter((a) => a.flags.slow).length;
  if (restock) return { tone: 'red' as const, label: `${restock} restock`, pulse: true };
  if (expiry) return { tone: 'yellow' as const, label: `${expiry} sell soon`, pulse: true };
  if (slow) return { tone: 'orange' as const, label: `${slow} slow`, pulse: false };
  return { tone: 'green' as const, label: 'Healthy', pulse: false };
}

function Hero() {
  const { analysis } = useWorkspace();
  const moves = analysis.nextMoves;
  const [i, setI] = useState(0);
  const idx = Math.min(i, Math.max(0, moves.length - 1));
  const a = moves[idx];
  return (
    <section aria-labelledby="next-move-title" className="relative overflow-hidden rounded-xl4 bg-green-dark p-4 sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-green-mid/40 blur-3xl" aria-hidden />
      <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="next-move-title" className="font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-yellow sm:text-[14px] sm:tracking-[0.18em]">What should I do next?</h2>
            {moves.length > 1 && (
              <div className="flex shrink-0 items-center gap-0.5 text-white">
                <button aria-label="Previous move" disabled={idx === 0} onClick={() => setI(idx - 1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><IconArrowLeft size={18} /></button>
                <span className="text-[12.5px] font-bold tabular-nums text-white/75">{idx + 1} / {moves.length}</span>
                <button aria-label="Next move" disabled={idx >= moves.length - 1} onClick={() => setI(idx + 1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><IconArrowRight size={18} /></button>
              </div>
            )}
          </div>
          <AnimatePresence mode="wait">
            {a ? (
              <motion.div key={a.product.id + a.recommendation.action} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}>
                <NextMoveCard a={a} hero position={idx === 0 ? 'Highest priority' : `Priority ${idx + 1}`} />
              </motion.div>
            ) : (
              <motion.div key="clear" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl4 bg-surface">
                <Empty art={<HealthyShelfIllustration size={110} />} title="You’re all caught up" body="Nothing needs action now or today. Beyond Legacy keeps watching stock, sales and expiry and will raise the next move here." action={<Link to="/next-moves" className="text-[14px] font-extrabold text-green">See what we’re watching →</Link>} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0">
          <StoreAisleIllustration className="overflow-hidden rounded-[22px] ring-4 ring-white/10">
            {ZONES.map((z) => {
              const m = zoneMarker(analysis.products.filter((x) => z.cats.includes(x.product.category)));
              return <AisleMarker key={z.key} x={z.x} y={z.y} tone={m.tone} label={m.label} pulse={m.pulse} />;
            })}
          </StoreAisleIllustration>
          <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-white/65"><IconShelf size={16} />Your shelves right now — markers show where today’s risks are.</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- store health
function HealthBand() {
  const { analysis } = useWorkspace();
  const h = analysis.health;
  const first = (f: (a: Analysis) => boolean) => analysis.products.find(f);
  const rows = [
    { key: 'restock', n: h.stockout, label: 'Restock risk', bar: 'bg-red', tint: 'bg-red-soft/70', to: '/insights/restock', icon: IconRestock, ex: first((a) => a.flags.stockout) },
    { key: 'expiry', n: h.expiry, label: 'Expiry risk', bar: 'bg-yellow', tint: 'bg-yellow-soft/80', to: '/insights/expiry', icon: IconExpiry, ex: first((a) => a.flags.expiry) },
    { key: 'slow', n: h.slow, label: 'Slow movers', bar: 'bg-orange', tint: 'bg-orange-soft/70', to: '/insights/slow', icon: IconForecast, ex: first((a) => a.flags.slow) },
    { key: 'healthy', n: h.healthy, label: 'Healthy', bar: 'bg-green', tint: 'bg-green-mint/60', to: '/inventory?risk=healthy', icon: IconHealthy, ex: first((a) => a.flags.healthy) },
  ];
  return (
    <section aria-label="Today’s store health" className="grid grid-cols-1 overflow-hidden rounded-xl4 bg-surface shadow-card ring-1 ring-line md:grid-cols-[310px_1fr]">
      <div className="flex items-center gap-5 bg-green-deep p-6 text-white">
        <div className="relative shrink-0">
          <HealthRing pct={h.pct ?? 0} size={118} parts={[{ value: h.stockout, cls: 'stroke-red' }, { value: h.expiry, cls: 'stroke-yellow' }, { value: h.slow, cls: 'stroke-orange' }, { value: h.healthy, cls: 'stroke-green-mid' }]} />
          <IconHealthy size={26} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow" />
        </div>
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-white/55">Today’s store health</p>
          <p className="font-display text-[52px] font-extrabold leading-none tracking-tight text-yellow"><AnimatedNumber value={h.pct ?? 0} suffix="%" /></p>
          <p className="mt-1 text-[14px] font-bold">Inventory healthy</p>
          <p className="text-[12px] text-white/60">{h.healthy} of {h.total} products need nothing</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {rows.map((r) => (
          <Link key={r.key} to={r.to} className={cx('group relative flex flex-col justify-between gap-2 border-line p-4 transition-[filter] odd:border-r hover:brightness-[0.97] sm:border-r sm:last:border-r-0', r.tint)}>
            <span className={cx('absolute inset-x-0 top-0 h-1.5', r.bar)} aria-hidden />
            <div className="flex items-start justify-between">
              <p className="font-display text-[40px] font-extrabold leading-none tabular-nums text-ink"><AnimatedNumber value={r.n} /></p>
              {r.ex && <ProductArt product={r.ex.product} size={52} className="-mr-1 -mt-1 transition-transform group-hover:-translate-y-0.5" />}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink"><r.icon size={16} />{r.label}</p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-ink-muted">{r.ex ? `e.g. ${r.ex.product.name}` : 'None today'}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- insight cards
function DemandCard() {
  const { analysis, todayStr } = useWorkspace();
  const history = useMemo(() => Array.from({ length: 14 }, (_, k) => {
    const date = addDays(todayStr, k - 14);
    return { date, units: analysis.products.reduce((s, a) => s + (a.demand.history.find((h) => h.date === date)?.units ?? 0), 0) };
  }), [analysis, todayStr]);
  const recent = history.slice(7).reduce((s, h) => s + h.units, 0), prior = history.slice(0, 7).reduce((s, h) => s + h.units, 0);
  const pct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;
  const top = analysis.products.filter((a) => a.demand.trend === 'up' && (a.demand.recent7 ?? 0) >= 2).sort((a, b) => b.demand.trendPct! - a.demand.trendPct!)[0];
  return (
    <Card className="p-5">
      <SectionTitle icon={<IconDemand size={20} />} title="Demand trend" sub="Units sold across the store, per day" right={pct !== null && <span className={cx('whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-extrabold', pct >= 0 ? 'bg-green-mint text-green' : 'bg-hold-bg text-hold-fg')}>{pct >= 0 ? '+' : ''}{pct}% wk</span>} />
      <DemandBars history={history} average={recent / 7} height={150} />
      {top && <Link to={`/products/${top.product.id}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-cream p-2.5 hover:bg-cream-deep"><ProductArt product={top.product} size={40} /><span className="min-w-0 flex-1"><span className="block text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-muted">Fastest growing</span><span className="block truncate text-[14px] font-bold text-ink">{top.product.name}</span></span><TrendChip a={top} /></Link>}
    </Card>
  );
}

function ExpiryCard() {
  const { analysis } = useWorkspace();
  const xs = analysis.products.filter((a) => a.flags.expiry).sort((a, b) => (a.expiry.daysToExpiry ?? 9) - (b.expiry.daysToExpiry ?? 9)).slice(0, 4);
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5 pb-3"><SectionTitle icon={<IconExpiry size={20} />} title="Sell-first shelf" sub="Stock likely to go unsold before expiry" right={<Link to="/insights/expiry" className="text-[13px] font-extrabold text-green">All →</Link>} /></div>
      {xs.length === 0 ? <p className="px-5 pb-5 text-[13.5px] text-ink-muted">Nothing needs expiry attention right now.</p> : (
        <div className="bg-yellow-soft/70 px-4 pb-4 pt-2">
          <div className="grid grid-cols-4 gap-2">
            {xs.map((a) => (
              <Link key={a.product.id} to={`/products/${a.product.id}`} className="group flex flex-col items-center text-center">
                <ProductArt product={a.product} size={62} className="transition-transform group-hover:-translate-y-1" />
                <span className="tag-shape mt-0.5 rounded-l bg-orange py-0.5 pl-1.5 pr-3 text-[10px] font-extrabold uppercase text-white">{relativeDay(a.expiry.daysToExpiry!)}</span>
                <span className="mt-1 line-clamp-2 text-[11.5px] font-bold leading-tight text-ink">{a.product.name}</span>
                <span className="text-[11px] font-semibold text-orange">{a.expiry.unsold} at risk</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 h-3 rounded-sm bg-[#CDBB93] shelf-grain" aria-hidden />
        </div>
      )}
    </Card>
  );
}

function SoonCard() {
  const { analysis } = useWorkspace();
  const xs = analysis.products.filter((a) => a.stockout.stockoutDate && a.coverageDays !== null && a.coverageDays < 3 && a.product.stock > 0 && !a.flags.expiry).sort((a, b) => a.coverageDays! - b.coverageDays!).slice(0, 4);
  return (
    <Card className="p-5">
      <SectionTitle icon={<IconRestock size={20} />} title="Could run out soon" sub={`Next 72 hours · ${rupees(analysis.valueAtRisk)} at risk`} right={<Link to="/insights/restock" className="text-[13px] font-extrabold text-green">All →</Link>} />
      {xs.length === 0 ? <p className="text-[13.5px] text-ink-muted">Nothing is projected to run out in the next three days.</p> : (
        <ul className="space-y-2">
          {xs.map((a) => (
            <li key={a.product.id}>
              <Link to={`/products/${a.product.id}`} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-cream">
                <ProductArt product={a.product} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink">{a.product.name}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-cream-deep"><motion.span className={cx('block h-full rounded-full', a.coverageDays! < 1 ? 'bg-red' : 'bg-orange')} initial={{ width: 0 }} animate={{ width: `${Math.max(6, (a.coverageDays! / 3) * 100)}%` }} /></span>
                </span>
                <span className="text-right"><span className="block font-display text-[16px] font-extrabold tabular-nums text-red-ink">{fmt1(a.coverageDays!)}d</span><span className="block text-[11px] font-semibold text-ink-muted">{weekday(a.stockout.stockoutDate!)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- aisles, queue, story
function Aisles() {
  const { analysis } = useWorkspace();
  const cats = CATEGORIES.map((c) => ({ c, xs: analysis.products.filter((a) => a.product.category === c) })).filter((x) => x.xs.length);
  return (
    <section aria-labelledby="aisles">
      <div className="mb-3 flex items-end justify-between">
        <div><Kicker className="text-green">Shop by aisle</Kicker><h2 id="aisles" className="font-display text-[22px] font-extrabold tracking-tight text-ink">Your categories</h2></div>
        <Link to="/inventory" className="text-[13px] font-extrabold text-green">Full inventory →</Link>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5 2xl:grid-cols-9">
        {cats.map(({ c, xs }) => <CategoryTile key={c} category={c} count={xs.length} risks={xs.filter((a) => !a.flags.healthy && !a.handled).length} to={`/inventory?cat=${encodeURIComponent(c)}`} />)}
      </div>
    </section>
  );
}

function Queue() {
  const { analysis } = useWorkspace();
  const sheets = useSheets();
  const rest = analysis.nextMoves.slice(1, 7);
  if (!rest.length) return null;
  return (
    <section aria-labelledby="queue">
      <div className="mb-3 flex items-end justify-between">
        <div><Kicker className="text-green">Priority actions</Kicker><h2 id="queue" className="font-display text-[22px] font-extrabold tracking-tight text-ink">Then, in this order</h2></div>
        <Link to="/next-moves" className="text-[13px] font-extrabold text-green">All next moves →</Link>
      </div>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rest.map((a, k) => (
          <motion.li key={a.product.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.04 }}
            className="relative flex items-center gap-3 overflow-hidden rounded-xl3 bg-surface p-3 pl-4 shadow-card ring-1 ring-line">
            <span className={cx('absolute inset-y-0 left-0 w-1.5', isCritical(a) ? 'bg-red' : a.recommendation.action === 'SELL_SOON' ? 'bg-yellow' : 'bg-green')} aria-hidden />
            <span className="w-5 text-center font-display text-[15px] font-extrabold tabular-nums text-ink-faint">{k + 2}</span>
            <ProductArt product={a.product} size={50} />
            <Link to={`/products/${a.product.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-extrabold text-ink">{a.product.name}</span>
              <span className="block truncate text-[12.5px] font-semibold text-ink-muted">{a.recommendation.headline}</span>
            </Link>
            <button onClick={() => sheets.act(a)} aria-label={`${a.recommendation.headline} — ${a.product.name}`}><ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} /></button>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Story() {
  const { workspace, analysis } = useWorkspace();
  const salesDays = workspace.products.reduce((s, p) => s + Object.keys(p.salesDaily).length, 0);
  const risks = analysis.health.stockout + analysis.health.expiry + analysis.health.slow;
  const steps = [
    { t: 'The store', v: `${workspace.products.length} products`, d: 'On your shelves and in your stockroom', icon: IconStore },
    { t: 'The data', v: `${salesDays.toLocaleString()} sales days`, d: 'Stock, sales, expiry and prices', icon: IconShelf },
    { t: 'The signal', v: `${risks} risks`, d: `${analysis.health.stockout} stock-out · ${analysis.health.expiry} expiry · ${analysis.health.slow} slow`, icon: IconDemand },
    { t: 'The decision', v: `${analysis.nextMoves.length} next moves`, d: 'Ranked by urgency and value at risk', icon: IconNextMove },
    { t: 'The action', v: `${analysis.products.filter((a) => a.handled).length} handled`, d: 'Ordered, prioritised or acknowledged', icon: IconHealthy },
  ];
  return (
    <section aria-label="How today’s moves were made" className="rounded-xl4 bg-green-deep p-5 text-white sm:p-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">How today’s moves were made</p>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.t} className="relative rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-inset ring-white/10">
            <s.icon size={22} className="text-yellow" />
            <p className="mt-2 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white/55">{i + 1} · {s.t}</p>
            <p className="font-display text-[17px] font-extrabold">{s.v}</p>
            <p className="text-[12px] text-white/60">{s.d}</p>
            {i < 4 && <IconChevronRight size={18} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-yellow sm:block" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function FirstRun() {
  const { repo } = useWorkspace();
  const sheets = useSheets();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-xl4 bg-green-dark p-6 text-white sm:p-8 lg:grid-cols-2">
      <div>
        <Kicker className="text-yellow">Get started</Kicker>
        <h2 className="mt-1 font-display text-[30px] font-extrabold leading-tight tracking-tight">Stock your digital shelves to see your first next move</h2>
        <p className="mt-2 max-w-xl text-[15px] text-white/75">Beyond Legacy needs stock, sales and expiry for each product. Add your own, or load the demo store with four weeks of sample sales — demo products are marked and can be removed any time.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button tone="accent" size="lg" onClick={sheets.addProduct}>Add your first product</Button>
          <Button tone="light" size="lg" busy={busy} onClick={async () => {
            setBusy(true);
            try {
              await repo.loadDemo();
              toast('Demo store loaded');
            } catch (e) {
              toast(friendlyError(e), 'error');
            } finally {
              setBusy(false);
            }
          }}>Load demo store</Button>
        </div>
      </div>
      <StoreAisleIllustration className="overflow-hidden rounded-[22px] ring-4 ring-white/10" />
    </section>
  );
}

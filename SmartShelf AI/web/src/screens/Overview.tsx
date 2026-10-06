// Overview — the decision workspace the owner opens each morning. It answers, in this order:
// what is happening in my store? → what should I do next? → how healthy is the store? → what needs attention? →
// why? → how does SmartShelf decide? Products appear only where they explain a decision; the catalogue lives in Inventory.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ActArt, AnalyseArt, InputArt, PredictArt } from '../art/thinking';
import { ISO_ZONES, IsoMarker, IsoStore } from '../art/IsoStore';
import { ProductArt } from '../art/ProductArt';
import { DemandBars } from '../charts/charts';
import { fmt1, rupees, type Analysis } from '../engine/analyze';
import { addDays, formatDate, relativeDay, weekday } from '../engine/dates';
import type { Category } from '../engine/types';
import { friendlyError } from '../data/repo';
import { useWorkspace } from '../state/session';
import { isCritical, primaryLabel, TrendChip } from '../ui/decision';
import { IconArrowLeft, IconArrowRight, IconCheck, IconChevronRight } from '../ui/icons';
import { ActionBadge, AnimatedNumber, Button, cx, Kicker, useToast } from '../ui/kit';
import { useSheets } from '../ui/sheets';

function greeting(h: number) {
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function isOpen(open: string, close: string, now: Date) {
  const m = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = open.split(':').map(Number), [ch, cm] = close.split(':').map(Number);
  const a = oh * 60 + om, b = ch * 60 + cm;
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

/** Sections reveal as they scroll into view (once). */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

export default function Overview() {
  const { analysis } = useWorkspace();
  if (analysis.health.total === 0) return <div className="space-y-8"><CommandHeader /><FirstRun /></div>;
  return (
    <div className="space-y-10 sm:space-y-12">
      <CommandHeader />
      <section aria-label="Next move and your store" className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] xl:items-stretch">
        <NextMoveHero />
        <StoreScene className="hidden xl:flex" />
      </section>
      <Reveal><TodayStore /></Reveal>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Reveal><Attention /></Reveal>
        <Reveal delay={0.08}><WhyToday /></Reveal>
      </div>
      <Reveal className="xl:hidden"><StoreScene /></Reveal>
      <Reveal><HowItThinks /></Reveal>
    </div>
  );
}

// ---------------------------------------------------------------- 1. command header
function CommandHeader() {
  const { workspace, analysis, todayStr, updatedAt } = useWorkspace();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const st = workspace.store, h = analysis.health;
  const open = isOpen(st.openTime, st.closeTime, now);
  const n = analysis.nextMoves.length;
  const urgent = analysis.nextMoves.filter((a) => a.recommendation.bucket === 'NOW').length;
  const message = h.total === 0
    ? 'Your store is set up. Add products and SmartShelf starts watching.'
    : n === 0
      ? 'Your store is in good shape. Nothing needs a decision right now.'
      : (h.pct ?? 0) >= 70
        ? `Your store is healthy. ${n} decision${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your attention.`
        : `${n} decision${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your attention${urgent ? ` — ${urgent} today` : ''}.`;
  const ago = updatedAt ? Math.max(0, Math.round((now.getTime() - updatedAt) / 60000)) : null;
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <Kicker className="text-green">{weekday(todayStr)} · {formatDate(todayStr)}</Kicker>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[44px]">{greeting(now.getHours())}, {st.name}</h1>
        <p className="mt-2 max-w-2xl text-[16px] font-medium text-ink-2 sm:text-[18px]">{message}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-extrabold', open ? 'bg-green-mint text-green' : 'bg-cream-deep text-ink-2')}>
          <span className={cx('h-2 w-2 rounded-full', open ? 'bg-green' : 'bg-ink-faint')} />{open ? 'Open' : 'Closed'} · {st.openTime}–{st.closeTime}
        </span>
        {h.pct !== null && <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-extrabold text-ink ring-1 ring-line">Health <span className={cx('tabular-nums', h.pct >= 70 ? 'text-green' : h.pct >= 50 ? 'text-orange' : 'text-red-ink')}>{h.pct}%</span></span>}
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-bold text-white" title="SmartShelf re-analyses every product whenever stock, sales or expiry changes">
          <span className="relative flex h-2 w-2"><span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-yellow" /><span className="relative inline-flex h-2 w-2 rounded-full bg-yellow" /></span>
          SmartShelf AI · watching {h.total} products{ago !== null ? ` · ${ago === 0 ? 'just now' : `${ago} min ago`}` : ''}
        </span>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- 2. the hero: one decision
function verbTitle(a: Analysis) {
  const name = a.product.name;
  switch (a.recommendation.action) {
    case 'RESTOCK': return `Restock ${name}`;
    case 'SELL_SOON': return `Sell ${name} first`;
    case 'REMOVE': return `Remove expired ${name}`;
    default: return `Hold ${name}`;
  }
}
function actionLine(a: Analysis) {
  const r = a.recommendation;
  if (r.action === 'RESTOCK') return `Restock ${r.quantity ?? ''} units`.replace('  ', ' ');
  if (r.action === 'SELL_SOON') return `Sell soon · ${a.expiry.unsold} at risk`;
  if (r.action === 'REMOVE') return `Remove ${a.product.stock} units`;
  return 'Hold';
}
const ACTION_PILL: Record<string, string> = { RESTOCK: 'bg-red text-white', SELL_SOON: 'bg-yellow text-ink', REMOVE: 'bg-white text-ink', HOLD: 'bg-white/90 text-ink' };

function NextMoveHero() {
  const { analysis } = useWorkspace();
  const sheets = useSheets();
  const reduce = useReducedMotion();
  const moves = analysis.nextMoves;
  const [i, setI] = useState(0);
  const idx = Math.min(i, Math.max(0, moves.length - 1));
  const a = moves[idx];
  return (
    <motion.section
      aria-labelledby="next-move"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative flex min-h-[420px] flex-col overflow-hidden rounded-xl4 bg-green-dark p-6 text-white shadow-lift sm:p-8"
    >
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-green-mid/35 blur-3xl" aria-hidden />
      <div className="relative flex items-center justify-between gap-3">
        <h2 id="next-move" className="flex items-center gap-2.5 text-[13px] font-extrabold uppercase tracking-[0.2em] text-yellow">
          <span className="relative flex h-2.5 w-2.5"><span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-yellow" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow" /></span>
          Next move
        </h2>
        {moves.length > 1 && (
          <div className="flex items-center gap-0.5">
            <button aria-label="Previous decision" disabled={idx === 0} onClick={() => setI(idx - 1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><IconArrowLeft size={18} /></button>
            <span className="text-[12.5px] font-bold tabular-nums text-white/70">{idx + 1} of {moves.length}</span>
            <button aria-label="Next decision" disabled={idx >= moves.length - 1} onClick={() => setI(idx + 1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><IconArrowRight size={18} /></button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {a ? (
          <motion.div
            key={a.product.id + a.recommendation.action}
            className="relative mt-5 flex flex-1 flex-col"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24, transition: { duration: 0.22 } }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-start gap-5">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">{verbTitle(a)}</h3>
                <p className="mt-2 text-[13.5px] font-semibold text-white/60">{idx === 0 ? 'Highest priority today' : `Priority ${idx + 1}`} · {a.recommendation.when}</p>
              </div>
              <div className="hidden shrink-0 rounded-[28px] bg-cream/95 p-2 sm:block"><ProductArt product={a.product} size={92} /></div>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
              <Fact label="in stock" value={<><AnimatedNumber value={a.product.stock} /> <span className="text-[15px] font-bold text-white/60">units</span></>} />
              <Fact label="selling" value={<>~{fmt1(a.demand.daily)}<span className="text-[15px] font-bold text-white/60">/day</span></>} />
              {a.recommendation.action === 'SELL_SOON' || a.recommendation.action === 'REMOVE'
                ? <Fact label="expiry" tone="text-yellow" value={a.expiry.daysToExpiry === null ? '—' : relativeDay(a.expiry.daysToExpiry)} />
                : <Fact label="of stock left" tone={(a.coverageDays ?? 9) < 2 ? 'text-[#FF8A7E]' : 'text-yellow'} value={a.coverageDays === null ? '—' : <>{fmt1(a.coverageDays)} <span className="text-[15px] font-bold">days</span></>} />}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">Recommended action</span>
              <motion.span layout className={cx('rounded-xl px-3.5 py-2 font-display text-[18px] font-extrabold uppercase tracking-wide sm:text-[20px]', ACTION_PILL[a.recommendation.action])}>{actionLine(a)}</motion.span>
            </div>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85"><b className="text-white">Why? </b>{a.recommendation.summary}</p>

            <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
              <Link to={`/products/${a.product.id}`} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-yellow px-5 text-[15px] font-extrabold text-ink transition hover:brightness-105 active:translate-y-px">
                Review recommendation <IconArrowRight size={18} />
              </Link>
              <button onClick={() => sheets.act(a)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-5 text-[15px] font-bold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15 active:translate-y-px">
                <IconCheck size={17} />{primaryLabel(a)}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="clear" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-6 flex flex-1 flex-col justify-center">
            <h3 className="font-display text-[34px] font-extrabold leading-tight">You’re all caught up.</h3>
            <p className="mt-2 max-w-md text-[15px] text-white/75">Nothing needs action now or today. SmartShelf keeps watching stock, sales and expiry, and the next move will appear here.</p>
            <Link to="/next-moves" className="mt-5 inline-flex h-12 w-fit items-center gap-2 rounded-2xl bg-yellow px-5 font-extrabold text-ink">See what we’re watching <IconArrowRight size={18} /></Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function Fact({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <dd className={cx('truncate font-display text-[24px] font-extrabold leading-none tabular-nums sm:text-[30px]', tone ?? 'text-white')}>{value}</dd>
      <dt className="mt-1.5 text-[12px] font-semibold text-white/55">{label}</dt>
    </div>
  );
}

// ---------------------------------------------------------------- the store, with intelligence markers
const ZONES: { at: { left: number; top: number }; cats: Category[]; name: string }[] = [
  { at: ISO_ZONES.cooler, cats: ['Beverages', 'Dairy'], name: 'Cooler' },
  { at: ISO_ZONES.shelves, cats: ['Snacks', 'Packaged Food'], name: 'Snacks' },
  { at: ISO_ZONES.bakery, cats: ['Bakery', 'Ready-to-Eat'], name: 'Bakery' },
  { at: ISO_ZONES.gondola, cats: ['Personal Care', 'Household', 'Other'], name: 'Aisle' },
];

function zoneMarker(xs: Analysis[]) {
  const restock = xs.filter((a) => a.flags.stockout && !a.handled).length;
  const expiry = xs.filter((a) => a.flags.expiry && !a.handled).length;
  if (restock) return { tone: 'red' as const, label: `${restock} restock`, pulse: true };
  if (expiry) return { tone: 'yellow' as const, label: `${expiry} sell soon`, pulse: true };
  return { tone: 'green' as const, label: 'Healthy', pulse: false };
}

function StoreScene({ className }: { className?: string }) {
  const { analysis } = useWorkspace();
  const top = analysis.nextMoves[0];
  return (
    <section aria-label="Your store right now" className={cx('flex flex-col overflow-hidden rounded-xl4 bg-cream-deep/70 p-4 ring-1 ring-line sm:p-5', className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <Kicker className="text-ink-2">Your store, right now</Kicker>
        <Link to="/inventory" className="text-[12.5px] font-extrabold text-green">Inventory →</Link>
      </div>
      <div className="relative mt-2 flex flex-1 items-center">
        <IsoStore className="w-full" title="Illustration of your store with today’s risk markers">
          {ZONES.map((z, k) => {
            const m = zoneMarker(analysis.products.filter((x) => z.cats.includes(x.product.category)));
            return <IsoMarker key={z.name} at={z.at} tone={m.tone} label={m.label} pulse={m.pulse} delay={0.5 + k * 0.15} />;
          })}
          {top && <IsoMarker at={ISO_ZONES.checkout} tone="ai" label={`AI · ${top.recommendation.action === 'RESTOCK' ? 'order' : 'move'} ${top.product.name.split(' ')[0]}`} delay={1.2} />}
        </IsoStore>
      </div>
      <Flow />
    </section>
  );
}

/** The product in one line: your store → SmartShelf analyses → your next move. */
function Flow() {
  return (
    <ol className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[12px] font-bold text-ink-2">
      <li className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">Your store</li>
      <li aria-hidden><IconChevronRight size={14} className="text-ink-faint" /></li>
      <li className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">SmartShelf analyses <span className="hidden font-semibold text-ink-muted 2xl:inline">sales · stock · expiry</span></li>
      <li aria-hidden><IconChevronRight size={14} className="text-ink-faint" /></li>
      <li className="rounded-full bg-green-dark px-3 py-1.5 text-white">Your next move</li>
    </ol>
  );
}

// ---------------------------------------------------------------- 3. today's store (four numbers)
function TodayStore() {
  const { analysis } = useWorkspace();
  const h = analysis.health;
  const cells = [
    { n: h.stockout, label: 'Restock', sub: 'could run out', dot: 'bg-red', to: '/insights/restock' },
    { n: h.expiry, label: 'Sell soon', sub: 'expiring before sold', dot: 'bg-yellow', to: '/insights/expiry' },
    { n: h.slow, label: 'Slow movers', sub: 'cash tied up', dot: 'bg-orange', to: '/insights/slow' },
  ];
  return (
    <section aria-label="Today’s store health">
      <h2 className="mb-3 font-display text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Today’s store</h2>
      <div className="overflow-hidden rounded-xl4 bg-surface shadow-card ring-1 ring-line">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {cells.map((c) => (
            <Link key={c.label} to={c.to} className="group border-b border-r border-line p-5 transition-colors hover:bg-cream sm:p-6 md:border-b-0">
              <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-2"><span className={cx('h-2.5 w-2.5 rounded-full', c.dot)} />{c.label}</p>
              <p className="mt-2 font-display text-[44px] font-extrabold leading-none tabular-nums text-ink sm:text-[52px]"><AnimatedNumber value={c.n} /></p>
              <p className="mt-1 text-[12.5px] font-semibold text-ink-muted group-hover:text-ink-2">{c.sub} →</p>
            </Link>
          ))}
          <Link to="/inventory?risk=healthy" className="group border-b border-line bg-green-mint/50 p-5 transition-colors hover:bg-green-mint sm:p-6 md:border-b-0">
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-green"><span className="h-2.5 w-2.5 rounded-full bg-green" />Inventory health</p>
            <p className="mt-2 font-display text-[44px] font-extrabold leading-none tabular-nums text-green sm:text-[52px]"><AnimatedNumber value={h.pct ?? 0} suffix="%" /></p>
            <p className="mt-1 text-[12.5px] font-semibold text-ink-muted">{h.healthy} of {h.total} need nothing</p>
          </Link>
        </div>
        <div className="flex h-2" aria-hidden>
          {[[h.stockout, 'bg-red'], [h.expiry, 'bg-yellow'], [h.slow, 'bg-orange'], [h.healthy, 'bg-green']].map(([v, c]) => (v as number) > 0 && (
            <motion.span key={c as string} className={c as string} initial={{ width: 0 }} whileInView={{ width: `${((v as number) / Math.max(1, h.total)) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 4. what needs attention (top 5 only)
function Attention() {
  const { analysis } = useWorkspace();
  const sheets = useSheets();
  const top = analysis.nextMoves.slice(0, 5);
  return (
    <section aria-labelledby="attention" className="h-full rounded-xl4 bg-surface p-5 shadow-card ring-1 ring-line sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="attention" className="font-display text-[22px] font-extrabold tracking-tight text-ink sm:text-[24px]">What needs attention</h2>
          <p className="text-[13px] text-ink-muted">Top decisions, most urgent first</p>
        </div>
        <Link to="/next-moves" className="shrink-0 text-[13px] font-extrabold text-green">View all {analysis.nextMoves.length} →</Link>
      </div>
      {top.length === 0 ? <p className="mt-6 text-[14px] text-ink-muted">Nothing needs a decision right now.</p> : (
        <ol className="mt-4 divide-y divide-line">
          <AnimatePresence initial={false}>
            {top.map((a, k) => (
              <motion.li key={a.product.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16, height: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-3 py-3">
                <span className="w-5 shrink-0 text-center font-display text-[16px] font-extrabold tabular-nums text-ink-faint">{k + 1}</span>
                <ProductArt product={a.product} size={40} className="shrink-0" />
                <Link to={`/products/${a.product.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-ink">{a.product.name}</span>
                  <span className="block truncate text-[12.5px] font-semibold text-ink-muted">{a.recommendation.headline}</span>
                </Link>
                <button onClick={() => sheets.act(a)} className="shrink-0" aria-label={`${primaryLabel(a)} — ${a.product.name}`}><ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} /></button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {analysis.nextMoves.length > 5 && <Link to="/next-moves" className="mt-2 inline-flex items-center gap-1 text-[14px] font-extrabold text-green">View all recommendations <IconArrowRight size={16} /></Link>}
    </section>
  );
}

// ---------------------------------------------------------------- 5. supporting insight
function WhyToday() {
  const { analysis, todayStr } = useWorkspace();
  const history = useMemo(() => Array.from({ length: 14 }, (_, k) => {
    const date = addDays(todayStr, k - 14);
    return { date, units: analysis.products.reduce((s, a) => s + (a.demand.history.find((h) => h.date === date)?.units ?? 0), 0) };
  }), [analysis, todayStr]);
  const recent = history.slice(7).reduce((s, h) => s + h.units, 0), prior = history.slice(0, 7).reduce((s, h) => s + h.units, 0);
  const pct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;
  const grower = analysis.products.filter((a) => a.demand.trend === 'up' && (a.demand.recent7 ?? 0) >= 2).sort((a, b) => b.demand.trendPct! - a.demand.trendPct!)[0];
  return (
    <section aria-labelledby="why-today" className="flex h-full flex-col rounded-xl4 bg-surface p-5 shadow-card ring-1 ring-line sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="why-today" className="font-display text-[22px] font-extrabold tracking-tight text-ink sm:text-[24px]">Why today looks like this</h2>
          <p className="text-[13px] text-ink-muted">Units sold per day, last 14 days</p>
        </div>
        <Link to="/insights" className="shrink-0 text-[13px] font-extrabold text-green">Insights →</Link>
      </div>
      <div className="mt-4"><DemandBars history={history} average={recent / 7} height={150} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div><dd className={cx('font-display text-[26px] font-extrabold tabular-nums', pct !== null && pct >= 0 ? 'text-green' : 'text-ink')}>{pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct}%`}</dd><dt className="text-[12.5px] text-ink-muted">demand vs last week</dt></div>
        <div><dd className="font-display text-[26px] font-extrabold tabular-nums text-red-ink">{rupees(analysis.valueAtRisk)}</dd><dt className="text-[12.5px] text-ink-muted">sales or stock at risk</dt></div>
      </dl>
      {grower && <Link to={`/products/${grower.product.id}`} className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-ink-2 hover:text-ink"><span>Fastest growing: <b className="text-ink">{grower.product.name}</b></span><TrendChip a={grower} /></Link>}
    </section>
  );
}

// ---------------------------------------------------------------- 6. how SmartShelf thinks
function HowItThinks() {
  const { workspace, analysis } = useWorkspace();
  const salesDays = workspace.products.reduce((s, p) => s + Object.keys(p.salesDaily).length, 0);
  const risks = analysis.health.stockout + analysis.health.expiry + analysis.health.slow;
  const steps = [
    { n: '01', t: 'Input', items: ['Stock', 'Sales', 'Expiry'], live: `${workspace.products.length} products · ${salesDays.toLocaleString('en-IN')} sales days`, art: <InputArt /> },
    { n: '02', t: 'Analyse', items: ['Demand', 'Patterns', 'Velocity'], live: `${analysis.products.filter((a) => a.demand.trend === 'up').length} rising · ${analysis.products.filter((a) => a.demand.trend === 'down').length} falling`, art: <AnalyseArt /> },
    { n: '03', t: 'Predict', items: ['Stock-out', 'Expiry', 'Slow'], live: `${risks} risks found`, art: <PredictArt /> },
    { n: '04', t: 'Act', items: ['Restock', 'Sell soon', 'Hold'], live: `${analysis.nextMoves.length} next moves`, art: <ActArt /> },
  ];
  return (
    <section aria-labelledby="how" className="relative overflow-hidden rounded-xl4 bg-green-deep px-5 py-7 text-white sm:px-8 sm:py-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-yellow">Behind every next move</p>
          <h2 id="how" className="mt-1 font-display text-[26px] font-extrabold tracking-tight sm:text-[32px]">How SmartShelf thinks</h2>
        </div>
        <p className="max-w-sm text-[13px] text-white/60">Transparent rules on your own numbers — every recommendation can be explained line by line.</p>
      </div>
      <ol className="relative mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <span className="pointer-events-none absolute left-0 right-0 top-[86px] hidden h-1 rounded-full bg-[#C89B63]/70 lg:block" aria-hidden />
        {steps.map((s, k) => (
          <motion.li key={s.n} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: k * 0.12, duration: 0.45 }} className="relative flex flex-col">
            <div className="relative mx-auto w-full max-w-[220px] px-1 sm:px-4">{s.art}</div>
            <div className="mt-2 flex-1 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
              <p className="font-display text-[13px] font-extrabold tracking-[0.14em] text-yellow">{s.n} — {s.t.toUpperCase()}</p>
              <p className="mt-1 text-[15px] font-bold">{s.items.join(' · ')}</p>
              <p className="mt-2 text-[12.5px] text-white/60">{s.live}</p>
            </div>
            {k < 3 && <IconChevronRight size={22} className="absolute -right-3.5 top-[76px] z-10 hidden rounded-full bg-green-deep text-yellow lg:block" />}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- empty state: explain the product
function FirstRun() {
  const { repo } = useWorkspace();
  const sheets = useSheets();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-xl4 bg-green-dark p-6 text-white sm:p-10 xl:grid-cols-[1fr_1.05fr]">
      <div>
        <Kicker className="text-yellow">Your store is ready</Kicker>
        <h2 className="mt-2 font-display text-[32px] font-extrabold leading-[1.08] tracking-tight sm:text-[42px]">Add your first products and SmartShelf starts learning.</h2>
        <ol className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-bold">
          {['Stock', 'Sales', 'Expiry', 'Demand'].map((s) => (
            <li key={s} className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5">{s}</span><IconChevronRight size={14} className="text-yellow" /></li>
          ))}
          <li className="rounded-full bg-yellow px-3 py-1.5 text-ink">Next Move</li>
        </ol>
        <p className="mt-4 max-w-xl text-[15px] text-white/75">For each product, tell SmartShelf what you have, what sells and when it expires. Or load the demo store with four weeks of sample sales — demo products are marked and can be removed any time.</p>
        <div className="mt-6 flex flex-wrap gap-2.5">
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
      <div className="rounded-[28px] bg-cream p-4"><IsoStore title="An empty store, ready for products" /></div>
    </section>
  );
}

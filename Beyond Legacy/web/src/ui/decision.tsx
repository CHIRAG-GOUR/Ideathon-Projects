// The signature pieces: the Next Move card, the "why" panel (WHAT / WHY / WHEN / IF IGNORED) and the receipt-style
// record of a completed action.
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { fmt1, type Analysis } from '../engine/analyze';
import { relativeDay } from '../engine/dates';
import { useWorkspace } from '../state/session';
import { useSheets } from './sheets';
import { actionTone, ActionBadge, Button, cx, Kicker, Num, RiskPill } from './kit';
import { IconCheck, IconFlat, IconTrendDown, IconTrendUp, IconUndo } from './icons';

export function primaryLabel(a: Analysis): string {
  switch (a.recommendation.action) {
    case 'RESTOCK': return 'Mark ordered';
    case 'SELL_SOON': return 'Mark priority';
    case 'REMOVE': return 'Mark removed';
    default: return 'Acknowledge';
  }
}

/** Out of stock, under a day of cover, or expired: the move wears red. */
export function isCritical(a: Analysis) {
  return a.recommendation.action === 'REMOVE' || (a.recommendation.action === 'RESTOCK' && (a.product.stock <= 0 || (a.coverageDays ?? 9) < 1));
}

export function TrendChip({ a, onDark }: { a: Analysis; onDark?: boolean }) {
  const d = a.demand;
  if (d.trendPct === null) return <span className={cx('text-[12.5px] font-semibold', onDark ? 'text-white/60' : 'text-ink-muted')}>{d.source === 'declared' ? 'Estimate' : 'No trend yet'}</span>;
  const I = d.trend === 'up' ? IconTrendUp : d.trend === 'down' ? IconTrendDown : IconFlat;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-extrabold', d.trend === 'up' ? (onDark ? 'bg-yellow text-ink' : 'bg-green-mint text-green') : d.trend === 'down' ? 'bg-hold-bg text-hold-fg' : onDark ? 'bg-white/10 text-white' : 'bg-cream-deep text-ink-2')}>
      <I size={14} />
      <Num>{d.trendPct > 0 ? '+' : ''}{Math.round(d.trendPct)}%</Num>
    </span>
  );
}

/** Key numbers in reading order: stock → demand → projection → order. */
export function facts(a: Analysis): { k: string; v: string; tone?: 'red' | 'orange' }[] {
  const r = a.recommendation, p = a.product;
  const out: { k: string; v: string; tone?: 'red' | 'orange' }[] = [{ k: 'In stock', v: `${p.stock} units`, tone: a.stockout.belowSafety ? 'red' : undefined }];
  if (r.action === 'SELL_SOON' || r.action === 'REMOVE') {
    out.push({ k: 'Expires', v: a.expiry.daysToExpiry === null ? '—' : relativeDay(a.expiry.daysToExpiry), tone: 'orange' });
    out.push({ k: 'Likely unsold', v: `${a.expiry.unsold} units`, tone: 'orange' });
  } else {
    out.push({ k: 'Demand', v: `${fmt1(a.demand.daily)}/day` });
    out.push({ k: a.coverageDays !== null && a.coverageDays < 7 ? 'Stock-out in' : 'Coverage', v: a.coverageDays === null ? 'No demand' : `${fmt1(a.coverageDays)} days`, tone: a.stockout.risk === 'HIGH' ? 'red' : undefined });
  }
  return out;
}

/** WHAT · WHY · WHEN · IF IGNORED — built only from the product's own numbers. */
export function Reasoning({ a }: { a: Analysis }) {
  const r = a.recommendation;
  return (
    <div className="space-y-5">
      <div>
        <Kicker>What</Kicker>
        <p className="mt-1 font-display text-[18px] font-extrabold text-ink">{r.headline}</p>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{r.summary}</p>
      </div>
      <div>
        <Kicker>Why {r.action === 'SELL_SOON' ? 'sell soon' : r.action.toLowerCase()}?</Kicker>
        <ul className="mt-2 space-y-2">
          {r.reasons.map((x, i) => (
            <motion.li key={x.text} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-2.5 text-[14px] text-ink-2">
              <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md', x.supports ? 'bg-green text-white' : 'bg-cream-deep text-ink-muted')} aria-label={x.supports ? 'Supporting factor' : 'Context'}>
                {x.supports ? <IconCheck size={13} /> : <span className="text-[11px] font-extrabold">i</span>}
              </span>
              {x.text}
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-3 ring-1 ring-line">
          <Kicker>When</Kicker>
          <p className="mt-1 text-[15px] font-extrabold text-ink">{r.when}</p>
        </div>
        <div className="rounded-2xl bg-surface p-3 ring-1 ring-line">
          <Kicker>Expected impact</Kicker>
          <ul className="mt-1 space-y-0.5 text-[13.5px] text-ink-2">{r.impact.map((x) => <li key={x}>• {x}</li>)}</ul>
        </div>
      </div>
      <div className="rounded-2xl border-l-4 border-red bg-red-soft/60 px-3 py-2.5">
        <Kicker className="text-red-ink">If ignored</Kicker>
        <p className="mt-1 text-[14px] text-ink-2">{r.ifIgnored}</p>
      </div>
      <p className="text-[12px] text-ink-faint">
        Based on {a.demand.source === 'sales' ? `${a.demand.daysOfData} days of recorded sales` : a.demand.source === 'blended' ? `${a.demand.daysOfData} days of sales blended with your estimate` : a.demand.source === 'declared' ? 'your daily sales estimate (no sales recorded yet)' : 'no sales data yet'} and the thresholds on the Store page — calculated by Beyond Legacy’s rules engine, not guessed.
      </p>
    </div>
  );
}

/** Receipt-style record of a completed move. */
export function HandledNote({ a, compact }: { a: Analysis; compact?: boolean }) {
  const { repo } = useWorkspace();
  const h = a.handled!;
  const verb = { ordered: 'Ordered', prioritized: 'On the sell-first shelf', acknowledged: 'Acknowledged', removed: 'Removed from sale' }[h.status];
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="overflow-hidden rounded-t-xl bg-surface ring-1 ring-line">
      <div className={cx('flex flex-wrap items-center justify-between gap-2', compact ? 'px-3 py-2' : 'px-4 py-3')}>
        <span className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-green text-white"><IconCheck size={15} /></span>
          <span>
            <span className="block text-[14px] font-extrabold text-ink">✓ {verb}{h.quantity ? ` · ${h.quantity} units` : ''}</span>
            <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{new Date(h.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{h.by ? ` · ${h.by}` : ''}</span>
          </span>
        </span>
        <button onClick={() => repo.clearAction(a.product.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-ink-muted hover:bg-ink/5"><IconUndo size={14} />Undo</button>
      </div>
      <div className="receipt-edge h-2 bg-cream-deep" aria-hidden />
    </motion.div>
  );
}

/** NEXT MOVE — the product's signature card. */
export function NextMoveCard({ a, hero, position }: { a: Analysis; hero?: boolean; position?: string }) {
  const sheets = useSheets();
  const p = a.product, r = a.recommendation;
  const critical = isCritical(a);
  const tone = actionTone(r.action, critical);
  const risk = r.action === 'SELL_SOON' || r.action === 'REMOVE' ? a.expiry.risk : a.stockout.risk;
  const fx = facts(a);
  return (
    <article className={cx('relative overflow-hidden bg-surface', hero ? 'rounded-xl4 shadow-lift ring-1 ring-black/5' : 'rounded-xl3 border border-line shadow-card transition-shadow hover:shadow-lift')}>
      <div className={cx('absolute inset-y-0 left-0', hero ? 'w-2' : 'w-1.5', tone.stripe)} aria-hidden />
      <div className={cx(hero ? 'grid gap-5 p-5 pl-7 sm:grid-cols-[auto_1fr] sm:p-7 sm:pl-9' : 'p-4 pl-5')}>
        {hero && (
          <Link to={`/products/${p.id}`} className={cx('relative mx-auto grid h-[150px] w-[150px] place-items-center rounded-[28px] sm:h-[164px] sm:w-[164px]', tone.tint)} aria-label={`Open ${p.name}`}>
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}><ProductArt product={p} size={138} /></motion.div>
            <span className="absolute inset-x-5 bottom-3 h-1.5 rounded-full bg-ink/10" aria-hidden />
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cx('pulse-ring absolute inline-flex h-full w-full rounded-full', critical ? 'bg-red' : 'bg-green')} />
                <span className={cx('relative inline-flex h-2.5 w-2.5 rounded-full', critical ? 'bg-red' : 'bg-green')} />
              </span>
              Next move
            </span>
            {position && <span className="ml-auto text-[11.5px] font-bold text-ink-faint">{position}</span>}
          </div>
          <div className={cx('flex items-start gap-3', hero ? 'mt-3' : 'mt-2.5')}>
            {!hero && <ProductArt product={p} size={58} className="-ml-1 shrink-0" />}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ActionBadge action={r.action} size={hero ? 'lg' : 'md'} critical={critical} />
                <RiskPill risk={risk} prefix={r.action === 'SELL_SOON' || r.action === 'REMOVE' ? 'Expiry' : r.action === 'RESTOCK' ? 'Stock-out' : undefined} />
              </div>
              <Link to={`/products/${p.id}`} className={cx('mt-2 block font-display font-extrabold leading-[1.05] tracking-tight text-ink hover:text-green', hero ? 'text-[28px] sm:text-[34px]' : 'text-[18px]')}>{p.name}</Link>
              {!hero && <p className="mt-1 text-[13.5px] font-semibold text-ink-2">{r.headline}</p>}
            </div>
          </div>
          {hero && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{r.summary}</p>}
          <div className={cx('flex flex-wrap items-end gap-x-6 gap-y-3', hero ? 'mt-5' : 'mt-3')}>
            {fx.map((f) => (
              <div key={f.k}>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{f.k}</p>
                <p className={cx('font-display font-extrabold tabular-nums', hero ? 'text-[24px]' : 'text-[16px]', f.tone === 'red' ? 'text-red-ink' : f.tone === 'orange' ? 'text-orange' : 'text-ink')}>{f.v}</p>
              </div>
            ))}
            {hero && a.demand.trendPct !== null && <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">Trend</p><div className="mt-1"><TrendChip a={a} /></div></div>}
            {r.quantity ? (
              <div className={cx('tag-shape bg-yellow pr-5 text-ink', hero ? 'rounded-l-xl py-2 pl-3.5' : 'rounded-l-lg py-1 pl-2.5')}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-75">Suggested order</p>
                <p className={cx('font-display font-black tabular-nums leading-tight', hero ? 'text-[26px]' : 'text-[17px]')}>+{r.quantity} units</p>
              </div>
            ) : null}
          </div>
          {a.handled ? <div className="mt-4"><HandledNote a={a} compact={!hero} /></div> : (
            <div className={cx('flex flex-wrap gap-2', hero ? 'mt-6' : 'mt-4')}>
              <Button tone="secondary" size={hero ? 'md' : 'sm'} onClick={() => sheets.why(a)}>Review reasoning</Button>
              <Button tone={critical ? 'primary' : 'dark'} size={hero ? 'md' : 'sm'} className={cx(critical && '!bg-red hover:!brightness-110')} onClick={() => sheets.act(a)}><IconCheck size={16} />{primaryLabel(a)}</Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

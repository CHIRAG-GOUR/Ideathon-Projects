// Next Moves: the action board. NOW (critical) · TODAY (important) · WATCH (monitor), then the handled receipts.
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { HealthyShelfIllustration, RestockIllustration } from '../art/scenes';
import type { Analysis } from '../engine/analyze';
import type { Action } from '../engine/types';
import { useWorkspace } from '../state/session';
import { HandledNote, isCritical, NextMoveCard, primaryLabel } from '../ui/decision';
import { IconAlert, IconCheck, IconClock, IconForecast } from '../ui/icons';
import { ActionBadge, Button, Card, cx, Empty, Segmented } from '../ui/kit';
import { PageBanner } from '../ui/page';
import { useSheets } from '../ui/sheets';

const COLUMNS = [
  { key: 'NOW', title: 'Now', sub: 'Critical — before anything else', head: 'bg-red text-white', icon: IconAlert },
  { key: 'TODAY', title: 'Today', sub: 'Important — before closing', head: 'bg-yellow text-ink', icon: IconClock },
  { key: 'MONITOR', title: 'Watch', sub: 'No action yet — keep an eye on these', head: 'bg-hold-dot text-white', icon: IconForecast },
] as const;

export default function NextMoves() {
  const { analysis } = useWorkspace();
  const [filter, setFilter] = useState<Action | 'all'>('all');
  const relevant = analysis.products.filter((a) => a.recommendation.priority > 0 || a.handled);
  const match = (a: Analysis) => filter === 'all' || a.recommendation.action === filter;
  const open = relevant.filter((a) => !a.handled && match(a));
  const handled = relevant.filter((a) => a.handled && match(a));
  const count = (x: Action) => relevant.filter((a) => !a.handled && a.recommendation.action === x).length;
  const options: [Action | 'all', string, number?][] = [['all', 'All', relevant.filter((a) => !a.handled).length], ['RESTOCK', 'Restock', count('RESTOCK')], ['SELL_SOON', 'Sell soon', count('SELL_SOON')], ['HOLD', 'Hold', count('HOLD')]];
  if (count('REMOVE')) options.push(['REMOVE', 'Remove', count('REMOVE')]);
  const now = open.filter((a) => a.recommendation.bucket === 'NOW').length, today = open.filter((a) => a.recommendation.bucket === 'TODAY').length;

  return (
    <div className="space-y-5">
      <PageBanner kicker="Your action board" title="Next Moves" sub="Your highest-priority inventory decisions, in order. Every move explains itself." art={<RestockIllustration size={130} />}
        stats={[[String(now), 'now'], [String(today), 'today'], [String(handled.length), 'handled']]} />
      <Segmented label="Filter by action" value={filter} onChange={setFilter} options={options} />

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {COLUMNS.map((c) => {
          const xs = open.filter((a) => a.recommendation.bucket === c.key);
          return (
            <section key={c.key} aria-labelledby={`col-${c.key}`} className="w-[86vw] max-w-[420px] shrink-0 snap-start rounded-xl4 bg-cream-deep/60 p-2.5 ring-1 ring-line lg:w-auto lg:max-w-none">
              <header className={cx('flex items-center gap-2.5 rounded-2xl px-3.5 py-3', c.head)}>
                <c.icon size={20} />
                <div className="min-w-0 flex-1">
                  <h2 id={`col-${c.key}`} className="font-display text-[17px] font-extrabold uppercase leading-none tracking-[0.06em]">{c.title}</h2>
                  <p className="mt-0.5 text-[11.5px] font-semibold opacity-80">{c.sub}</p>
                </div>
                <span className="font-display text-[24px] font-extrabold tabular-nums">{xs.length}</span>
              </header>
              <div className="mt-2.5 space-y-2.5">
                {xs.length === 0 ? (
                  <p className="rounded-2xl border-2 border-dashed border-line-strong px-4 py-6 text-center text-[13px] font-semibold text-ink-muted">{c.key === 'MONITOR' ? 'Nothing to watch right now.' : `Nothing ${c.key === 'NOW' ? 'critical' : 'due today'}${filter !== 'all' ? ' for this filter' : ''}.`}</p>
                ) : (
                  <AnimatePresence initial={false}>
                    {xs.map((a) => (
                      <motion.div layout key={a.product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}>
                        {c.key === 'MONITOR' ? <WatchCard a={a} /> : <NextMoveCard a={a} />}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="done">
        <div className="mb-3 flex items-baseline gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-green text-white"><IconCheck size={15} /></span>
          <h2 id="done" className="font-display text-[20px] font-extrabold tracking-tight text-ink">Handled</h2>
          <span className="text-[13px] font-bold tabular-nums text-ink-faint">{handled.length}</span>
        </div>
        {handled.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-line-strong px-4 py-5 text-[13.5px] font-semibold text-ink-muted">Moves you mark as ordered, prioritised or acknowledged appear here as receipts — with the time and quantity.</p> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {handled.map((a) => (
              <motion.div layout key={a.product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl3 bg-surface p-3 shadow-card ring-1 ring-line">
                <Link to={`/products/${a.product.id}`} className="mb-2 flex items-center gap-3">
                  <ProductArt product={a.product} size={44} />
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-extrabold text-ink">{a.product.name}</span>
                  <ActionBadge action={a.recommendation.action} size="sm" />
                </Link>
                <HandledNote a={a} compact />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {analysis.products.length > 0 && open.length === 0 && handled.length === 0 && filter === 'all' && (
        <Card><Empty art={<HealthyShelfIllustration size={110} />} title="Everything is healthy" body="No product needs restocking, selling or review. Keep recording sales and stock so the forecasts stay current." /></Card>
      )}
    </div>
  );
}

function WatchCard({ a }: { a: Analysis }) {
  const sheets = useSheets();
  return (
    <div className="relative overflow-hidden rounded-xl3 bg-surface p-3 pl-4 shadow-card ring-1 ring-line">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-hold-dot" aria-hidden />
      <div className="flex items-center gap-3">
        <ProductArt product={a.product} size={48} />
        <Link to={`/products/${a.product.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-extrabold text-ink">{a.product.name}</span>
          <span className="block truncate text-[12.5px] font-semibold text-ink-muted">{a.coverageDays === null ? 'No recent sales' : `${Math.round(a.coverageDays)} days of cover`} · {a.recommendation.headline.replace(/^(Hold|Monitor) — /, '')}</span>
        </Link>
        <ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} />
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <Button size="sm" tone="ghost" onClick={() => sheets.why(a)}>Review</Button>
        <Button size="sm" className="ml-auto" onClick={() => sheets.act(a)}>{primaryLabel(a)}</Button>
      </div>
    </div>
  );
}

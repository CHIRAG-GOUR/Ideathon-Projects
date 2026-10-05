// Product intelligence: one product, its forecast, its recommendation and why — plus the live analysis band where
// changing the stock visibly flows through DATA → PREDICTION → ACTION.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { DemandBars, ForecastChart } from '../charts/charts';
import { analyseProduct, fmt1, rupees, type Analysis } from '../engine/analyze';
import { formatDate, relativeDay, shortDate } from '../engine/dates';
import { friendlyError } from '../data/repo';
import { useWorkspace } from '../state/session';
import { HandledNote, isCritical, primaryLabel, Reasoning, TrendChip } from '../ui/decision';
import { IconArrowLeft, IconArrowRight, IconBox, IconCart, IconCheck, IconDemand, IconEdit, IconExpiry, IconForecast, IconMinus, IconPlus, IconTrash } from '../ui/icons';
import { actionTone, ActionBadge, AisleTag, AnimatedNumber, Button, Card, cx, Empty, Kicker, RiskPill, SectionTitle, Sheet, useToast } from '../ui/kit';
import { useSheets } from '../ui/sheets';
import { splitSize } from '../ui/shelf';

export default function ProductDetail() {
  const { id } = useParams();
  const { workspace, analysis, todayStr, repo } = useWorkspace();
  const sheets = useSheets();
  const toast = useToast();
  const nav = useNavigate();
  const saved = analysis.products.find((a) => a.product.id === id);
  const [draft, setDraft] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setDraft(null), [id, saved?.product.stock]);

  // The live analysis: the same engine, re-run instantly on the stock being entered.
  const a: Analysis | undefined = useMemo(
    () => (saved && draft !== null && draft !== saved.product.stock ? analyseProduct({ ...saved.product, stock: draft }, workspace.settings, todayStr, workspace.actions) : saved),
    [saved, draft, workspace.settings, todayStr, workspace.actions],
  );
  if (!saved || !a) return <Card><Empty title="Product not found" body="It may have been deleted on another device." action={<Link to="/inventory" className="font-extrabold text-green">Back to inventory</Link>} /></Card>;
  const p = a.product, r = a.recommendation;
  const previewing = draft !== null && draft !== saved.product.stock;
  const critical = isCritical(a);
  const tone = actionTone(r.action, critical);
  const [title, size] = splitSize(p.name);
  const events = workspace.events.filter((e) => e.productId === p.id).slice(0, 8);

  async function saveCount() {
    if (draft === null) return;
    setSaving(true);
    try {
      await repo.adjustStock(saved!.product.id, 'count', draft, 'Stock count from product analysis');
      toast(`Stock saved · ${draft} units`);
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/inventory" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink-muted hover:text-ink"><IconArrowLeft size={16} />Inventory</Link>

      {/* hero: product on its shelf + headline numbers */}
      <section className="grid grid-cols-1 overflow-hidden rounded-xl4 bg-surface shadow-card ring-1 ring-line md:grid-cols-[minmax(240px,340px)_1fr]">
        <div className={cx('relative flex items-end justify-center overflow-hidden px-6 pt-8', tone.tint)}>
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-white/70 blur-2xl" aria-hidden />
          <motion.div key={p.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} className="relative">
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}><ProductArt product={p} size={230} /></motion.div>
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-end bg-[#CDBB93] px-4 shelf-grain">
            <span className="tag-shape rounded-l bg-yellow py-1 pl-2.5 pr-5 font-display text-[16px] font-black tabular-nums text-ink">{rupees(p.unitPrice)}</span>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2"><AisleTag>{p.category}</AisleTag>{p.demo && <AisleTag tone="dark">Demo product</AisleTag>}</div>
          <h1 className="mt-2 font-display text-[34px] font-extrabold uppercase leading-[0.98] tracking-tight text-ink sm:text-[46px]">{title}</h1>
          <p className="mt-1 text-[15px] font-bold text-ink-muted">{size ? `${size} · ` : ''}{p.supplier || 'No supplier set'}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div><dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">In stock</dt><dd className={cx('font-display text-[32px] font-extrabold leading-none', a.stockout.belowSafety ? 'text-red-ink' : 'text-ink')}><AnimatedNumber value={p.stock} /><span className="ml-1 text-[13px] font-bold text-ink-muted">units</span></dd></div>
            <div><dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Demand</dt><dd className="font-display text-[32px] font-extrabold leading-none text-ink"><AnimatedNumber value={a.demand.daily} decimals={1} /><span className="ml-1 text-[13px] font-bold text-ink-muted">/day</span></dd><TrendChip a={a} /></div>
            <div><dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Forecast</dt><dd className={cx('font-display text-[32px] font-extrabold leading-none', a.stockout.risk === 'HIGH' ? 'text-red-ink' : 'text-ink')}>{a.coverageDays === null ? '—' : <AnimatedNumber value={Math.min(99, a.coverageDays)} decimals={1} />}<span className="ml-1 text-[13px] font-bold text-ink-muted">days</span></dd></div>
            <div><dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Beyond Legacy</dt><dd className="mt-1"><AnimatePresence mode="wait"><motion.span key={r.action + critical} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-block"><ActionBadge action={r.action} size="lg" critical={critical} /></motion.span></AnimatePresence></dd>{r.quantity ? <p className="mt-1 text-[13px] font-extrabold text-green">Suggested +{r.quantity}</p> : null}</div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button tone="primary" onClick={() => sheets.recordSale(p.id)}><IconCart size={17} />Record sale</Button>
            <Button onClick={() => sheets.stock(p.id, 'receive')}><IconBox size={17} />Update stock</Button>
            <Button tone="ghost" onClick={() => sheets.editProduct(saved.product)} aria-label="Edit product"><IconEdit size={17} />Edit</Button>
            <Button tone="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete product"><IconTrash size={17} /></Button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {previewing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="sticky top-[76px] z-20 flex flex-wrap items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift lg:top-[84px]">
            <p className="flex-1 text-[14px]"><b className="text-yellow">Analysing {draft} units</b> <span className="text-white/70">(saved: {saved.product.stock}) — every number on this page is recalculated. Nothing is saved yet.</span></p>
            <Button size="sm" tone="light" onClick={() => setDraft(null)}>Reset</Button>
            <Button size="sm" tone="accent" busy={saving} onClick={saveCount}><IconCheck size={16} />Save as stock count</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <LiveAnalysis base={saved} a={a} draft={draft} setDraft={setDraft} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <SectionTitle icon={<IconForecast size={20} />} title="Stock forecast" sub={`Projected units on hand at ${fmt1(a.demand.daily)}/day if nothing is received`}
              right={<p className={cx('text-right font-display text-[16px] font-extrabold', a.coverageDays !== null && a.coverageDays < 7 ? 'text-red-ink' : 'text-ink-2')}>{a.coverageDays === null ? 'No demand recorded' : a.coverageDays < 7 ? `Stock-out in ${fmt1(a.coverageDays)} days` : `Covers ${Math.round(a.coverageDays)} days`}</p>} />
            <ForecastChart forecast={a.forecast} safety={p.safetyStock} stockoutAt={a.coverageDays} expiryDay={a.expiry.daysToExpiry} />
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {a.forecast.slice(0, 4).map((f, i) => (
                <div key={f.date} className={cx('rounded-2xl px-2 py-2.5', f.stock <= 0 && i > 0 ? 'bg-red-soft' : f.stock <= p.safetyStock ? 'bg-yellow-soft' : 'bg-cream')}>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-muted">{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : `Day ${i}`}</p>
                  <p className={cx('font-display text-[19px] font-extrabold tabular-nums', f.stock <= 0 && i > 0 ? 'text-red-ink' : 'text-ink')}>{f.stock < 0 ? `−${Math.round(-f.stock)}` : Math.round(f.stock)}</p>
                  {f.stock < 0 && <p className="text-[10.5px] font-bold text-red-ink">short</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden p-5 pl-7">
            <span className={cx('absolute inset-y-0 left-0 w-2', tone.stripe)} aria-hidden />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Kicker className="text-green">Why this recommendation?</Kicker>
              <RiskPill risk={r.action === 'SELL_SOON' || r.action === 'REMOVE' ? a.expiry.risk : a.stockout.risk} prefix={r.action === 'SELL_SOON' || r.action === 'REMOVE' ? 'Expiry' : 'Stock-out'} />
            </div>
            <Reasoning a={a} />
            {!previewing && (saved.handled ? <div className="mt-5"><HandledNote a={saved} /></div> : r.priority > 0 && (
              <div className="mt-5"><Button tone={critical ? 'primary' : 'dark'} size="lg" className={cx(critical && '!bg-red')} onClick={() => sheets.act(saved)}><IconCheck size={18} />{primaryLabel(saved)}</Button></div>
            ))}
          </Card>

          <Card className="p-5">
            <SectionTitle icon={<IconDemand size={20} />} title="Demand" sub="Units sold per day, last 14 complete days" right={<span className="text-[13px] font-semibold text-ink-muted">avg <b className="tabular-nums text-ink">{fmt1(a.demand.daily)}</b>/day</span>} />
            {a.demand.daysOfData > 0 ? <DemandBars history={a.demand.history} average={a.demand.daily} /> : (
              <p className="rounded-2xl bg-cream px-4 py-6 text-center text-[13.5px] text-ink-muted">No sales recorded yet. {p.declaredDailySales > 0 ? `Forecasts use your estimate of ${fmt1(p.declaredDailySales)}/day until sales come in.` : 'Record sales, or add a daily sales estimate, to get a forecast.'}</p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className={cx('overflow-hidden p-0', a.flags.expiry && 'ring-2 ring-orange/40')}>
            <div className={cx('flex items-center justify-between px-5 py-4', a.flags.expiry ? 'bg-yellow-soft' : 'bg-cream')}>
              <h2 className="flex items-center gap-2 font-display text-[17px] font-extrabold text-ink"><IconExpiry size={20} />Expiry</h2>
              {p.expiryDate && <RiskPill risk={a.expiry.risk === 'NONE' ? 'LOW' : a.expiry.risk} prefix="Expiry risk" />}
            </div>
            {p.expiryDate ? (
              <dl className="grid grid-cols-2 gap-3 p-5 text-[13px]">
                <div><dt className="font-bold text-ink-muted">Expiry date</dt><dd className="mt-0.5 font-display text-[17px] font-extrabold text-ink">{formatDate(p.expiryDate)}</dd></div>
                <div><dt className="font-bold text-ink-muted">When</dt><dd className="mt-0.5 font-display text-[17px] font-extrabold text-ink">{relativeDay(a.expiry.daysToExpiry!)}</dd></div>
                <div><dt className="font-bold text-ink-muted">Expected to sell by then</dt><dd className="mt-0.5 font-display text-[17px] font-extrabold tabular-nums text-ink">{a.expiry.risk === 'EXPIRED' ? '—' : Math.round(a.expiry.expectedSold)}</dd></div>
                <div><dt className="font-bold text-ink-muted">Likely unsold</dt><dd className={cx('mt-0.5 font-display text-[17px] font-extrabold tabular-nums', a.expiry.unsold > 0 ? 'text-orange' : 'text-ink')}>{a.expiry.unsold}</dd></div>
              </dl>
            ) : <p className="p-5 text-[13.5px] text-ink-muted">Not perishable — no expiry date set.</p>}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Product data" />
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div><dt className="font-bold text-ink-muted">Minimum safe stock</dt><dd className="mt-0.5 font-extrabold tabular-nums text-ink">{p.safetyStock}</dd></div>
              <div><dt className="font-bold text-ink-muted">Order multiple</dt><dd className="mt-0.5 font-extrabold tabular-nums text-ink">{p.caseSize}</dd></div>
              <div><dt className="font-bold text-ink-muted">Value on hand</dt><dd className="mt-0.5 font-extrabold tabular-nums text-ink">{rupees(p.stock * p.unitPrice)}</dd></div>
              <div><dt className="font-bold text-ink-muted">Sales tracked since</dt><dd className="mt-0.5 font-extrabold text-ink">{shortDate(p.trackingSince)}</dd></div>
              <div className="col-span-2"><dt className="font-bold text-ink-muted">Demand basis</dt><dd className="mt-0.5 font-extrabold text-ink">{{ sales: `${a.demand.daysOfData} days of recorded sales`, blended: `${a.demand.daysOfData} days of sales + your estimate`, declared: 'Your estimate (no sales yet)', none: 'No data yet' }[a.demand.source]}</dd></div>
              {p.notes && <div className="col-span-2"><dt className="font-bold text-ink-muted">Notes</dt><dd className="mt-0.5 text-ink-2">{p.notes}</dd></div>}
            </dl>
          </Card>

          <Card className="p-5">
            <SectionTitle title="History" />
            {events.length ? (
              <ol className="relative space-y-3 border-l-2 border-dashed border-line-strong pl-4">
                {events.map((e) => (
                  <li key={e.id} className="relative text-[13px]">
                    <span className={cx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface', e.delta > 0 ? 'bg-green' : e.delta < 0 ? 'bg-orange' : 'bg-hold-dot')} aria-hidden />
                    <p className="font-bold text-ink">{e.note} {e.delta !== 0 && <span className={cx('tabular-nums', e.delta > 0 ? 'text-green' : 'text-orange')}>{e.delta > 0 ? `+${e.delta}` : e.delta}</span>}</p>
                    <p className="text-[11.5px] text-ink-faint">{new Date(e.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {e.by}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-[13.5px] text-ink-muted">Stock movements, sales and actions for this product will be listed here.</p>}
          </Card>
        </div>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete product?" sub={p.name}
        footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button tone="danger" className="flex-1" onClick={async () => {
          try {
            await repo.deleteProduct(p.id);
            toast(`${p.name} deleted`);
            nav('/inventory');
          } catch (e) {
            toast(friendlyError(e), 'error');
          }
        }}>Delete</Button></div>}>
        <p className="text-[14px] text-ink-2">The product and its recommendation are removed. Recorded sales stay in the sales log.</p>
      </Sheet>
    </div>
  );
}

/** DATA CHANGED → PREDICTION CHANGED → ACTION CHANGED, driven by the stock being entered. */
function LiveAnalysis({ base, a, draft, setDraft }: { base: Analysis; a: Analysis; draft: number | null; setDraft: (n: number | null) => void }) {
  const value = draft ?? base.product.stock;
  const max = Math.max(40, base.product.stock * 2, base.product.safetyStock * 3, Math.ceil(base.demand.daily * 10));
  const set = (n: number) => setDraft(Math.max(0, Math.min(99999, Math.round(n))));
  const expiryMove = a.recommendation.action === 'SELL_SOON' || a.recommendation.action === 'REMOVE';
  const risk = expiryMove ? a.expiry.risk : a.stockout.risk;
  const riskWord = risk === 'NONE' ? 'No risk' : `${risk === 'EXPIRED' ? 'Expired' : risk[0] + risk.slice(1).toLowerCase()} ${expiryMove ? 'expiry' : 'stock-out'} risk`;
  const riskCls = risk === 'HIGH' || risk === 'EXPIRED' ? 'bg-red text-white' : risk === 'MEDIUM' ? 'bg-orange text-white' : 'bg-green-mid text-white';
  const critical = isCritical(a);
  return (
    <section aria-labelledby="live" className="rounded-xl4 bg-green-dark p-4 text-white sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">Live analysis</p>
          <h2 id="live" className="font-display text-[22px] font-extrabold tracking-tight">Data changed → prediction changed → action changed</h2>
        </div>
        <p className="text-[13px] text-white/65">Change the stock and watch the decision respond.</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_auto_1fr_auto_1fr_auto_1.15fr] md:items-stretch">
        <div className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-inset ring-white/15">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-yellow">1 · Data · stock</p>
          <div className="mt-2 flex items-center gap-2">
            <button aria-label="Decrease stock" onClick={() => set(value - 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><IconMinus /></button>
            <label htmlFor="live-stock" className="sr-only">Current stock</label>
            <input id="live-stock" aria-label="Current stock" inputMode="numeric" value={value} onChange={(e) => set(Number(e.target.value.replace(/[^\d]/g, '') || 0))}
              className="h-11 min-w-0 flex-1 rounded-xl bg-white text-center font-display text-[24px] font-extrabold tabular-nums text-ink focus:outline-none focus:ring-4 focus:ring-yellow/50" />
            <button aria-label="Increase stock" onClick={() => set(value + 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><IconPlus /></button>
          </div>
          <input type="range" min={0} max={max} value={Math.min(value, max)} onChange={(e) => set(Number(e.target.value))} aria-label="Stock level" className="mt-3 w-full accent-[#F5B82E]" />
          <p className="mt-1 text-[12px] text-white/60">{fmt1(a.demand.daily)} sold/day · safety {a.product.safetyStock}</p>
        </div>
        <IconArrowRight size={22} className="hidden self-center text-yellow md:block" />
        <LiveStage n={2} k="Analyse" flashKey={`a${value}`}>
          <p className="font-display text-[30px] font-extrabold leading-none">{a.coverageDays === null ? '—' : <AnimatedNumber value={Math.min(99, a.coverageDays)} decimals={1} />}<span className="ml-1 text-[14px] font-bold text-white/70">days of cover</span></p>
          <p className="mt-1.5 text-[12.5px] text-white/65">{a.demand.trendPct !== null ? `Demand ${a.demand.trendPct >= 0 ? '+' : ''}${Math.round(a.demand.trendPct)}% vs last week` : 'No previous week to compare'}</p>
        </LiveStage>
        <IconArrowRight size={22} className="hidden self-center text-yellow md:block" />
        <LiveStage n={3} k="Predict" flashKey={`p${risk}`}>
          <span className={cx('inline-flex rounded-lg px-2.5 py-1 text-[13px] font-extrabold uppercase tracking-wide', riskCls)}>{riskWord}</span>
          <p className="mt-2 text-[12.5px] text-white/65">{a.stockout.stockoutDate && a.coverageDays !== null && a.coverageDays < 14 ? `Runs out ~${relativeDay(Math.floor(a.coverageDays)).toLowerCase()}` : 'No stock-out within two weeks'}</p>
        </LiveStage>
        <IconArrowRight size={22} className="hidden self-center text-yellow md:block" />
        <motion.div key={a.recommendation.action + a.recommendation.headline} initial={{ scale: 0.96, backgroundColor: 'rgba(245,184,46,1)' }} animate={{ scale: 1, backgroundColor: 'rgba(255,252,246,1)' }} transition={{ duration: 0.7 }} className="rounded-2xl p-4 text-ink">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-green">4 · Action</p>
          <div className="mt-2"><ActionBadge action={a.recommendation.action} size="lg" critical={critical} /></div>
          <p className="mt-2 text-[14px] font-extrabold">{a.recommendation.headline}</p>
          {draft !== null && draft !== base.product.stock && base.recommendation.action !== a.recommendation.action && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-muted">was <ActionBadge action={base.recommendation.action} size="sm" /></p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function LiveStage({ n, k, children, flashKey }: { n: number; k: string; children: React.ReactNode; flashKey: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
      {/* a brief golden wash whenever this stage's value changes */}
      <motion.span key={flashKey} className="pointer-events-none absolute inset-0 bg-yellow" initial={{ opacity: 0.28 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }} aria-hidden />
      <p className="relative text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-yellow">{n} · {k}</p>
      <div className="relative mt-2">{children}</div>
    </div>
  );
}

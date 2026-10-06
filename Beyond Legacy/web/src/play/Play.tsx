// Shelf Rush — "Legacy vs SmartShelf". Play the same festival week twice: by habit, then with the app's real
// recommendation engine, and compare the money. Plus "Beat the AI", a 10-second decision quiz on real demo data.
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { analyseStore, rupees, fmt1, type Analysis } from '../engine/analyze';
import { today } from '../engine/dates';
import { demoProducts } from '../engine/demo';
import { DEFAULT_SETTINGS, type Action } from '../engine/types';
import { ProductArt } from '../art/ProductArt';
import { ActionBadge, Button, Card, cx, Kicker } from '../ui/kit';
import { backUnits, clockOf, DAY_LEN, finishLive, requestRestock, runToEnd, shelfUnits, smartTask, startLive, type LiveDay } from './live';
import { aiMove, aiPlan, batchesOf, DAYS, expiringOn, FESTIVAL_DAY, habitPlan, ITEMS, newWeek, SHELF_CAP, stockOf, totals, units, type Plan, type SimState, type Totals } from './sim';

const Store3D = lazy(() => import('./Store3D'));
type Round = 'legacy' | 'smart';
type Screen = { kind: 'intro' } | { kind: 'round'; round: Round } | { kind: 'compare' } | { kind: 'quiz' };

export default function Play() {
  const [screen, setScreen] = useState<Screen>({ kind: 'intro' });
  const [results, setResults] = useState<Partial<Record<Round, Totals>>>({});
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {screen.kind === 'intro' && <Intro onPlay={() => setScreen({ kind: 'round', round: 'legacy' })} onQuiz={() => setScreen({ kind: 'quiz' })} results={results} onCompare={() => setScreen({ kind: 'compare' })} />}
      {screen.kind === 'round' && (
        <RoundView
          key={screen.round}
          round={screen.round}
          onFinish={(t) => setResults((r) => ({ ...r, [screen.round]: t }))}
          onNext={() => setScreen(screen.round === 'legacy' ? { kind: 'round', round: 'smart' } : { kind: 'compare' })}
          onExit={() => setScreen({ kind: 'intro' })}
        />
      )}
      {screen.kind === 'compare' && <Compare results={results} onReplay={() => (setResults({}), setScreen({ kind: 'round', round: 'legacy' }))} onQuiz={() => setScreen({ kind: 'quiz' })} />}
      {screen.kind === 'quiz' && <Quiz onExit={() => setScreen({ kind: 'intro' })} />}
    </div>
  );
}

// ---------------------------------------------------------------- intro
function Intro({ onPlay, onQuiz, onCompare, results }: { onPlay: () => void; onQuiz: () => void; onCompare: () => void; results: Partial<Record<Round, Totals>> }) {
  return (
    <section className="relative overflow-hidden rounded-xl4 bg-green-dark px-6 py-8 text-white sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-yellow/20 blur-3xl" aria-hidden />
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">Shelf Rush · a store simulation</p>
      <h1 className="mt-2 max-w-3xl font-display text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">Legacy vs SmartShelf: one festival week, played twice.</h1>
      <p className="mt-3 max-w-2xl text-[15.5px] text-white/80">
        Run a kirana store from Monday to Diwali weekend. Round 1: order the way the shop always has. Round 2: the same week, same customers —
        with SmartShelf’s recommendation engine suggesting each morning’s moves. Then compare the money lost to stock-outs, wastage and dead stock.
      </p>
      <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        {[
          ['1', 'Plan the morning', 'Order cases, or mark items 15% off to sell them before they expire.'],
          ['2', 'Open the store', 'Customers buy. Empty shelves lose sales, expired stock is thrown away.'],
          ['3', 'Compare', 'Same week, two ways. Which one keeps more money?'],
        ].map(([n, t, d]) => (
          <div key={n} className="rounded-2xl bg-white/10 p-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-yellow text-sm font-extrabold text-ink">{n}</span>
            <p className="mt-2 font-bold">{t}</p>
            <p className="mt-0.5 text-[13px] text-white/70">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button tone="accent" size="lg" onClick={onPlay}>▶ Start round 1 — the legacy way</Button>
        <Button tone="light" size="lg" onClick={onQuiz}>⚡ Beat the AI (60 seconds)</Button>
        {results.legacy && results.smart && <Button tone="light" size="lg" onClick={onCompare}>See last comparison</Button>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- one round
function emptyPlan(): Plan {
  return { order: Object.fromEntries(ITEMS.map((i) => [i.id, 0])), discount: Object.fromEntries(ITEMS.map((i) => [i.id, false])) };
}

function RoundView({ round, onFinish, onNext, onExit }: { round: Round; onFinish: (t: Totals) => void; onNext: () => void; onExit: () => void }) {
  const [state, setState] = useState<SimState>(newWeek);
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [live, setLive] = useState<LiveDay | null>(null); // the open day; null = morning
  const [speed, setSpeed] = useState(1);
  const [auto, setAuto] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const smart = round === 'smart';
  const t = useMemo(() => totals(state), [state]);
  const moves = useMemo(() => (smart && !state.done ? Object.fromEntries(ITEMS.map((it) => [it.id, aiMove(state, it)])) : {}), [smart, state]);
  const festive = state.day >= FESTIVAL_DAY - 1 && !state.done;
  // the morning view of the store: yesterday's shelves, today's delivery waiting in the stockroom
  const preview = useMemo(() => startLive(state, plan, 'player'), [state, plan]);
  const view = live ?? preview;

  // while the store is open, the side panel follows the live counts
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setTick((k) => k + 1), 250);
    return () => clearInterval(id);
  }, [live]);

  const open = (p: Plan, isAuto: boolean) => {
    if (live || state.done) return;
    setPlan(p);
    setLive(startLive(state, p, isAuto ? (smart ? 'smart' : 'habit') : 'player'));
  };
  const endDay = useCallback(() => {
    setLive((L) => {
      if (!L) return L;
      const next = finishLive(L);
      setState(next);
      setPlan(emptyPlan());
      if (next.done) { setAuto(false); onFinish(totals(next)); }
      return null;
    });
  }, [onFinish]);
  // auto-play: open the next day with the round's ordering and worker policy
  useEffect(() => {
    if (auto && !live && !state.done) {
      const id = setTimeout(() => open(smart ? aiPlan(state) : habitPlan(state), true), 600);
      return () => clearTimeout(id);
    }
  });
  const pick = (id: string) => {
    const L = live ?? null;
    if (!L) { setNote('Open the store first — then send the worker to restock.'); return; }
    if (L.policy !== 'player') { setNote('Auto-play is running the worker.'); return; }
    if (!backUnits(L, id)) { setNote(`No ${ITEMS.find((i) => i.id === id)!.name} in the stockroom — order more tomorrow.`); return; }
    if (shelfUnits(L, id) >= SHELF_CAP[id] && !L.items[id].back.some((b) => (b.expiresDay ?? 99) < Math.min(99, ...L.items[id].shelf.map((x) => x.expiresDay ?? 99)))) { setNote('That shelf is already full.'); return; }
    if (requestRestock(L, id)) setNote(null);
    setTick((k) => k + 1);
  };
  const hint = live && smart && live.policy === 'player' ? smartTask(live) : null;
  const last = state.log[state.log.length - 1];
  const dayLoss = last ? ITEMS.reduce((n, it) => n + last.missed[it.id] * it.price, 0) : 0;
  const dayWaste = last ? ITEMS.reduce((n, it) => n + last.wasted[it.id] * it.cost, 0) : 0;
  const served = live ? live.customers.filter((c) => c.paid).length : 0;
  const leftEmpty = live ? live.customers.filter((c) => c.got === 0 && (c.phase === 'leaving' || c.phase === 'gone')).length : 0;

  return (
    <>
      <section className={cx('flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl4 px-5 py-4 text-white', smart ? 'bg-green' : 'bg-[#4A3426]')}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">{smart ? 'Round 2 · SmartShelf way' : 'Round 1 · the legacy way'}</p>
          <h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">
            {state.done ? 'Week over' : `${DAYS[state.day]}${state.day === FESTIVAL_DAY ? ' — Diwali eve 🪔' : state.day === FESTIVAL_DAY - 1 ? ' — festival rush starts' : ''}`}
          </h1>
          <p className="text-[13.5px] text-white/75">{smart ? 'SmartShelf suggests the morning order and tells you which shelf to restock next. You decide.' : 'No predictions. Order by habit, restock by what the shelves look like.'}</p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {[[rupees(t.profit), 'profit so far'], [rupees(t.lostSales), 'lost to stock-outs'], [rupees(t.wastedValue), 'thrown away']].map(([v, k]) => (
            <div key={k}><dt className="sr-only">{k}</dt><dd className="font-display text-[22px] font-extrabold tabular-nums">{v}</dd><p className="text-[11.5px] text-white/70">{k}</p></div>
          ))}
        </dl>
        <div className="flex w-full gap-1" aria-label={`Day ${Math.min(state.day + 1, 7)} of 7`}>
          {DAYS.map((d, i) => <span key={d} className={cx('h-1.5 flex-1 rounded-full', i < state.day ? 'bg-yellow' : i === state.day && !state.done ? 'bg-white' : 'bg-white/20')} />)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <Card className="relative self-start overflow-hidden p-0 xl:sticky xl:top-24">
          <div className="h-[52vh] min-h-[320px] xl:h-[min(680px,calc(100vh-140px))]">
            <Suspense fallback={<div className="grid h-full place-items-center bg-green-dark text-white/70">Opening the store…</div>}>
              <Store3D live={view} running={!!live} speed={speed} festive={festive} hint={hint?.item ?? null} onPick={pick} onEnd={endDay} />
            </Suspense>
          </div>
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            {live ? (
              <span className="rounded-xl bg-white/95 px-3 py-2 text-[13px] font-bold shadow-lift">🕘 {clockOf(live.time)} · {live.time < DAY_LEN ? 'open' : 'closing — last customers'} · {served} served{leftEmpty ? <span className="text-red-ink"> · {leftEmpty} left empty-handed</span> : null}</span>
            ) : last && !state.done ? (
              <span className="rounded-xl bg-white/95 px-3 py-2 text-[13px] shadow-lift"><b>{DAYS[last.day]}:</b> sold {ITEMS.reduce((n, it) => n + last.sold[it.id], 0)} · <span className={dayLoss ? 'font-bold text-red-ink' : ''}>missed {rupees(dayLoss)}</span> · <span className={dayWaste ? 'font-bold text-orange' : ''}>wasted {rupees(dayWaste)}</span></span>
            ) : null}
          </div>
          {live && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-xl bg-white/95 p-1 shadow-lift" role="group" aria-label="Speed">
              {[1, 2, 4].map((k) => <button key={k} onClick={() => setSpeed(k)} aria-pressed={speed === k} className={cx('h-8 min-w-9 rounded-lg px-2 text-[12.5px] font-extrabold', speed === k ? 'bg-green text-white' : 'text-ink-2 hover:bg-cream-deep')}>{k}×</button>)}
              <button onClick={() => { runToEnd(live); setTick((k) => k + 1); }} className="h-8 rounded-lg px-2 text-[12.5px] font-extrabold text-ink-2 hover:bg-cream-deep" title="Finish the day instantly">⏭ Finish day</button>
            </div>
          )}
          <p className="pointer-events-none absolute bottom-2 left-3 right-3 text-right text-[11.5px] font-semibold text-white/75">Click a shelf or its number to restock · orange sticker = expires today · red ! = left without it · drag to look around</p>
        </Card>

        {state.done ? (
          <RoundResult round={round} t={t} onNext={onNext} onExit={onExit} />
        ) : live ? (
          <Card className="flex flex-col p-4">
            <Kicker>You’re the worker · {DAYS[state.day]}</Kicker>
            <p className="text-[13px] text-ink-muted">{live.policy === 'player' ? 'Send the worker to refill shelves from the stockroom. Restocking rotates stock: the oldest date goes to the front so it sells first.' : `Auto-play: the worker restocks ${smart ? 'the SmartShelf way (early, oldest date in front)' : 'by habit (only when a shelf is empty, newest cartons in front)'}.`}</p>
            {hint && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-green-dark p-3 text-white">
                <span className="text-[20px]" aria-hidden>🧠</span>
                <p className="min-w-0 flex-1 text-[13px]"><b className="text-yellow">SmartShelf: restock {ITEMS.find((i) => i.id === hint.item)!.name}</b><br /><span className="text-white/75">{hint.why}</span></p>
                <button onClick={() => pick(hint.item)} className="shrink-0 rounded-xl bg-yellow px-3 py-2 text-[13px] font-extrabold text-ink">Do it</button>
              </div>
            )}
            {note && <p role="status" className="mt-3 rounded-xl bg-cream-deep px-3 py-2 text-[13px] font-semibold text-ink-2">{note}</p>}
            <p className="mt-3 text-[12.5px] font-bold text-ink-2">
              Worker: {live.worker.phase === 'idle' ? 'waiting at the stockroom' : live.worker.phase === 'back' ? 'walking back to the stockroom' : `${live.worker.phase === 'stocking' ? 'restocking' : 'carrying a carton to'} ${ITEMS.find((i) => i.id === live.worker.task)?.name}`}
              {live.tasks.length > 0 && <span className="text-ink-muted"> · next: {live.tasks.map((id) => ITEMS.find((i) => i.id === id)!.name.split(' ')[0]).join(', ')}</span>}
            </p>
            <ul className="mt-2 flex-1 divide-y divide-line">
              {ITEMS.map((it) => {
                const sh = shelfUnits(live, it.id), bk = backUnits(live, it.id), cap = SHELF_CAP[it.id];
                const expShelf = expiringOn(live.items[it.id].shelf, live.day), expBack = expiringOn(live.items[it.id].back, live.day);
                const queued = live.tasks.includes(it.id) || live.worker.task === it.id;
                return (
                  <li key={it.id} className={cx('flex items-center gap-3 py-2', hint?.item === it.id && 'rounded-xl bg-yellow-soft/70 px-2')}>
                    <ProductArt product={it} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{it.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-cream-deep"><span className={cx('block h-full rounded-full transition-all', sh === 0 ? 'bg-red' : sh <= cap * 0.35 ? 'bg-orange' : 'bg-green')} style={{ width: `${(sh / cap) * 100}%` }} /></span>
                        <span className="text-[12px] font-bold tabular-nums">{sh}/{cap}</span>
                        <span className="text-[12px] text-ink-muted tabular-nums">+{bk} in back</span>
                      </div>
                      {(expShelf > 0 || expBack > 0) && <p className="text-[11.5px] font-bold text-orange">{expShelf + expBack} expire today{expBack ? ` (${expBack} hidden in the back!)` : ''}</p>}
                    </div>
                    <button disabled={live.policy !== 'player' || queued || bk === 0} onClick={() => pick(it.id)} className="h-9 shrink-0 rounded-xl bg-green px-3 text-[12.5px] font-extrabold text-white disabled:bg-cream-deep disabled:text-ink-muted">{queued ? 'Queued' : bk === 0 ? 'None in back' : 'Restock'}</button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[12px] text-ink-muted">Today: {rupees(live.revenue)} taken at the counter.</p>
          </Card>
        ) : (
          <Card className="flex flex-col p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Kicker>Morning plan · {DAYS[state.day]}</Kicker>
                <p className="text-[13px] text-ink-muted">Orders arrive in the stockroom before opening. Fresh items expire — restock so the oldest sells first.</p>
              </div>
              {smart
                ? <Button size="sm" tone="primary" onClick={() => setPlan(aiPlan(state))}>✓ Apply all AI moves</Button>
                : <Button size="sm" onClick={() => setPlan(habitPlan(state))}>Use my usual habit</Button>}
            </div>
            <ul className="mt-3 flex-1 divide-y divide-line">
              {ITEMS.map((it) => {
                const st = state.items[it.id];
                const stock = stockOf(st);
                const exp = expiringOn(batchesOf(st), state.day);
                const m = moves[it.id];
                const q = plan.order[it.id];
                return (
                  <li key={it.id} className="py-2.5">
                    <div className="flex items-center gap-3">
                      <ProductArt product={it} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{it.name}</p>
                        <p className="text-[12px] text-ink-muted">
                          <b className={stock === 0 ? 'text-red-ink' : 'text-ink'}>{units(st.shelf)} on shelf · {units(st.back)} in back</b>
                          {exp > 0 && <span className="font-bold text-orange"> · {exp} expire today</span>}
                          <span> · case {it.caseSize}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1" role="group" aria-label={`Order ${it.name}`}>
                        <button disabled={q === 0} onClick={() => setPlan((p) => ({ ...p, order: { ...p.order, [it.id]: Math.max(0, q - it.caseSize) } }))} className="grid h-8 w-8 place-items-center rounded-lg bg-cream-deep font-bold disabled:opacity-40" aria-label="One case less">−</button>
                        <span className="w-10 text-center text-[14px] font-extrabold tabular-nums">{q ? `+${q}` : '0'}</span>
                        <button onClick={() => setPlan((p) => ({ ...p, order: { ...p.order, [it.id]: q + it.caseSize } }))} className="grid h-8 w-8 place-items-center rounded-lg bg-green font-bold text-white" aria-label="One case more">+</button>
                        <button onClick={() => setPlan((p) => ({ ...p, discount: { ...p.discount, [it.id]: !p.discount[it.id] } }))} aria-pressed={plan.discount[it.id]} className={cx('ml-1 h-8 rounded-lg px-2 text-[11.5px] font-extrabold', plan.discount[it.id] ? 'bg-yellow text-ink' : 'bg-cream-deep text-ink-muted')}>15% off</button>
                      </div>
                    </div>
                    {smart && m && (
                      <div className="mt-1.5 flex items-start gap-2 rounded-xl bg-cream-deep/70 px-2.5 py-1.5">
                        <ActionBadge action={m.action} size="sm" />
                        <p className="min-w-0 flex-1 text-[12px] leading-snug"><b>{m.headline}</b> <span className="text-ink-muted">{m.why}</span></p>
                        {(m.order > 0 || m.discount) && (
                          <button onClick={() => setPlan((p) => ({ order: { ...p.order, [it.id]: m.order }, discount: { ...p.discount, [it.id]: m.discount } }))} className="shrink-0 rounded-lg bg-green px-2 py-1 text-[11.5px] font-bold text-white">Use</button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="primary" size="lg" className="flex-1" onClick={() => open(plan, false)}>▶ Open the store — I’ll restock</Button>
              <Button size="lg" disabled={auto} onClick={() => { setAuto(true); setSpeed(4); }}>{smart ? 'Auto-play: follow the AI' : 'Auto-play: by habit'}</Button>
            </div>
            <button onClick={onExit} className="mt-2 self-start text-[12.5px] font-semibold text-ink-muted underline">Leave game</button>
          </Card>
        )}
      </div>
    </>
  );
}

function RoundResult({ round, t, onNext, onExit }: { round: Round; t: Totals; onNext: () => void; onExit: () => void }) {
  return (
    <Card className="p-5">
      <Kicker>{round === 'legacy' ? 'Round 1 result · legacy way' : 'Round 2 result · SmartShelf way'}</Kicker>
      <p className="mt-1 font-display text-[40px] font-extrabold leading-none tabular-nums">{rupees(t.profit)}</p>
      <p className="text-[13px] text-ink-muted">profit for the week, after wastage</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {[[rupees(t.lostSales), `lost to stock-outs (${t.missedUnits} customers' items)`, 'text-red-ink'], [rupees(t.wastedValue), `thrown away (${t.wastedUnits} units expired)`, 'text-orange'], [rupees(t.stuckValue), 'cash stuck in dead stock', 'text-ink'], [rupees(t.revenue), 'sales', 'text-green']].map(([v, k, c]) => (
          <div key={k} className="rounded-2xl bg-cream-deep/70 p-3"><dd className={cx('font-display text-[22px] font-extrabold tabular-nums', c)}>{v}</dd><dt className="text-[12px] text-ink-muted">{k}</dt></div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button tone="primary" size="lg" onClick={onNext}>{round === 'legacy' ? '▶ Play the same week with SmartShelf' : 'Compare both weeks →'}</Button>
        <Button size="lg" onClick={onExit}>Leave</Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- comparison
function Compare({ results, onReplay, onQuiz }: { results: Partial<Record<Round, Totals>>; onReplay: () => void; onQuiz: () => void }) {
  const a = results.legacy, b = results.smart;
  if (!a || !b) return <Card className="p-6"><p>Play both rounds first.</p><Button className="mt-3" tone="primary" onClick={onReplay}>Start</Button></Card>;
  const saved = (a.lostSales + a.wastedValue) - (b.lostSales + b.wastedValue);
  const rows: [string, number, number, boolean][] = [
    ['Profit after wastage', a.profit, b.profit, true],
    ['Lost to stock-outs', a.lostSales, b.lostSales, false],
    ['Thrown away (expired)', a.wastedValue, b.wastedValue, false],
    ['Cash stuck in dead stock', a.stuckValue, b.stuckValue, false],
  ];
  return (
    <>
      <section className="rounded-xl4 bg-green-dark px-6 py-8 text-white sm:px-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">Same week · same customers · two ways</p>
        <h1 className="mt-2 font-display text-[32px] font-extrabold leading-tight sm:text-[46px]">
          {saved > 0 ? <>SmartShelf saved <span className="text-yellow">{rupees(saved)}</span> in one week.</> : <>Your legacy week did as well — impressive.</>}
        </h1>
        <p className="mt-2 max-w-2xl text-white/75">Money lost to empty shelves and expired stock: {rupees(a.lostSales + a.wastedValue)} the legacy way vs {rupees(b.lostSales + b.wastedValue)} with SmartShelf. Over a year of weeks like this, that is roughly {rupees(Math.max(0, saved) * 52)} for one shop.</p>
      </section>
      <Card className="p-5">
        <ul className="space-y-5">
          {rows.map(([label, x, y, higherBetter]) => {
            const max = Math.max(x, y, 1);
            const better = higherBetter ? y > x : y < x;
            return (
              <li key={label}>
                <div className="flex items-baseline justify-between"><p className="font-bold">{label}</p>{better && <span className="text-[12px] font-extrabold text-green">SmartShelf better</span>}</div>
                {[['Legacy', x, 'bg-[#8B6B55]'], ['SmartShelf', y, 'bg-green']].map(([n, v, c]) => (
                  <div key={n as string} className="mt-1.5 flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[12.5px] text-ink-muted">{n}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-cream-deep">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(2, ((v as number) / max) * 100)}%` }} transition={{ duration: 0.8 }} className={cx('h-full rounded-lg', c as string)} />
                    </div>
                    <span className="w-24 shrink-0 text-right font-extrabold tabular-nums">{rupees(v as number)}</span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-[12.5px] text-ink-muted">Simulation of 8 products over one week with the same seeded customer demand in both rounds. Recommendations come from the same engine the app uses; festival orders use last year’s festival lift. Figures are illustrative, not field data.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button tone="primary" onClick={onReplay}>Play again</Button><Button onClick={onQuiz}>⚡ Beat the AI</Button></div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- Beat the AI
const CHOICES: [Action, string][] = [['RESTOCK', 'Restock'], ['SELL_SOON', 'Sell soon'], ['HOLD', 'Hold']];
const QUESTIONS = 8, SECONDS = 10;

function pickQuestions(): Analysis[] {
  const t = today();
  const all = analyseStore(demoProducts(t).map((p, i) => ({ ...p, id: `q${i}` })), DEFAULT_SETTINGS, t).products;
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const by = (a: Action) => shuffle(all.filter((x) => x.recommendation.action === a));
  return shuffle([...by('RESTOCK').slice(0, 3), ...by('SELL_SOON').slice(0, 3), ...by('HOLD').slice(0, 2)]).slice(0, QUESTIONS);
}

function Quiz({ onExit }: { onExit: () => void }) {
  const [qs, setQs] = useState(pickQuestions);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<Action | 'timeout' | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem('bl.quiz.best') || 0); } catch { return 0; } });
  const q = qs[i];
  const done = i >= qs.length;

  useEffect(() => {
    if (done || answer) return;
    if (left <= 0) { setAnswer('timeout'); return; }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left, answer, done]);
  useEffect(() => {
    if (done && score > best) {
      setBest(score);
      try { localStorage.setItem('bl.quiz.best', String(score)); } catch { /* private mode */ }
    }
  }, [done, score, best]);

  const choose = (a: Action) => {
    if (answer) return;
    setAnswer(a);
    if (a === q.recommendation.action) setScore((s) => s + 1);
  };
  const next = () => { setI((n) => n + 1); setAnswer(null); setLeft(SECONDS); };
  const restart = () => { setQs(pickQuestions()); setI(0); setScore(0); setAnswer(null); setLeft(SECONDS); };

  if (done) {
    return (
      <section className="rounded-xl4 bg-green-dark px-6 py-10 text-center text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow">Beat the AI · result</p>
        <p className="mt-2 font-display text-[64px] font-extrabold leading-none">{score}/{qs.length}</p>
        <p className="mt-2 text-white/80">{score === qs.length ? 'You think like the engine. Now imagine doing this for 300 products every morning.' : score >= qs.length / 2 ? 'Good instincts — the engine catches the rest, every morning, for every product.' : 'Tricky, right? That is exactly why shopkeepers need the next move spelled out.'}</p>
        <p className="mt-1 text-[13px] text-white/60">Best on this device: {best}/{qs.length}</p>
        <div className="mt-6 flex justify-center gap-3"><Button tone="accent" size="lg" onClick={restart}>Play again</Button><Button tone="light" size="lg" onClick={onExit}>Back</Button></div>
      </section>
    );
  }
  const r = q.recommendation;
  const correct = answer === r.action;
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Kicker>Beat the AI · {i + 1} of {qs.length} · score {score}</Kicker>
        <button onClick={onExit} className="text-[13px] font-semibold text-ink-muted underline">Leave</button>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="h-1.5 bg-cream-deep"><motion.div key={i} initial={{ width: '100%' }} animate={{ width: answer ? undefined : '0%' }} transition={{ duration: SECONDS, ease: 'linear' }} className={cx('h-full', left <= 3 ? 'bg-red' : 'bg-yellow')} /></div>
        <div className="flex items-center gap-4 p-5">
          <ProductArt product={q.product} size={88} />
          <div className="min-w-0">
            <p className="font-display text-[24px] font-extrabold leading-tight">{q.product.name}</p>
            <p className="text-[13px] text-ink-muted">{q.product.category} · {left}s left</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {[[`${q.product.stock}`, 'in stock'], [`${fmt1(q.demand.daily)}/day`, 'selling'], [`${q.product.safetyStock}`, 'minimum safe'], [q.expiry.daysToExpiry === null ? '—' : q.expiry.daysToExpiry === 0 ? 'today' : `${q.expiry.daysToExpiry} days`, 'expires in']].map(([v, k]) => (
            <div key={k} className="bg-surface p-3"><dd className="font-display text-[22px] font-extrabold tabular-nums">{v}</dd><dt className="text-[12px] text-ink-muted">{k}</dt></div>
          ))}
        </dl>
        <div className="grid grid-cols-3 gap-2 p-4">
          {CHOICES.map(([a, label]) => (
            <button key={a} onClick={() => choose(a)} disabled={!!answer}
              className={cx('h-14 rounded-2xl text-[15px] font-extrabold transition', !answer && 'bg-cream-deep hover:bg-yellow', answer && a === r.action && 'bg-green text-white', answer && a === answer && a !== r.action && 'bg-red text-white', answer && a !== answer && a !== r.action && 'bg-cream-deep opacity-50')}>
              {label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {answer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-line bg-cream-deep/50 px-5 py-4">
              <p className={cx('font-extrabold', correct ? 'text-green' : 'text-red-ink')}>{answer === 'timeout' ? '⏱ Time’s up.' : correct ? '✓ Same call as the AI.' : '✗ The AI chose differently.'}</p>
              <div className="mt-2 flex items-center gap-2"><ActionBadge action={r.action} /><p className="font-bold">{r.headline}</p></div>
              <ul className="mt-2 space-y-0.5 text-[13.5px] text-ink-2">{r.reasons.slice(0, 3).map((x) => <li key={x.text}>• {x.text}</li>)}</ul>
              <p className="mt-2 text-[13px] text-ink-muted"><b>If ignored:</b> {r.ifIgnored}</p>
              <Button tone="primary" className="mt-3" onClick={next}>{i + 1 < qs.length ? 'Next product →' : 'See score'}</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </section>
  );
}

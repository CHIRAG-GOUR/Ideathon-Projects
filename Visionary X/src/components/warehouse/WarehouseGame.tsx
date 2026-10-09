'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  CheckCircle2,
  Gamepad2,
  Keyboard,
  LayoutGrid,
  Loader2,
  MousePointerClick,
  RotateCcw,
  ScanLine,
  Star,
  AlertTriangle,
  PartyPopper,
  PackageCheck,
} from 'lucide-react';
import { useShop, useStockItems, summarize, POINTS_PER_PLACEMENT } from '@/lib/store';
import { ZONES, ZONE_ORDER, ZoneId, getProductById, getRecommendedZone, formatExpiry, TOTAL_AT_RISK_VALUE } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfLifeBar } from '@/components/ui/ShelfLifeBar';
import { Barcode } from '@/components/ui/Barcode';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useWarehouseGame, WarehouseGame as Game } from './useWarehouseGame';
import type { Nearby } from './WarehouseScene3D';
import { cn, formatCurrency } from '@/lib/utils';

const WarehouseScene3D = dynamic(() => import('./WarehouseScene3D'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-ink-muted">
      <Loader2 className="h-5 w-5 animate-spin" /> Unlocking the warehouse…
    </div>
  ),
});

type Mode = '3d' | 'simple';

export function WarehouseGame() {
  const items = useStockItems();
  const summary = summarize(items);
  const points = useShop((s) => s.points);
  const resetShop = useShop((s) => s.resetShop);
  const game = useWarehouseGame();
  const [mode, setMode] = useState<Mode>('3d');

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            <Gamepad2 className="h-4 w-4" /> Mission
          </p>
          <h1 className="display-xl mt-2 text-4xl sm:text-5xl">Organize Today’s Stock</h1>
          <p className="mt-2 max-w-xl text-lg text-ink-soft">
            You’re the shopkeeper. Find each box, scan it, read the expiry and put it on the right shelf.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-cream-200 p-1" role="tablist" aria-label="View">
            {(
              [
                ['3d', '3D Warehouse', Gamepad2],
                ['simple', 'Simple shelves', LayoutGrid],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition', mode === m ? 'bg-white text-leaf-700 shadow-soft' : 'text-ink-soft')}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <button onClick={resetShop} className="btn btn-ghost btn-sm" title="Put all products back in the delivery area">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {mode === '3d' ? <Game3D game={game} /> : <SimpleShelves game={game} />}

      {/* Mission checklist — the same six products as the scanner and My Stock */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => {
          const state = it.progress.placedCorrectly ? 'placed' : game.carryingId === it.id ? 'carrying' : it.progress.scanned ? 'scanned' : 'waiting';
          return (
            <div
              key={it.id}
              className={cn(
                'flex items-center gap-2 rounded-2xl p-2.5 ring-1 ring-inset transition-colors',
                state === 'placed' ? 'bg-leaf-50 ring-leaf-200' : state === 'carrying' ? 'bg-mango-50 ring-mango-300' : 'bg-white ring-cream-300'
              )}
            >
              <ProductArt id={it.id} className="h-10 w-10 flex-none" />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-ink">{it.name}</p>
                <p className="text-xs leading-tight text-ink-muted">
                  {state === 'placed'
                    ? `✓ ${ZONES[it.recommendedZone].label}`
                    : state === 'carrying'
                    ? 'In your hands'
                    : state === 'scanned'
                    ? 'Scanned'
                    : 'In delivery'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-ink-muted">
        {summary.organized}/{summary.total} organised · {points} points · products scanned with the real camera show up here too.
      </p>

      <CompletionModal game={game} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3D mode                                                             */
/* ------------------------------------------------------------------ */

function Game3D({ game }: { game: Game }) {
  const items = useStockItems();
  const summary = summarize(items);
  const points = useShop((s) => s.points);
  const input = useRef({ x: 0, z: 0 });
  const action = useRef(false);
  const keys = useRef(new Set<string>());
  const [nearby, setNearby] = useState<Nearby>(null);
  const [helpOpen, setHelpOpen] = useState(true);

  const syncKeys = useCallback(() => {
    const k = keys.current;
    input.current.x = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
    input.current.z = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0);
  }, []);

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
    };
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (map[e.code]) {
        e.preventDefault();
        keys.current.add(map[e.code]);
        syncKeys();
        setHelpOpen(false);
      } else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        if (e.code !== 'KeyE') e.preventDefault();
        action.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (map[e.code]) {
        keys.current.delete(map[e.code]);
        syncKeys();
      }
    };
    const blur = () => {
      keys.current.clear();
      syncKeys();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [syncKeys]);

  const carrying = game.carryingId ? getProductById(game.carryingId) : null;
  const nearbyProduct = nearby?.kind === 'box' ? getProductById(nearby.id) : null;

  let prompt: { text: React.ReactNode; button?: string } = { text: 'Walk to a box — or just click it — to scan it.' };
  if (game.scanningId) prompt = { text: 'Scanning…' };
  else if (carrying && nearby?.kind === 'pad') prompt = { text: <>Put {carrying.name} on the <strong>{ZONES[nearby.zone].label.toUpperCase()}</strong> shelf?</>, button: 'Place' };
  else if (carrying) prompt = { text: <>Carry <strong>{carrying.name}</strong> to the right shelf — walk there or click the shelf.</> };
  else if (nearbyProduct) prompt = { text: <>A box of <strong>{nearbyProduct.name}</strong>. Scan it?</>, button: 'Scan' };

  return (
    <div className="relative overflow-hidden rounded-4xl bg-cream-100 shadow-soft ring-1 ring-inset ring-cream-300">
      <div className="relative h-[68vh] min-h-[440px] w-full sm:h-[600px]" data-testid="warehouse-3d">
        <WarehouseScene3D
          items={items}
          carryingId={game.carryingId}
          scanningId={game.scanningId}
          lastPlaced={game.lastPlaced}
          controls={{ input, action }}
          onNearbyChange={setNearby}
          onScan={game.scan}
          onPlace={game.place}
        />

        {/* Mission card */}
        <div className="pointer-events-none absolute left-3 top-3 rounded-3xl bg-white/95 p-3 shadow-soft sm:left-4 sm:top-4 sm:p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Today’s stock</p>
          <p className="font-display text-2xl font-semibold leading-tight text-ink">
            {summary.organized}/{summary.total} <span className="text-base font-sans font-bold text-ink-muted">organised</span>
          </p>
          <div className="mt-2 flex gap-1">
            {items.map((i) => (
              <span key={i.id} className="h-2 w-5 rounded-full" style={{ background: i.progress.placedCorrectly ? ZONES[i.recommendedZone].color : '#EFE1C6' }} />
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-sm font-extrabold text-mango-700">
            <Star className="h-4 w-4 fill-mango-400 text-mango-500" /> <AnimatedNumber value={points} /> pts
          </p>
        </div>

        {/* Controls help */}
        <div className="absolute right-3 top-3 hidden sm:right-4 sm:top-4 md:block">
          <AnimatePresence initial={false}>
            {helpOpen ? (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="w-60 rounded-3xl bg-white/95 p-4 text-sm shadow-soft">
                <p className="font-bold text-ink">How to play</p>
                <ul className="mt-2 space-y-1.5 text-ink-soft">
                  <li className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-leaf-600" /> <kbd className="font-mono text-xs">WASD</kbd> / arrows to walk
                  </li>
                  <li className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-leaf-600" /> <kbd className="font-mono text-xs">E</kbd> to scan & place
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-leaf-600" /> Or click boxes & shelves
                  </li>
                </ul>
                <button onClick={() => setHelpOpen(false)} className="btn btn-ghost btn-sm mt-2 w-full">
                  Got it
                </button>
              </motion.div>
            ) : (
              <button onClick={() => setHelpOpen(true)} className="btn btn-secondary btn-sm">
                <Keyboard className="h-4 w-4" /> Controls
              </button>
            )}
          </AnimatePresence>
        </div>

        <FeedbackToast game={game} />

        {/* Scan card */}
        <AnimatePresence>
          {game.scanCardId && <ScanCard key={game.scanCardId} productId={game.scanCardId} onClose={game.dismissScanCard} />}
        </AnimatePresence>

        {/* Prompt + action */}
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
          <DPad input={input} />
          <motion.div layout className="mx-auto flex max-w-md items-center gap-3 rounded-full bg-white/95 py-2 pl-5 pr-2 text-sm text-ink shadow-lift" aria-live="polite">
            <span className="py-1.5">{prompt.text}</span>
            {prompt.button && (
              <button onClick={() => (action.current = true)} className="btn btn-primary btn-sm flex-none" data-testid="game-action">
                {prompt.button === 'Scan' ? <ScanLine className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                {prompt.button}
                <kbd className="hidden rounded bg-white/20 px-1.5 font-mono text-[10px] md:inline">E</kbd>
              </button>
            )}
          </motion.div>
          <div className="hidden w-[132px] md:block" />
        </div>
      </div>
    </div>
  );
}

function DPad({ input }: { input: React.MutableRefObject<{ x: number; z: number }> }) {
  const hold = (x: number, z: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      input.current.x = x;
      input.current.z = z;
    },
    onPointerUp: () => {
      input.current.x = 0;
      input.current.z = 0;
    },
    onPointerCancel: () => {
      input.current.x = 0;
      input.current.z = 0;
    },
  });
  const btn = 'flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-ink shadow-soft active:bg-leaf-100 select-none touch-none';
  return (
    <div className="grid w-[132px] flex-none grid-cols-3 grid-rows-3 gap-0.5 md:hidden" aria-label="Walk controls">
      <span />
      <button className={btn} aria-label="Walk up" {...hold(0, -1)}>
        <ArrowUp className="h-5 w-5" />
      </button>
      <span />
      <button className={btn} aria-label="Walk left" {...hold(-1, 0)}>
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span />
      <button className={btn} aria-label="Walk right" {...hold(1, 0)}>
        <ArrowRight className="h-5 w-5" />
      </button>
      <span />
      <button className={btn} aria-label="Walk down" {...hold(0, 1)}>
        <ArrowDown className="h-5 w-5" />
      </button>
      <span />
    </div>
  );
}

function ScanCard({ productId, onClose }: { productId: string; onClose: () => void }) {
  const product = getProductById(productId);
  if (!product) return null;
  const zone = getRecommendedZone(product);
  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="absolute right-3 top-[132px] w-[min(300px,calc(100%-24px))] rounded-3xl bg-white p-4 shadow-float sm:right-4 md:top-4"
      data-testid="scan-card"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-extrabold text-leaf-700">
          <CheckCircle2 className="h-4 w-4" /> Scanned
        </span>
        <button onClick={onClose} className="text-xs font-bold text-ink-muted hover:text-ink">
          Hide
        </button>
      </div>
      <div className="mt-2 flex justify-center rounded-2xl bg-white ring-1 ring-cream-300">
        <Barcode value={product.barcode} height={40} moduleWidth={1.5} className="w-full max-w-[190px]" showValue />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProductArt id={product.id} className="h-14 w-14 flex-none" />
        <div>
          <p className="font-display text-2xl font-semibold uppercase leading-none tracking-wide text-ink">{product.name}</p>
          <p className="mt-1 text-sm font-bold" style={{ color: ZONES[zone].ink }}>
            {formatExpiry(product.daysUntilExpiry)}
          </p>
        </div>
      </div>
      <ShelfLifeBar days={product.daysUntilExpiry} className="mt-3" showLabel={false} />
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl p-2.5" style={{ background: ZONES[zone].soft }}>
        <span className="text-xs font-bold" style={{ color: ZONES[zone].ink }}>
          Recommendation
        </span>
        <ZoneBadge zone={zone} size="sm" />
      </div>
      <p className="mt-2 text-xs text-ink-muted">Now carry it to the {ZONES[zone].label.toUpperCase()} shelf.</p>
    </motion.div>
  );
}

function FeedbackToast({ game }: { game: Game }) {
  const f = game.feedback;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center px-3 md:top-4">
      <AnimatePresence>
        {f && (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn('flex items-center gap-3 rounded-3xl px-5 py-3 shadow-float', f.correct ? 'bg-leaf-600 text-white' : 'bg-mango-100 text-ink ring-1 ring-mango-300')}
            role="status"
            data-testid="game-feedback"
          >
            {f.correct ? <CheckCircle2 className="h-6 w-6 flex-none" /> : <AlertTriangle className="h-6 w-6 flex-none text-mango-600" />}
            <div>
              <p className="font-extrabold">{f.correct ? `✓ ${f.title}` : f.title}</p>
              <p className={cn('text-sm', f.correct ? 'text-leaf-50' : 'text-ink-soft')}>{f.message}</p>
            </div>
            {f.correct && f.pointsEarned > 0 && (
              <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
                +{f.pointsEarned} points
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple mode (2D shelves) — same rules, tap-only                      */
/* ------------------------------------------------------------------ */

function SimpleShelves({ game }: { game: Game }) {
  const items = useStockItems();
  const waiting = items.filter((i) => !i.progress.placedCorrectly);
  const carrying = game.carryingId ? getProductById(game.carryingId) : null;

  return (
    <div className="relative rounded-4xl bg-cream-100 p-4 ring-1 ring-inset ring-cream-300 sm:p-6" data-testid="simple-shelves">
      <FeedbackToast game={game} />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-soft">
            <Box className="h-4 w-4 text-soil-500" /> New delivery · tap a box to scan it
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {waiting.map((i) => (
              <motion.button
                layoutId={`simple-${i.id}`}
                key={i.id}
                onClick={() => !game.carryingId && !game.scanningId && game.scan(i.id)}
                disabled={Boolean(game.carryingId && game.carryingId !== i.id)}
                className={cn(
                  'relative flex flex-col items-center rounded-2xl bg-soil-200 p-2 text-xs font-bold text-soil-700 shadow-soft transition disabled:opacity-40',
                  game.carryingId === i.id && 'ring-4 ring-mango-400',
                  game.scanningId === i.id && 'animate-pulse'
                )}
                data-testid={`simple-box-${i.id}`}
              >
                <span className="mb-1 h-1.5 w-8 rounded-full bg-cream-100/80" />
                {i.progress.scanned ? <ProductArt id={i.id} className="h-12 w-12" /> : <span className="flex h-12 w-12 items-center justify-center text-2xl">📦</span>}
                {i.progress.scanned ? i.name : 'Box'}
              </motion.button>
            ))}
            {waiting.length === 0 && <p className="col-span-full py-6 text-center text-sm font-bold text-leaf-700">Delivery area is empty — everything is on a shelf! 🎉</p>}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {ZONE_ORDER.map((zone) => {
              const z = ZONES[zone];
              const onShelf = items.filter((i) => i.progress.placedCorrectly && i.progress.zone === zone);
              return (
                <div key={zone} className="rounded-3xl bg-white p-4 shadow-soft" style={{ boxShadow: `inset 0 4px 0 ${z.color}` }}>
                  <div className="flex items-center justify-between">
                    <ZoneBadge zone={zone} />
                    <span className="text-xs text-ink-muted">{z.rule}</span>
                  </div>
                  <div className="mt-3 flex min-h-[72px] items-end gap-1 border-b-8 border-soil-300 pb-1">
                    {onShelf.map((i) => (
                      <motion.div layoutId={`simple-${i.id}`} key={i.id} title={i.name}>
                        <ProductArt id={i.id} className="h-16 w-16" />
                      </motion.div>
                    ))}
                  </div>
                  <button
                    disabled={!carrying}
                    onClick={() => game.place(zone)}
                    className="btn btn-md mt-3 w-full text-white disabled:opacity-30"
                    style={{ background: z.color }}
                    data-testid={`place-${zone}`}
                  >
                    {carrying ? `Put ${carrying.name} here` : 'Scan a box first'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait">
            {game.scanCardId ? (
              <div key={game.scanCardId} className="relative [&>div]:static [&>div]:w-full">
                <ScanCard productId={game.scanCardId} onClose={game.dismissScanCard} />
              </div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-400 p-6 text-center text-sm text-ink-muted">
                <ScanLine className="mb-2 h-6 w-6 text-leaf-500" />
                Scan a box to see its barcode, expiry and recommended shelf.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Completion                                                          */
/* ------------------------------------------------------------------ */

function CompletionModal({ game }: { game: Game }) {
  const items = useStockItems();
  const summary = summarize(items);
  const points = useShop((s) => s.points);
  const resetShop = useShop((s) => s.resetShop);

  return (
    <AnimatePresence>
      {game.showComplete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <motion.div className="absolute inset-0 bg-[#3b2f1f]/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-5xl bg-background text-center shadow-float"
            data-testid="completion"
          >
            <div className="bg-leaf-50 px-6 pb-6 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft">
                <PartyPopper className="h-8 w-8 text-mango-500" />
              </div>
              <h2 id="done-title" className="display-xl mt-4 text-4xl">
                🎉 Warehouse Organized!
              </h2>
              <p className="mt-2 text-ink-soft">Every product is on the right shelf. The oldest stock will sell first.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 p-6 text-left">
              {[
                ['Products scanned', `${summary.scanned} / ${summary.total}`],
                ['Correctly placed', `${summary.organized} / ${summary.total}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-3xl bg-white p-4 shadow-soft">
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-muted">{k}</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">{v}</dd>
                </div>
              ))}
              <div className="rounded-3xl bg-leaf-600 p-4 text-white shadow-soft">
                <dt className="text-xs font-bold uppercase tracking-wider text-leaf-100">Potential waste prevented</dt>
                <dd className="mt-1 font-display text-3xl font-semibold">
                  <AnimatedNumber value={summary.wastePrevented} format={(n) => formatCurrency(n)} duration={1.4} />
                </dd>
              </div>
              <div className="rounded-3xl bg-mango-100 p-4 shadow-soft">
                <dt className="text-xs font-bold uppercase tracking-wider text-mango-700">Points</dt>
                <dd className="mt-1 font-display text-3xl font-semibold text-ink">
                  <AnimatedNumber value={points} duration={1.4} />
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2 px-6 pb-6 sm:flex-row">
              <Link href="/dashboard?done=1" className="btn btn-primary btn-md flex-1" onClick={() => game.setShowComplete(false)}>
                Back to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                className="btn btn-secondary btn-md"
                onClick={() => {
                  resetShop();
                  game.setShowComplete(false);
                }}
              >
                <RotateCcw className="h-4 w-4" /> Play again
              </button>
            </div>
            <p className="pb-5 text-xs text-ink-muted">
              {POINTS_PER_PLACEMENT} points per product · up to {formatCurrency(TOTAL_AT_RISK_VALUE)} of stock saved from expiring unnoticed
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ScanLine, Warehouse, MousePointerClick, RotateCcw, Sparkles } from 'lucide-react';
import { PRODUCTS, Product, ZONES, ZONE_ORDER, getRecommendedZone, formatExpiry, ProductArtId } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ShopkeeperArt } from '@/components/art/ShopkeeperArt';
import { Awning } from '@/components/art/Awning';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { cn } from '@/lib/utils';

const SHELF_ROWS: ProductArtId[][] = [
  ['milk', 'bread', 'juice'],
  ['paneer', 'biscuits', 'rice'],
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden data-audit-ignore className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-leaf-100/60 blur-3xl" />
      <div aria-hidden data-audit-ignore className="pointer-events-none absolute -left-32 top-64 h-[360px] w-[360px] rounded-full bg-mango-100/70 blur-3xl" />
      <div className="container-page relative grid items-center gap-12 pb-12 pt-8 sm:pt-12 lg:grid-cols-[1fr_1.05fr] lg:pb-16">
        <div className="min-w-0">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip bg-white py-2 text-leaf-700 shadow-soft ring-1 ring-inset ring-leaf-100">
            <Sparkles className="h-4 w-4 text-mango-500" /> Smart inventory for neighbourhood grocery shops
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="display-xl mt-6 text-[2.55rem] leading-[1] min-[380px]:text-[3.1rem] sm:text-7xl lg:text-[5.2rem]"
          >
            Know What to <span className="relative whitespace-nowrap text-leaf-600">Sell First.<svg viewBox="0 0 300 20" className="absolute -bottom-2 left-0 w-full" aria-hidden><path d="M4 14c80-10 200-12 292-4" stroke="#F5B633" strokeWidth="7" fill="none" strokeLinecap="round" /></svg></span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl"
          >
            Scan your grocery stock, understand expiry dates, organize your warehouse and reduce avoidable waste — all from one simple smart inventory
            assistant.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/scanner" className="btn btn-primary btn-lg">
              <ScanLine className="h-5 w-5" /> Try the Scanner
            </Link>
            <Link href="/warehouse" className="btn btn-secondary btn-lg">
              <Warehouse className="h-5 w-5" /> Explore the Warehouse <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-muted">
            <li>✓ Works with a phone camera</li>
            <li>✓ Three simple shelves</li>
            <li>✓ Printable demo barcodes</li>
          </motion.ul>
        </div>

        <motion.div className="min-w-0" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <InteractiveShop />
        </motion.div>
      </div>
    </section>
  );
}

/** The hero shop: hover a product to check it, click it to sort it into the right shelf. */
function InteractiveShop() {
  const [active, setActive] = useState<ProductArtId | null>(null);
  const [sorted, setSorted] = useState<ProductArtId[]>([]);
  const touched = useRef(false);
  const reduce = useReducedMotion();

  // Play the idea once for first-time visitors: check milk, then move it to Sell First.
  useEffect(() => {
    const t1 = setTimeout(() => !touched.current && setActive('milk'), 1400);
    const t2 = setTimeout(() => {
      if (touched.current) return;
      setSorted((s) => (s.includes('milk') ? s : [...s, 'milk']));
      setActive(null);
    }, reduce ? 1500 : 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduce]);

  const touch = () => (touched.current = true);
  const sort = (id: ProductArtId) => {
    touch();
    setSorted((s) => (s.includes(id) ? s : [...s, id]));
    setActive(null);
  };
  const sortAll = () => {
    touch();
    PRODUCTS.forEach((p, i) => setTimeout(() => setSorted((s) => (s.includes(p.id) ? s : [...s, p.id])), i * 160));
    setActive(null);
  };
  const reset = () => {
    touch();
    setSorted([]);
  };

  const allSorted = sorted.length === PRODUCTS.length;

  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <LayoutGroup>
        <div className="relative overflow-hidden rounded-5xl bg-[#FFF4E0] shadow-float ring-1 ring-inset ring-cream-300">
          <Awning className="h-12 w-full sm:h-14" />
          <div className="relative px-4 pb-4 pt-5 sm:px-6">
            <div className="grid grid-cols-[1fr_30%] gap-2">
              {/* shelf */}
              <div className="relative rounded-2xl bg-cream-200/80 px-2 pb-2 pt-4 sm:px-3">
                {SHELF_ROWS.map((row, r) => (
                  <div key={r} className={cn('relative', r > 0 && 'mt-6')}>
                    <div className="grid grid-cols-3 items-end gap-1 px-1">
                      {row.map((id, col) => (
                        <ShelfSlot key={id} id={id} col={col} below={r === 0} sorted={sorted.includes(id)} active={active === id} onHover={(on) => { touch(); setActive(on ? id : null); }} onSort={() => sort(id)} />
                      ))}
                    </div>
                    <div className="shelf-plank h-3 rounded-md" />
                  </div>
                ))}
              </div>
              {/* shopkeeper */}
              <div className="relative flex items-end justify-center">
                <ShopkeeperArt mood="happy" className="w-full max-w-[170px] translate-y-3" />
              </div>
            </div>

            {/* sorting bins */}
            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
              {ZONE_ORDER.map((zone) => {
                const z = ZONES[zone];
                const inBin = sorted.filter((id) => getRecommendedZone(PRODUCTS.find((p) => p.id === id) as Product) === zone);
                return (
                  <div key={zone} className="rounded-3xl bg-white p-2 shadow-soft" style={{ boxShadow: `inset 0 -5px 0 ${z.color}` }}>
                    <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.1em] sm:text-[11px]" style={{ color: z.ink }}>
                      {z.label}
                    </p>
                    <div className="mt-1 flex min-h-[48px] flex-wrap items-end justify-center gap-0.5 pb-1 sm:min-h-[56px]">
                      {inBin.map((id) => (
                        <motion.div key={id} layoutId={`hero-${id}`} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                          <ProductArt id={id} className="h-11 w-11 sm:h-12 sm:w-12" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </LayoutGroup>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="chip bg-white py-2 text-ink-soft shadow-soft">
          <MousePointerClick className="h-4 w-4 text-leaf-600" /> Hover to check · click to sort
        </span>
        {allSorted ? (
          <button onClick={reset} className="btn btn-secondary btn-sm">
            <RotateCcw className="h-4 w-4" /> Restock shelf
          </button>
        ) : (
          <button onClick={sortAll} className="btn btn-mango btn-sm">
            <Sparkles className="h-4 w-4" /> Sort the whole shelf
          </button>
        )}
      </div>
    </div>
  );
}

function ShelfSlot({
  id,
  col,
  below,
  sorted,
  active,
  onHover,
  onSort,
}: {
  id: ProductArtId;
  col: number;
  below: boolean;
  sorted: boolean;
  active: boolean;
  onHover: (on: boolean) => void;
  onSort: () => void;
}) {
  const product = PRODUCTS.find((p) => p.id === id) as Product;
  const zone = getRecommendedZone(product);
  return (
    <div className="relative flex h-[84px] items-end justify-center sm:h-[100px]">
      {sorted ? (
        <div className="mb-1 h-12 w-12 rounded-2xl border-2 border-dashed border-cream-400" aria-hidden />
      ) : (
        <motion.button
          layoutId={`hero-${id}`}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          onFocus={() => onHover(true)}
          onBlur={() => onHover(false)}
          onClick={() => (active ? onSort() : onHover(true))}
          animate={{ y: active ? -8 : 0, scale: active ? 1.08 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="relative rounded-2xl"
          aria-label={`${product.name}: ${formatExpiry(product.daysUntilExpiry)}. Recommended shelf ${ZONES[zone].label}. Click to sort.`}
          data-testid={`hero-product-${id}`}
        >
          <span className={cn('absolute inset-x-2 bottom-0 h-3 rounded-full blur-md transition-opacity', active ? 'opacity-100' : 'opacity-0')} style={{ background: ZONES[zone].color }} />
          <ProductArt id={id} className="relative h-[76px] w-[76px] sm:h-[92px] sm:w-[92px]" />
        </motion.button>
      )}
      <AnimatePresence>
        {active && !sorted && (
          <motion.div
            initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={cn(
              'paper-tag pointer-events-none absolute z-20 w-[9.5rem] p-3 text-left sm:w-40',
              below ? 'top-[96%]' : 'bottom-[96%]',
              // Keep the tag inside the shop on narrow phones: outer columns open inwards.
              col === 0 ? 'left-0' : col === 2 ? 'right-0' : 'left-1/2'
            )}
            style={{ x: col === 1 ? '-50%' : 0 }}
            role="tooltip"
          >
            <span className={cn('absolute -top-1.5 h-3 w-3 rounded-full bg-cream-300 ring-2 ring-white', col === 0 ? 'left-8' : col === 2 ? 'right-8' : 'left-1/2 -translate-x-1/2')} />
            <p className="font-display text-xl font-semibold leading-none text-ink">{product.name}</p>
            <p className="mt-1 text-xs font-semibold text-ink-muted">{product.quantity} units</p>
            <p className="mt-1 text-sm font-extrabold" style={{ color: ZONES[zone].ink }}>
              {formatExpiry(product.daysUntilExpiry)}
            </p>
            <ZoneBadge zone={zone} size="sm" className="mt-2" pulse />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

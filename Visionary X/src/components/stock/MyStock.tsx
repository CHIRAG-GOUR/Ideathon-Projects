'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Package, ScanLine, Truck, ArrowRight, Sparkles } from 'lucide-react';
import { useShop, useStockItems, StockItem } from '@/lib/store';
import { ZONES, ZONE_ORDER, ZoneId, formatDaysLeft } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfLifeBar } from '@/components/ui/ShelfLifeBar';
import { cn } from '@/lib/utils';

type Filter = 'ALL' | ZoneId;

export function MyStock() {
  const items = useStockItems();
  const [filter, setFilter] = useState<Filter>('ALL');
  const shown = items
    .filter((i) => filter === 'ALL' || i.recommendedZone === filter)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display-xl text-4xl sm:text-5xl">My Stock</h1>
          <p className="mt-2 text-lg text-ink-soft">Everything in your shop, sorted by what needs attention first.</p>
        </div>
        <Link href="/after-expiry" className="btn btn-secondary btn-sm self-start gap-1.5 ring-mango-300 hover:bg-mango-50 sm:self-auto">
          <Sparkles className="h-4 w-4 text-mango-600" /> After-Expiry Guide (₹1,242)
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by shelf">
        {(['ALL', ...ZONE_ORDER] as Filter[]).map((f) => {
          const count = f === 'ALL' ? items.length : items.filter((i) => i.recommendedZone === f).length;
          const active = filter === f;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn('chip py-2 text-sm ring-1 ring-inset transition', active ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-cream-300 hover:bg-cream-100')}
            >
              {f !== 'ALL' && <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONES[f].color }} />}
              {f === 'ALL' ? 'All products' : ZONES[f].label}
              <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-cream-200')}>{count}</span>
            </button>
          );
        })}
      </div>

      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((item) => (
            <StockCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function StockCard({ item }: { item: StockItem }) {
  const z = ZONES[item.recommendedZone];
  const router = useRouter();
  const setHandoff = useShop((s) => s.setHandoff);
  const placed = item.progress.placedCorrectly;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="card group overflow-hidden"
      data-testid={`stock-${item.id}`}
    >
      <div className="relative flex h-40 items-end justify-center" style={{ background: z.soft }}>
        <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(180deg,#E6C697,#C4985F)' }} />
        <ProductArt id={item.id} className="relative mb-1 h-32 w-32 transition-transform duration-300 group-hover:-translate-y-1" />
        <ZoneBadge zone={item.recommendedZone} className="absolute left-4 top-4" pulse={!placed} />
        {item.progress.scanned && (
          <span className="chip absolute right-4 top-4 bg-white/90 text-leaf-700">
            <ScanLine className="h-3.5 w-3.5" /> Scanned
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold text-ink">{item.name}</h2>
          <span className="flex items-center gap-1 text-sm font-bold text-ink-soft">
            <Package className="h-4 w-4 text-soil-500" /> {item.quantity} units
          </span>
        </div>
        <p className="text-sm text-ink-muted">
          {item.category} · {item.pack}
        </p>
        <p className="mt-3 text-lg font-extrabold" style={{ color: z.ink }}>
          {formatDaysLeft(item.daysUntilExpiry)}
        </p>
        <ShelfLifeBar days={item.daysUntilExpiry} className="mt-2" showLabel={false} />
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-cream-300 pt-4 text-sm">
          {placed ? (
            <span className="flex items-center gap-1.5 font-bold text-leaf-700">
              <CheckCircle2 className="h-4 w-4" /> On the {z.label} shelf
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-ink-muted">
                <Truck className="h-4 w-4" /> In delivery area
              </span>
              <button
                onClick={() => {
                  setHandoff(item.id);
                  router.push('/warehouse');
                }}
                className="flex items-center gap-1 font-bold text-leaf-700 hover:underline"
              >
                Arrange <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}


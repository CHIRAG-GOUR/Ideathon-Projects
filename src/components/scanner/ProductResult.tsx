'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ScanLine, Package, CalendarClock } from 'lucide-react';
import { Product, ZONES, formatDaysLeft, getRecommendationReason, getRecommendedZone } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ShelfIcon } from '@/components/art/ShelfIcon';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfLifeBar } from '@/components/ui/ShelfLifeBar';
import { useShop } from '@/lib/store';
import { cn } from '@/lib/utils';

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function ProductResult({
  product,
  onArrange,
  onScanAnother,
}: {
  product: Product;
  onArrange: () => void;
  onScanAnother: () => void;
}) {
  const zone = getRecommendedZone(product);
  const z = ZONES[zone];
  const progress = useShop((s) => s.progress[product.id]);
  const demo = useShop((s) => s.demo);
  const highlightExpiry = demo.active && demo.step === 3;

  return (
    <motion.article
      key={product.id}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="card overflow-hidden"
      data-testid="product-result"
      data-product={product.id}
    >
      <motion.div variants={item} className="flex items-center justify-between gap-3 border-b border-cream-300 bg-leaf-50 px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-extrabold text-leaf-700">
          <CheckCircle2 className="h-5 w-5 text-leaf-500" /> Product Found
        </span>
        <span className="font-mono text-xs font-semibold text-ink-muted">{product.barcode}</span>
      </motion.div>

      <div className="p-5 sm:p-6">
        <motion.div variants={item} className="flex items-center gap-5">
          <div className="relative flex h-32 w-32 flex-none items-center justify-center rounded-[28px]" style={{ background: z.soft }}>
            <ProductArt id={product.id} className="h-28 w-28" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-muted">
              {product.category} · {product.pack}
            </p>
            <h2 className="display-xl text-4xl sm:text-5xl" data-testid="result-name">
              {product.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink-soft">
              <Package className="h-4 w-4 text-soil-500" /> {product.quantity} units in stock
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className={cn('mt-5 rounded-3xl bg-cream-100 p-4 transition-shadow', highlightExpiry && 'ring-2 ring-mango-400 ring-offset-2 ring-offset-white')}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              <CalendarClock className="h-4 w-4" /> Expiry
            </span>
            {highlightExpiry && <span className="chip bg-mango-100 text-mango-700">Step 3 · Read the expiry</span>}
          </div>
          <p className="font-display text-3xl font-semibold" style={{ color: z.ink }} data-testid="result-expiry">
            {product.daysUntilExpiry === 1 ? '1 day remaining' : `${product.daysUntilExpiry} days remaining`}
          </p>
          <ShelfLifeBar days={product.daysUntilExpiry} className="mt-3" showLabel={false} />
        </motion.div>

        <motion.div variants={item} className="mt-4 rounded-3xl p-4" style={{ background: z.soft }}>
          <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: z.ink }}>
            Recommendation
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ShelfIcon zone={zone} className="h-12 w-14 flex-none" />
            <ZoneBadge zone={zone} size="lg" pulse />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink" data-testid="result-reason">
            {getRecommendationReason(product)}
          </p>
          {progress?.placedCorrectly && (
            <p className="mt-2 text-sm font-bold text-leaf-700">✓ Already on the {z.label.toUpperCase()} shelf.</p>
          )}
        </motion.div>

        <motion.div variants={item} className="mt-5 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
          <button onClick={onArrange} className="btn btn-primary btn-lg" data-testid="arrange-product">
            Arrange Product <ArrowRight className="h-5 w-5" />
          </button>
          <button onClick={onScanAnother} className="btn btn-secondary btn-lg" data-testid="scan-another">
            <ScanLine className="h-5 w-5" /> Scan Another
          </button>
        </motion.div>
        <p className="mt-3 text-center text-xs text-ink-muted">{formatDaysLeft(product.daysUntilExpiry)} · goes on the {z.label} shelf</p>
      </div>
    </motion.article>
  );
}

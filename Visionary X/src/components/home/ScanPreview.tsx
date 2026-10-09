'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ScanLine, ArrowRight, RotateCcw, Camera } from 'lucide-react';
import { PRODUCTS, Product, ProductArtId, ZONES, formatExpiry, getRecommendedZone } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { Barcode } from '@/components/ui/Barcode';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfIcon } from '@/components/art/ShelfIcon';
import { SectionHeading } from '@/components/ui/Reveal';
import { playScanBeep, playSuccessChime } from '@/lib/sound';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'scanning' | 'found';
const CHOICES: ProductArtId[] = ['milk', 'bread', 'rice'];

/** Simulated scan on the landing page. The real /scanner page uses the camera. */
export function ScanPreview() {
  const [id, setId] = useState<ProductArtId>('milk');
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const product = PRODUCTS.find((p) => p.id === id) as Product;
  const zone = getRecommendedZone(product);

  useEffect(() => () => clearTimeout(timer.current), []);

  const scan = () => {
    clearTimeout(timer.current);
    setPhase('scanning');
    timer.current = setTimeout(() => {
      setPhase('found');
      playScanBeep();
      setTimeout(playSuccessChime, 120);
    }, 1400);
  };

  const choose = (next: ProductArtId) => {
    clearTimeout(timer.current);
    setId(next);
    setPhase('idle');
  };

  const reveal = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.25 + i * 0.35, duration: 0.35 } });

  return (
    <section id="see-it" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading
            eyebrow="See it in action"
            title="Barcode in. Decision out."
            lead="Pick a product and press Scan Demo. This preview is simulated — the real scanner opens your camera and reads printed barcodes."
          />
          <div className="mt-8 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a product">
            {CHOICES.map((c) => {
              const p = PRODUCTS.find((x) => x.id === c) as Product;
              return (
                <button
                  key={c}
                  role="radio"
                  aria-checked={id === c}
                  onClick={() => choose(c)}
                  className={cn('flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-bold ring-1 ring-inset transition', id === c ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-cream-300 hover:bg-cream-100')}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100">
                    <ProductArt id={c} className="h-7 w-7" />
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/scanner" className="btn btn-primary btn-md">
              <Camera className="h-4 w-4" /> Open the real scanner
            </Link>
            <Link href="/demo" className="btn btn-secondary btn-md">
              Print demo barcodes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-5xl bg-cream-100 p-5 shadow-soft ring-1 ring-inset ring-cream-300 sm:p-8">
          <div className="grid items-center gap-6 sm:grid-cols-2">
            {/* product with barcode label under a scanner frame */}
            <div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-4xl bg-white">
              <ProductArt id={id} className="absolute left-1/2 top-3 h-[58%] w-[58%] -translate-x-1/2 opacity-90" />
              <div className="absolute bottom-[14%] left-1/2 w-[78%] -translate-x-1/2 rounded-xl bg-white p-1 shadow-soft ring-1 ring-cream-300">
                <Barcode value={product.barcode} height={46} moduleWidth={1.4} showValue className="w-full" />
              </div>
              <div className={cn('absolute inset-x-[6%] bottom-[8%] top-[52%] rounded-3xl border-[4px] transition-colors', phase === 'found' ? 'border-leaf-500' : 'border-leaf-300 border-dashed')} />
              {phase === 'scanning' && (
                <motion.span className="absolute left-[10%] right-[10%] h-[3px] rounded-full bg-leaf-400 shadow-[0_0_14px_2px_rgba(93,178,119,0.8)]" initial={{ top: '54%' }} animate={{ top: ['54%', '88%', '54%'] }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
              )}
              <AnimatePresence>
                {phase === 'found' && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-leaf-500 text-white shadow-lift">
                    <CheckCircle2 className="h-6 w-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* result */}
            <div className="min-h-[280px]" aria-live="polite">
              {phase === 'idle' && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <p className="text-ink-muted">Ready to scan {product.name}.</p>
                  <button onClick={scan} className="btn btn-primary btn-lg" data-testid="scan-demo">
                    <ScanLine className="h-5 w-5" /> SCAN DEMO
                  </button>
                </div>
              )}
              {phase === 'scanning' && (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
                  <p className="font-display text-2xl font-semibold">Scanning…</p>
                  <p className="font-mono text-sm text-ink-muted">{product.barcode}</p>
                </div>
              )}
              {phase === 'found' && (
                <div className="space-y-3" data-testid="scan-demo-result">
                  <motion.p {...reveal(0)} className="flex items-center gap-2 font-extrabold text-leaf-700">
                    <CheckCircle2 className="h-5 w-5" /> Product Found
                  </motion.p>
                  <motion.p {...reveal(1)} className="display-xl text-5xl">
                    {product.name}
                  </motion.p>
                  <motion.p {...reveal(2)} className="text-xl font-extrabold" style={{ color: ZONES[zone].ink }}>
                    {formatExpiry(product.daysUntilExpiry)}
                  </motion.p>
                  <motion.div {...reveal(3)} className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-soft">
                    <ShelfIcon zone={zone} className="h-10 w-12" />
                    <ZoneBadge zone={zone} size="lg" pulse />
                  </motion.div>
                  <motion.button {...reveal(4)} onClick={scan} className="btn btn-ghost btn-sm">
                    <RotateCcw className="h-4 w-4" /> Scan again
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

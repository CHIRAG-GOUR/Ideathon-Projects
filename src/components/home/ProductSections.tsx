'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, Printer, ArrowRight, Boxes } from 'lucide-react';
import { PRODUCTS, ZONES, getRecommendedZone, formatDaysLeft } from '@/lib/products';
import { useStockItems } from '@/lib/store';
import { ProductArt } from '@/components/art/ProductArt';
import { Barcode } from '@/components/ui/Barcode';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { Reveal, SectionHeading } from '@/components/ui/Reveal';

/** The real scanner: what it does + a fan of the real printable barcodes. */
export function ScannerBand() {
  const fan = PRODUCTS.slice(0, 3);
  return (
    <section id="scanner" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <div className="grid items-center gap-12 overflow-hidden rounded-5xl bg-mango-50 p-6 ring-1 ring-inset ring-mango-200 sm:p-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="The real scanner"
              title="Print a barcode. Stick it on anything. Scan it."
              lead="The scanner opens your phone’s back camera and reads barcodes live — no app to install."
            />
            <Reveal delay={0.1}>
              <ul className="mt-6 grid gap-2.5 text-ink-soft">
                {[
                  'Opens the rear camera on phones, any webcam on laptops',
                  'Reads Code 128, EAN-13, EAN-8 and UPC barcodes',
                  'Pauses the moment a product is found',
                  'Type the number instead if there’s no camera',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-leaf-600" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/scanner" className="btn btn-primary btn-lg">
                  <Camera className="h-5 w-5" /> Open the Scanner
                </Link>
                <Link href="/demo" className="btn btn-secondary btn-lg">
                  <Printer className="h-5 w-5" /> Print Demo Barcodes
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="relative h-[360px] sm:h-[420px]">
            {fan.map((p, i) => {
              const z = ZONES[getRecommendedZone(p)];
              return (
                <div
                  key={p.id}
                  className="absolute left-1/2 top-1/2 w-[240px] rounded-3xl border-2 border-dashed border-cream-400 bg-white p-4 shadow-lift transition-transform duration-500 hover:z-10 hover:!rotate-0 hover:scale-105 sm:w-[270px]"
                  style={{ transform: `translate(-50%, -50%) translate(${(i - 1) * 70}px, ${(i - 1) * 18}px) rotate(${(i - 1) * 9}deg)` }}
                >
                  <div className="flex items-center gap-2">
                    <ProductArt id={p.id} className="h-10 w-10" />
                    <p className="text-lg font-extrabold uppercase text-ink">{p.name}</p>
                    <span className="ml-auto h-3 w-3 rounded-full" style={{ background: z.color }} />
                  </div>
                  <Barcode value={p.barcode} height={56} moduleWidth={1.6} className="mx-auto mt-2 w-full" />
                  <p className="text-center font-mono text-sm font-semibold tracking-[0.18em]">{p.barcode}</p>
                </div>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Live preview of My Stock — reads the same shared store as the app. */
export function StockPreview() {
  const items = useStockItems();
  return (
    <section id="stock" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="My Stock" title="Your whole shop on one shelf." lead="Every product, sorted by what needs attention first." />
          <Link href="/stock" className="btn btn-secondary btn-md self-start sm:self-auto">
            <Boxes className="h-4 w-4" /> Open My Stock <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Reveal className="mt-10 rounded-5xl bg-cream-100 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...items]
              .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
              .map((i) => (
                <div key={i.id} className="group rounded-3xl bg-white p-3 text-center shadow-soft transition hover:-translate-y-1">
                  <div className="rounded-2xl pt-2" style={{ background: ZONES[i.recommendedZone].soft }}>
                    <ProductArt id={i.id} className="mx-auto h-20 w-20 transition-transform group-hover:scale-105" />
                  </div>
                  <p className="mt-2 font-bold text-ink">{i.name}</p>
                  <p className="text-xs text-ink-muted">
                    {i.quantity} units · {formatDaysLeft(i.daysUntilExpiry)}
                  </p>
                  <ZoneBadge zone={i.recommendedZone} size="sm" className="mt-2" />
                </div>
              ))}
          </div>
          <div className="shelf-plank mt-3 h-3 rounded-md" />
        </Reveal>
      </div>
    </section>
  );
}

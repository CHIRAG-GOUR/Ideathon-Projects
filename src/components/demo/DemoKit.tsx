'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, Download, Scissors, ScanLine, Loader2, StickyNote, Presentation, CheckCircle2 } from 'lucide-react';
import { PRODUCTS, Product, ZONES, formatExpiry, getRecommendedZone } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { Barcode } from '@/components/ui/Barcode';
import { Reveal } from '@/components/ui/Reveal';
import { DemoModeButton, DEMO_STEPS } from '@/components/app/DemoMode';
import { downloadBarcodeSheet } from './sheet';

function printSingle(id: string) {
  const card = document.querySelector<HTMLElement>(`[data-card="${id}"]`);
  if (!card) return;
  document.body.dataset.printSingle = 'true';
  card.dataset.printTarget = 'true';
  const cleanup = () => {
    delete document.body.dataset.printSingle;
    delete card.dataset.printTarget;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

function BarcodeCard({ product }: { product: Product }) {
  const zone = getRecommendedZone(product);
  const z = ZONES[zone];
  return (
    <article
      data-card={product.id}
      className="barcode-card flex min-w-0 break-inside-avoid flex-col rounded-[28px] border-2 border-dashed border-cream-400 bg-white p-4 sm:p-5 print:h-[83mm] print:rounded-[6mm] print:border-[#bba77f] print:p-[4mm]"
    >
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl print:h-[15mm] print:w-[15mm]" style={{ background: z.soft }}>
          <ProductArt id={product.id} data-art={product.id} className="h-14 w-14 print:h-[13mm] print:w-[13mm]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold uppercase tracking-wide text-ink print:text-[14pt]">{product.name}</h3>
          <p className="text-sm text-ink-muted print:text-[8pt]">
            {product.category} · {product.quantity} units
          </p>
        </div>
        <ZoneBadge zone={zone} size="sm" />
      </header>

      {/* Barcode: pure white area, no decoration, generous quiet zone */}
      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl bg-white print:mt-[2mm]">
        <Barcode value={product.barcode} height={80} moduleWidth={2} className="w-full max-w-[260px] print:w-[62mm] print:max-w-none" />
        <p className="mt-1 font-mono text-lg font-semibold tracking-[0.2em] text-black print:text-[11pt]" data-testid={`barcode-number-${product.id}`}>
          {product.barcode}
        </p>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-cream-300 pt-3 text-sm print:mt-[2mm] print:pt-[2mm] print:text-[9pt]">
        <span className="font-bold text-ink">{formatExpiry(product.daysUntilExpiry)}</span>
        <span className="font-bold" style={{ color: z.ink }}>
          Recommended shelf: {z.label}
        </span>
      </footer>
      <button onClick={() => printSingle(product.id)} className="no-print btn btn-ghost btn-sm mt-3 self-center text-xs">
        <Printer className="h-3.5 w-3.5" /> Print just this one
      </button>
    </article>
  );
}

export function DemoKit() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadBarcodeSheet();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="paper-grain print:bg-none">
      <section className="container-page pb-10 pt-8 sm:pt-14 print:hidden">
        <Reveal className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">
              <StickyNote className="h-4 w-4" /> Demo kit
            </p>
            <h1 className="display-xl mt-3 text-[2.6rem] leading-[1.05] min-[380px]:text-5xl sm:text-6xl">Demo Barcodes</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Print these barcodes and use them with the live scanner. Stick them on boxes, bottles, books — anything — and every
              scan shows the matching product.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => window.print()} className="btn btn-primary btn-lg" data-testid="print-all">
                <Printer className="h-5 w-5" /> Print All Barcodes
              </button>
              <button onClick={download} className="btn btn-secondary btn-lg" disabled={downloading} data-testid="download-sheet">
                {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Download Barcode Sheet
              </button>
            </div>
          </div>
          <ol className="grid gap-3 rounded-4xl bg-white p-5 shadow-soft ring-1 ring-inset ring-cream-300">
            {[
              { icon: Printer, t: 'Print on A4 at 100% scale', d: 'All six fit on one page.' },
              { icon: Scissors, t: 'Cut & stick', d: 'Tape each label flat onto an object.' },
              { icon: ScanLine, t: 'Scan it', d: 'Open the scanner and point the camera.' },
            ].map((s, i) => (
              <li key={s.t} className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-ink">
                    {i + 1}. {s.t}
                  </p>
                  <p className="text-sm text-ink-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <div className="print-only mb-[4mm]">
        <p className="font-display text-[18pt] font-semibold">Smart Stock · Demo Barcodes</p>
        <p className="text-[9pt] text-ink-muted">Cut along the dashed lines, stick on any object, then scan with the Smart Stock scanner.</p>
      </div>

      <section className="container-page pb-16 print:max-w-none print:p-0">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-[4mm]">
          {PRODUCTS.map((p) => (
            <BarcodeCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section id="guide" className="border-t border-cream-300 bg-cream-100 py-16 print:hidden">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">
              <Presentation className="h-4 w-4" /> Presenter guide
            </p>
            <h2 className="display-xl mt-3 text-4xl">Present it in two minutes</h2>
            <p className="mt-3 text-lg text-ink-soft">
              Press <strong>Demo Mode</strong> before you start. It resets the shop and shows each step on screen, so anyone can present.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <DemoModeButton size="md" />
              <Link href="/scanner" className="btn btn-secondary btn-md">
                <ScanLine className="h-4 w-4" /> Open the scanner
              </Link>
            </div>
          </div>
          <ol className="grid gap-3">
            {DEMO_STEPS.map((s) => (
              <li key={s.step} className="flex gap-4 rounded-3xl bg-white p-4 shadow-soft">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-leaf-600 font-extrabold text-white">{s.step}</span>
                <div>
                  <p className="font-bold text-ink">{s.title}</p>
                  <p className="text-sm text-ink-muted">{s.hint}</p>
                </div>
              </li>
            ))}
            <li className="flex gap-3 rounded-3xl bg-leaf-50 p-4 text-sm text-leaf-800">
              <CheckCircle2 className="h-5 w-5 flex-none" />
              Tip: phones need the site on <strong>https://</strong> (or localhost) to open the camera. Matte paper avoids glare.
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

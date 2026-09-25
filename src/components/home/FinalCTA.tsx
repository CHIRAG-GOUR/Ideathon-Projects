'use client';

import React from 'react';
import Link from 'next/link';
import { ScanLine, Printer } from 'lucide-react';
import { PRODUCTS } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { Awning } from '@/components/art/Awning';
import { DemoModeButton } from '@/components/app/DemoMode';
import { Reveal } from '@/components/ui/Reveal';

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-5xl bg-leaf-50 text-center ring-1 ring-inset ring-leaf-100">
          <Awning className="h-12 w-full sm:h-14" stripes={20} />
          <div className="px-6 pb-0 pt-12 sm:pt-16">
            <h2 className="display-xl mx-auto max-w-3xl text-4xl leading-[1.05] sm:text-6xl">Scan your stock. Put it in the right place. Waste less.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">It takes one barcode to see how it works.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/scanner" className="btn btn-primary btn-lg">
                <ScanLine className="h-5 w-5" /> Scan Your First Product
              </Link>
              <Link href="/demo" className="btn btn-secondary btn-lg">
                <Printer className="h-5 w-5" /> Print Demo Barcodes
              </Link>
              <DemoModeButton size="lg" />
            </div>
            <div className="mx-auto mt-14 max-w-3xl">
              <div className="flex items-end justify-center gap-1 sm:gap-4">
                {PRODUCTS.map((p) => (
                  <ProductArt key={p.id} id={p.id} className="h-16 w-16 sm:h-24 sm:w-24" />
                ))}
              </div>
              <div className="shelf-plank h-4 rounded-t-md" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useInView } from 'framer-motion';
import { ArrowRight, Gamepad2, MousePointerClick, RotateCcw, Loader2 } from 'lucide-react';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';
import type { ProductArtId } from '@/lib/products';

const WarehousePreview3D = dynamic(() => import('./WarehousePreview3D'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D preview…
    </div>
  ),
});

export function WarehousePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { once: true, margin: '300px' });
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const select = (id: ProductArtId) => {
    if (placed.includes(id)) return;
    clearTimeout(timer.current);
    setSelected(id);
    // Show the expiry first, then move the box to its shelf.
    timer.current = setTimeout(() => {
      setPlaced((p) => [...p, id]);
      setSelected(null);
    }, 1600);
  };

  return (
    <section id="warehouse" className="scroll-mt-20 bg-leaf-50 py-20 sm:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeading
            eyebrow="3D warehouse"
            title="Step into the shopkeeper’s shoes."
            lead="Walk around a small 3D warehouse, scan each box, read its expiry and carry it to Fresh, Sell Soon or Sell First. It uses the same products as the real scanner."
          />
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            <Link href="/warehouse" className="btn btn-primary btn-lg">
              <Gamepad2 className="h-5 w-5" /> Enter the 3D Warehouse <ArrowRight className="h-5 w-5" />
            </Link>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div ref={ref} className="relative aspect-[4/3] overflow-hidden rounded-5xl bg-cream-100 shadow-lift ring-1 ring-inset ring-cream-300" data-testid="warehouse-preview">
            {near && <WarehousePreview3D placed={placed} selected={selected} onSelect={select} />}
            <div className="pointer-events-none absolute left-4 top-4 chip bg-white/95 py-2 text-ink-soft shadow-soft">
              <MousePointerClick className="h-4 w-4 text-leaf-600" /> Click a box
            </div>
            {placed.length > 0 && (
              <button onClick={() => setPlaced([])} className="btn btn-secondary btn-sm absolute bottom-4 right-4">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

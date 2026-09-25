'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Flame, Check } from 'lucide-react';
import { BoxArt, ProductArt } from '@/components/art/ProductArt';
import { SpotBasket, SpotIdentify, SpotScan, SpotShelf, SpotStore, SpotWarehouse, SpotSchool } from '@/components/art/Spots';
import { SectionHeading } from '@/components/ui/Reveal';
import type { ProductArtId } from '@/lib/products';
import { cn } from '@/lib/utils';

type Station = { label: string; art: React.ReactNode };

const CASES: { title: string; desc: string; token: ProductArtId; stations: Station[] }[] = [
  {
    title: 'Grocery Shops',
    desc: 'Keep everyday products organized.',
    token: 'milk',
    stations: [
      { label: 'Boxes', art: <BoxArt className="h-full w-full" /> },
      { label: 'Scanner', art: <SpotScan className="h-full w-full" /> },
      { label: 'Shelf', art: <SpotShelf className="h-full w-full" /> },
    ],
  },
  {
    title: 'Small Retail Stores',
    desc: 'Know which stock needs attention.',
    token: 'paneer',
    stations: [
      { label: 'Stock', art: <SpotWarehouse className="h-full w-full" /> },
      {
        label: 'Expiry alert',
        art: (
          <span className="flex h-full w-full items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tomato-500 text-white shadow-soft">
              <Flame className="h-6 w-6" />
            </span>
          </span>
        ),
      },
      { label: 'Sell first', art: <SpotBasket className="h-full w-full" /> },
    ],
  },
  {
    title: 'Mini Markets',
    desc: 'Track products across shelves and storage.',
    token: 'rice',
    stations: [
      { label: 'Storage', art: <SpotWarehouse className="h-full w-full" /> },
      { label: 'Shelves', art: <SpotShelf className="h-full w-full" /> },
      { label: 'Counter', art: <SpotStore className="h-full w-full" /> },
    ],
  },
  {
    title: 'School / Educational Demo',
    desc: 'Learn how technology can reduce food waste.',
    token: 'biscuits',
    stations: [
      { label: 'Barcode', art: <SpotSchool className="h-full w-full" /> },
      {
        label: 'Camera',
        art: (
          <span className="flex h-full w-full items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400 text-white shadow-soft">
              <Camera className="h-6 w-6" />
            </span>
          </span>
        ),
      },
      { label: 'Recognized', art: <SpotIdentify className="h-full w-full" /> },
    ],
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading align="center" eyebrow="Use cases" title="Who Can Use It?" lead="Made for small shops — and simple enough for a classroom." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <UseCaseCard key={c.title} {...c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCaseCard({ title, desc, token, stations, index }: (typeof CASES)[number] & { index: number }) {
  const [play, setPlay] = useState(0);
  const start = () => setPlay((p) => p + 1);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: index * 0.08 }}
      onViewportEnter={() => play === 0 && setTimeout(start, 400 + index * 250)}
      onMouseEnter={start}
      onFocus={start}
      onClick={start}
      tabIndex={0}
      className="card group cursor-default overflow-hidden outline-none transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative bg-cream-100 px-5 pb-6 pt-8">
        <div className="relative grid grid-cols-3 items-end">
          <div className="absolute left-[16%] right-[16%] top-[34px] border-t-2 border-dashed border-cream-400" />
          {stations.map((s, i) => (
            <div key={s.label} className="relative flex flex-col items-center">
              <div className={cn('relative h-[68px] w-[68px] rounded-2xl bg-white p-1.5 shadow-soft transition-transform', 'group-hover:scale-105')}>{s.art}</div>
              <p className="mt-2 text-xs font-bold text-ink-soft">{s.label}</p>
              {i === 2 && play > 0 && (
                <motion.span key={play} initial={{ scale: 0 }} animate={{ scale: [0, 0, 1] }} transition={{ duration: 1.8, times: [0, 0.85, 1] }} className="absolute -right-1 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-leaf-500 text-white shadow-soft">
                  <Check className="h-4 w-4" />
                </motion.span>
              )}
            </div>
          ))}
          {play > 0 && (
            <motion.div
              key={play}
              className="pointer-events-none absolute top-[-6px] h-10 w-10"
              initial={{ left: '12%', opacity: 0 }}
              animate={{ left: ['12%', '12%', '45%', '45%', '78%'], opacity: [0, 1, 1, 1, 0], y: [0, -6, 0, -6, 0] }}
              transition={{ duration: 1.8, times: [0, 0.1, 0.45, 0.6, 1], ease: 'easeInOut' }}
            >
              <ProductArt id={token} className="h-10 w-10 drop-shadow" />
            </motion.div>
          )}
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-ink-soft">{desc}</p>
      </div>
    </motion.article>
  );
}

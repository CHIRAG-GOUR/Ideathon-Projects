'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { CheckCircle2, Star } from 'lucide-react';
import { ProductArt } from '@/components/art/ProductArt';
import { ZONES, ZONE_ORDER } from '@/lib/products';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfLifeBar } from '@/components/ui/ShelfLifeBar';
import { Barcode } from '@/components/ui/Barcode';
import { SectionHeading } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: '01', t: 'Scan', d: 'Point the camera at a barcode.' },
  { n: '02', t: 'Understand', d: 'The product and expiry information appears.' },
  { n: '03', t: 'Organize', d: 'The system recommends where the product should go.' },
  { n: '04', t: 'Act', d: 'Move the product to the correct priority shelf.' },
];

export function HowItWorks() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });

  useEffect(() => {
    if (!inView || paused) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 3600);
    return () => clearTimeout(t);
  }, [step, inView, paused]);

  return (
    <section id="how" className="scroll-mt-20 bg-leaf-50 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading eyebrow="How it works" title="Four steps. One minute. No training." />
        <div ref={ref} className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <ol className="grid gap-3" role="tablist" aria-label="How it works steps">
            {STEPS.map((s, i) => {
              const active = i === step;
              return (
                <li key={s.n}>
                  <button
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStep(i)}
                    className={cn('relative w-full overflow-hidden rounded-4xl p-5 text-left transition-colors sm:p-6', active ? 'bg-white shadow-lift' : 'hover:bg-white/60')}
                  >
                    <div className="flex items-baseline gap-4">
                      <span className={cn('font-display text-3xl font-semibold', active ? 'text-leaf-600' : 'text-ink-faint')}>{s.n}</span>
                      <div>
                        <p className="font-display text-2xl font-semibold text-ink">{s.t}</p>
                        <p className="mt-1 text-ink-soft">{s.d}</p>
                      </div>
                    </div>
                    {active && !paused && inView && (
                      <motion.span key={`p${step}`} className="absolute bottom-0 left-0 h-1 bg-leaf-400" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3.6, ease: 'linear' }} />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="relative mx-auto flex aspect-[4/4.6] w-full max-w-[560px] items-center justify-center overflow-hidden rounded-5xl min-[480px]:aspect-[4/3.4] bg-white shadow-lift ring-1 ring-cream-300">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
              >
                {step === 0 && <StageScan />}
                {step === 1 && <StageUnderstand />}
                {step === 2 && <StageOrganize />}
                {step === 3 && <StageAct />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageScan() {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-4xl bg-cream-100">
      <div className="relative">
        <ProductArt id="milk" className="h-48 w-48" />
        <div className="absolute left-1/2 top-[52%] w-28 -translate-x-1/2 rounded-md bg-white p-1.5 shadow-soft">
          <Barcode value="890000000001" height={28} moduleWidth={1} className="w-full" />
        </div>
      </div>
      <div className="absolute inset-[14%] rounded-[28px] border-[5px] border-dashed border-leaf-400/70" />
      <motion.span className="absolute left-[18%] right-[18%] h-[3px] rounded-full bg-leaf-400 shadow-[0_0_14px_2px_rgba(93,178,119,0.8)]" animate={{ top: ['22%', '76%', '22%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
      <p className="absolute bottom-4 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink shadow-soft">Looking for a barcode…</p>
    </div>
  );
}

function StageUnderstand() {
  return (
    <div className="w-full max-w-sm rounded-4xl bg-white p-5 shadow-soft ring-1 ring-cream-300">
      <p className="flex items-center gap-2 text-sm font-extrabold text-leaf-700">
        <CheckCircle2 className="h-5 w-5" /> Product Found
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="rounded-3xl bg-tomato-50 p-2">
          <ProductArt id="milk" className="h-20 w-20" />
        </div>
        <div>
          <p className="font-display text-3xl font-semibold">Milk</p>
          <p className="text-sm text-ink-muted">Dairy · 42 units</p>
        </div>
      </div>
      <p className="mt-4 font-display text-2xl font-semibold text-tomato-700">2 days remaining</p>
      <ShelfLifeBar days={2} className="mt-2" showLabel={false} />
    </div>
  );
}

function StageOrganize() {
  return (
    <div className="grid w-full max-w-md gap-2.5">
      {ZONE_ORDER.map((z, i) => (
        <motion.div
          key={z}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={cn('flex flex-wrap items-center justify-between gap-2 rounded-3xl p-3 ring-2 sm:p-4', z === 'SELL_FIRST' ? 'bg-tomato-50 ring-tomato-400' : 'bg-cream-100 ring-transparent')}
        >
          <div>
            <ZoneBadge zone={z} />
            <p className="mt-1 text-xs text-ink-muted">{ZONES[z].rule}</p>
          </div>
          {z === 'SELL_FIRST' && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="chip bg-tomato-500 text-white">
              Recommended for Milk
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StageAct() {
  return (
    <div className="relative flex h-full w-full flex-col justify-end rounded-4xl bg-cream-100 p-6">
      <div className="absolute left-6 top-6">
        <ZoneBadge zone="SELL_FIRST" size="lg" />
        <p className="mt-2 text-sm font-semibold text-ink-muted">Front shelf</p>
      </div>
      <div className="flex items-end justify-center gap-2">
        <ProductArt id="paneer" className="h-24 w-24" />
        <motion.div initial={{ x: 180, y: -120, rotate: 20 }} animate={{ x: 0, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.2 }}>
          <ProductArt id="milk" className="h-28 w-28" />
        </motion.div>
      </div>
      <div className="shelf-plank h-4 rounded-md" style={{ boxShadow: `inset 0 -4px 0 ${ZONES.SELL_FIRST.color}` }} />
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.9 }} className="absolute right-6 top-6 rounded-3xl bg-leaf-600 px-4 py-3 text-white shadow-lift">
        <p className="flex items-center gap-2 font-extrabold">
          <CheckCircle2 className="h-5 w-5" /> Great job!
        </p>
        <p className="flex items-center gap-1 text-sm text-leaf-50">
          <Star className="h-4 w-4 fill-mango-300 text-mango-300" /> +100 points
        </p>
      </motion.div>
    </div>
  );
}

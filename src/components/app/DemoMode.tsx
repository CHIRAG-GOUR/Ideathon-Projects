'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Presentation, X, Check, ChevronDown, ChevronUp, Printer, RotateCcw, ScanLine, PartyPopper } from 'lucide-react';
import { useShop, DemoStep } from '@/lib/store';
import { cn } from '@/lib/utils';

export const DEMO_STEPS: { step: DemoStep; title: string; hint: string }[] = [
  { step: 1, title: 'Scan a barcode', hint: 'Point the camera at a printed demo barcode.' },
  { step: 2, title: 'See the product', hint: 'The product card appears with its details.' },
  { step: 3, title: 'Read expiry', hint: 'Check the shelf-life bar. How many days are left?' },
  { step: 4, title: 'Arrange it', hint: 'Tap “Arrange Product” and pick the right shelf.' },
  { step: 5, title: 'Earn points', hint: '+100 points for every product on the right shelf.' },
];

/** Big friendly "Demo Mode" entry point. Resets the shop and starts the guided walkthrough. */
export function DemoModeButton({
  variant = 'mango',
  className,
  label = 'full',
  size = 'sm',
}: {
  variant?: 'mango' | 'ghost' | 'secondary';
  className?: string;
  label?: 'full' | 'short';
  size?: 'sm' | 'md' | 'lg';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'btn',
          size === 'sm' && 'btn-sm',
          size === 'md' && 'btn-md',
          size === 'lg' && 'btn-lg',
          variant === 'mango' && 'btn-mango',
          variant === 'ghost' && 'btn-ghost',
          variant === 'secondary' && 'btn-secondary',
          className
        )}
      >
        <Presentation className="h-4 w-4" />
        {label === 'short' ? <span className="hidden xl:inline">Demo Mode</span> : 'Demo Mode'}
        {label === 'short' && <span className="sr-only xl:hidden">Demo Mode</span>}
      </button>
      <DemoModeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function DemoModeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const startDemo = useShop((s) => s.startDemo);
  const router = useRouter();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <motion.div
            className="absolute inset-0 bg-[#3b2f1f]/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-lg overflow-hidden rounded-4xl bg-background shadow-float ring-1 ring-cream-300"
          >
            <div className="bg-mango-100 px-6 pb-5 pt-6 sm:px-8">
              <button onClick={onClose} className="btn btn-ghost absolute right-4 top-4 h-10 w-10 p-0" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
              <p className="eyebrow text-mango-700">
                <Presentation className="h-4 w-4" /> Demo Mode
              </p>
              <h2 id="demo-title" className="display-xl mt-2 text-3xl">
                Ready to present?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                This resets the shop to a fresh morning, clears points and guides you through five simple steps.
              </p>
            </div>
            <ol className="space-y-2 px-6 py-5 sm:px-8">
              {DEMO_STEPS.map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-leaf-100 text-sm font-extrabold text-leaf-700">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-bold text-ink">{s.title}</p>
                    <p className="text-sm text-ink-muted">{s.hint}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-2 border-t border-cream-300 px-6 py-5 sm:flex-row sm:px-8">
              <button
                className="btn btn-primary btn-md flex-1"
                onClick={() => {
                  startDemo();
                  onClose();
                  router.push('/scanner');
                }}
              >
                <ScanLine className="h-4 w-4" /> Start the demo
              </button>
              <Link href="/demo" onClick={onClose} className="btn btn-secondary btn-md">
                <Printer className="h-4 w-4" /> Print barcodes
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Floating step-by-step coach shown inside the app while Demo Mode is on. */
export function DemoCoach() {
  const demo = useShop((s) => s.demo);
  const exitDemo = useShop((s) => s.exitDemo);
  const resetShop = useShop((s) => s.resetShop);
  const points = useShop((s) => s.points);
  // On phones the coach starts as a one-line pill so it never covers buttons.
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  if (!demo.active) return null;

  const current = demo.roundComplete ? 6 : demo.step;
  const currentStep = DEMO_STEPS.find((s) => s.step === current);

  return (
    <>
    <div className="h-20 lg:h-0" aria-hidden />
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="no-print fixed bottom-[88px] left-3 right-3 z-40 sm:left-auto sm:right-5 sm:w-[340px] lg:bottom-5"
      aria-label="Demo guide"
    >
      <div className="overflow-hidden rounded-3xl bg-white shadow-float ring-1 ring-mango-300">
        <div className="flex items-center justify-between gap-2 bg-mango-100 px-4 py-2.5">
          <button onClick={() => setCollapsed((c) => !c)} className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-mango-700" aria-expanded={!collapsed}>
            <Presentation className="h-4 w-4" />
            <span className="truncate">
              {demo.roundComplete ? 'Demo · Done! Scan the next one' : `Step ${demo.step}/5${collapsed && currentStep ? ` · ${currentStep.title}` : ' · Demo Mode'}`}
            </span>
            {collapsed ? <ChevronUp className="h-4 w-4 flex-none" /> : <ChevronDown className="h-4 w-4 flex-none" />}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={resetShop} className="btn btn-ghost h-8 w-8 p-0" title="Reset demo" aria-label="Reset demo">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={exitDemo} className="btn btn-ghost h-8 w-8 p-0" title="Exit demo mode" aria-label="Exit demo mode">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <ol className="space-y-1 p-3">
                {DEMO_STEPS.map((s) => {
                  const done = s.step < current;
                  const active = s.step === current;
                  return (
                    <li
                      key={s.step}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl px-2.5 py-2 transition-colors',
                        active && 'bg-leaf-50 ring-1 ring-leaf-200'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-extrabold',
                          done ? 'bg-leaf-500 text-white' : active ? 'bg-leaf-600 text-white' : 'bg-cream-200 text-ink-muted'
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : s.step}
                      </span>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-bold', done ? 'text-ink-muted line-through decoration-leaf-400' : 'text-ink')}>{s.title}</p>
                        {active && <p className="text-xs leading-snug text-ink-soft">{s.hint}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {demo.roundComplete && (
                <div className="mx-3 mb-3 rounded-2xl bg-leaf-50 p-3 text-sm">
                  <p className="flex items-center gap-2 font-extrabold text-leaf-700">
                    <PartyPopper className="h-4 w-4" /> Brilliant! {points} points so far.
                  </p>
                  <Link href="/scanner" className="btn btn-primary btn-sm mt-2 w-full">
                    <ScanLine className="h-4 w-4" /> Scan the next product
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
    </>
  );
}

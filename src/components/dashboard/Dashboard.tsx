'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ScanLine, AlertTriangle, PackageCheck, Lightbulb, Warehouse, Printer, PartyPopper, Star } from 'lucide-react';
import { useShop, useStockItems, summarize } from '@/lib/store';
import { ZONES, formatDaysLeft } from '@/lib/products';
import { ProductArt } from '@/components/art/ProductArt';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { DemoModeButton } from '@/components/app/DemoMode';
import { formatCurrency } from '@/lib/utils';

const TIPS = [
  'Products that expire sooner should be sold first.',
  'When new stock arrives, put it behind the older stock — never in front.',
  'Check the Sell First shelf every morning before opening.',
  'Dairy and bakery items need attention fastest. Rice and biscuits can wait.',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function Dashboard() {
  const items = useStockItems();
  const s = summarize(items);
  const points = useShop((st) => st.points);
  const [hello, setHello] = useState('Good Morning');
  const [tip, setTip] = useState(0);

  useEffect(() => {
    setHello(greeting());
    setTip(new Date().getDate() % TIPS.length);
  }, []);

  const attention = items.filter((i) => i.recommendedZone !== 'FRESH' && !i.progress.placedCorrectly).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const stats = [
    { label: 'Scanned today', value: s.scanned, suffix: ` / ${s.total}`, icon: ScanLine, tone: 'bg-sky-100 text-sky-500' },
    { label: 'Needs attention', value: s.needsAttention, suffix: '', icon: AlertTriangle, tone: 'bg-tomato-100 text-tomato-500' },
    { label: 'Organized', value: s.organized, suffix: ` / ${s.total}`, icon: PackageCheck, tone: 'bg-leaf-100 text-leaf-600' },
  ];

  return (
    <div className="container-page py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display-xl text-4xl sm:text-5xl">{hello} 👋</h1>
          <p className="mt-2 text-lg text-ink-soft">Let’s organize today’s stock.</p>
        </div>
        <DemoModeButton size="md" className="self-start sm:hidden" />
      </motion.div>

      {s.allOrganized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 flex flex-col gap-3 rounded-4xl bg-leaf-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6"
          data-testid="dashboard-complete"
        >
          <div className="flex items-center gap-3">
            <PartyPopper className="h-8 w-8 flex-none text-mango-300" />
            <div>
              <p className="font-display text-2xl font-semibold">Warehouse organized!</p>
              <p className="text-leaf-100">
                All six products are on the right shelf. <AnimatedNumber value={s.wastePrevented} format={(n) => formatCurrency(n)} duration={1.4} /> of stock saved
                from expiring unnoticed.
              </p>
            </div>
          </div>
          <span className="chip self-start bg-white/15 py-2 text-base text-white sm:self-auto">
            <Star className="h-4 w-4 fill-mango-300 text-mango-300" /> <AnimatedNumber value={points} duration={1.4} /> points
          </span>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          href="/scanner"
          className="group mt-6 flex items-center justify-between gap-4 overflow-hidden rounded-5xl bg-leaf-600 p-6 text-white shadow-lift transition hover:bg-leaf-700 sm:p-8"
          data-testid="dashboard-scan"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-leaf-100">Start here</p>
            <p className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Scan a Product</p>
            <p className="mt-2 max-w-sm text-leaf-50">Point your camera at a barcode to see its expiry and where it belongs.</p>
            <span className="btn btn-lg mt-5 bg-white text-leaf-700 group-hover:bg-cream-100">
              <ScanLine className="h-5 w-5" /> Open scanner <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
          <div className="relative hidden h-40 w-56 flex-none sm:block" aria-hidden>
            <div className="absolute inset-x-6 bottom-2 h-3 rounded-full bg-black/10 blur-sm" />
            <ProductArt id="milk" className="absolute bottom-3 left-2 h-32 w-32 transition-transform duration-300 group-hover:-rotate-3" />
            <ProductArt id="paneer" className="absolute bottom-3 right-2 h-28 w-28 transition-transform duration-300 group-hover:rotate-3" />
            <span className="absolute left-1/2 top-4 h-[3px] w-40 -translate-x-1/2 rounded-full bg-mango-300 shadow-[0_0_12px_rgba(248,203,99,0.9)]" />
          </div>
        </Link>
      </motion.div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((st, i) => (
          <motion.div
            key={st.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="card flex items-center gap-4 p-5"
            data-testid={`stat-${i}`}
          >
            <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${st.tone}`}>
              <st.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-muted">{st.label}</p>
              <p className="font-display text-4xl font-semibold text-ink">
                <AnimatedNumber value={st.value} />
                <span className="text-xl text-ink-faint">{st.suffix}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Needs attention</h2>
            <Link href="/stock" className="text-sm font-bold text-leaf-700 hover:underline">
              My Stock →
            </Link>
          </div>
          {attention.length === 0 ? (
            <p className="mt-4 rounded-3xl bg-leaf-50 p-4 font-semibold text-leaf-700">Nothing urgent. Every product that expires soon is on the right shelf. 🌿</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {attention.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-3xl bg-cream-100 p-3">
                  <ProductArt id={i.id} className="h-12 w-12 flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{i.name}</p>
                    <p className="text-sm font-semibold" style={{ color: ZONES[i.recommendedZone].ink }}>
                      {formatDaysLeft(i.daysUntilExpiry)} · {i.quantity} units
                    </p>
                  </div>
                  <ZoneBadge zone={i.recommendedZone} size="sm" pulse />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4">
          <section className="rounded-4xl bg-mango-100 p-6">
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-mango-700">
              <Lightbulb className="h-4 w-4" /> Today’s Tip
            </p>
            <p className="mt-2 font-display text-2xl font-semibold leading-snug text-ink">“{TIPS[tip]}”</p>
          </section>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/warehouse" className="card group p-5 transition hover:-translate-y-0.5">
              <Warehouse className="h-6 w-6 text-leaf-600" />
              <p className="mt-3 font-bold text-ink">3D Warehouse</p>
              <p className="text-sm text-ink-muted">Organize as the shopkeeper</p>
            </Link>
            <Link href="/demo" className="card group p-5 transition hover:-translate-y-0.5">
              <Printer className="h-6 w-6 text-soil-500" />
              <p className="mt-3 font-bold text-ink">Demo barcodes</p>
              <p className="text-sm text-ink-muted">Print all six</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

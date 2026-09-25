'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine, CalendarClock, LayoutList, ChevronRight } from 'lucide-react';
import { ProductArt, BoxArt } from '@/components/art/ProductArt';
import { ShopScene } from '@/components/art/ShopScene';
import { SpotBasket, SpotCalendar, SpotIdentify, SpotPriority, SpotScan, SpotShelf } from '@/components/art/Spots';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { ShelfLifeBar } from '@/components/ui/ShelfLifeBar';
import { Reveal, SectionHeading } from '@/components/ui/Reveal';
import { GENERATED_IMAGES } from '@/lib/assets';

/* ------------------------------------------------------------------ */
/* What is Smart Stock?                                                */
/* ------------------------------------------------------------------ */

export function WhatIs() {
  return (
    <section id="what" className="scroll-mt-20 pb-20 pt-12 sm:pb-28 sm:pt-16">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="What is Smart Stock?"
            title={<>A digital helper for the grocery shop counter.</>}
            lead="Smart Stock is a digital assistant for grocery shops. It helps shopkeepers keep track of products, understand which items are getting close to expiry, and organize stock so older products get sold first."
          />
          <Reveal delay={0.1} className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: ScanLine, t: 'Scan', d: 'Any phone camera reads the barcode.' },
              { icon: CalendarClock, t: 'See days left', d: 'Expiry shown in plain words.' },
              { icon: LayoutList, t: 'Know the shelf', d: 'Fresh, Sell Soon or Sell First.' },
            ].map((f) => (
              <div key={f.t} className="border-l-2 border-leaf-200 pl-4">
                <f.icon className="h-6 w-6 text-leaf-600" />
                <p className="mt-2 font-bold text-ink">{f.t}</p>
                <p className="text-sm text-ink-muted">{f.d}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative mx-auto aspect-square w-full max-w-[520px]">
          <div className="absolute inset-[6%] rounded-full bg-leaf-100" />
          <div className="absolute inset-[18%] rounded-full bg-leaf-50" />
          <ProductArt id="rice" className="absolute bottom-[10%] left-[2%] w-[30%]" />
          <ProductArt id="bread" className="absolute left-[6%] top-[14%] w-[26%]" />
          <ProductArt id="juice" className="absolute right-[2%] top-[10%] w-[24%]" />
          <BoxArt className="absolute bottom-[8%] right-[4%] w-[28%]" />
          <PhoneMock className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2" />
        </Reveal>
      </div>
    </section>
  );
}

function PhoneMock({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="rounded-[34px] bg-white p-2.5 shadow-float ring-1 ring-cream-300">
        <div className="overflow-hidden rounded-[26px] bg-background">
          <div className="flex items-center gap-1.5 bg-leaf-50 px-3 py-2 text-[10px] font-extrabold text-leaf-700">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-leaf-500 text-[8px] text-white">✓</span> Product Found
          </div>
          <div className="p-3">
            <div className="flex items-center justify-center rounded-2xl bg-tomato-50 py-2">
              <ProductArt id="milk" className="h-20 w-20" />
            </div>
            <p className="mt-2 font-display text-xl font-semibold leading-none">Milk</p>
            <p className="text-[10px] font-semibold text-ink-muted">42 units · Dairy</p>
            <p className="mt-2 text-xs font-extrabold text-tomato-700">2 days left</p>
            <ShelfLifeBar days={2} showLabel={false} className="mt-1 [&_span]:h-1.5" />
            <ZoneBadge zone="SELL_FIRST" size="sm" className="mt-3" />
            <div className="mt-3 rounded-full bg-leaf-600 py-1.5 text-center text-[10px] font-extrabold text-white">Arrange Product</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The Problem                                                         */
/* ------------------------------------------------------------------ */

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-20 bg-cream-100 py-20 sm:py-28">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <Reveal className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-5xl shadow-lift ring-1 ring-cream-300">
              {GENERATED_IMAGES.shopkeeperBefore ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={GENERATED_IMAGES.shopkeeperBefore} alt="An anxious shopkeeper surrounded by too many boxes" className="block aspect-[16/11] w-full object-cover" />
              ) : (
                <ShopScene state="chaos" className="block w-full" />
              )}
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-ink-muted">“Too much stock. I don’t know what will expire.”</p>
          </Reveal>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow={<span className="text-tomato-600">The Problem</span>}
              title="Old stock hides behind new stock."
              lead="Grocery shops keep lots of products in storage. When a new delivery arrives, it often gets stacked in front — and the older products get pushed to the back."
            />
            <Reveal delay={0.1}>
              <HiddenStock />
            </Reveal>
          </div>
        </div>

        <Reveal className="mx-auto mt-20 max-w-4xl text-center">
          <p className="display-xl text-3xl leading-tight sm:text-5xl">
            The problem isn’t simply having too much stock.
            <span className="mt-2 block text-leaf-600">It’s not knowing what needs attention first.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** Small story: a delivery covers the old milk, which then expires unnoticed. */
function HiddenStock() {
  const steps = [
    { t: 'Product expires', c: 'bg-tomato-100 text-tomato-700' },
    { t: 'Money is lost', c: 'bg-mango-100 text-mango-700' },
    { t: 'Food is wasted', c: 'bg-cream-200 text-soil-700' },
  ];
  return (
    <div className="mt-8 rounded-4xl bg-white p-5 shadow-soft">
      <motion.div
        className="relative h-36 overflow-hidden rounded-3xl bg-cream-100"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.7 }}
      >
        <div className="shelf-plank absolute inset-x-0 bottom-6 h-3" />
        <motion.div className="absolute bottom-8 left-[12%]" variants={{ hidden: { opacity: 1 }, show: { opacity: 0.55, transition: { delay: 1.6, duration: 0.6 } } }}>
          <ProductArt id="milk" className="h-24 w-24" />
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-ink-muted shadow-soft">old</span>
        </motion.div>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-8"
            style={{ left: `${6 + i * 17}%` }}
            variants={{
              hidden: { x: 480, opacity: 0 },
              show: { x: 0, opacity: 1, transition: { delay: 0.5 + i * 0.25, type: 'spring', stiffness: 120, damping: 18 } },
            }}
          >
            <BoxArt className="h-24 w-24" label={i === 1} />
          </motion.div>
        ))}
        <motion.span
          className="absolute left-[10%] top-3 rounded-lg bg-tomato-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-soft"
          variants={{
            hidden: { opacity: 0, scale: 1.6, rotate: -14 },
            show: { opacity: 1, scale: 1, rotate: -8, transition: { delay: 1.9, type: 'spring', stiffness: 300, damping: 14 } },
          }}
        >
          Expired — hidden!
        </motion.span>
        <motion.span
          className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink shadow-soft"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.3 } } }}
        >
          🚚 New delivery
        </motion.span>
      </motion.div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="text-ink-muted">If nobody notices:</span>
        {steps.map((s, i) => (
          <React.Fragment key={s.t}>
            {i > 0 && <ChevronRight className="h-4 w-4 text-ink-faint" />}
            <span className={`rounded-full px-3 py-1 ${s.c}`}>{s.t}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The Solution                                                        */
/* ------------------------------------------------------------------ */

const FLOW = [
  { t: 'Scan', d: 'Point a phone at the barcode.', Art: SpotScan },
  { t: 'Identify', d: 'The product is recognised.', Art: SpotIdentify },
  { t: 'Check expiry', d: 'See exactly how many days are left.', Art: SpotCalendar },
  { t: 'Prioritize', d: 'Closest expiry goes to the top.', Art: SpotPriority },
  { t: 'Organize', d: 'Put it on the right shelf.', Art: SpotShelf },
  { t: 'Sell first', d: 'Older stock sells before it spoils.', Art: SpotBasket },
];

export function Solution() {
  return (
    <section id="solution" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          align="center"
          eyebrow="The Solution"
          title="A Smarter Way to Manage Stock"
          lead="Six small steps turn a crowded storeroom into shelves that tell you what to sell next."
        />
        <div className="relative mt-16">
          <motion.div
            className="absolute left-[8%] right-[8%] top-[64px] hidden h-1 origin-left rounded-full bg-gradient-to-r from-leaf-200 via-mango-200 to-leaf-300 lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <ol className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {FLOW.map(({ t, d, Art }, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-cream-300">
                  <Art className="h-24 w-24" />
                  <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-extrabold text-white">{i + 1}</span>
                </div>
                <p className="mt-4 font-display text-xl font-semibold uppercase tracking-wide text-ink">{t}</p>
                <p className="mt-1 max-w-[12rem] text-sm text-ink-muted">{d}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

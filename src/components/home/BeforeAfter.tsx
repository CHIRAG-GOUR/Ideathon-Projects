'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { ShopScene } from '@/components/art/ShopScene';
import { SectionHeading } from '@/components/ui/Reveal';
import { GENERATED_IMAGES } from '@/lib/assets';

const WITHOUT = ['Extra stock', 'Unknown expiry', 'Messy warehouse', 'Products forgotten', 'Higher waste'];
const WITH = ['Expiry visible', 'Stock organized', 'Sell-first products identified', 'Warehouse sorted', 'Less waste'];

/** "From Stock Chaos to Smart Shelves" — the right-hand shop organises itself as you scroll. */
export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'center 45%'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const done = useMotionValue(1);
  const progress = reduce ? done : smooth;

  return (
    <section id="story" className="scroll-mt-20 bg-cream-100 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading align="center" eyebrow="Before & after" title="From Stock Chaos to Smart Shelves" lead="Same shop. Same shopkeeper. Same stock. The only difference is knowing what needs attention first." />

        <div ref={ref} className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="overflow-hidden rounded-5xl bg-white shadow-soft ring-1 ring-inset ring-cream-300">
            <div className="flex items-center justify-between px-6 pt-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-tomato-600">Without Visionary X</p>
              <span className="text-xs font-bold text-ink-faint">Before</span>
            </div>
            <div className="p-4">
              {GENERATED_IMAGES.shopkeeperBefore ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={GENERATED_IMAGES.shopkeeperBefore} alt="An anxious shopkeeper surrounded by too many boxes" className="block aspect-[16/11] w-full rounded-4xl object-cover" />
              ) : (
                <ShopScene state="chaos" className="block w-full rounded-4xl" />
              )}
            </div>
            <div className="px-6 pb-6">
              <p className="font-display text-2xl font-semibold leading-snug text-ink">“Too much stock. Too many boxes. Too many expiry dates to remember.”</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {WITHOUT.map((t) => (
                  <li key={t} className="chip bg-tomato-50 py-1.5 text-tomato-700">
                    <X className="h-3.5 w-3.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="overflow-hidden rounded-5xl bg-white shadow-lift ring-2 ring-inset ring-leaf-200">
            <div className="flex items-center justify-between px-6 pt-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-leaf-700">With Visionary X</p>
              <span className="text-xs font-bold text-ink-faint">After</span>
            </div>
            <div className="p-4">
              {GENERATED_IMAGES.shopkeeperBefore && GENERATED_IMAGES.shopkeeperAfter ? (
                <PhotoMorph before={GENERATED_IMAGES.shopkeeperBefore} after={GENERATED_IMAGES.shopkeeperAfter} progress={progress} />
              ) : (
                <ShopScene progress={progress} state="tidy" className="block w-full rounded-4xl" />
              )}
            </div>
            <div className="px-6 pb-6">
              <p className="font-display text-2xl font-semibold leading-snug text-ink">“Scan. Understand. Organize. Sell smarter.”</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {WITH.map((t, i) => (
                  <Label key={t} text={t} index={i} progress={progress} />
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Label({ text, index, progress }: { text: string; index: number; progress: ReturnType<typeof useMotionValue<number>> }) {
  const start = 0.35 + index * 0.1;
  const opacity = useTransform(progress, [start, start + 0.12], [0.25, 1]);
  const scale = useTransform(progress, [start, start + 0.12], [0.92, 1]);
  return (
    <motion.li style={{ opacity, scale }} className="chip bg-leaf-50 py-1.5 text-leaf-700">
      <Check className="h-3.5 w-3.5" /> {text}
    </motion.li>
  );
}

/** Cross-fades generated photos (if provided) in step with scrolling. */
function PhotoMorph({ before, after, progress }: { before: string; after: string; progress: ReturnType<typeof useMotionValue<number>> }) {
  const opacity = useTransform(progress, [0.3, 0.7], [0, 1]);
  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-4xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={after} alt="The same shopkeeper, relaxed, in an organised shop" style={{ opacity }} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

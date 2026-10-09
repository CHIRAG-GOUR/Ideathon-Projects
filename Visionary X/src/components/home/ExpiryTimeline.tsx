'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Leaf, Clock3, Hourglass, Flame, Trash2 } from 'lucide-react';
import { ProductArt } from '@/components/art/ProductArt';
import { SectionHeading } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

const STAGES = [
  { t: 'Fresh', d: 'Just arrived. Plenty of time.', color: '#2F8F55', soft: '#E1F2E4', Icon: Leaf },
  { t: 'Getting older', d: 'Still good — keep an eye on it.', color: '#5DB277', soft: '#F1F8F1', Icon: Clock3 },
  { t: 'Sell soon', d: 'A few days left. Move it forward.', color: '#F2A516', soft: '#FDF1D3', Icon: Hourglass },
  { t: 'Expiring', d: 'Sell it today!', color: '#E4572E', soft: '#FDE6DF', Icon: Flame },
  { t: 'Waste', d: 'Too late. Money and food are lost.', color: '#8A6237', soft: '#F2E7D6', Icon: Trash2 },
];

export function ExpiryTimeline() {
  const [stage, setStage] = useState(0);
  const touched = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  // Walk through the stages once when the section appears.
  useEffect(() => {
    if (!inView) return;
    const timers = STAGES.map((_, i) => setTimeout(() => !touched.current && setStage(i), 500 + i * 900));
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const s = STAGES[stage];
  const pct = (stage / (STAGES.length - 1)) * 100;

  return (
    <section id="expiry" className="scroll-mt-20 bg-cream-100 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading align="center" eyebrow="Why expiry matters" title="Every product has a clock." lead="Watch a bottle of milk move through time. Drag the slider — the earlier you notice, the easier it is to sell." />

        <div ref={ref} className="mx-auto mt-14 max-w-4xl rounded-5xl bg-white p-6 shadow-soft sm:p-10">
          <div className="relative h-44">
            <div className="absolute inset-x-6 bottom-8 h-2 rounded-full bg-gradient-to-r from-leaf-500 via-mango-400 to-tomato-500" />
            <div className="absolute inset-x-6 bottom-8 h-2">
              {STAGES.map((st, i) => (
                <span key={st.t} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-soft" style={{ left: `${(i / (STAGES.length - 1)) * 100}%`, background: st.color }} />
              ))}
            </div>
            <div className="absolute inset-x-6 bottom-12 top-0">
              <motion.div className="absolute bottom-0" animate={{ left: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ x: '-50%' }}>
                <motion.div animate={{ rotate: stage === 4 ? 78 : 0, y: stage === 4 ? 26 : 0, filter: stage >= 3 ? `saturate(${stage === 4 ? 0.2 : 0.7})` : 'saturate(1)' }} transition={{ type: 'spring', stiffness: 140, damping: 14 }}>
                  <ProductArt id="milk" className="h-28 w-28" />
                </motion.div>
                {stage >= 3 && (
                  <motion.span key={stage} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-2 top-0 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-soft" style={{ background: s.color }}>
                    <s.Icon className="h-5 w-5" />
                  </motion.span>
                )}
              </motion.div>
            </div>
          </div>

          <div className="relative -mt-14 h-10 rounded-full focus-within:ring-2 focus-within:ring-leaf-400">
            <label htmlFor="expiry-slider" className="sr-only">
              Move the milk through time
            </label>
            <input
              id="expiry-slider"
              type="range"
              min={0}
              max={STAGES.length - 1}
              step={1}
              value={stage}
              onChange={(e) => {
                touched.current = true;
                setStage(Number(e.target.value));
              }}
              aria-valuetext={s.t}
              className="absolute inset-0 h-full w-full cursor-grab opacity-0 active:cursor-grabbing"
            />
          </div>

          <ol className="mt-6 grid grid-cols-5 gap-2">
            {STAGES.map((st, i) => (
              <li key={st.t}>
                <button
                  onClick={() => {
                    touched.current = true;
                    setStage(i);
                  }}
                  className={cn('w-full rounded-2xl p-2 text-center transition sm:p-3', i === stage ? 'shadow-soft' : 'opacity-60 hover:opacity-100')}
                  style={{ background: i === stage ? st.soft : 'transparent' }}
                >
                  <st.Icon className="mx-auto h-5 w-5" style={{ color: st.color }} />
                  <p className="mt-1 text-xs font-extrabold text-ink sm:text-sm">{st.t}</p>
                  <p className="mt-0.5 hidden text-xs text-ink-muted md:block">{st.d}</p>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center font-display text-2xl leading-snug text-ink sm:text-3xl">
          “Smart stock rotation helps products that are older or closer to expiry get attention first.”
        </p>
      </div>
    </section>
  );
}

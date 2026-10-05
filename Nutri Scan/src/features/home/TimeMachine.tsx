'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutGroup, motion } from 'framer-motion';
import { useCalmMotion } from '@/lib/motion';
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { ExpiryStatus } from '@/types';
import { STATUS_META, describeDays, statusForDays } from '@/lib/expiry';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { cn } from '@/lib/utils';

/** A sample fridge: days until each item's (saved) expiry date. */
const FRIDGE = [
  { name: 'Milk', e: '🥛', d: 2 },
  { name: 'Paneer', e: '🧀', d: 3 },
  { name: 'Bread', e: '🍞', d: 4 },
  { name: 'Bananas', e: '🍌', d: 5 },
  { name: 'Yogurt', e: '🥣', d: 7 },
  { name: 'Carrots', e: '🥕', d: 9 },
  { name: 'Apples', e: '🍎', d: 14 },
];
const MAX_DAY = 10;
const SHELVES: ExpiryStatus[] = ['use_first', 'use_soon', 'fresh', 'expired'];

function dayLabel(day: number) {
  if (day === 0) return 'Today';
  if (day === 1) return 'Tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + day);
  return `${d.toLocaleDateString('en-IN', { weekday: 'short' })} · in ${day} days`;
}

export function TimeMachine() {
  const reduce = useCalmMotion();
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (day >= MAX_DAY) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setDay((d) => d + 1), 750);
    return () => clearTimeout(t);
  }, [playing, day]);

  const items = FRIDGE.map((f) => ({ ...f, left: f.d - day, status: statusForDays(f.d - day) }));
  const expired = items.filter((i) => i.status === 'expired').length;
  const urgent = items.filter((i) => i.status === 'use_first').length;

  return (
    <section className="bg-lilac-50/70 py-16 sm:py-20" data-testid="time-machine">
      <div className="page">
        <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">Food tracking</p>
            <h2 className="h-display mt-2 text-3xl sm:text-5xl">Watch your fridge age.</h2>
            <p className="mt-3 max-w-xl text-lg text-ink-soft">
              Drag the slider to fast-forward time. Nutri Scan re-sorts everything every day from the dates you saved — dates come from the label or from you, never guessed.
            </p>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Time machine</p>
                <p className="num truncate text-xl font-extrabold text-ink" data-testid="tm-day" data-day={day}>
                  {dayLabel(day)}
                </p>
              </div>
              <div className="flex flex-none gap-1.5">
                <button
                  onClick={() => {
                    if (day >= MAX_DAY) setDay(0);
                    setPlaying((p) => !p);
                  }}
                  className="btn btn-primary h-11 w-11 min-h-0 p-0"
                  aria-label={playing ? 'Pause' : 'Play time forward'}
                  data-testid="tm-play"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setDay(0);
                  }}
                  className="btn btn-secondary h-11 w-11 min-h-0 p-0"
                  aria-label="Back to today"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_DAY}
              step={1}
              value={day}
              onChange={(e) => {
                setPlaying(false);
                setDay(Number(e.target.value));
              }}
              aria-label="Days from today"
              className="mt-3 w-full accent-aqua-600"
              data-testid="tm-slider"
            />
            <div className="flex justify-between text-[11px] font-bold text-ink-faint">
              <span>Today</span>
              <span>+{MAX_DAY} days</span>
            </div>
          </div>
        </div>

        <LayoutGroup>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SHELVES.map((s) => {
              const m = STATUS_META[s];
              const on = items.filter((i) => i.status === s);
              return (
                <div key={s} className={cn('min-h-[150px] rounded-4xl p-3 ring-1 ring-inset transition-colors sm:p-4', s === 'expired' ? 'bg-peach-100/70 ring-peach-200' : 'bg-white/80 ring-cloud-300')} data-shelf={s}>
                  <div className="flex items-center justify-between">
                    <span className="chip" style={{ background: m.soft, color: m.ink }}>
                      {s === 'expired' ? '🗑 Wasted' : m.label}
                    </span>
                    <span className="num text-sm font-extrabold text-ink-muted">{on.length}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {on.map((i) => (
                      <motion.div
                        layout={!reduce}
                        layoutId={reduce ? undefined : `tm-${i.name}`}
                        key={i.name}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className={cn('flex items-center gap-2 rounded-2xl bg-white p-1.5 pr-2 shadow-soft', s === 'expired' && 'opacity-70 grayscale')}
                        data-item={i.name}
                      >
                        <Emoji3D emoji={i.e} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-ink">{i.name}</p>
                          <p className="text-[11px] font-bold leading-tight" style={{ color: m.ink }}>
                            {describeDays(i.left)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-2xl font-semibold text-ink-soft" aria-live="polite" data-testid="tm-summary">
            {expired > 0 ? (
              <>
                <b className="text-coral-600">
                  {expired} {expired === 1 ? 'item' : 'items'} would be wasted
                </b>{' '}
                if nobody noticed. Nutri Scan flags every one of them as <b>Use Soon</b> up to 4 days ahead.
              </>
            ) : urgent > 0 ? (
              <>
                <b className="text-coral-600">{urgent} to use first.</b> That’s what goes on your plate next.
              </>
            ) : (
              <>Everything’s fresh. Press play and see what happens.</>
            )}
          </p>
          <Link href="/food" className="btn btn-primary flex-none">
            Open My Food <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

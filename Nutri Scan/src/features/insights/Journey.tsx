'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, Lock } from 'lucide-react';
import { useKitchen } from '@/features/food/store';
import { BADGES, earnedBadges, scanStreak } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { Emoji3D } from '@/components/ui/Emoji3D';

function useJourney() {
  const foods = useKitchen((s) => s.foods);
  const usage = useKitchen((s) => s.usage);
  const scans = useKitchen((s) => s.scans);
  const kitchenBestStars = useKitchen((s) => s.kitchenBestStars);
  const earned = earnedBadges({ foods, usage, scans, kitchenBestStars });
  return { earned, streak: scanStreak(scans), scans: scans.length };
}

/** Full badge wall for Insights. */
export function Journey() {
  const { earned, streak } = useJourney();
  return (
    <section data-testid="journey">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-extrabold text-ink">Your Journey</h2>
        <span className="chip bg-coral-50 py-2 text-sm text-coral-600">
          <Flame className="h-4 w-4" /> {streak > 0 ? `${streak}-day scan streak` : 'Scan today to start a streak'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BADGES.map((b, i) => {
          const got = earned.includes(b.id);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('rounded-3xl p-4 ring-1 ring-inset', got ? 'bg-white ring-lemon-200' : 'bg-cloud-50 ring-cloud-300')}
              data-badge={b.id}
              data-earned={got}
            >
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-2xl', got ? 'bg-lemon-50' : 'bg-cloud-200 grayscale')}>{got ? <Emoji3D emoji={b.emoji} size={34} /> : <Lock className="h-5 w-5 text-ink-faint" />}</span>
              <p className={cn('mt-2 font-extrabold', got ? 'text-ink' : 'text-ink-muted')}>{b.title}</p>
              <p className="text-xs text-ink-muted">{b.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/** Compact strip for Home. */
export function JourneyStrip() {
  const { earned, streak, scans } = useJourney();
  const hydrated = useKitchen((s) => s.hydrated);
  if (!hydrated || scans === 0) return null;
  const latest = BADGES.filter((b) => earned.includes(b.id)).slice(-4);
  return (
    <section className="page pb-8">
      <Link href="/insights" className="card flex flex-wrap items-center gap-4 p-4 transition hover:shadow-lift" data-testid="journey-strip">
        <span className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Flame className="h-5 w-5 text-coral-500" /> {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </span>
        <span className="flex items-center gap-1">
          {latest.map((b) => (
            <span key={b.id} className="flex h-9 w-9 items-center justify-center rounded-xl bg-lemon-50 text-lg" title={b.title}>
              <Emoji3D emoji={b.emoji} size={26} />
            </span>
          ))}
        </span>
        <span className="ml-auto text-sm font-bold text-aqua-700">
          {earned.length}/{BADGES.length} badges →
        </span>
      </Link>
    </section>
  );
}

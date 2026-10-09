'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getFreshness, getZoneForDays, ZONES } from '@/lib/products';
import { cn } from '@/lib/utils';

/** A small "how much shelf life is left" bar, coloured by urgency. */
export function ShelfLifeBar({ days, className, showLabel = true }: { days: number; className?: string; showLabel?: boolean }) {
  const zone = ZONES[getZoneForDays(days)];
  const fill = getFreshness(days);
  const segments = 10;
  const filled = Math.max(1, Math.round(fill * segments));
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-ink-muted">
          <span>Shelf life left</span>
          <span className="font-bold" style={{ color: zone.ink }}>
            {days === 1 ? '1 day' : `${days} days`}
          </span>
        </div>
      )}
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: segments }).map((_, i) => (
          <motion.span
            key={i}
            className="h-2.5 flex-1 rounded-full"
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
            style={{ background: i < filled ? zone.color : '#EFE1C6' }}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/** Counts up from 0 to `value` once (instant with reduced motion). */
export function CountUp({ value, duration = 0.9, decimals = 0, className, testId }: { value: number; duration?: number; decimals?: number; className?: string; testId?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) => (decimals ? n.toFixed(decimals) : String(Math.round(n)));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => (el.textContent = fmt(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, duration]);
  return (
    <span ref={ref} className={className} data-testid={testId} data-value={value}>
      {fmt(value)}
    </span>
  );
}

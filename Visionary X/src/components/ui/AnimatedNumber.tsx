'use client';

import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/** Counts up to `value` when it scrolls into view (instant with reduced motion). */
export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString('en-IN'),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: '-40px' });
  const reduce = useReducedMotion();
  const from = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!inView || reduce) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

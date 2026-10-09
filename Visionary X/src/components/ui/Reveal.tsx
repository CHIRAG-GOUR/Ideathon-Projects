'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/** Gentle fade-up when a block scrolls into view. Honors reduced motion via MotionConfig. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...rest
}: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <Reveal className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-2xl ${className ?? ''}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="display-xl text-[2.1rem] leading-[1.08] sm:text-5xl">{title}</h2>
      {lead && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{lead}</p>}
    </Reveal>
  );
}

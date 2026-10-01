'use client';
import { motion, useTransform } from 'framer-motion';
import { useHold } from '@core/useHold';
import { Icon, type IconName } from './icons';
import { cx } from './kit';

/** A pill that must be held (default 2 s) — used for the Discreet Alert so it can't fire from a stray tap. */
export function HoldPill({ label, hint, onComplete, icon = 'eyeoff', ms = 2000, className }: { label: string; hint: string; onComplete: () => void; icon?: IconName; ms?: number; className?: string }) {
  const h = useHold(ms, onComplete);
  const w = useTransform(h.progress, (p) => `${p * 100}%`);
  return (
    <button type="button" {...h.handlers} aria-label={`${label}. Press and hold for ${ms / 1000} seconds`} className={cx('relative w-full touch-none select-none overflow-hidden rounded-2xl border border-violet-200 bg-white px-4 py-3.5 text-left shadow-card', className)}>
      <motion.span className="absolute inset-y-0 left-0 bg-violet-100" style={{ width: w }} aria-hidden />
      <span className="relative flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-800 text-white"><Icon name={icon} size={20} /></span>
        <span className="min-w-0">
          <span className="block font-extrabold text-ink">{h.left ? `Keep holding… ${h.left}` : label}</span>
          <span className="block text-xs font-semibold text-ink-muted">{hint}</span>
        </span>
      </span>
    </button>
  );
}

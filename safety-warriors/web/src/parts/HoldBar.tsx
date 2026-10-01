'use client';
import { motion, useTransform } from 'framer-motion';
import { useHold } from '@core/useHold';
import { cx } from '@/ui/kit';
import { Icon } from '@/ui/icons';

/** An emergency action that must be held (2 s) so it never fires from a stray tap while reading. */
export function HoldBar({ label, onComplete, tone = 'sos', ms = 2000 }: { label: string; onComplete: () => void; tone?: 'sos' | 'indigo'; ms?: number }) {
  const h = useHold(ms, onComplete);
  const w = useTransform(h.progress, (p) => `${p * 100}%`);
  return (
    <button type="button" {...h.handlers} aria-label={`${label}. Press and hold for ${ms / 1000} seconds`} className={cx('relative w-full touch-none select-none overflow-hidden rounded-2xl border-b-4 px-4 py-3 text-left font-semibold text-white', tone === 'sos' ? 'border-sos-700 bg-sos-500' : 'border-indigo-900 bg-indigo-700')}>
      <motion.span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: w }} aria-hidden />
      <span className="relative flex items-center gap-2"><Icon name="alert" size={18} />{h.left ? `Keep holding… ${h.left}` : `${label} — hold 2 s`}</span>
    </button>
  );
}

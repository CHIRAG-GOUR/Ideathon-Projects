'use client';
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { useId } from 'react';
import { useHold } from '@core/useHold';
import { cx } from './kit';

const SHIELD = 'M50 6l38 13v28c0 24-16.5 42.5-38 51C28.5 89.5 12 71 12 47V19z';

/** Shield-shaped hold control. The outline fills while held; release early and nothing happens. */
export function SosControl({ onComplete, onPress, onCancel, size = 236, label = 'SOS', sub = 'Hold 3 seconds', tone = 'alert', ms = 3000 }: { onComplete: () => void; onPress?: () => void; onCancel?: () => void; size?: number; label?: string; sub?: string; tone?: 'alert' | 'dark'; ms?: number }) {
  const h = useHold(ms, onComplete, { onPress, onCancel });
  const gid = useId().replace(/:/g, '');
  const dash = useTransform(h.progress, (p) => `${p * 300} 300`);
  const fill = tone === 'alert' ? ['#F05A5D', '#C9262A'] : ['#3E3456', '#1E1533'];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size * 1.02 }}>
      {tone === 'alert' && <motion.div className="absolute inset-4 rounded-full bg-alert-500/15 blur-xl" animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.3, 0.7] }} transition={{ duration: 2.6, repeat: Infinity }} />}
      <motion.button
        type="button"
        aria-label={`${label}. Press and hold for ${ms / 1000} seconds`}
        {...h.handlers}
        animate={h.fired ? { scale: [1, 1.12, 1] } : h.holding ? { scale: 0.96 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 480, damping: 20 }}
        className="relative z-10 touch-none select-none outline-none focus-visible:ring-8 focus-visible:ring-violet-200 rounded-full"
        style={{ width: size, height: size * 1.02, WebkitTouchCallout: 'none' }}
      >
        <svg viewBox="0 0 100 102" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={fill[0]} />
              <stop offset="1" stopColor={fill[1]} />
            </linearGradient>
          </defs>
          <path d={SHIELD} fill={tone === 'alert' ? '#FFE3E3' : '#E8E2F2'} transform="translate(0 2)" />
          <path d={SHIELD} fill={`url(#${gid})`} transform="translate(9 9) scale(0.82)" />
          <motion.path d={SHIELD} fill="none" stroke={tone === 'alert' ? '#3B1E77' : '#7C4DDB'} strokeWidth="4" strokeLinecap="round" style={{ strokeDasharray: dash }} pathLength={300} transform="translate(0 2)" />
        </svg>
        <span className="pointer-events-none relative flex h-full flex-col items-center justify-center pb-3 text-white">
          <AnimatePresence mode="popLayout" initial={false}>
            {h.left ? (
              <motion.span key={h.left} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.16 }} className="text-6xl font-extrabold leading-none tabular-nums" aria-live="assertive">
                {h.left}
              </motion.span>
            ) : (
              <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cx('font-extrabold leading-none tracking-tight', label.length > 4 ? 'text-2xl' : size < 190 ? 'text-3xl' : 'text-5xl')}>
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="mt-2 text-xs font-bold text-white/85">{h.left ? 'Keep holding…' : sub}</span>
        </span>
      </motion.button>
    </div>
  );
}

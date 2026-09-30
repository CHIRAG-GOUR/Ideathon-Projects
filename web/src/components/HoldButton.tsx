'use client';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from './ui';

const HOLD_MS = 3000;

interface Props {
  onComplete: () => void;
  onPress?: () => void;
  onCancel?: () => void;
  onTick?: (secondsLeft: number) => void;
  variant?: 'sos' | 'end';
  size?: number;
  disabled?: boolean;
  label?: string;
}

/**
 * Press and hold for 3 continuous seconds. A tap, or releasing early, never triggers anything.
 * onComplete fires the instant the hold completes — no animation runs before it.
 */
export function HoldButton({ onComplete, onPress, onCancel, onTick, variant = 'sos', size = 248, disabled, label }: Props) {
  const progress = useMotionValue(0);
  const [left, setLeft] = useState<number | null>(null);
  const [fired, setFired] = useState(false);
  const raf = useRef<number>();
  const start = useRef(0);
  const lastTick = useRef(4);
  const done = useRef(false);

  const stop = (cancelled: boolean) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = undefined;
    if (cancelled && !done.current && start.current) onCancel?.();
    start.current = 0;
    setLeft(null);
    if (!done.current) animate(progress, 0, { duration: 0.25 });
  };

  const loop = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    progress.set(p);
    const secs = Math.ceil(3 - p * 3);
    if (secs !== lastTick.current && secs > 0) {
      lastTick.current = secs;
      setLeft(secs);
      onTick?.(secs);
    }
    if (p >= 1) {
      done.current = true;
      start.current = 0;
      setLeft(null);
      setFired(true);
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(loop);
  };

  const begin = () => {
    if (disabled || start.current) return;
    done.current = false;
    setFired(false);
    lastTick.current = 4;
    start.current = performance.now();
    onPress?.();
    raf.current = requestAnimationFrame(loop);
  };

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);
  useEffect(() => {
    if (!fired) return;
    const t = setTimeout(() => {
      setFired(false);
      progress.set(0);
    }, 900);
    return () => clearTimeout(t);
  }, [fired, progress]);

  const r = 46;
  const dash = useTransform(progress, (p) => `${p * 2 * Math.PI * r} ${2 * Math.PI * r}`);
  const sos = variant === 'sos';

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {sos && !disabled && (
        <>
          <motion.span className="absolute inset-3 rounded-full bg-sos-400/25" animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }} />
          <motion.span className="absolute inset-7 rounded-full bg-sos-400/30" animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0.1, 0.8] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
        </>
      )}
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke={sos ? '#FFE0E6' : '#F2DFE3'} strokeWidth="5" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={sos ? '#F02452' : '#2A1519'} strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: dash }} />
      </svg>
      <motion.button
        type="button"
        aria-label={label ?? (sos ? 'SOS. Press and hold for 3 seconds to send an emergency alert' : 'End SOS. Press and hold for 3 seconds')}
        disabled={disabled}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={() => stop(true)}
        onPointerCancel={() => stop(true)}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && begin()}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop(true)}
        onContextMenu={(e) => e.preventDefault()}
        animate={fired ? { scale: [1, 1.14, 1] } : left ? { scale: 0.95 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className={cn(
          'relative z-10 grid touch-none select-none place-items-center rounded-full outline-none focus-visible:ring-8 focus-visible:ring-sos-200',
          sos ? 'bg-gradient-to-br from-sos-400 via-sos-500 to-sos-700 text-white shadow-glow' : 'bg-ink text-white shadow-soft',
          disabled && 'opacity-50',
        )}
        style={{ width: size * 0.74, height: size * 0.74, WebkitTouchCallout: 'none' }}
      >
        <span className="pointer-events-none flex flex-col items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {left ? (
              <motion.span key={left} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.18 }} className="text-7xl font-extrabold leading-none tabular-nums" aria-live="assertive">
                {left}
              </motion.span>
            ) : (
              <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('font-extrabold leading-none tracking-tight', sos ? 'text-6xl' : 'text-2xl')}>
                {sos ? 'SOS' : 'END SOS'}
              </motion.span>
            )}
          </AnimatePresence>
          <span className={cn('mt-2 font-semibold', sos ? 'text-sm text-white/85' : 'text-xs text-white/75')}>{left ? 'Keep holding…' : 'Hold for 3 seconds'}</span>
        </span>
      </motion.button>
    </div>
  );
}

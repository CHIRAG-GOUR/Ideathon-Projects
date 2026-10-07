'use client';
import { useEffect, useRef, useState } from 'react';
import { useMotionValue, animate, type MotionValue } from 'framer-motion';

/**
 * Press-and-hold logic for emergency controls (headless — each app draws its own control).
 * A tap or early release never triggers; onComplete fires the instant the hold completes.
 */
export function useHold(ms: number, onComplete: () => void, opts: { onPress?: () => void; onCancel?: () => void; onTick?: (left: number) => void; disabled?: boolean } = {}) {
  const progress: MotionValue<number> = useMotionValue(0);
  const [left, setLeft] = useState<number | null>(null);
  const [fired, setFired] = useState(false);
  const raf = useRef<number>();
  const start = useRef(0);
  const last = useRef(99);
  const done = useRef(false);
  const cb = useRef({ onComplete, ...opts });
  cb.current = { onComplete, ...opts };

  const loop = () => {
    const p = Math.min(1, (performance.now() - start.current) / ms);
    progress.set(p);
    const secs = Math.ceil((ms / 1000) * (1 - p));
    if (secs !== last.current && secs > 0) {
      last.current = secs;
      setLeft(secs);
      cb.current.onTick?.(secs);
    }
    if (p >= 1) {
      done.current = true;
      start.current = 0;
      setLeft(null);
      setFired(true);
      cb.current.onComplete();
      return;
    }
    raf.current = requestAnimationFrame(loop);
  };
  const begin = () => {
    if (cb.current.disabled || start.current) return;
    done.current = false;
    setFired(false);
    last.current = 99;
    start.current = performance.now();
    cb.current.onPress?.();
    raf.current = requestAnimationFrame(loop);
  };
  const end = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = undefined;
    if (!done.current && start.current) cb.current.onCancel?.();
    start.current = 0;
    setLeft(null);
    if (!done.current) animate(progress, 0, { duration: 0.2 });
  };
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);
  useEffect(() => {
    if (!fired) return;
    const t = setTimeout(() => (setFired(false), progress.set(0)), 900);
    return () => clearTimeout(t);
  }, [fired, progress]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      begin();
    },
    onPointerUp: end,
    onPointerCancel: end,
    onKeyDown: (e: React.KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && begin(),
    onKeyUp: (e: React.KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && end(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  return { progress, left, fired, holding: left !== null, handlers };
}

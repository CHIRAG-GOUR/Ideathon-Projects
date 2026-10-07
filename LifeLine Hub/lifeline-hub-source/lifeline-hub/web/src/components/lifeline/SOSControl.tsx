'use client';
/**
 * SOSControl — the deliberate emergency control. HOLD TO ACTIVATE (3 s) with a progress ring and three stages:
 * 1 Preparing emergency response… · 2 Locating you… · 3 SOS ACTIVE. A tap or early release never triggers.
 * Used by SOS Push, Home, and the cinematic's interactive moment (same component, same hold).
 */
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { useId, useState } from 'react';
import { useHold } from '@core/useHold';
import { sound } from '@/services/sound';
import { cx } from '@/ui/kit';

export const SOS_STAGES = ['Hold to activate', 'Preparing emergency response…', 'Locating you…', 'Activating…'];

export function SOSControl({ onActivated, size = 248, dark, label, disabled, showCaption = true, resetAfter, className }: {
  onActivated: () => void;
  size?: number;
  dark?: boolean;
  label?: string;
  disabled?: boolean;
  showCaption?: boolean;
  /** ms after which the control returns to idle (practice / film); omit to stay "active". */
  resetAfter?: number;
  className?: string;
}) {
  const id = useId().replace(/[:«»]/g, '');
  const [done, setDone] = useState(false);
  const h = useHold(3000, () => {
    setDone(true);
    sound.activate();
    onActivated();
    if (resetAfter) setTimeout(() => setDone(false), resetAfter);
  }, {
    disabled,
    onPress: () => { sound.unlock(); sound.click(); setDone(false); try { navigator.vibrate?.(30); } catch { /* */ } },
    onTick: (left) => { if (left < 3) sound.tick(3 - left + 1); try { navigator.vibrate?.(25); } catch { /* */ } },
    onCancel: () => sound.cancel(),
  });
  const stage = h.left === null ? 0 : 4 - h.left;
  const R = 46, C = 2 * Math.PI * R;
  const dash = useTransform(h.progress, (v) => `${v * C} ${C}`);
  const fill = useTransform(h.progress, (v) => 0.25 + v * 0.75);

  return (
    <div className={cx('flex flex-col items-center', className)}>
      <motion.button
        type="button"
        {...h.handlers}
        disabled={disabled}
        aria-label={label ?? 'SOS. Press and hold for 3 seconds to activate'}
        className="relative touch-none select-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/50"
        style={{ width: size, height: size, WebkitTouchCallout: 'none' }}
        whileHover={{ scale: disabled ? 1 : 1.015 }}
        animate={h.holding ? { scale: 0.975 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        {/* halo */}
        <AnimatePresence>
          {(done || h.holding) && (
            <motion.span key="halo" className="absolute inset-[-14%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'radial-gradient(closest-side, rgba(240,56,74,.35), transparent)' }} />
          )}
        </AnimatePresence>
        {done && [0, 1, 2].map((i) => (
          <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-coral-400" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7 }} />
        ))}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${id}-ring`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#FF8C93" /><stop offset="1" stopColor="#F0384A" /></linearGradient>
            <radialGradient id={`${id}-core`} cx=".5" cy=".38" r=".7"><stop offset="0" stopColor={dark ? '#203A5E' : '#1A2D4C'} /><stop offset="1" stopColor="#081325" /></radialGradient>
            <radialGradient id={`${id}-hot`} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#FF5A64" /><stop offset="1" stopColor="#D02035" /></radialGradient>
          </defs>
          {/* bezel ticks */}
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2, r1 = i % 5 ? 49 : 48, r2 = 50;
            return <line key={i} x1={50 + Math.sin(a) * r1} y1={50 - Math.cos(a) * r1} x2={50 + Math.sin(a) * r2} y2={50 - Math.cos(a) * r2} stroke={dark ? '#5C7393' : '#9AA8B8'} strokeWidth={i % 5 ? 0.35 : 0.7} opacity=".7" />;
          })}
          <circle cx="50" cy="50" r={R} fill="none" stroke={dark ? 'rgba(255,255,255,.08)' : '#E1E9EE'} strokeWidth="3" />
          <motion.circle cx="50" cy="50" r={R} fill="none" stroke={`url(#${id}-ring)`} strokeWidth="3.4" strokeLinecap="round" style={{ strokeDasharray: done ? `${C} ${C}` : dash }} transform="rotate(-90 50 50)" />
          {/* three stage marks */}
          {[1, 2, 3].map((n) => {
            const a = (n / 3) * Math.PI * 2;
            const lit = done || stage > n || (stage === n && n < 3);
            return <circle key={n} cx={50 + Math.sin(a) * R} cy={50 - Math.cos(a) * R} r="2.4" fill={lit ? '#FF5A64' : dark ? '#152946' : '#fff'} stroke={lit ? '#fff' : dark ? '#34507A' : '#CCD8E0'} strokeWidth=".8" />;
          })}
          {/* core */}
          <circle cx="50" cy="50" r="38" fill={`url(#${id}-core)`} />
          <motion.circle cx="50" cy="50" r="38" fill={`url(#${id}-hot)`} style={{ scale: done ? 1 : fill, opacity: done || h.holding ? 1 : 0, transformOrigin: '50px 50px' }} />
          <circle cx="50" cy="50" r="37.5" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".6" />
          <path d="M22 38 A30 30 0 0 1 78 38" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-white">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="done" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                <span className="font-display font-bold leading-none tracking-wide" style={{ fontSize: size * 0.13 }}>SOS</span>
                <span className="mt-1 font-mono font-semibold uppercase tracking-[0.2em]" style={{ fontSize: Math.max(9, size * 0.045) }}>Active</span>
              </motion.span>
            ) : stage ? (
              <motion.span key={stage} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.25 }} className="font-display font-bold leading-none tabular" style={{ fontSize: size * 0.24 }}>
                {stage}
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <span className="font-display font-bold leading-none tracking-[0.04em]" style={{ fontSize: size * 0.15 }}>SOS</span>
                <span className="mt-1.5 font-mono font-medium uppercase tracking-[0.2em] text-coral-200" style={{ fontSize: Math.max(9, size * 0.042) }}>Hold 3 s</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
      {showCaption && (
        <div className="mt-4 h-12 text-center" aria-live="assertive">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={done ? 'done' : stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
              className={cx('font-display text-[17px] font-semibold tracking-tight', done ? 'text-coral-500' : stage ? (dark ? 'text-white' : 'text-ink') : dark ? 'text-midnight-200' : 'text-ink-muted')}>
              {done ? 'SOS ACTIVE' : stage ? `${stage} · ${SOS_STAGES[stage]}` : 'HOLD TO ACTIVATE'}
            </motion.p>
          </AnimatePresence>
          <p className={cx('mt-0.5 text-[12px]', dark ? 'text-midnight-300' : 'text-ink-faint')}>{done ? 'Response starting' : h.holding ? 'Keep holding · release to cancel' : 'A tap does nothing. Release early to cancel.'}</p>
        </div>
      )}
    </div>
  );
}

'use client';
/**
 * SOSControl — LifeLine's own emergency control, drawn as an ambulance beacon: a white housing ringed with the
 * red-and-white reflective livery of an ambulance, a glass light dome in ambulance red, and a heartbeat that
 * becomes the progress. HOLD TO ACTIVATE (3 s) with three stages:
 *   1 Preparing emergency response…  ·  2 Locating you…  ·  3 SOS ACTIVE
 * While held the beacon's light sweeps; the livery ring fills in red. A tap or early release never triggers.
 * Used by SOS Push, Home, and the film's interactive moment (same component, same hold).
 */
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { useId, useState } from 'react';
import { useHold } from '@core/useHold';
import { sound } from '@/services/sound';
import { cx } from '@/ui/kit';

export const SOS_STAGES = ['Hold to activate', 'Preparing emergency response…', 'Locating you…', 'Activating…'];

const SEGMENTS = 36; // livery chevrons round the ring
const R_RING = 45.5, C_RING = 2 * Math.PI * R_RING;

export function SOSControl({ onActivated, size = 248, label, disabled, showCaption = true, resetAfter, className }: {
  onActivated: () => void;
  size?: number;
  /** kept for API compatibility — the control is always drawn on light surfaces */
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
    onPress: () => { sound.unlock(); sound.click(); setDone(false); try { navigator.vibrate?.(30); } catch { /* unsupported */ } },
    onTick: (left) => { if (left < 3) sound.tick(3 - left + 1); try { navigator.vibrate?.(25); } catch { /* unsupported */ } },
    onCancel: () => sound.cancel(),
  });
  const stage = h.left === null ? 0 : 4 - h.left;
  const dash = useTransform(h.progress, (v) => `${v * C_RING} ${C_RING}`);
  const glow = useTransform(h.progress, (v) => 0.15 + v * 0.85);
  const ecg = useTransform(h.progress, (v) => 1 - v);
  const lit = done || h.holding;

  return (
    <div className={cx('flex flex-col items-center', className)}>
      <motion.button
        type="button"
        {...h.handlers}
        disabled={disabled}
        aria-label={label ?? 'SOS. Press and hold for 3 seconds to activate'}
        className="relative touch-none select-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-coral-500/30"
        style={{ width: size, height: size, WebkitTouchCallout: 'none' }}
        whileHover={{ scale: disabled ? 1 : 1.015 }}
        animate={h.holding ? { scale: 0.975 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        {/* soft red glow on the surface around the beacon while active */}
        <AnimatePresence>
          {lit && <motion.span key="halo" className="absolute inset-[-16%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'radial-gradient(closest-side, rgba(218,30,44,.28), transparent)' }} />}
        </AnimatePresence>
        {done && [0, 1, 2].map((i) => (
          <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-coral-500" initial={{ scale: 1, opacity: 0.55 }} animate={{ scale: 1.55, opacity: 0 }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7 }} />
        ))}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_14px_22px_rgba(14,27,23,.18)]" aria-hidden>
          <defs>
            <radialGradient id={`${id}-house`} cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E9F0EC" /></radialGradient>
            <radialGradient id={`${id}-dome`} cx=".5" cy=".3" r=".75"><stop offset="0" stopColor="#FF6B72" /><stop offset=".55" stopColor="#DA1E2C" /><stop offset="1" stopColor="#8F0F18" /></radialGradient>
            <radialGradient id={`${id}-domeLit`} cx=".5" cy=".32" r=".7"><stop offset="0" stopColor="#FFE3E4" /><stop offset=".35" stopColor="#FF4A55" /><stop offset="1" stopColor="#B71420" /></radialGradient>
            <linearGradient id={`${id}-sweep`} x1="0" x2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset="1" stopColor="#FFFFFF" stopOpacity=".55" /></linearGradient>
            <clipPath id={`${id}-domeClip`}><circle cx="50" cy="50" r="33" /></clipPath>
          </defs>
          {/* housing */}
          <circle cx="50" cy="50" r="49.5" fill={`url(#${id}-house)`} stroke="#DCE8E1" strokeWidth=".6" />
          {/* ambulance livery ring: alternating red / white chevron segments */}
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const a0 = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 0.5) / SEGMENTS) * Math.PI * 2 - Math.PI / 2;
            const p = (a: number, r: number) => `${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`;
            return <path key={i} d={`M ${p(a0, 42.5)} L ${p(a0 + 0.06, 48.4)} L ${p(a1 + 0.06, 48.4)} L ${p(a1, 42.5)} Z`} fill="#DA1E2C" opacity={lit ? 0.35 : 0.9} />;
          })}
          {/* progress: the ring fills in solid red */}
          <motion.circle cx="50" cy="50" r={R_RING} fill="none" stroke="#DA1E2C" strokeWidth="6.2" style={{ strokeDasharray: done ? `${C_RING} ${C_RING}` : dash }} transform="rotate(-90 50 50)" />
          {/* three stage studs */}
          {[1, 2, 3].map((n) => {
            const a = (n / 3) * Math.PI * 2 - Math.PI / 2;
            const on = done || stage > n || (stage === n && n < 3);
            return <circle key={n} cx={50 + Math.cos(a) * R_RING} cy={50 + Math.sin(a) * R_RING} r="3" fill={on ? '#FFFFFF' : '#F4F8F6'} stroke={on ? '#DA1E2C' : '#C4D8CD'} strokeWidth="1.2" />;
          })}
          {/* chrome bezel round the dome */}
          <circle cx="50" cy="50" r="36.5" fill="#F4F8F6" stroke="#C4D8CD" strokeWidth="1" />
          <circle cx="50" cy="50" r="34.6" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
          {/* the beacon dome */}
          <circle cx="50" cy="50" r="33" fill={`url(#${id}-dome)`} />
          <motion.circle cx="50" cy="50" r="33" fill={`url(#${id}-domeLit)`} style={{ opacity: done ? 1 : glow }} />
          {/* fresnel ribs of the lens */}
          <g clipPath={`url(#${id}-domeClip)`} opacity=".18" stroke="#FFFFFF" strokeWidth=".5" fill="none">
            {[8, 15, 22, 29].map((r) => <circle key={r} cx="50" cy="50" r={r} />)}
          </g>
          {/* rotating beacon sweep while held / active */}
          {lit && (
            <g clipPath={`url(#${id}-domeClip)`}>
              <motion.path d="M50 50 L50 15 A35 35 0 0 1 80 32 Z" fill={`url(#${id}-sweep)`} animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} style={{ originX: '50px', originY: '50px', transformBox: 'view-box' }} />
            </g>
          )}
          {/* glass highlight */}
          <ellipse cx="44" cy="31" rx="15" ry="7" fill="#FFFFFF" opacity=".28" transform="rotate(-18 44 31)" />
          {/* heartbeat across the dome: drawn in as the hold progresses */}
          <motion.path d="M24 61 h10 l3 -6 l4 11 l4 -16 l4 11 h27" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: done ? 0 : ecg, opacity: 0.85 }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-white">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="done" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="-mt-[6%] flex flex-col items-center">
                <span className="font-display font-bold leading-none tracking-wide drop-shadow" style={{ fontSize: size * 0.14 }}>SOS</span>
                <span className="mt-1 font-mono font-bold uppercase tracking-[0.2em]" style={{ fontSize: Math.max(9, size * 0.045) }}>Active</span>
              </motion.span>
            ) : stage ? (
              <motion.span key={stage} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.25 }} className="-mt-[6%] font-display font-bold leading-none tabular drop-shadow" style={{ fontSize: size * 0.22 }}>
                {stage}
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mt-[6%] flex flex-col items-center">
                <span className="font-display font-bold leading-none tracking-[0.04em] drop-shadow" style={{ fontSize: size * 0.155 }}>SOS</span>
                <span className="mt-1.5 rounded-full bg-white/20 px-2 py-0.5 font-mono font-semibold uppercase tracking-[0.18em]" style={{ fontSize: Math.max(8.5, size * 0.04) }}>Hold 3 s</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
      {showCaption && (
        <div className="mt-4 h-12 text-center" aria-live="assertive">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={done ? 'done' : stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
              className={cx('font-display text-[17px] font-semibold tracking-tight', done ? 'text-coral-600' : stage ? 'text-ink' : 'text-ink-muted')}>
              {done ? 'SOS ACTIVE' : stage ? `${stage} · ${SOS_STAGES[stage]}` : 'HOLD TO ACTIVATE'}
            </motion.p>
          </AnimatePresence>
          <p className="mt-0.5 text-[12px] text-ink-faint">{done ? 'Response starting' : h.holding ? 'Keep holding · release to cancel' : 'A tap does nothing. Release early to cancel.'}</p>
        </div>
      )}
    </div>
  );
}

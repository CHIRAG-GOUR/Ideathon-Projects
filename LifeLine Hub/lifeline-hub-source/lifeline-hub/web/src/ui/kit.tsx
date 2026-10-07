'use client';
/**
 * LifeLine Hub component kit: command panels, status chips, buttons, metrics with animated counters, bottom
 * sheets, pulse indicators, honesty badges. Motion is fast and deliberate — springs for touch, eases for data.
 */
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------------------------- motion presets
export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
export const soft = { type: 'spring', stiffness: 220, damping: 28 } as const;
export const ease = [0.22, 1, 0.36, 1] as const;
export const stagger = (gap = 0.06, delay = 0) => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } });
export const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

// ---------------------------------------------------------------------------------------------- surfaces
type Tone = 'light' | 'command' | 'emergency' | 'glass';
export function Panel({ tone = 'light', className, children, ...rest }: { tone?: Tone; className?: string; children: ReactNode } & HTMLMotionProps<'section'>) {
  const t = {
    light: 'bg-white border border-line shadow-panel',
    command: 'surface-command text-white border border-white/[0.06] shadow-lift',
    emergency: 'surface-emergency text-white border border-coral-500/25 shadow-lift',
    glass: 'glass border border-white/70 shadow-panel',
  }[tone];
  return <motion.section variants={rise} className={cx('relative min-w-0 overflow-hidden rounded-4xl', t, className)} {...rest}>{children}</motion.section>;
}

export function Kicker({ children, className, tone = 'teal' }: { children: ReactNode; className?: string; tone?: 'teal' | 'cyan' | 'violet' | 'coral' | 'muted' }) {
  const c = { teal: 'text-teal-600', cyan: 'text-cyan-300', violet: 'text-violet-500', coral: 'text-coral-500', muted: 'text-ink-muted' }[tone];
  return <p className={cx('font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em]', c, className)}>{children}</p>;
}

export function SectionHeader({ kicker, title, sub, right, dark, tone }: { kicker?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; dark?: boolean; tone?: 'teal' | 'cyan' | 'violet' | 'coral' }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <Kicker tone={tone ?? (dark ? 'cyan' : 'teal')}>{kicker}</Kicker>}
        <h2 className={cx('mt-1 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]', dark ? 'text-white' : 'text-ink')}>{title}</h2>
        {sub && <p className={cx('mt-1 max-w-2xl text-[14px]', dark ? 'text-midnight-200' : 'text-ink-muted')}>{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- buttons
type BtnTone = 'primary' | 'dark' | 'ghost' | 'coral' | 'soft' | 'white' | 'outline';
export function Btn({ tone = 'primary', size = 'md', icon, className, children, ...rest }: { tone?: BtnTone; size?: 'sm' | 'md' | 'lg'; icon?: IconName; className?: string; children?: ReactNode } & HTMLMotionProps<'button'>) {
  const t = {
    primary: 'bg-teal-500 text-white hover:bg-teal-600 shadow-[0_10px_24px_-12px_rgba(14,159,154,.8)]',
    dark: 'bg-midnight-900 text-white hover:bg-midnight-800',
    ghost: 'text-ink-soft hover:bg-clinic-100',
    coral: 'bg-coral-500 text-white hover:bg-coral-600 shadow-coral',
    soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
    white: 'bg-white text-ink border border-line hover:border-clinic-300',
    outline: 'border border-white/20 text-white hover:bg-white/10',
  }[tone];
  const s = { sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-xl', md: 'h-11 px-4 text-[14px] gap-2 rounded-2xl', lg: 'h-14 px-6 text-[16px] gap-2.5 rounded-2xl' }[size];
  return (
    <motion.button whileTap={{ scale: 0.97 }} transition={spring} className={cx('inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50', t, s, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 17} />}
      {children}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------------------------- status
export type Status = 'active' | 'notified' | 'responding' | 'nearby' | 'verified' | 'pending' | 'ready' | 'locked' | 'scanning' | 'simulated' | 'offline' | 'failed' | 'off' | 'soon' | 'estimated' | 'live';
const STATUS: Record<Status, { label: string; cls: string; icon?: IconName; dot?: string; pulse?: boolean }> = {
  active: { label: 'Active', cls: 'bg-coral-500/15 text-coral-600 ring-coral-500/30', dot: 'bg-coral-500', pulse: true },
  notified: { label: 'Notified', cls: 'bg-vital-50 text-vital-600 ring-vital-500/25', icon: 'check' },
  responding: { label: 'Responding', cls: 'bg-cyan-400/15 text-cyan-600 ring-cyan-500/30', dot: 'bg-cyan-500', pulse: true },
  nearby: { label: 'Nearby', cls: 'bg-teal-50 text-teal-700 ring-teal-500/25', icon: 'location' },
  verified: { label: 'Verified', cls: 'bg-teal-50 text-teal-700 ring-teal-500/25', icon: 'safe' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-500/30', icon: 'clock' },
  ready: { label: 'Ready', cls: 'bg-vital-50 text-vital-600 ring-vital-500/25', dot: 'bg-vital-500' },
  locked: { label: 'Locked', cls: 'bg-vital-50 text-vital-600 ring-vital-500/25', icon: 'location' },
  scanning: { label: 'Scanning', cls: 'bg-cyan-400/15 text-cyan-600 ring-cyan-500/30', dot: 'bg-cyan-500', pulse: true },
  simulated: { label: 'Simulated', cls: 'bg-violet-50 text-violet-600 ring-violet-500/25', icon: 'info' },
  offline: { label: 'Offline', cls: 'bg-amber-50 text-amber-700 ring-amber-500/30', icon: 'wifiOff' },
  failed: { label: 'Failed', cls: 'bg-coral-50 text-coral-600 ring-coral-500/30', icon: 'x' },
  off: { label: 'Off', cls: 'bg-clinic-100 text-ink-muted ring-line', dot: 'bg-ink-faint' },
  soon: { label: 'Coming soon', cls: 'bg-clinic-100 text-ink-muted ring-line', icon: 'clock' },
  estimated: { label: 'Estimated', cls: 'bg-clinic-100 text-ink-soft ring-line', icon: 'eta' },
  live: { label: 'Live', cls: 'bg-coral-500/15 text-coral-600 ring-coral-500/30', dot: 'bg-coral-500', pulse: true },
};
/** A status chip never relies on colour alone: every state carries an icon or dot AND a word. */
export function StatusChip({ status, label, dark, className }: { status: Status; label?: string; dark?: boolean; className?: string }) {
  const s = STATUS[status];
  return (
    <motion.span layout initial={false} className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ring-1 ring-inset', dark ? 'bg-white/10 text-white ring-white/15' : s.cls, className)}>
      {s.dot && (
        <span className="relative grid h-2 w-2 place-items-center">
          {s.pulse && <span className={cx('absolute h-2 w-2 animate-ping rounded-full opacity-60', s.dot)} />}
          <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
        </span>
      )}
      {s.icon && <Icon name={s.icon} size={12} strokeWidth={2.4} />}
      {label ?? s.label}
    </motion.span>
  );
}

/** Honesty label for anything that is a demonstration, a simulation or a prototype. */
export function Honest({ kind = 'simulated', children, dark, className }: { kind?: 'simulated' | 'demo' | 'prototype' | 'estimated'; children?: ReactNode; dark?: boolean; className?: string }) {
  const text = { simulated: 'Simulated', demo: 'Demonstration data', prototype: 'Prototype', estimated: 'Estimated' }[kind];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]', dark ? 'bg-violet-400/20 text-violet-200' : 'bg-violet-50 text-violet-600', className)}>
      <Icon name="info" size={10} strokeWidth={2.4} />
      {children ?? text}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------- data
export function AnimatedNumber({ value, decimals = 0, className, suffix }: { value: number; decimals?: number; className?: string; suffix?: string }) {
  const mv = useMotionValue(0);
  const reduce = useReducedMotion();
  const text = useTransform(mv, (v) => v.toFixed(decimals) + (suffix ?? ''));
  useEffect(() => {
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 0.9, ease });
    return () => c.stop();
  }, [value, mv, reduce]);
  return <motion.span className={cx('tabular', className)}>{text}</motion.span>;
}

export function Metric({ label, value, unit, icon, tone = 'light', note }: { label: string; value: ReactNode; unit?: string; icon?: IconName; tone?: 'light' | 'dark'; note?: ReactNode }) {
  return (
    <div className={cx('rounded-3xl p-4', tone === 'dark' ? 'bg-white/[0.05] ring-1 ring-inset ring-white/10' : 'bg-clinic-50 ring-1 ring-inset ring-line')}>
      <div className={cx('flex items-center gap-1.5 text-[11.5px] font-semibold', tone === 'dark' ? 'text-midnight-200' : 'text-ink-muted')}>
        {icon && <Icon name={icon} size={14} />}
        {label}
      </div>
      <div className={cx('mt-1 font-display text-[26px] font-semibold leading-none tracking-tight', tone === 'dark' ? 'text-white' : 'text-ink')}>
        {value}
        {unit && <span className={cx('ml-1 text-[13px] font-medium', tone === 'dark' ? 'text-midnight-200' : 'text-ink-muted')}>{unit}</span>}
      </div>
      {note && <div className={cx('mt-1.5 text-[11.5px]', tone === 'dark' ? 'text-midnight-300' : 'text-ink-faint')}>{note}</div>}
    </div>
  );
}

/** Concentric pulse rings — location, SOS, radar sweeps. */
export function PulseRings({ color = '#22D3EE', size = 120, count = 3, duration = 2.4, className }: { color?: string; size?: number; count?: number; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className={cx('pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', className)} style={{ width: size, height: size }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <motion.span key={i} className="absolute inset-0 rounded-full border" style={{ borderColor: color }} initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration, repeat: Infinity, delay: (i * duration) / count, ease: 'easeOut' }} />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-xl', className)} />;
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-[14.5px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] text-ink-muted">{hint}</span>}
      </label>
      <button id={id} role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40', on ? 'bg-teal-500' : 'bg-clinic-300')}>
        <motion.span layout transition={spring} className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'right-1' : 'left-1')} />
      </button>
    </div>
  );
}

export const inputCls = 'h-11 w-full rounded-2xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-500/15';
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-faint">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------------------------- bottom sheet
export function BottomSheet({ open, onClose, title, children, dark }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; dark?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-midnight-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx('fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[88vh] max-w-2xl overflow-y-auto rounded-t-[2rem] p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-lift sm:bottom-6 sm:rounded-[2rem]', dark ? 'surface-command text-white' : 'bg-white')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <div className={cx('mx-auto mb-4 h-1.5 w-10 rounded-full', dark ? 'bg-white/20' : 'bg-clinic-300')} />
            {title && <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0 flex-1">{title}</div><button onClick={onClose} aria-label="Close" className={cx('grid h-9 w-9 place-items-center rounded-full', dark ? 'bg-white/10' : 'bg-clinic-100')}><Icon name="x" size={16} /></button></div>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Typing text — for AI Guidance and system narration. */
export function TypeText({ text, speed = 18, className, onDone }: { text: string; speed?: number; className?: string; onDone?: () => void }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) { setN(text.length); onDone?.(); return; }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(Math.min(i, text.length));
      if (i >= text.length) { clearInterval(id); onDone?.(); }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, reduce]);
  return <span className={className}>{text.slice(0, n)}{n < text.length && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current" />}</span>;
}

export function Divider({ dark }: { dark?: boolean }) {
  return <div className={cx('h-px w-full', dark ? 'bg-white/10' : 'bg-line')} />;
}

'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Tone = 'cobalt' | 'teal' | 'soft' | 'white' | 'ghost' | 'coral' | 'dark';
const TONES: Record<Tone, string> = {
  cobalt: 'bg-cobalt-600 text-white hover:bg-cobalt-700 shadow-lift',
  teal: 'bg-teal-500 text-white hover:bg-teal-600',
  soft: 'bg-cobalt-50 text-cobalt-700 hover:bg-cobalt-100',
  white: 'bg-white text-ink border border-line hover:border-cobalt-200 shadow-soft',
  ghost: 'bg-transparent text-ink-soft hover:bg-cobalt-50',
  coral: 'bg-coral-500 text-white hover:bg-coral-600 shadow-coral',
  dark: 'bg-ink text-white hover:bg-ink-soft',
};

export function Btn({ tone = 'cobalt', big, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} className={cx('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50', big ? 'min-h-[56px] px-7 text-[17px]' : 'min-h-[44px] px-5 text-[15px]', TONES[tone], className)} {...(p as object)}>
      {children}
    </motion.button>
  );
}

export function Card({ className, children, onClick, glass }: { className?: string; children: ReactNode; onClick?: () => void; glass?: boolean }) {
  const C = onClick ? motion.button : motion.div;
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined} className={cx('block w-full min-w-0 rounded-4xl p-5 text-left', glass ? 'glass border border-white/80 shadow-soft' : 'border border-line bg-white shadow-soft', className)}>
      {children}
    </C>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-xs font-semibold uppercase tracking-[0.12em] text-cobalt-600', className)}>{children}</p>;
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50">
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-teal-500' : 'bg-line')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'right-1' : 'left-1')} />
      </span>
    </button>
  );
}

export function Chip({ tone = 'cobalt', children, className }: { tone?: 'cobalt' | 'teal' | 'lav' | 'coral' | 'amber' | 'gray' | 'demo'; children: ReactNode; className?: string }) {
  const t = { cobalt: 'bg-cobalt-50 text-cobalt-700', teal: 'bg-teal-50 text-teal-700', lav: 'bg-lav-100 text-lav-600', coral: 'bg-coral-50 text-coral-700', amber: 'bg-amber-50 text-amber-700', gray: 'bg-paper-200 text-ink-muted', demo: 'bg-ink text-white' }[tone];
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', t, className)}>{children}</span>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-cobalt-900/25 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label={title} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-5xl bg-paper p-6 pb-9 shadow-2xl sm:rounded-5xl" initial={{ y: 80, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line sm:hidden" />
            {title && <h2 className="mb-4 text-xl font-bold text-ink">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-cobalt-300 focus:ring-4 focus:ring-cobalt-100';

export function Dot({ state }: { state: 'ok' | 'warn' | 'off' | 'unknown' | 'pending' | 'failed' | 'queued' | 'available' }) {
  const c = { ok: 'bg-teal-500', warn: 'bg-amber-400', off: 'bg-coral-500', failed: 'bg-coral-500', unknown: 'bg-ink-faint', pending: 'bg-cobalt-400 animate-pulse', queued: 'bg-amber-400', available: 'bg-cobalt-500' }[state];
  const label = { ok: 'Ready', warn: 'Needs attention', off: 'Not ready', failed: 'Failed', unknown: 'Unknown', pending: 'In progress', queued: 'Waiting', available: 'Available' }[state];
  return <span className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', c)} role="img" aria-label={label} />;
}

export function DemoBar() {
  return <div className="sticky top-0 z-40 bg-ink px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white" role="status">DEMO · DEMONSTRATION ONLY · nothing is sent</div>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: { label?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="mt-4">
      {label && <legend className="mb-2 text-sm font-semibold text-ink-soft">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map(([v, t]) => (
          <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)} className={cx('rounded-full border px-4 py-2 text-sm font-semibold transition-colors', v === value ? 'border-cobalt-600 bg-cobalt-600 text-white' : 'border-line bg-white text-ink-soft hover:border-cobalt-200')}>
            {t}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

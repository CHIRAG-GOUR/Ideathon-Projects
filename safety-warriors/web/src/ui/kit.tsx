'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Tone = 'teal' | 'indigo' | 'tang' | 'soft' | 'white' | 'ghost' | 'sos' | 'emerald';
const TONES: Record<Tone, string> = {
  teal: 'bg-teal-500 text-white border-b-4 border-teal-700 hover:bg-teal-400',
  indigo: 'bg-indigo-700 text-white border-b-4 border-indigo-900 hover:bg-indigo-600',
  tang: 'bg-tang-400 text-indigo-900 border-b-4 border-tang-600 hover:bg-tang-300',
  emerald: 'bg-emerald-500 text-white border-b-4 border-emerald-600',
  soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
  white: 'bg-white text-ink border-2 border-indigo-100 hover:border-indigo-300',
  ghost: 'bg-transparent text-ink-soft hover:bg-cream-100',
  sos: 'bg-sos-500 text-white border-b-4 border-sos-700 hover:bg-sos-600',
};

export function Btn({ tone = 'teal', big, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.97, y: 2 }} className={cx('inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50', big ? 'min-h-[56px] px-6 text-[17px]' : 'min-h-[46px] px-5 text-[15px]', TONES[tone], className)} {...(p as object)}>
      {children}
    </motion.button>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const C = onClick ? motion.button : motion.div;
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined} className={cx('block w-full min-w-0 rounded-3xl border-2 border-indigo-100 bg-white p-5 text-left shadow-tile', className)}>
      {children}
    </C>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[11px] font-bold uppercase tracking-[0.16em] text-teal-600', className)}>{children}</p>;
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50">
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors', on ? 'border-teal-600 bg-teal-500' : 'border-indigo-100 bg-cream-100')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', on ? 'right-0.5' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Tag({ tone = 'teal', children, className }: { tone?: 'teal' | 'indigo' | 'tang' | 'sos' | 'emerald' | 'gray' | 'demo'; children: ReactNode; className?: string }) {
  const t = { teal: 'bg-teal-50 text-teal-700', indigo: 'bg-indigo-50 text-indigo-600', tang: 'bg-tang-50 text-tang-600', sos: 'bg-sos-50 text-sos-700', emerald: 'bg-emerald-50 text-emerald-600', gray: 'bg-cream-100 text-ink-muted', demo: 'bg-ink text-white' }[tone];
  return <span className={cx('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide', t, className)}>{children}</span>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-indigo-900/40" onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label={title} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl border-2 border-indigo-100 bg-cream p-6 pb-9 shadow-2xl sm:rounded-4xl" initial={{ y: 70 }} animate={{ y: 0 }} exit={{ y: 70 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-indigo-100 sm:hidden" />
            {title && <h2 className="mb-4 text-xl font-bold text-indigo-800">{title}</h2>}
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

export const inputCls = 'w-full rounded-2xl border-2 border-indigo-100 bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-teal-400 focus:ring-4 focus:ring-teal-50';

export function Dot({ state }: { state: 'ok' | 'warn' | 'off' | 'unknown' | 'pending' | 'failed' | 'queued' | 'available' }) {
  const c = { ok: 'bg-emerald-500', warn: 'bg-tang-400', off: 'bg-sos-500', failed: 'bg-sos-500', unknown: 'bg-ink-faint', pending: 'bg-teal-400 animate-pulse', queued: 'bg-tang-400', available: 'bg-indigo-500' }[state];
  const label = { ok: 'Ready', warn: 'Needs attention', off: 'Not ready', failed: 'Failed', unknown: 'Unknown', pending: 'In progress', queued: 'Waiting', available: 'Available' }[state];
  return <span className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', c)} role="img" aria-label={label} />;
}

export function DemoBar() {
  return <div className="sticky top-0 z-40 bg-ink px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white" role="status">DEMO · DEMONSTRATION ONLY · nothing is sent</div>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

export function Choice<T extends string | number>({ label, value, options, onChange }: { label?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="mt-4">
      {label && <legend className="mb-2 text-sm font-semibold text-ink-soft">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map(([v, t]) => (
          <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)} className={cx('rounded-xl border-2 px-3.5 py-2 text-sm font-semibold', v === value ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-indigo-100 bg-white text-ink-soft')}>{t}</button>
        ))}
      </div>
    </fieldset>
  );
}

'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Tone = 'violet' | 'soft' | 'white' | 'ghost' | 'alert' | 'mint' | 'dark';
const TONES: Record<Tone, string> = {
  violet: 'bg-violet-800 text-white hover:bg-violet-700 shadow-glow',
  soft: 'bg-violet-50 text-violet-800 hover:bg-violet-100',
  white: 'bg-white text-ink border border-line hover:border-violet-200 shadow-card',
  ghost: 'bg-transparent text-ink-soft hover:bg-violet-50',
  alert: 'bg-alert-500 text-white hover:bg-alert-600 shadow-alert',
  mint: 'bg-mint-500 text-white hover:bg-mint-600',
  dark: 'bg-ink text-white hover:bg-ink-soft',
};

export function Btn({ tone = 'violet', big, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cx('inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:pointer-events-none disabled:opacity-50', big ? 'min-h-[58px] px-6 text-[17px]' : 'min-h-[46px] px-5 text-[15px]', TONES[tone], className)}
      {...(p as object)}
    >
      {children}
    </motion.button>
  );
}

export function Card({ className, children, onClick, as = 'div' }: { className?: string; children: ReactNode; onClick?: () => void; as?: 'div' | 'section' }) {
  const C = onClick ? motion.button : as === 'section' ? motion.section : motion.div;
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined} className={cx('block w-full min-w-0 rounded-xl2 border border-line bg-white p-4 text-left shadow-card', className)}>
      {children}
    </C>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-600', className)}>{children}</p>;
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50">
      <span>
        <span className="block font-bold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-violet-600' : 'bg-line')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'right-1' : 'left-1')} />
      </span>
    </button>
  );
}

export function Pill({ tone = 'violet', children, className }: { tone?: 'violet' | 'mint' | 'rose' | 'alert' | 'blue' | 'gray' | 'demo'; children: ReactNode; className?: string }) {
  const t = { violet: 'bg-violet-100 text-violet-800', mint: 'bg-mint-50 text-mint-600', rose: 'bg-rose-100 text-rose-500', alert: 'bg-alert-50 text-alert-600', blue: 'bg-shield-100 text-shield-600', gray: 'bg-pearl-200 text-ink-muted', demo: 'bg-ink text-white' }[tone];
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', t, className)}>{children}</span>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-violet-900/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label={title} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-5 pb-8 shadow-2xl sm:rounded-4xl" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            {title && <h2 className="mb-3 text-xl font-extrabold text-ink">{title}</h2>}
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
      <span className="mb-1.5 block text-sm font-bold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-violet-300 focus:ring-4 focus:ring-violet-100';

export function Dot({ state }: { state: 'ok' | 'warn' | 'off' | 'unknown' | 'pending' | 'failed' | 'queued' | 'available' }) {
  const c = { ok: 'bg-mint-500', warn: 'bg-amber-400', off: 'bg-alert-500', failed: 'bg-alert-500', unknown: 'bg-ink-faint', pending: 'bg-violet-400 animate-pulse', queued: 'bg-amber-400', available: 'bg-shield-500' }[state];
  const label = { ok: 'Ready', warn: 'Needs attention', off: 'Not ready', failed: 'Failed', unknown: 'Unknown', pending: 'In progress', queued: 'Waiting', available: 'Available' }[state];
  return <span className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', c)} role="img" aria-label={label} />;
}

export function DemoBar() {
  return <div className="sticky top-0 z-40 bg-ink px-4 py-1.5 text-center text-xs font-bold tracking-wide text-white" role="status">DEMO · DEMONSTRATION ONLY · nothing is sent</div>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF5577" />
            <stop offset="1" stopColor="#D5103F" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lg)" />
        <path d="M32 50s-15-9.6-15-21.2A8.8 8.8 0 0 1 32 23a8.8 8.8 0 0 1 15 5.8C47 40.4 32 50 32 50z" fill="#fff" />
        <circle cx="32" cy="31" r="4.2" fill="#F02452" />
        <path d="M14 18a24 24 0 0 1 8-6M50 18a24 24 0 0 0-8-6" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      {withText && <span className="text-[1.2rem] font-extrabold tracking-tight text-ink">Shevolution</span>}
    </span>
  );
}

export function E3d({ name, size = 40, className, alt = '' }: { name: string; size?: number; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/e3d/${name}.webp`} width={size} height={size} alt={alt} className={cn('select-none', className)} draggable={false} />;
}

type Variant = 'primary' | 'soft' | 'ghost' | 'white' | 'safe' | 'dark';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sos-500 text-white shadow-glow hover:bg-sos-600',
  soft: 'bg-sos-50 text-sos-700 hover:bg-sos-100',
  ghost: 'bg-transparent text-ink-soft hover:bg-blush-100',
  white: 'bg-white text-ink shadow-soft border border-line hover:border-sos-200',
  safe: 'bg-safe-500 text-white hover:bg-safe-600',
  dark: 'bg-ink text-white hover:bg-ink-soft',
};

export function Button({ variant = 'primary', className, children, big, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        big ? 'min-h-[60px] px-6 text-lg' : 'min-h-[48px] px-5 text-[15px]',
        VARIANTS[variant],
        className,
      )}
      {...(p as object)}
    >
      {children}
    </motion.button>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const C = onClick ? motion.button : motion.div;
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined} className={cn('block w-full rounded-3xl border border-line bg-white p-4 text-left shadow-soft', className)}>
      {children}
    </C>
  );
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50">
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-sos-500' : 'bg-line')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'right-1' : 'left-1')} />
      </span>
    </button>
  );
}

export function Pill({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'red' | 'safe' | 'warn' | 'demo'; children: ReactNode; className?: string }) {
  const t = {
    neutral: 'bg-blush-100 text-ink-soft',
    red: 'bg-sos-100 text-sos-700',
    safe: 'bg-safe-50 text-safe-600',
    warn: 'bg-warn-50 text-warn-600',
    demo: 'bg-plum text-white',
  }[tone];
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', t, className)}>{children}</span>;
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={title}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-5 pb-8 shadow-2xl sm:rounded-4xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            {title && <h2 className="mb-3 text-xl font-extrabold text-ink">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-sos-300 focus:ring-4 focus:ring-sos-100';

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 bg-plum px-4 py-1.5 text-center text-xs font-bold tracking-wide text-white" role="status">
      DEMO MODE · DEMONSTRATION ONLY · nothing is sent to anyone
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-hidden />;
}

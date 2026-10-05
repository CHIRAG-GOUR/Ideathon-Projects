import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { DOT_CLASS, SYMBOL, TONE_CLASS, type Tone } from '@/safety/labels';
import { sound } from '@/services/sound';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type BtnTone = 'primary' | 'secondary' | 'ghost' | 'warn' | 'danger' | 'dark' | 'ok';
const BTN: Record<BtnTone, string> = {
  primary: 'bg-lpg-600 text-white hover:bg-lpg-700 shadow-lift',
  secondary: 'bg-white text-graphite ring-1 ring-line hover:ring-lpg-300 shadow-card',
  ghost: 'text-graphite-soft hover:bg-cream-100',
  warn: 'bg-safety-500 text-white hover:bg-safety-600',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  dark: 'bg-graphite text-white hover:bg-graphite-soft',
  ok: 'bg-ok-600 text-white hover:bg-ok-700',
};
export function Btn({ tone = 'primary', size = 'md', className, children, onClick, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: BtnTone; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={(e) => {
        sound.click();
        onClick?.(e);
      }}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-lpg-200 disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'min-h-[36px] px-3 text-[13px]' : size === 'lg' ? 'min-h-[52px] px-6 text-[16px]' : 'min-h-[44px] px-4 text-[14px]',
        BTN[tone],
        className,
      )}
      {...(p as object)}
    >
      {children}
    </motion.button>
  );
}

export function Card({ className, children, title, action, as = 'section' }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; as?: 'section' | 'div' }) {
  const C = as;
  return (
    <C className={cx('min-w-0 rounded-xl2 bg-white p-4 shadow-card ring-1 ring-line sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-graphite-muted">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </C>
  );
}

/** Status chip — always text + symbol, never colour alone. */
export function Status({ tone, children, className, pulse }: { tone: Tone; children: ReactNode; className?: string; pulse?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide ring-1', TONE_CLASS[tone], className)}>
      <span aria-hidden className={cx('relative inline-flex h-2 w-2 rounded-full', DOT_CLASS[tone])}>
        {pulse && <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', DOT_CLASS[tone])} />}
      </span>
      <span className="sr-only">{SYMBOL[tone]}</span>
      {children}
    </span>
  );
}

export function SimBadge({ className }: { className?: string }) {
  return <span className={cx('rounded-md bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white', className)}>SIMULATION</span>;
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-graphite sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-graphite-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

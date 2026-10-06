// Design-system primitives on the retail tokens (index.css). State colour always comes with a word and usually an
// icon — never colour alone.
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import type { Action, Risk } from '../engine/types';
import { IconAlert, IconCheck, IconExpiry, IconHold, IconRestock, IconTrash, IconX } from './icons';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

// ---------------------------------------------------------------- buttons
type Tone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'accent' | 'light';
const TONES: Record<Tone, string> = {
  primary: 'bg-green text-white hover:bg-green-mid shadow-inset',
  dark: 'bg-green-dark text-white hover:bg-green-deep shadow-inset',
  accent: 'bg-yellow text-ink hover:brightness-105 shadow-inset',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-cream',
  light: 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15',
  ghost: 'text-ink-2 hover:bg-ink/[0.05]',
  danger: 'bg-surface text-red-ink ring-1 ring-inset ring-red/25 hover:bg-red-soft',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'sm' | 'md' | 'lg'; busy?: boolean }>(
  function Button({ tone = 'secondary', size = 'md', busy, className, children, disabled, ...rest }, ref) {
    const sz = size === 'sm' ? 'h-9 px-3 text-[13px] rounded-xl' : size === 'lg' ? 'h-12 px-5 text-[15px] rounded-2xl' : 'h-10 px-4 text-sm rounded-xl';
    return (
      <button ref={ref} disabled={disabled || busy} className={cx('inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold transition-[background,box-shadow,transform,filter] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green disabled:cursor-not-allowed disabled:opacity-50', sz, TONES[tone], className)} {...rest}>
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
        {children}
      </button>
    );
  },
);

// ---------------------------------------------------------------- surfaces
export function Card({ className, children, as: As = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return <As className={cx('rounded-xl3 border border-line bg-surface shadow-card', className)} {...rest}>{children}</As>;
}

export function SectionTitle({ title, sub, right, icon }: { title: string; sub?: string; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-green">{icon}</span>}
        <div>
          <h2 className="font-display text-[17px] font-extrabold tracking-tight text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[13px] text-ink-muted">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-muted', className)}>{children}</p>;
}

/** A small aisle-sign label (e.g. "AISLE 2 · SNACKS"). */
export function AisleTag({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'red' | 'yellow' | 'orange' | 'dark' }) {
  const t = { green: 'bg-green text-white', red: 'bg-red text-white', yellow: 'bg-yellow text-ink', orange: 'bg-orange text-white', dark: 'bg-green-dark text-yellow' }[tone];
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em]', t)}>{children}</span>;
}

// ---------------------------------------------------------------- action language
export const ACTION_STYLE: Record<Action, { label: string; pill: string; stripe: string; tint: string; text: string; icon: (p: { size?: number }) => JSX.Element }> = {
  RESTOCK: { label: 'Restock', pill: 'bg-red text-white', stripe: 'bg-red', tint: 'bg-red-soft/70', text: 'text-red-ink', icon: IconRestock },
  SELL_SOON: { label: 'Sell soon', pill: 'bg-yellow text-ink', stripe: 'bg-yellow', tint: 'bg-yellow-soft', text: 'text-yellow-ink', icon: IconExpiry },
  HOLD: { label: 'Hold', pill: 'bg-hold-bg text-hold-fg ring-1 ring-inset ring-hold-fg/20', stripe: 'bg-hold-dot', tint: 'bg-hold-bg/60', text: 'text-hold-fg', icon: IconHold },
  REMOVE: { label: 'Remove', pill: 'bg-ink text-white', stripe: 'bg-ink', tint: 'bg-cream-deep', text: 'text-ink', icon: IconTrash },
};

/** Colour carries meaning: red = restock risk, yellow = sell soon, neutral = hold, charcoal = remove. Critical restocks get a ring. */
export function actionTone(action: Action, critical: boolean) {
  return critical && action === 'RESTOCK' ? { ...ACTION_STYLE[action], pill: 'bg-red text-white ring-2 ring-red/30 ring-offset-1' } : ACTION_STYLE[action];
}

export function ActionBadge({ action, size = 'md', critical }: { action: Action; size?: 'sm' | 'md' | 'lg'; critical?: boolean }) {
  const a = actionTone(action, !!critical);
  const I = a.icon;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-lg font-extrabold uppercase tracking-[0.08em]', a.pill, size === 'lg' ? 'px-3 py-1.5 text-[13px]' : size === 'sm' ? 'px-1.5 py-[3px] text-[10px]' : 'px-2 py-1 text-[11px]')}>
      <I size={size === 'lg' ? 16 : 13} />
      {a.label}
    </span>
  );
}

export const RISK_STYLE: Record<Risk | 'EXPIRED', { label: string; cls: string; dot: string }> = {
  HIGH: { label: 'High', cls: 'text-red-ink bg-red-soft', dot: 'bg-red' },
  EXPIRED: { label: 'Expired', cls: 'text-red-ink bg-red-soft', dot: 'bg-red' },
  MEDIUM: { label: 'Medium', cls: 'text-yellow-ink bg-yellow-soft', dot: 'bg-orange' },
  LOW: { label: 'Low', cls: 'text-ok-fg bg-ok-bg', dot: 'bg-ok-dot' },
  NONE: { label: 'None', cls: 'text-hold-fg bg-hold-bg', dot: 'bg-hold-dot' },
};

export function RiskPill({ risk, prefix }: { risk: Risk | 'EXPIRED'; prefix?: string }) {
  const r = RISK_STYLE[risk];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold', r.cls)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', r.dot)} aria-hidden />
      {prefix ? `${prefix} ${r.label.toLowerCase()}` : r.label}
    </span>
  );
}

/** Stock strip like a shelf-edge fill indicator: how full the shelf is relative to two reorder windows. */
export function StockBar({ days, warnAt, critAt, className }: { days: number | null; warnAt: number; critAt: number; className?: string }) {
  const full = warnAt * 2.5;
  const pct = days === null ? 100 : Math.max(3, Math.min(100, (days / full) * 100));
  const color = days === null ? 'bg-hold-dot' : days < critAt ? 'bg-red' : days < warnAt ? 'bg-orange' : days >= full ? 'bg-hold-dot' : 'bg-green';
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-cream-deep', className)} aria-hidden>
      <motion.div className={cx('h-full rounded-full', color)} initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 160, damping: 26 }} />
    </div>
  );
}

/** Number that glides to its new value (respects reduced motion). */
export function AnimatedNumber({ value, decimals = 0, className, suffix = '' }: { value: number; decimals?: number; className?: string; suffix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-IN')}${suffix}`);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className={cx('tabular-nums', className)}>{text}</motion.span>;
}

// ---------------------------------------------------------------- forms
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-bold text-ink-2">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1 text-[12.5px] font-semibold text-red-ink">{error}</p> : hint ? <p className="mt-1 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

const inputCls = 'h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-green focus:outline-none focus:ring-4 focus:ring-green/15 disabled:bg-cream';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputCls, className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputCls, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%236E675C%27 stroke-width=%272%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-[right_12px_center] bg-no-repeat pr-9', className)} {...rest}>{children}</select>;
}

export function Segmented<T extends string>({ value, onChange, options, label, dark }: { value: T; onChange: (v: T) => void; options: [T, string, number?][]; label: string; dark?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl p-1', dark ? 'bg-white/10' : 'bg-cream-deep')}>
      {options.map(([v, l, n]) => (
        <button key={v} role="radio" aria-checked={v === value} onClick={() => onChange(v)}
          className={cx('relative h-9 shrink-0 rounded-xl px-3.5 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green', v === value ? (dark ? 'text-ink' : 'text-white') : dark ? 'text-white/75 hover:text-white' : 'text-ink-2 hover:text-ink')}>
          {v === value && <motion.span layoutId={`seg-${label}`} className={cx('absolute inset-0 rounded-xl shadow-card', dark ? 'bg-yellow' : 'bg-green-dark')} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="relative">{l}{n !== undefined && <span className={cx('ml-1.5 tabular-nums', v === value ? 'opacity-75' : 'opacity-60')}>{n}</span>}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- empty / error
export function Empty({ title, body, action, art }: { title: string; body: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3">{art ?? <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ok-bg text-ok-fg"><IconCheck size={22} /></div>}</div>
      <p className="font-display text-[17px] font-extrabold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13.5px] text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-soft px-3 py-2.5 text-[13.5px] font-semibold text-red-ink">
      <IconAlert size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------- sheet: bottom sheet on phones, drawer on desktop
export function Sheet({ open, onClose, title, sub, children, footer, wide, header }: { open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode; footer?: ReactNode; wide?: boolean; header?: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const m = matchMedia('(min-width: 768px)');
    const f = () => setDesktop(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 80);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
      }
    };
    addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      removeEventListener('keydown', key);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-green-deep/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id}
            className={cx('absolute flex flex-col bg-cream', desktop ? cx('right-0 top-0 h-full w-full border-l border-line shadow-lift', wide ? 'max-w-[580px]' : 'max-w-[460px]') : 'bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-[26px] shadow-sheet')}
            initial={desktop ? { x: 48, opacity: 0 } : { y: '100%' }} animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }} exit={desktop ? { x: 48, opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
            {!desktop && <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line-strong" aria-hidden />}
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0">
                {header}
                <h2 id={id} className="font-display text-xl font-extrabold tracking-tight text-ink">{title}</h2>
                {sub && <p className="mt-0.5 text-[13px] text-ink-muted">{sub}</p>}
              </div>
              <button data-close onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-ink/5"><IconX /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
            {footer && <div className="border-t border-line bg-surface px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- toasts: receipt-slip confirmations
type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:items-end" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={cx('pointer-events-auto w-full max-w-sm overflow-hidden rounded-t-2xl shadow-lift', t.tone === 'ok' ? 'bg-surface' : 'bg-red text-white')} role={t.tone === 'error' ? 'alert' : 'status'}>
              <div className="flex items-start gap-3 px-4 pb-4 pt-3">
                <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', t.tone === 'ok' ? 'bg-green text-white' : 'bg-white/20')}>{t.tone === 'ok' ? <IconCheck size={14} /> : <IconAlert size={14} />}</span>
                <div className="min-w-0">
                  {t.tone === 'ok' && <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">Recorded · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                  <p className={cx('text-[14px] font-bold', t.tone === 'ok' ? 'text-ink' : 'text-white')}>{t.text}</p>
                </div>
              </div>
              {t.tone === 'ok' && <div className="receipt-edge h-2 bg-cream-deep" aria-hidden />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('tabular-nums', className)}>{children}</span>;
}

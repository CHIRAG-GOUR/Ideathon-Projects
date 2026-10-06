import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cx } from './kit';

/** Page heading for simple pages. */
export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink sm:text-[36px]">{title}</h1>
        {sub && <div className="mt-1 text-[14.5px] text-ink-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const TONES = {
  green: 'bg-green-dark text-white',
  deep: 'bg-green-deep text-white',
  yellow: 'bg-yellow-soft text-ink ring-1 ring-yellow/40',
  quiet: 'bg-hold-bg text-ink ring-1 ring-line',
};

/** Banner header used by the main sections: title, live stats, actions and a section illustration. */
export function PageBanner({ kicker, title, sub, stats, actions, art, tone = 'green' }: { kicker?: string; title: string; sub?: ReactNode; stats?: [string, string][]; actions?: ReactNode; art?: ReactNode; tone?: keyof typeof TONES }) {
  const dark = tone === 'green' || tone === 'deep';
  return (
    <section className={cx('relative overflow-hidden rounded-xl4 px-5 py-5 sm:px-7 sm:py-6', TONES[tone])}>
      {dark && <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-green-mid/30 blur-3xl" aria-hidden />}
      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1">
          {kicker && <p className={cx('text-[11px] font-extrabold uppercase tracking-[0.18em]', dark ? 'text-yellow' : 'text-ink-muted')}>{kicker}</p>}
          <h1 className="mt-1 font-display text-[30px] font-extrabold leading-tight tracking-tight sm:text-[38px]">{title}</h1>
          {sub && <div className={cx('mt-1 max-w-2xl text-[14.5px]', dark ? 'text-white/75' : 'text-ink-2')}>{sub}</div>}
          {stats && (
            <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
              {stats.map(([v, k]) => (
                <div key={k}>
                  <dt className="sr-only">{k}</dt>
                  <dd><span className={cx('font-display text-[26px] font-extrabold tabular-nums', dark ? 'text-yellow' : 'text-ink')}>{v}</span> <span className={cx('text-[12.5px] font-bold', dark ? 'text-white/70' : 'text-ink-muted')}>{k}</span></dd>
                </div>
              ))}
            </dl>
          )}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {art && <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="hidden shrink-0 sm:block">{art}</motion.div>}
      </div>
    </section>
  );
}

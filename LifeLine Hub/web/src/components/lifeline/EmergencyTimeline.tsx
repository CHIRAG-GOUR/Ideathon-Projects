'use client';
/** EmergencyTimeline — stages activating in sequence, with a live pulse on the current stage. */
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/ui/icons';
import { Honest, cx } from '@/ui/kit';

export interface TimelineItem { key: string; label: string; detail?: string; state: 'done' | 'active' | 'pending' | 'failed'; at?: string | null; icon: IconName; simulated?: boolean }

export function EmergencyTimeline({ items, dark = true }: { items: TimelineItem[]; dark?: boolean }) {
  return (
    <ol className="relative">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const c = it.state === 'done' ? 'bg-vital-500 text-white' : it.state === 'active' ? 'bg-coral-500 text-white' : it.state === 'failed' ? 'bg-amber-500 text-white' : dark ? 'bg-clinic-50 text-ink-faint' : 'bg-clinic-100 text-ink-faint';
        return (
          <motion.li key={it.key} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative flex gap-3 pb-4">
            {!last && <span className={cx('absolute left-[17px] top-9 bottom-0 w-[2px]', dark ? 'bg-clinic-100' : 'bg-line')}>
              <motion.span className="absolute inset-x-0 top-0 bg-vital-500" initial={{ height: 0 }} animate={{ height: it.state === 'done' ? '100%' : '0%' }} transition={{ duration: 0.6 }} />
            </span>}
            <span className={cx('relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors', c)}>
              {it.state === 'active' && <span className="absolute inset-0 animate-ping rounded-full bg-coral-500/50" />}
              <Icon name={it.state === 'done' ? 'check' : it.icon} size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1 pt-1">
              <span className="flex flex-wrap items-center gap-2">
                <b className={cx('text-[14px]', dark ? 'text-ink' : 'text-ink', it.state === 'pending' && 'opacity-60')}>{it.label}</b>
                {it.simulated && <Honest dark={dark} kind="simulated" />}
              </span>
              {it.detail && <span className={cx('block text-[12.5px]', dark ? 'text-ink-muted' : 'text-ink-muted')}>{it.detail}</span>}
            </span>
            {it.at && <span className={cx('pt-1.5 font-mono text-[11px]', dark ? 'text-ink-faint' : 'text-ink-faint')}>{it.at}</span>}
          </motion.li>
        );
      })}
    </ol>
  );
}

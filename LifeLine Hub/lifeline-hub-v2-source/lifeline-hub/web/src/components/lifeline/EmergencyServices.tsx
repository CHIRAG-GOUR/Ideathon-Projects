'use client';
/** Emergency service cards — public numbers (configurable), dialled by the phone. LifeLine Hub dispatches nothing. */
import { motion } from 'framer-motion';
import { dial } from '@core/native';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { cx } from '@/ui/kit';
import type { ServiceLine } from '@/services/emergency/numbers';

const LOOK: Record<ServiceLine['key'], { icon: IconName; color: string }> = {
  emergency: { icon: 'sos', color: '#F0384A' },
  ambulance: { icon: 'ambulance', color: '#DA1E2C' },
  police: { icon: 'police', color: '#8C7CF3' },
  fire: { icon: 'fire', color: '#F5B544' },
};

export function EmergencyServiceCard({ line, dark, compact }: { line: ServiceLine; dark?: boolean; compact?: boolean }) {
  const { demo, toast } = useApp();
  const l = LOOK[line.key];
  const call = () => (demo ? toast(`Demo mode — would call ${line.number}. Nothing was dialled.`) : dial(line.number));
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={call} aria-label={`Call ${line.label}, ${line.number}`}
      className={cx('group flex w-full items-center gap-3 rounded-3xl p-4 text-left ring-1 ring-inset transition', dark ? 'bg-clinic-50 ring-line hover:bg-clinic-100' : 'bg-white ring-line hover:shadow-panel')}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${l.color}1F`, color: l.color }}><Icon name={l.icon} size={23} /></span>
      <span className="min-w-0 flex-1">
        <b className={cx('block text-[14.5px]', dark ? 'text-ink' : 'text-ink')}>{line.label}</b>
        {!compact && <span className={cx('block truncate text-[12px]', dark ? 'text-ink-muted' : 'text-ink-muted')}>{line.note}{line.custom ? ' · your number' : ''}</span>}
      </span>
      <span className={cx('font-display text-[22px] font-semibold tabular', dark ? 'text-ink' : 'text-ink')}>{line.number}</span>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-vital-500 text-white shadow-[0_8px_18px_-8px_rgba(35,160,106,.8)]"><Icon name="phone" size={17} /></span>
    </motion.button>
  );
}

export function EmergencyServicesList({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  const { lines } = useApp();
  return <div className={cx('grid grid-cols-1 gap-2', compact ? '' : 'md:grid-cols-2')}>{lines.map((l) => <EmergencyServiceCard key={l.key} line={l} dark={dark} compact={compact} />)}</div>;
}

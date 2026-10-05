'use client';
import { motion } from 'framer-motion';
import type { Action } from '@/content';
import { useApp } from '@/ctx';
import { cx } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/icons';

/** The five Quick Actions, all real: SOS, call emergency, call your trusted person, share location, nearby help. */
export function useQuickActions() {
  const { region, contacts } = useApp();
  const primary = contacts.find((c) => c.role === 'primary' && c.phone) ?? contacts.find((c) => c.phone);
  const list: { a: Action; t: string; d: string; icon: IconName; tone: string }[] = [
    { a: { kind: 'sos' }, t: 'SOS', d: 'Alert everyone', icon: 'alert', tone: 'bg-sos-500 text-white border-sos-700' },
    { a: { kind: 'call', line: 'emergency' }, t: `Call ${region.primary.number}`, d: region.primary.label, icon: 'phone', tone: 'bg-indigo-700 text-white border-indigo-900' },
    { a: { kind: 'callTrusted' }, t: primary ? `Call ${primary.name.split(' ')[0]}` : 'Trusted person', d: primary ? 'Your trusted person' : 'Add a contact', icon: 'people', tone: 'bg-teal-500 text-white border-teal-700' },
    { a: { kind: 'share' }, t: 'Share location', d: primary ? `With ${primary.name.split(' ')[0]}` : 'Add a contact', icon: 'share', tone: 'bg-tang-400 text-indigo-900 border-tang-600' },
    { a: { kind: 'nearby' }, t: 'Nearby help', d: 'Police, hospitals', icon: 'pin', tone: 'bg-emerald-500 text-white border-emerald-600' },
  ];
  return list;
}

export function QuickRow() {
  const { run, nav } = useApp();
  const list = useQuickActions();
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
      {list.map((q, i) => (
        <motion.button
          key={q.t}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.95, y: 2 }}
          // SOS from a tile opens the hold screen — a single tap never starts an alert by accident.
          onClick={() => (q.a.kind === 'sos' ? nav.go('sos') : run(q.a))}
          className={cx('flex w-36 shrink-0 flex-col items-start gap-3 rounded-3xl border-b-4 p-4 text-left sm:w-auto', q.tone)}
        >
          <Icon name={q.icon} />
          <span>
            <span className="block font-display text-[15px] font-bold leading-tight">{q.t}</span>
            <span className="block text-xs opacity-85">{q.d}</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}

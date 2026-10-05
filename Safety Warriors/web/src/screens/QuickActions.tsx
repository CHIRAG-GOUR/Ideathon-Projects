'use client';
import { motion } from 'framer-motion';
import { dial } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Card, Kicker, cx } from '@/ui/kit';
import { Icon } from '@/ui/icons';
import { Checklist } from '@/parts/Checklist';
import { useQuickActions } from '@/parts/QuickRow';

export function QuickActions() {
  const { run, nav, region, demo, toast } = useApp();
  const dialNumber = (n: string) => (demo ? toast(`Demo — would call ${n}.`) : dial(n));
  const list = useQuickActions();
  return (
    <>
      <Header title="Quick actions" sub="Real actions, one tap away" />
      <Page>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {list.map((q, i) => (
            <motion.button key={q.t} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 320, damping: 20 }} whileTap={{ scale: 0.95, y: 3 }} onClick={() => (q.a.kind === 'sos' ? nav.go('sos') : run(q.a))} className={cx('flex min-h-[140px] flex-col justify-between rounded-3xl border-b-[6px] p-5 text-left', q.tone, i === 0 && 'col-span-2 lg:col-span-1')}>
              <Icon name={q.icon} size={28} />
              <span>
                <span className="block font-display text-lg font-bold leading-tight">{q.t}</span>
                <span className="block text-sm opacity-85">{q.d}</span>
              </span>
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-ink-muted">SOS opens the hold screen so it can&apos;t start by accident. Calls open your phone&apos;s dialer. Sharing opens WhatsApp or Messages ready to send.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Checklist />
          <Card>
            <Kicker>Official numbers · {region.name}</Kicker>
            <ul className="mt-2 divide-y divide-line">
              {[region.primary, ...region.others].map((l) => (
                <li key={l.number}>
                  <button onClick={() => dialNumber(l.number)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="w-16 font-display text-xl font-bold text-indigo-800">{l.number}</span>
                    <span className="flex-1 text-sm text-ink-soft">{l.label}</span>
                    <Icon name="phone" size={18} className="text-teal-600" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Page>
    </>
  );
}

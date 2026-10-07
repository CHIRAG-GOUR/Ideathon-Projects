'use client';
import { motion } from 'framer-motion';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Page, PageTitle, MORE_ITEMS } from '@/components/lifeline/LifeLineShell';

export function MoreScreen() {
  const { nav } = useApp();
  return (
    <Page>
      <PageTitle kicker="LifeLine Hub" title="More" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MORE_ITEMS.map((m, i) => (
          <motion.button key={m.s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => nav.tab(m.s)} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-inset ring-line hover:shadow-panel">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-600"><Icon name={m.icon} size={20} /></span>
            <span><b className="block text-[14.5px] text-ink">{m.label}</b><span className="text-[12.5px] text-ink-muted">{m.sub}</span></span>
          </motion.button>
        ))}
      </div>
    </Page>
  );
}

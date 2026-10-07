'use client';
/** Recent emergency activity (SOS events + Health Vault access) and the wearable readiness card. */
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ago } from '@shared/geo';
import { useMyEvents } from '@core/data';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { Honest, StatusChip, cx } from '@/ui/kit';
import { useLogs } from './HealthVault';

interface Item { id: string; icon: IconName; t: string; d: string; at: string; tone: 'coral' | 'teal' | 'cyan' | 'muted' }

export function RecentActivity({ max = 4 }: { max?: number }) {
  const { uid, demo } = useApp();
  const events = useMyEvents(demo ? null : uid, 5);
  const logs = useLogs();
  const items = useMemo<Item[] | undefined>(() => {
    if (demo) {
      const t = (m: number) => new Date(Date.now() - m * 60000).toISOString();
      return [
        { id: 'a', icon: 'eye', t: 'Responder viewed Health Vault', d: 'Blood group, allergies, medications', at: t(2), tone: 'cyan' },
        { id: 'b', icon: 'sos', t: 'SOS practice', d: 'Ended safely · 2 contacts (demo)', at: t(60 * 26), tone: 'coral' },
        { id: 'c', icon: 'vault', t: 'Health Vault updated', d: 'Medications', at: t(60 * 24 * 8), tone: 'teal' },
      ];
    }
    if (events === undefined || logs === undefined) return undefined;
    const ev: Item[] = (events ?? []).map((e) => ({ id: e.id, icon: 'sos', t: e.status === 'active' ? 'SOS active' : 'SOS', d: `${e.status === 'safe' ? 'Ended safe' : e.status === 'cancelled' ? 'Cancelled' : 'In progress'}`, at: e.startedAt, tone: 'coral' }));
    const lg: Item[] = logs.map((l) => ({ id: l.id, icon: l.kind === 'responder_view' ? 'eye' : 'key', t: l.kind === 'responder_view' ? 'Responder viewed Health Vault' : l.detail, d: l.kind === 'responder_view' ? l.detail : l.actor, at: l.at, tone: l.kind === 'responder_view' ? 'cyan' : 'teal' }));
    return [...ev, ...lg].sort((a, b) => b.at.localeCompare(a.at)).slice(0, max);
  }, [demo, events, logs, max]);

  if (items === undefined) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>;
  if (!items.length) return <p className="text-[13.5px] text-ink-muted">No emergency activity yet. That’s a good thing.</p>;
  const tone = { coral: 'bg-coral-50 text-coral-500', teal: 'bg-teal-50 text-teal-600', cyan: 'bg-cyan-400/10 text-cyan-600', muted: 'bg-clinic-100 text-ink-muted' };
  return (
    <ul className="space-y-1">
      {demo && <li className="mb-1"><Honest kind="demo" /></li>}
      {items.map((i, k) => (
        <motion.li key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-clinic-50">
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone[i.tone])}><Icon name={i.icon} size={17} /></span>
          <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] text-ink">{i.t}</b><span className="block truncate text-[12px] text-ink-muted">{i.d}</span></span>
          <span className="shrink-0 font-mono text-[11px] text-ink-faint">{ago(i.at)}</span>
        </motion.li>
      ))}
    </ul>
  );
}

/** Wearable auto-SOS is on the roadmap; nothing here pretends a device is connected. */
export function WearableStatus({ compact }: { compact?: boolean }) {
  const { nav } = useApp();
  return (
    <div className={cx('rounded-3xl bg-white p-4 ring-1 ring-inset ring-line', compact && 'p-3')}>
      <div className="flex items-center gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-clinic-100 text-ink-muted"><Icon name="watch" size={21} /></span>
        <span className="min-w-0 flex-1"><b className="block text-[14px] text-ink">Wearable</b><span className="block text-[12px] text-ink-muted">Not connected</span></span>
        <StatusChip status="soon" />
      </div>
      {!compact && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-clinic-50 px-3 py-2.5 text-[13px]">
          <span className="font-semibold text-ink-soft">Auto SOS (fall / impact detection)</span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Disabled</span>
        </div>
      )}
      <button onClick={() => nav.tab('devices')} className="mt-2 text-[12.5px] font-semibold text-teal-600">Device readiness →</button>
    </div>
  );
}

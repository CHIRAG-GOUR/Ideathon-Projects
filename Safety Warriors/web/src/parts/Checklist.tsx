'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { hasNative, invoke, requestPermission } from '@core/native';
import { APP_ID, useApp } from '@/ctx';
import { Card, Kicker, cx } from '@/ui/kit';
import { Icon } from '@/ui/icons';

/** Safety Checklist: device items come from what the phone/browser reports; personal items are ticked by you (kept on this device). */
const PERSONAL = [
  { id: 'plans', t: 'Someone knows my plans today' },
  { id: 'numbers', t: 'I know 112 and 181 by heart' },
  { id: 'powerbank', t: 'Power bank or charger with me' },
];

export function Checklist({ compact }: { compact?: boolean }) {
  const { readiness, nav } = useApp();
  const [ticked, setTicked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${APP_ID}.checklist`) ?? '{}');
    } catch {
      return {};
    }
  });
  const tick = (id: string) => {
    const next = { ...ticked, [id]: !ticked[id] };
    setTicked(next);
    try {
      localStorage.setItem(`${APP_ID}.checklist`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const get = (k: string) => readiness.items.find((i) => i.key === k);
  const battery = get('battery');
  const device = [
    { id: 'battery', t: 'Phone charged', ok: battery?.state === 'ok', unknown: battery?.state === 'unknown', d: battery?.detail ?? '', fix: undefined as (() => void) | undefined },
    { id: 'location', t: 'Location on', ok: get('location')?.state === 'ok' && (!get('gps') || get('gps')?.state !== 'off'), unknown: get('location')?.state === 'unknown', d: get('location')?.detail ?? '', fix: async () => { if (!(await requestPermission('location')) && hasNative()) invoke('openAppSettings'); readiness.refresh(); } },
    { id: 'contacts', t: 'Trusted contact added', ok: get('contacts')?.state === 'ok', unknown: false, d: get('contacts')?.detail ?? '', fix: () => nav.go('contacts') },
    { id: 'perms', t: 'Alerts allowed', ok: get('notifications')?.state === 'ok' && (!hasNative() || get('sms')?.state === 'ok'), unknown: get('notifications')?.state === 'unknown', d: hasNative() ? 'Notifications and SMS' : 'Notifications', fix: async () => { await requestPermission('notifications'); if (hasNative()) await requestPermission('sms'); readiness.refresh(); } },
  ];
  const done = device.filter((i) => i.ok).length + PERSONAL.filter((p) => ticked[p.id]).length;
  const total = device.length + PERSONAL.length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Kicker>Safety checklist</Kicker>
        <span className="font-display text-sm font-bold text-indigo-700">{done}/{total}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream-100">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" animate={{ width: `${(done / total) * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <ul className={cx('mt-3 grid gap-1.5', !compact && 'sm:grid-cols-2')}>
        {device.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
            <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2', i.ok ? 'border-emerald-600 bg-emerald-500 text-white' : i.unknown ? 'border-indigo-100 bg-cream-100 text-ink-faint' : 'border-tang-400 bg-tang-50 text-tang-600')} aria-label={i.ok ? 'Done' : i.unknown ? 'Unknown' : 'Not done'} role="img">
              {i.ok ? <Icon name="check" size={16} /> : i.unknown ? '?' : '!'}
            </span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{i.t}</span>{!compact && <span className="block truncate text-xs text-ink-muted">{i.d}</span>}</span>
            {!i.ok && i.fix && <button onClick={() => i.fix!()} className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">Fix</button>}
          </li>
        ))}
        {PERSONAL.map((p) => (
          <li key={p.id}>
            <button role="checkbox" aria-checked={!!ticked[p.id]} onClick={() => tick(p.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left">
              <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2', ticked[p.id] ? 'border-emerald-600 bg-emerald-500 text-white' : 'border-indigo-100 bg-white')}>{ticked[p.id] && <Icon name="check" size={16} />}</span>
              <span className="text-sm font-semibold text-ink">{p.t}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

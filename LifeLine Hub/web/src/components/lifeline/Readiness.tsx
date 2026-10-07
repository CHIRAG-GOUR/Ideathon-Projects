'use client';
/** Emergency readiness — what would happen if SOS were pressed now, from real device/account state. */
import { motion } from 'framer-motion';
import { hasNative } from '@core/native';
import { useApp, type Screen } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { AnimatedNumber, StatusChip, cx, rise, stagger, type Status } from '@/ui/kit';
import { readiness as vaultReadiness } from '@/services/health/vault';

export interface ReadyItem { key: string; icon: IconName; label: string; detail: string; status: Status; ok: boolean; go: Screen }

export function useEmergencyReadiness(): { items: ReadyItem[]; score: number } {
  const { fix, locState, contacts, medical, online, readiness, demo } = useApp();
  const v = vaultReadiness(medical ?? null);
  const native = hasNative();
  const notif = readiness.items.find((i) => i.key === 'notifications');
  const items: ReadyItem[] = [
    { key: 'loc', icon: 'location', label: 'Location', detail: fix ? (demo ? 'Demo location' : `Ready · ±${Math.round(fix.accuracy ?? 30)} m`) : locState === 'denied' ? 'Permission blocked' : 'Tap to enable', status: fix ? 'locked' : 'pending', ok: !!fix, go: 'radar' },
    { key: 'contacts', icon: 'family', label: 'Emergency contacts', detail: contacts.length ? `${contacts.length} will be alerted` : 'Add at least one', status: contacts.length ? 'ready' : 'pending', ok: contacts.length > 0, go: 'contacts' },
    { key: 'vault', icon: 'vault', label: 'Health Vault', detail: `${Math.round(v.score * 100)}% of critical info`, status: v.score >= 0.75 ? 'ready' : 'pending', ok: v.score >= 0.75, go: 'vault' },
    { key: 'comms', icon: 'broadcast', label: 'Communication', detail: !online ? (native ? 'Offline · SMS fallback ready' : 'Offline') : native ? 'SMS from SIM + WhatsApp' : 'WhatsApp + SMS (tap to send)', status: !online ? 'offline' : 'ready', ok: online || native, go: 'sos' },
    { key: 'guide', icon: 'ai', label: 'AI Guidance', detail: 'Works offline on this device', status: 'ready', ok: true, go: 'guidance' },
    { key: 'notif', icon: 'info', label: 'Alerts on this device', detail: notif?.detail ?? 'Unknown', status: notif?.state === 'ok' ? 'ready' : 'pending', ok: notif?.state === 'ok', go: 'settings' },
  ];
  return { items, score: items.filter((i) => i.ok).length / items.length };
}

export function ReadinessPanel({ dense }: { dense?: boolean }) {
  const { nav, locate, fix } = useApp();
  const { items, score } = useEmergencyReadiness();
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-teal-600">Emergency readiness</p>
          <p className="mt-1 font-display text-[34px] font-semibold leading-none tracking-tight text-ink"><AnimatedNumber value={Math.round(score * 100)} suffix="%" /></p>
        </div>
        <ScoreRing value={score} />
      </div>
      <motion.ul variants={stagger(0.05)} initial="hidden" animate="show" className={cx('mt-4 divide-y divide-line', dense && 'text-[13px]')}>
        {items.map((i) => (
          <motion.li key={i.key} variants={rise}>
            <button onClick={() => (i.key === 'loc' && !fix ? locate() : nav.tab(i.go))} className="group flex w-full items-center gap-3 py-2.5 text-left">
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', i.ok ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600')}><Icon name={i.icon} size={17} /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-semibold text-ink">{i.label}</b>
                <span className="block truncate text-[12px] text-ink-muted">{i.detail}</span>
              </span>
              <StatusChip status={i.status} />
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function ScoreRing({ value, size = 56 }: { value: number; size?: number }) {
  const R = 22, C = 2 * Math.PI * R;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={R} fill="none" stroke="#E1E9EE" strokeWidth="5" />
      <motion.circle cx="28" cy="28" r={R} fill="none" stroke={value >= 0.8 ? '#0B8A57' : '#E89A16'} strokeWidth="5" strokeLinecap="round" transform="rotate(-90 28 28)" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${value * C} ${C}` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

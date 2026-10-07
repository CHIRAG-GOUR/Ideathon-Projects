'use client';
/** EMERGENCY BROADCAST — the resilient stack's live status (WhatsApp · SMS · live link · push · network). */
import { AnimatePresence, motion } from 'framer-motion';
import { hasNative } from '@core/native';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { Honest, cx } from '@/ui/kit';
import { broadcastStatus, type TransportState, type TransportId } from '@/services/emergency/transport';

const ICON: Record<TransportId, IconName> = { whatsapp: 'whatsapp', sms: 'sms', live: 'location', push: 'broadcast', offline: 'wifi' };
const LOOK: Record<TransportState, { label: string; cls: string; icon?: IconName; spin?: boolean }> = {
  idle: { label: 'Idle', cls: 'text-ink-faint' },
  working: { label: 'Sending', cls: 'text-cyan-600', spin: true },
  sent: { label: 'Sent', cls: 'text-vital-600', icon: 'check' },
  partial: { label: 'Partly sent', cls: 'text-amber-700', icon: 'alert' },
  ready: { label: 'Ready', cls: 'text-vital-600', icon: 'check' },
  manual: { label: 'Tap to send', cls: 'text-amber-700', icon: 'hand' },
  queued: { label: 'Queued', cls: 'text-amber-700', icon: 'clock' },
  failed: { label: 'Failed', cls: 'text-coral-600', icon: 'x' },
  unavailable: { label: 'Not configured', cls: 'text-ink-faint', icon: 'info' },
  standby: { label: 'Standby', cls: 'text-vital-600', icon: 'wifi' },
  degraded: { label: 'Degraded', cls: 'text-amber-700', icon: 'wifiOff' },
  simulated: { label: 'Simulated', cls: 'text-violet-600', icon: 'info' },
};

export function BroadcastStatus({ whatsappOpened = {}, light }: { whatsappOpened?: Record<string, boolean>; light?: boolean }) {
  const { sos, contacts, demo, online } = useApp();
  const list = broadcastStatus({ sos: sos.state, contacts, native: hasNative(), demo, online, whatsappOpened });
  const degraded = list.find((l) => l.id === 'offline')?.state === 'degraded';
  return (
    <div className={cx('rounded-3xl p-4', light ? 'bg-white text-ink' : 'bg-clinic-50 ring-1 ring-inset ring-line')}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-cyan-600">Emergency broadcast</p>
        {demo && sos.state.phase !== 'IDLE' && <Honest dark kind="simulated" />}
      </div>
      <AnimatePresence>
        {degraded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/15 px-3 py-2 text-[12.5px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-400/30">
              <Icon name="wifiOff" size={15} />Connection degraded · attempting fallback… {hasNative() ? 'SMS fallback ready' : 'call or text directly'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ul className="mt-2 divide-y divide-white/[0.06]">
        {list.map((t, i) => {
          const look = LOOK[t.state];
          return (
            <motion.li key={t.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 py-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-clinic-50 text-ink"><Icon name={ICON[t.id]} size={17} /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13.5px]">{t.label}</b>
                <span className="block truncate text-[11.5px] text-ink-faint">{t.detail}</span>
              </span>
              <motion.span key={t.state} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className={cx('inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wide', look.cls)}>
                {look.spin ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : look.icon && <Icon name={look.icon} size={13} strokeWidth={2.4} />}
                {look.label}
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

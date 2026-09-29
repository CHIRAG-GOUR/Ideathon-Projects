'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { EmergencyContact, SosEvent } from '@shared/types';
import { HoldButton } from '@/components/HoldButton';
import { Card, E3d, Pill, cn } from '@/components/ui';
import { Avatar } from '../circle/Circle';
import type { NativeInfo } from '@/lib/native';

export type Screen = 'home' | 'circle' | 'trip' | 'timer' | 'checkin' | 'nearby' | 'fakecall' | 'settings' | 'history' | 'alert' | 'watch';

interface Props {
  name: string;
  contacts: EmergencyContact[];
  discreet: boolean;
  native: NativeInfo | null;
  network: 'online' | 'weak' | 'offline';
  cancelledFlash: boolean;
  activeTrip: string | null;
  circleAlerts: SosEvent[];
  checkinRequests: { id: string; fromName: string; contactId: string }[];
  onHoldStart: () => void;
  onHoldCancel: () => void;
  onSos: () => void;
  onGo: (s: Screen, arg?: string) => void;
  onAnswerRequest: (id: string, contactId: string) => void;
  onFixReadiness: (what: 'location' | 'sms' | 'notifications') => void;
}

const ACTIONS: { s: Screen; label: string; sub: string; icon: string }[] = [
  { s: 'trip', label: 'Safe Trip', sub: 'Share your journey', icon: 'woman-walking' },
  { s: 'checkin', label: 'Check In', sub: "Say you're okay", icon: 'wave' },
  { s: 'nearby', label: 'Nearby Help', sub: 'Police · hospitals', icon: 'police' },
  { s: 'timer', label: 'Safety Timer', sub: 'Alert if no check-in', icon: 'timer' },
];

export function Home(p: Props) {
  const ready = [
    { key: 'location' as const, ok: !!p.native?.permissions.location && p.native.locationEnabled, label: p.native && !p.native.locationEnabled ? 'Turn on Location' : 'Location' },
    { key: 'sms' as const, ok: !p.native || !p.native.directSms || !!p.native.permissions.sms, label: 'SOS texts' },
    { key: 'notifications' as const, ok: !!p.native?.permissions.notifications, label: 'Notifications' },
  ];
  const verified = p.contacts.filter((c) => c.verified).length;

  return (
    <div className="space-y-5 pb-10">
      <AnimatePresence>
        {p.circleAlerts.map((e) => (
          <motion.div key={e.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => p.onGo('watch', e.id)} className="w-full rounded-4xl bg-gradient-to-br from-sos-500 to-sos-700 p-4 text-left text-white shadow-glow">
              <p className="text-xs font-extrabold tracking-widest">🚨 SOS ALERT</p>
              <p className="mt-1 text-xl font-extrabold">{e.ownerName} needs help</p>
              <p className="text-sm text-white/85">Tap to see live location →</p>
            </button>
          </motion.div>
        ))}
        {p.checkinRequests.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-sos-200 bg-sos-50">
              <p className="font-bold">{r.fromName} asks: are you safe?</p>
              <button onClick={() => p.onAnswerRequest(r.id, r.contactId)} className="mt-2 rounded-2xl bg-safe-500 px-4 py-2 font-bold text-white">
                I&apos;m safe — tell {r.fromName}
              </button>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {p.activeTrip && (
        <Card onClick={() => p.onGo('trip')} className="flex items-center gap-3 border-sos-100">
          <E3d name="woman-walking" size={40} />
          <div className="flex-1">
            <p className="font-bold">{p.activeTrip}</p>
            <p className="text-sm text-ink-muted">Trip in progress · tap to check in</p>
          </div>
          <Pill tone="red">LIVE</Pill>
        </Card>
      )}

      {!p.discreet && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative px-8 pt-2 text-center">
          <motion.div className="absolute -left-1 top-2" animate={{ y: [0, -6, 0], rotate: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <E3d name="heart" size={34} />
          </motion.div>
          <motion.div className="absolute -right-1 top-8" animate={{ y: [0, 6, 0] }} transition={{ duration: 3.4, repeat: Infinity }}>
            <E3d name="shield" size={34} />
          </motion.div>
          <h1 className="text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-ink">
            You&apos;re <span className="text-sos-500">not alone.</span>
          </h1>
          <p className="mt-2 text-ink-soft">One hold can alert the people who matter.</p>
        </motion.section>
      )}

      <div className="flex flex-col items-center">
        <HoldButton size={p.discreet ? 200 : 260} onPress={p.onHoldStart} onCancel={p.onHoldCancel} onComplete={p.onSos} />
        <div className="h-7">
          <AnimatePresence>
            {p.cancelledFlash && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm font-bold text-ink-muted" role="status">
                SOS cancelled
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        {p.native && (
          <div className="flex flex-wrap justify-center gap-2">
            {ready.map((r) => (
              <button key={r.key} onClick={() => !r.ok && p.onFixReadiness(r.key)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', r.ok ? 'bg-safe-50 text-safe-600' : 'bg-warn-50 text-warn-600')}>
                {r.ok ? '✓' : '!'} {r.label}
                {!r.ok && ' · fix'}
              </button>
            ))}
          </div>
        )}
      </div>

      <Card onClick={() => p.onGo('circle')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="h-eyebrow">Safety Circle</p>
            <p className="mt-1 font-extrabold text-ink">
              {p.contacts.length ? `${p.contacts.length} trusted ${p.contacts.length === 1 ? 'person' : 'people'}` : 'Add a safety contact'}
            </p>
            {p.contacts.length > 0 && <p className="text-xs text-ink-muted">{verified} verified for live location</p>}
          </div>
          <div className="flex -space-x-2">
            {p.contacts.slice(0, 4).map((c) => (
              <span key={c.id} className="rounded-full ring-2 ring-white">
                <Avatar name={c.name} verified={c.verified} size={38} />
              </span>
            ))}
            {!p.contacts.length && <E3d name="family" size={44} />}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a, i) => (
          <motion.div key={a.s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <Card onClick={() => p.onGo(a.s)} className="h-full">
              <E3d name={a.icon} size={40} />
              <p className="mt-2 font-extrabold text-ink">{a.label}</p>
              <p className="text-xs text-ink-muted">{a.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <button onClick={() => p.onGo('fakecall')} className="rounded-2xl bg-white px-4 py-3 text-left font-semibold text-ink-soft shadow-soft">
          📱 Fake call <span className="block text-xs font-normal text-ink-muted">Escape tool, not an alert</span>
        </button>
        <button onClick={() => p.onGo('history')} className="rounded-2xl bg-white px-4 py-3 text-left font-semibold text-ink-soft shadow-soft">
          🕘 History <span className="block text-xs font-normal text-ink-muted">SOS, trips, check-ins</span>
        </button>
      </div>
    </div>
  );
}

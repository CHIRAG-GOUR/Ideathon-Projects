'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { EmergencyContact, EmergencyLocation } from '@shared/types';
import { fmtDistance } from '@shared/geo';
import { hasNative, invoke, onNative } from '@/lib/native';
import { nearbyHelp, type HelpKind } from '@/lib/places';
import { Button, Card, Pill, cn } from '@/components/ui';

const sosText = (contactId?: string) => (hasNative() ? invoke<{ text: string }>('sosMessage', { contactId }).text : 'DEMO');

/** WhatsApp and email from the user's own apps (pre-filled; the user taps Send). SMS goes automatically. */
export function ShareChannels({ contacts, demo }: { contacts: EmergencyContact[]; demo: boolean }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [emailed, setEmailed] = useState(false);
  useEffect(
    () =>
      onNative((e) => {
        if (e.type === 'sos_whatsapp' && e.state === 'queued') setOpened((o) => ({ ...o, [e.id]: true }));
      }),
    [],
  );
  const phones = contacts.filter((c) => c.phone);
  const emails = contacts.filter((c) => c.email).map((c) => c.email!);
  return (
    <Card>
      <p className="font-extrabold text-ink">Also send on WhatsApp & email</p>
      <p className="text-xs text-ink-muted">From your own WhatsApp and email — each opens ready to send.</p>
      <ul className="mt-2 divide-y divide-line">
        {phones.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-semibold">{c.name}</span>
            <button
              disabled={demo}
              onClick={() => {
                invoke('whatsapp', { phone: c.phone, text: sosText(c.id) });
                setOpened((o) => ({ ...o, [c.id]: true }));
              }}
              className={cn('rounded-full px-3.5 py-2 text-xs font-extrabold', opened[c.id] ? 'bg-safe-50 text-safe-600' : 'bg-[#25D366] text-white')}
            >
              {opened[c.id] ? 'WhatsApp opened ✓' : 'Send on WhatsApp'}
            </button>
          </li>
        ))}
      </ul>
      {emails.length > 0 && (
        <Button
          variant="white"
          className="mt-2 w-full"
          disabled={demo}
          onClick={() => {
            invoke('email', { to: emails, subject: '🆘 SOS — I NEED HELP', body: sosText() });
            setEmailed(true);
          }}
        >
          ✉️ {emailed ? 'Email opened ✓ — tap Send' : `Email ${emails.length} contact${emails.length > 1 ? 's' : ''}`}
        </Button>
      )}
    </Card>
  );
}

const ICON: Record<HelpKind, string> = { police: '👮‍♀️', army: '🪖', hospital: '🏥', fire: '🚒', pharmacy: '💊' };

/**
 * One press, nearest authorities. SIMULATION: this version has no official link to police or the army,
 * so nothing is sent to them — the places and distances are real (OpenStreetMap).
 */
export function AuthoritiesPanel({ loc, emergency }: { loc: EmergencyLocation | null; emergency: string }) {
  const [rows, setRows] = useState<{ icon: string; name: string; sub: string }[] | null>(null);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    if (!loc || rows) return;
    const base = [{ icon: '🆘', name: `${emergency} · Emergency Response`, sub: 'Nationwide emergency number' }];
    const pick = (kind: HelpKind, n: number, all: Awaited<ReturnType<typeof nearbyHelp>>) => all.filter((p) => p.kind === kind).slice(0, n).map((p) => ({ icon: ICON[kind], name: p.name, sub: `${fmtDistance(p.distance)} away` }));
    nearbyHelp(loc.latitude, loc.longitude, 5000)
      .then((all) => setRows([...base, ...pick('police', 2, all), ...pick('army', 1, all), ...pick('hospital', 1, all)]))
      .catch(() => setRows([...base, { icon: '👮‍♀️', name: 'Nearest police station', sub: 'Needs internet to find it' }]));
  }, [loc, rows, emergency]);

  useEffect(() => {
    if (!rows || sent >= rows.length) return;
    const t = setTimeout(() => setSent((n) => n + 1), 700);
    return () => clearTimeout(t);
  }, [rows, sent]);

  return (
    <Card className="border-sos-100 bg-gradient-to-br from-white to-sos-50">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold text-ink">🚓 Alerting nearest police & army</p>
        <Pill tone="demo">SIMULATION</Pill>
      </div>
      {!rows && <p className="mt-2 text-sm text-ink-muted">{loc ? 'Finding the nearest stations…' : 'Waiting for your location…'}</p>}
      <ul className="mt-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {rows?.map((r, i) => (
            <motion.li key={r.name + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-soft">
              <span className="text-xl" aria-hidden>{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{r.name}</span>
                <span className="text-xs text-ink-muted">{r.sub}</span>
              </span>
              <span className={cn('shrink-0 text-xs font-extrabold', i < sent ? 'text-safe-600' : 'text-ink-muted')}>{i < sent ? '✓ SOS SENT' : 'Sending…'}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <p className="mt-2 text-[11px] font-semibold text-ink-muted">Simulation in this version — police and army are not actually contacted. Tap “Call {emergency}” for real help.</p>
    </Card>
  );
}

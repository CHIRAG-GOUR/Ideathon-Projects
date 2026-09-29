'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { EmergencyContact, EmergencyLocation } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { SMS_TEMPLATES, fillSms, fmtTime } from '@shared/message';
import { api } from '@/lib/api';
import { currentFix, hasNative, invoke, onNative } from '@/lib/native';
import { Button, Card, E3d, Toggle, cn, inputCls } from '@/components/ui';

const PRESETS = ["I'm okay.", 'Reached home safely.', "I'm on my way.", 'Running late but safe.'];

export function CheckIn({ name, contacts, region, signedIn, demo, initialTo }: { name: string; contacts: EmergencyContact[]; region: string; signedIn: boolean; demo: boolean; initialTo?: string[] }) {
  const withPhone = contacts.filter((c) => c.phone);
  const [message, setMessage] = useState(PRESETS[0]);
  const [to, setTo] = useState<string[]>(initialTo ?? withPhone.slice(0, 1).map((c) => c.id));
  const [shareLoc, setShareLoc] = useState(true);
  const [results, setResults] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onNative((e) => {
        if (e.type === 'sms_result' && e.tag === 'checkin') setResults((r) => ({ ...r, [e.id]: e.status }));
      }),
    [],
  );

  async function send() {
    setBusy(true);
    const loc: EmergencyLocation | null = shareLoc ? await currentFix() : null;
    const r = EmergencyNumberService.forRegion(region);
    const body = fillSms(SMS_TEMPLATES.checkin, { name, message, location: loc, time: fmtTime(new Date().toISOString(), r.timeZone), emergency: r.primary.number });
    const targets = withPhone.filter((c) => to.includes(c.id));
    if (demo) {
      setResults(Object.fromEntries(targets.map((c) => [c.id, 'demo'])));
    } else if (hasNative()) {
      invoke('smsSend', { to: targets.map((c) => ({ id: c.id, phone: c.phone })), body, tag: 'checkin' });
    } else {
      window.location.href = `sms:${targets.map((c) => c.phone).join(',')}?body=${encodeURIComponent(body)}`;
    }
    if (!demo && signedIn) api('/checkins', { message, contactIds: targets.map((c) => c.id), location: loc, results: {} }).catch(() => undefined);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <motion.div initial={{ scale: 0.5, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
          <E3d name="check" size={96} className="mx-auto" />
        </motion.div>
        <h2 className="mt-3 text-2xl font-extrabold">Check-in on its way</h2>
        <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left">
          {withPhone
            .filter((c) => to.includes(c.id))
            .map((c) => (
              <li key={c.id} className="flex justify-between rounded-2xl bg-white px-4 py-2.5 shadow-soft">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm font-bold text-ink-muted">{LABEL[results[c.id] ?? 'pending']}</span>
              </li>
            ))}
        </ul>
        <Button variant="white" className="mt-6" onClick={() => (setSent(false), setResults({}))}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p} onClick={() => setMessage(p)} className={cn('rounded-full px-3.5 py-2 text-sm font-semibold', message === p ? 'bg-sos-500 text-white' : 'bg-white shadow-soft')}>
            {p}
          </button>
        ))}
      </div>
      <textarea className={cn(inputCls, 'h-24 resize-none')} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={160} aria-label="Message" />
      <Card>
        <p className="mb-2 font-bold">Send to</p>
        {withPhone.length === 0 && <p className="text-sm text-ink-muted">Add a contact with a phone number first.</p>}
        <div className="flex flex-wrap gap-2">
          {withPhone.map((c) => (
            <button key={c.id} onClick={() => setTo((t) => (t.includes(c.id) ? t.filter((x) => x !== c.id) : [...t, c.id]))} className={cn('rounded-full px-3.5 py-2 text-sm font-semibold', to.includes(c.id) ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}>
              {c.name}
            </button>
          ))}
        </div>
        <Toggle on={shareLoc} onChange={setShareLoc} label="Include my current location" />
      </Card>
      <Button big className="w-full" disabled={busy || !to.length} onClick={send}>
        👋 Send check-in
      </Button>
    </div>
  );
}

const LABEL: Record<string, string> = { pending: 'Sending…', submitted: 'Sent ✓', delivered: 'Delivered ✓', failed: 'Failed ✕', composer: 'Opened in Messages', demo: 'DEMO' };

'use client';
/**
 * Responder view — opened by scanning a Health Vault QR. Shows only the fields the owner chose, until the link
 * expires. No account is needed; the server logs the view for the owner. /r/demo shows demonstration data.
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Logo } from '@/ui/brand';
import { Icon, type IconName } from '@/ui/icons';
import { Honest, StatusChip } from '@/ui/kit';
import { DEMO_MEDICAL, useCountdown, type Medication } from '@/services/health/vault';

interface View {
  firstName: string; expiresAt: string; updatedAt: string | null;
  bloodGroup?: string | null; allergies?: string[] | null; medications?: Medication[] | null; conditions?: string[] | null; emergencyNotes?: string | null;
  emergencyContact?: { name: string; relationship: string; phone: string } | null; doctor?: { name: string; phone: string; clinic: string } | null;
}

function tokenFromPath() {
  if (typeof location === 'undefined') return null;
  const p = location.pathname.startsWith('/r/') ? location.pathname.slice(3).split('/')[0] : new URLSearchParams(location.search).get('t');
  if (p === 'demo') return 'demo';
  return p && /^[A-Za-z0-9_-]{24,64}$/.test(p) ? p : null;
}

export default function ResponderView() {
  const [token] = useState(tokenFromPath);
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return setErr('This link is incomplete.');
    if (token === 'demo') {
      const m = DEMO_MEDICAL;
      return setV({ firstName: 'Arjun', expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), updatedAt: m.updatedAt, bloodGroup: m.bloodGroup, allergies: m.allergies, medications: m.medications, conditions: m.conditions });
    }
    fetch(`/api/responder?t=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? 'This link is not valid.'); setV(j); })
      .catch((e) => setErr(e.message));
  }, [token]);
  const cd = useCountdown(v?.expiresAt ?? null);
  const demo = token === 'demo';

  type Row = { icon: IconName; label: string; value: string | null | undefined; show: boolean; warn?: boolean };
  const all: Row[] = v ? [
    { icon: 'blood', label: 'Blood group', value: v.bloodGroup ?? 'Not recorded', show: v.bloodGroup !== undefined },
    { icon: 'allergy', label: 'Allergies', value: v.allergies?.length ? v.allergies.join(', ') : 'None recorded', show: v.allergies !== undefined, warn: !!v.allergies?.length },
    { icon: 'pill', label: 'Current medications', value: v.medications?.length ? v.medications.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ''}`).join(', ') : 'None recorded', show: v.medications !== undefined },
    { icon: 'condition', label: 'Critical conditions', value: v.conditions?.length ? v.conditions.join(', ') : 'None recorded', show: v.conditions !== undefined },
    { icon: 'note', label: 'Emergency notes', value: v.emergencyNotes ?? 'None', show: v.emergencyNotes !== undefined },
    { icon: 'contact', label: 'Emergency contact', value: v.emergencyContact ? `${v.emergencyContact.name} (${v.emergencyContact.relationship}) · ${v.emergencyContact.phone}` : 'Not recorded', show: v.emergencyContact !== undefined },
    { icon: 'doctor', label: 'Doctor', value: v.doctor ? `${v.doctor.name}${v.doctor.clinic ? `, ${v.doctor.clinic}` : ''} · ${v.doctor.phone}` : 'Not recorded', show: v.doctor !== undefined },
  ] : [];
  const rows = all.filter((r) => r.show);

  return (
    <main className="min-h-screen surface-command px-4 pb-10 pt-[max(env(safe-area-inset-top),1rem)] text-white">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between py-2"><Logo light size={28} />{demo && <Honest dark kind="demo" />}</div>
        {err ? (
          <div className="mt-12 rounded-4xl bg-white/[0.05] p-8 text-center ring-1 ring-inset ring-white/10"><Icon name="lock" size={34} className="mx-auto text-cyan-300" /><h1 className="mt-3 font-display text-[22px] font-semibold">Access not available</h1><p className="mt-2 text-midnight-200">{err}</p></div>
        ) : !v ? (
          <p className="mt-20 text-center text-midnight-200">Verifying access…</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-3">
            <div className="rounded-4xl bg-white/[0.05] p-5 ring-1 ring-inset ring-cyan-300/20">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Emergency medical access</p>
              <h1 className="mt-1 font-display text-[28px] font-semibold">{v.firstName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2"><StatusChip status={cd.expired ? 'off' : 'live'} label={cd.expired ? 'Expired' : `Expires in ${cd.label}`} />{v.updatedAt && <span className="text-[12px] text-midnight-300">Updated {new Date(v.updatedAt).toLocaleDateString()}</span>}</div>
            </div>
            {!cd.expired && rows.map((r, i) => (
              <motion.div key={r.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex gap-3 rounded-3xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${r.warn ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}`}><Icon name={r.icon} size={19} /></span>
                <span><span className="block text-[12px] font-semibold uppercase tracking-wide text-midnight-200">{r.label}</span><span className={r.label === 'Blood group' ? 'block font-display text-[30px] font-semibold leading-tight' : 'block text-[15.5px] font-semibold'}>{r.value}</span></span>
              </motion.div>
            ))}
            <p className="text-center text-[12px] text-midnight-300">Shared by the patient for emergency care only. This view is logged. {demo ? 'Demonstration data — not a real person.' : 'Self-reported information; confirm clinically.'}</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}

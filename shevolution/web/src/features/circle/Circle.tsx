'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import type { EmergencyContact, Relationship } from '@shared/types';
import { contactInputSchema } from '@shared/schemas';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { hasNative, invoke, nextNative, type NativeEvent } from '@/lib/native';
import { Button, Card, E3d, Field, Pill, Sheet, Toggle, cn, inputCls } from '@/components/ui';

const RELATIONS: Relationship[] = ['Mother', 'Father', 'Sibling', 'Partner', 'Friend', 'Roommate', 'Guardian', 'Other'];
export const PRIORITY = { 1: 'Primary', 2: 'Secondary', 3: 'Backup' } as const;
const MAX = 5;

export function normalizePhone(raw: string, region = 'IN'): string | null {
  const t = raw.replace(/[^\d+]/g, '');
  if (!t) return null;
  if (t.startsWith('+')) return t;
  const d = t.replace(/^0+/, '');
  if (region === 'IN' && d.length === 10) return `+91${d}`;
  return `+${d}`;
}

export function Avatar({ name, verified, size = 44 }: { name: string; verified?: boolean; size?: number }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sos-100 to-blush-200 font-extrabold text-sos-700" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.trim().charAt(0).toUpperCase()}
      {verified && <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-safe-500 text-[9px] text-white ring-2 ring-white">✓</span>}
    </span>
  );
}

export function Circle({ uid, contacts, region }: { uid: string; contacts: EmergencyContact[]; region: string }) {
  const [edit, setEdit] = useState<EmergencyContact | 'new' | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  async function invite(c: EmergencyContact) {
    setInviteMsg(null);
    try {
      const { url } = await api<{ url: string }>('/contacts/invite', { contactId: c.id });
      const text = `Hi ${c.name}, I've added you to my Shevolution Safety Circle. Please verify it's you so you can see my live location if I ever send an SOS: ${url}`;
      if (hasNative() && c.phone) invoke('smsCompose', { numbers: [c.phone], body: text });
      else if (navigator.share) await navigator.share({ text }).catch(() => undefined);
      else {
        await navigator.clipboard.writeText(text);
        setInviteMsg('Invitation copied — paste it into a message to ' + c.name);
      }
    } catch (e) {
      setInviteMsg((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {contacts.map((c) => (
          <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}>
            <Card onClick={() => setEdit(c)}>
              <div className="flex items-center gap-3">
                <Avatar name={c.name} verified={c.verified} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{c.name}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {c.relationship} · {c.phone ?? c.email}
                  </p>
                </div>
                <Pill tone={c.priority === 1 ? 'red' : 'neutral'}>{PRIORITY[c.priority]}</Pill>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.channels.sms && <Pill>SOS SMS</Pill>}
                {c.channels.live && <Pill tone={c.verified ? 'safe' : 'warn'}>{c.verified ? 'Live location' : 'Live location after verification'}</Pill>}
                {c.channels.call && <Pill>Call escalation</Pill>}
              </div>
              {!c.verified && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-warn-50 px-3 py-2">
                  <span className="text-xs font-semibold text-warn-600">Not verified yet — cannot see live location</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      invite(c);
                    }}
                    className="text-xs font-extrabold text-sos-600"
                  >
                    Send link
                  </span>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      {inviteMsg && <p className="text-sm font-semibold text-ink-soft">{inviteMsg}</p>}
      {contacts.length === 0 && (
        <Card className="text-center">
          <E3d name="family" size={72} className="mx-auto" />
          <p className="mt-2 font-bold">Add a safety contact</p>
          <p className="text-sm text-ink-muted">Choose up to {MAX} people who should know when you hold SOS.</p>
        </Card>
      )}
      {contacts.length < MAX && (
        <Button big variant="soft" className="w-full" onClick={() => setEdit('new')}>
          + Add emergency contact
        </Button>
      )}
      <ContactSheet key={edit === 'new' ? 'new' : edit?.id ?? 'none'} uid={uid} region={region} contact={edit} onClose={() => setEdit(null)} onInvite={invite} />
    </div>
  );
}

function ContactSheet({ uid, region, contact, onClose, onInvite }: { uid: string; region: string; contact: EmergencyContact | 'new' | null; onClose: () => void; onInvite: (c: EmergencyContact) => void }) {
  const c = contact && contact !== 'new' ? contact : null;
  const [name, setName] = useState(c?.name ?? '');
  const [phone, setPhone] = useState(c?.phone ?? '');
  const [email, setEmail] = useState(c?.email ?? '');
  const [relationship, setRel] = useState<Relationship>(c?.relationship ?? 'Mother');
  const [priority, setPriority] = useState<1 | 2 | 3>(c?.priority ?? 1);
  const [channels, setChannels] = useState(c?.channels ?? { sms: true, live: true, call: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick() {
    invoke('pickContact');
    const e = await nextNative((x): x is Extract<NativeEvent, { type: 'contact_picked' }> => x.type === 'contact_picked');
    if (e && !e.cancelled) {
      if (e.name) setName(e.name);
      if (e.phone) setPhone(e.phone);
    }
  }

  async function save() {
    setErr(null);
    const p = normalizePhone(phone, region);
    const parsed = contactInputSchema.safeParse({ name, phone: p, email: email.trim() || null, relationship, priority, channels });
    if (!parsed.success) return setErr(parsed.error.issues[0]?.path.join('.') === 'phone' ? 'Enter a mobile number with country code, e.g. +91 98765 43210' : 'Check the name, phone and email.');
    if (!parsed.data.phone && !parsed.data.email) return setErr('Add a phone number or an email.');
    if (parsed.data.channels.sms && !parsed.data.phone) return setErr('SOS SMS needs a phone number.');
    setBusy(true);
    try {
      if (c) {
        const changedId = c.phone !== parsed.data.phone || c.email !== parsed.data.email;
        await updateDoc(doc(db(), `users/${uid}/contacts/${c.id}`), { ...parsed.data, ...(changedId ? { verified: false, linkedUid: null } : {}) });
      } else {
        await addDoc(collection(db(), `users/${uid}/contacts`), { ...parsed.data, verified: false, linkedUid: null, createdAt: new Date().toISOString() });
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!c || !confirm(`Remove ${c.name} from your Safety Circle? They lose any live-location access immediately.`)) return;
    setBusy(true);
    try {
      await api('/contacts/remove', { contactId: c.id });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!contact} onClose={onClose} title={c ? `Edit ${c.name}` : 'Add emergency contact'}>
      <div className="space-y-4">
        {!c && hasNative() && (
          <Button variant="white" className="w-full" onClick={pick}>
            📇 Choose from phone contacts
          </Button>
        )}
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Mobile number" hint="Only this number is stored — never your whole address book.">
          <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Email (optional)">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-soft">Relationship</p>
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map((r) => (
              <button key={r} type="button" onClick={() => setRel(r)} className={cn('rounded-full px-3.5 py-2 text-sm font-semibold', relationship === r ? 'bg-sos-500 text-white' : 'bg-blush-100 text-ink-soft')}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-soft">Priority</p>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)} className={cn('rounded-2xl py-2.5 text-sm font-bold', priority === p ? 'bg-ink text-white' : 'bg-blush-100 text-ink-soft')}>
                {PRIORITY[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line px-4">
          <Toggle on={channels.sms} onChange={(v) => setChannels({ ...channels, sms: v })} label="SOS SMS" hint="Text with your location from your phone — works without internet." />
          <Toggle on={channels.live} onChange={(v) => setChannels({ ...channels, live: v })} label="Live location" hint="Only after they verify their number or email." />
          <Toggle on={channels.call} onChange={(v) => setChannels({ ...channels, call: v })} label="Call escalation" hint="Can be called automatically if you choose them in Settings." />
        </div>
        {err && <p className="text-sm font-semibold text-sos-700">{err}</p>}
        <Button big className="w-full" disabled={busy} onClick={save}>
          {c ? 'Save' : 'Add to Safety Circle'}
        </Button>
        {c && !c.verified && (
          <Button variant="white" className="w-full" onClick={() => onInvite(c)}>
            Send verification link
          </Button>
        )}
        {c && (
          <button className="w-full py-2 text-sm font-bold text-sos-600" onClick={remove} disabled={busy}>
            Remove from Safety Circle
          </button>
        )}
      </div>
    </Sheet>
  );
}

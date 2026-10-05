'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ContactRole, EmergencyContact } from '@shared/types';
import { normalizePhone, removeContact, saveContact, type ContactDraft } from '@core/data';
import { hasNative, invoke, nextNative, type NativeEvent } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Field, Pill, Sheet, Spinner, Toggle, inputCls, cx } from '@/ui/kit';
import { CircleArt } from '@/ui/art';
import { Icon } from '@/ui/icons';

const ROLES: [ContactRole, string][] = [['primary', 'Primary'], ['family', 'Family'], ['friend', 'Friend'], ['emergency', 'Emergency']];
const EMPTY: ContactDraft = { name: '', phone: null, email: null, role: 'family', relationship: '', channels: { sms: true, whatsapp: true, email: false, live: true } };

export function Contacts() {
  const { contacts, contactsLoaded, demo, uid, toast } = useApp();
  const [edit, setEdit] = useState<{ id?: string; d: ContactDraft } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (c: EmergencyContact) => {
    if (demo) return toast('Demo contacts cannot be changed.');
    if (!confirm(`Remove ${c.name}? Any live-location link they hold stops working.`)) return;
    setRemoving(c.id);
    try {
      await removeContact(c.id);
      toast(`${c.name} removed.`);
    } catch (e) {
      toast(`Unable to remove this contact: ${(e as Error).message}`);
    }
    setRemoving(null);
  };

  return (
    <>
      <Header title="Trusted contacts" sub="The people She Shield alerts in an emergency" back right={<Btn onClick={() => setEdit({ d: { ...EMPTY, role: contacts.length ? 'family' : 'primary' } })}><Icon name="plus" size={18} />Add</Btn>} />
      <Page>
        {!contactsLoaded ? (
          <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>
        ) : contacts.length === 0 ? (
          <Card className="flex flex-col items-center !p-8 text-center">
            <CircleArt size={96} />
            <h2 className="mt-3 text-xl font-extrabold text-violet-900">Add your first trusted contact</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">They get your SOS by text, WhatsApp or email, with a private live-location link. They don&apos;t need the app.</p>
            <Btn className="mt-4" onClick={() => setEdit({ d: { ...EMPTY, role: 'primary' } })}>Add a contact</Btn>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-lg font-extrabold text-violet-800">{c.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-ink">{c.name}</p>
                      <p className="truncate text-sm text-ink-muted">{[c.relationship, c.phone, c.email].filter(Boolean).join(' · ')}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill tone={c.role === 'primary' ? 'violet' : 'gray'}>{ROLES.find((r) => r[0] === c.role)?.[1]}</Pill>
                        {c.channels.sms && <Pill tone="blue">SMS</Pill>}
                        {c.channels.whatsapp && <Pill tone="mint">WhatsApp</Pill>}
                        {c.channels.email && <Pill tone="rose">Email</Pill>}
                        {c.channels.live && <Pill tone="violet">Live link</Pill>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <Btn tone="ghost" className="flex-1 !min-h-[40px]" onClick={() => setEdit({ id: c.id, d: { name: c.name, phone: c.phone, email: c.email, role: c.role, relationship: c.relationship, channels: { ...c.channels } } })}><Icon name="edit" size={18} />Edit</Btn>
                    <Btn tone="ghost" className="flex-1 !min-h-[40px] !text-alert-600" disabled={removing === c.id} onClick={() => remove(c)}>{removing === c.id ? <Spinner /> : <Icon name="trash" size={18} />}Remove</Btn>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">Contacts are stored in your private She Shield account. They are only messaged when you trigger an alert or miss a protection check.</p>
      </Page>
      {edit && <Editor key={edit.id ?? 'new'} id={edit.id} initial={edit.d} uid={uid} demo={demo} onClose={() => setEdit(null)} onSaved={(n) => (toast(`${n} saved.`), setEdit(null))} />}
    </>
  );
}

function Editor({ id, initial, uid, demo, onClose, onSaved }: { id?: string; initial: ContactDraft; uid: string | null; demo: boolean; onClose: () => void; onSaved: (name: string) => void }) {
  const [d, setD] = useState(initial);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    invoke('pickContact');
    const e = await nextNative((x): x is Extract<NativeEvent, { type: 'contact_picked' }> => x.type === 'contact_picked');
    if (e && !e.cancelled) {
      if (e.name) setD((v) => ({ ...v, name: v.name || e.name! }));
      if (e.phone) setPhone(e.phone);
    }
  };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (demo || !uid) return setErr('Demo mode — sign in to save contacts.');
    setBusy(true);
    const draft = { ...d, name: d.name.trim(), relationship: d.relationship.trim(), phone: phone.trim() ? normalizePhone(phone) : null, email: d.email?.trim() || null };
    const e = await saveContact(uid, draft, id);
    setBusy(false);
    if (e) setErr(e);
    else onSaved(draft.name);
  };
  const chan = (k: keyof ContactDraft['channels'], label: string, hint: string) => <Toggle on={d.channels[k]} onChange={(v) => setD({ ...d, channels: { ...d.channels, [k]: v } })} label={label} hint={hint} />;

  return (
    <Sheet open onClose={onClose} title={id ? 'Edit contact' : 'Add trusted contact'}>
      <form onSubmit={save} className="space-y-4">
        {hasNative() && !id && <Btn type="button" tone="soft" className="w-full" onClick={pick}><Icon name="people" size={18} />Choose from phone contacts</Btn>}
        <Field label="Name"><input className={inputCls} required maxLength={60} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile" hint="With country code if outside India"><input className={inputCls} type="tel" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Relationship"><input className={inputCls} maxLength={40} placeholder="Sister, friend…" value={d.relationship} onChange={(e) => setD({ ...d, relationship: e.target.value })} /></Field>
        </div>
        <Field label="Email (optional)"><input className={inputCls} type="email" value={d.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-ink-soft">Role</legend>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(([r, t]) => (
              <button key={r} type="button" aria-pressed={d.role === r} onClick={() => setD({ ...d, role: r })} className={cx('rounded-full px-3.5 py-2 text-sm font-bold', d.role === r ? 'bg-violet-800 text-white' : 'bg-violet-50 text-violet-800')}>{t}</button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">Primary gets WhatsApp opened first during an SOS.</p>
        </fieldset>
        <div className="divide-y divide-line rounded-2xl border border-line px-4">
          {chan('sms', 'SMS', 'Sent automatically from your SIM (Android app)')}
          {chan('whatsapp', 'WhatsApp', 'Opens ready to send from your WhatsApp')}
          {chan('email', 'Email', 'Opens your mail app ready to send')}
          {chan('live', 'Private live-location link', 'A personal link that stops working when the SOS ends')}
        </div>
        {err && <p role="alert" className="text-sm font-semibold text-alert-600">{err}</p>}
        <Btn big type="submit" className="w-full" disabled={busy}>{busy && <Spinner />}Save contact</Btn>
      </form>
    </Sheet>
  );
}

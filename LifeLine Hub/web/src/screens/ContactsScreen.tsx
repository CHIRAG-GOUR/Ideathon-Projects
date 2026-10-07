'use client';
/** EMERGENCY CONTACTS — who is alerted, on which channels. Saved through Safety Core (rules-validated). */
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ContactRole, EmergencyContact } from '@shared/types';
import { normalizePhone, removeContact, saveContact, type ContactDraft } from '@core/data';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { BottomSheet, Btn, Field, Honest, Toggle, cx, inputCls } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';

const EMPTY: ContactDraft = { name: '', phone: null, email: null, role: 'family', relationship: '', channels: { sms: true, whatsapp: true, email: false, live: true } };

export function ContactsScreen() {
  const { contacts, uid, demo, toast, settings } = useApp();
  const [edit, setEdit] = useState<{ d: ContactDraft; id?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit) return;
    if (demo || !uid) { toast('Demo mode — contacts are fictional and not saved.'); return setEdit(null); }
    setBusy(true);
    const d = { ...edit.d, phone: edit.d.phone ? normalizePhone(edit.d.phone, settings.region) : null, email: edit.d.email?.trim() || null };
    const err = await saveContact(uid, d, edit.id);
    setBusy(false);
    if (err) return toast(err);
    toast('Contact saved.');
    setEdit(null);
  };
  const remove = async (c: EmergencyContact) => {
    if (demo) return toast('Demo mode — nothing to remove.');
    try { await removeContact(c.id); toast(`${c.name} removed. Their live link no longer works.`); } catch (e) { toast((e as Error).message); }
  };
  return (
    <Page>
      <PageTitle kicker="Emergency contacts" title="The people who move first." sub="Alerted the moment SOS starts — by SMS and WhatsApp, each with a private live-location link." right={<div className="flex items-center gap-2">{demo && <Honest kind="demo" />}<Btn icon="plus" onClick={() => setEdit({ d: { ...EMPTY, role: contacts.length ? 'family' : 'primary' } })}>Add contact</Btn></div>} />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {contacts.map((c, i) => (
          <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-line">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 font-display text-[18px] font-semibold text-teal-700">{c.name[0]}</span>
              <span className="min-w-0 flex-1"><b className="block text-[15px] text-ink">{c.name}</b><span className="block text-[12.5px] text-ink-muted">{c.relationship || c.role}{c.role === 'primary' ? ' · primary' : ''} · <span className="font-mono">{c.phone ?? c.email}</span></span></span>
              <button onClick={() => setEdit({ d: { name: c.name, phone: c.phone, email: c.email, role: c.role, relationship: c.relationship, channels: c.channels }, id: c.id })} aria-label={`Edit ${c.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-clinic-100 text-ink-soft"><Icon name="edit" size={16} /></button>
              <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-clinic-100 text-ink-soft"><Icon name="trash" size={16} /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['whatsapp', 'sms', 'live', 'email'] as const).map((k) => (
                <span key={k} className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold', c.channels[k] ? 'bg-teal-50 text-teal-700' : 'bg-clinic-100 text-ink-faint line-through')}>
                  <Icon name={k === 'whatsapp' ? 'whatsapp' : k === 'sms' ? 'sms' : k === 'live' ? 'location' : 'send'} size={12} />{k === 'live' ? 'Live location' : k === 'sms' ? 'SMS' : k === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </span>
              ))}
            </div>
          </motion.li>
        ))}
        {!contacts.length && <li className="rounded-3xl bg-amber-50 p-5 text-[14px] text-amber-700 md:col-span-2">No emergency contacts yet. Add at least one person — SOS alerts them first.</li>}
      </ul>
      <BottomSheet open={!!edit} onClose={() => setEdit(null)} title={<p className="font-display text-[19px] font-semibold">{edit?.id ? 'Edit contact' : 'Add emergency contact'}</p>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Name"><input className={inputCls} value={edit.d.name} maxLength={60} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, name: e.target.value } })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mobile" hint="With country code"><input className={inputCls} type="tel" value={edit.d.phone ?? ''} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, phone: e.target.value || null } })} placeholder="+91 98765 43210" /></Field>
              <Field label="Relationship"><input className={inputCls} value={edit.d.relationship} maxLength={30} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, relationship: e.target.value } })} placeholder="Father" /></Field>
            </div>
            <Field label="Email (optional)"><input className={inputCls} type="email" value={edit.d.email ?? ''} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, email: e.target.value || null } })} /></Field>
            <Field label="Role"><select className={inputCls} value={edit.d.role} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, role: e.target.value as ContactRole } })}><option value="primary">Primary</option><option value="family">Family</option><option value="friend">Friend</option><option value="emergency">Other emergency contact</option></select></Field>
            <div className="divide-y divide-line rounded-2xl bg-clinic-50 px-4 ring-1 ring-inset ring-line">
              <Toggle on={edit.d.channels.whatsapp} onChange={(v) => setEdit({ ...edit, d: { ...edit.d, channels: { ...edit.d.channels, whatsapp: v } } })} label="WhatsApp" hint="Priority channel — opens ready to send" />
              <Toggle on={edit.d.channels.sms} onChange={(v) => setEdit({ ...edit, d: { ...edit.d, channels: { ...edit.d.channels, sms: v } } })} label="SMS" hint="Automatic from your SIM in the Android app" />
              <Toggle on={edit.d.channels.live} onChange={(v) => setEdit({ ...edit, d: { ...edit.d, channels: { ...edit.d.channels, live: v } } })} label="Live location link" hint="Private, expires when SOS ends" />
              <Toggle on={edit.d.channels.email} onChange={(v) => setEdit({ ...edit, d: { ...edit.d, channels: { ...edit.d.channels, email: v } } })} label="Email" />
            </div>
            <Btn size="lg" className="w-full" disabled={busy || !edit.d.name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save contact'}</Btn>
          </div>
        )}
      </BottomSheet>
    </Page>
  );
}

'use client';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import type { EmergencyContact, User } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { DEFAULT_SETTINGS, saveProfile } from '@/lib/data';
import { hasNative, invoke, requestPermission, type NativeInfo, type PermissionName } from '@/lib/native';
import { Button, Card, Field, Toggle, cn, inputCls } from '@/components/ui';
import { normalizePhone } from '../circle/Circle';

interface Props {
  uid: string;
  profile: User | null;
  contacts: EmergencyContact[];
  native?: NativeInfo | null;
  onNativeRefresh?: () => void;
  demo?: boolean;
  onDemo?: (v: boolean) => void;
}

const PERMS: { name: PermissionName; label: string; why: string }[] = [
  { name: 'location', label: 'Location', why: 'Find you when you hold SOS and during a Safe Trip.' },
  { name: 'notifications', label: 'Notifications', why: 'Shows "Shevolution is sharing your location" and safety reminders.' },
  { name: 'sms', label: 'Send SMS', why: 'Texts your circle from your own number — works without internet.' },
  { name: 'phone', label: 'Phone calls', why: 'Only if you turn on auto-call for a contact.' },
  { name: 'receiveSms', label: 'SOS alerts from your circle', why: 'Rings loudly when a Shevolution SOS text arrives from someone who added you.' },
];

export function Settings({ uid, profile, contacts, native, onNativeRefresh, demo, onDemo }: Props) {
  const base: Omit<User, 'uid'> = profile ?? {
    name: auth().currentUser?.displayName ?? '',
    phone: null,
    email: auth().currentUser?.email ?? null,
    profile: { shareMedical: false },
    settings: { ...DEFAULT_SETTINGS, region: native?.region ?? 'IN' },
    createdAt: new Date().toISOString(),
  };
  const [u, setU] = useState<Omit<User, 'uid'>>(() => ({ name: base.name, phone: base.phone, email: base.email, profile: { ...base.profile }, settings: { ...DEFAULT_SETTINGS, ...base.settings }, createdAt: base.createdAt }));
  const [phone, setPhone] = useState(base.phone ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = u.settings;
  const set = (patch: Partial<typeof s>) => setU({ ...u, settings: { ...s, ...patch } });
  const setP = (patch: Partial<typeof u.profile>) => setU({ ...u, profile: { ...u.profile, ...patch } });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const p = phone.trim() ? normalizePhone(phone, s.region) : null;
      if (p && !/^\+[1-9]\d{6,14}$/.test(p)) throw new Error('Enter your mobile number with country code.');
      const clean = { ...u, phone: p, name: u.name.trim() || 'Me', profile: Object.fromEntries(Object.entries(u.profile).map(([k, v]) => [k, v === '' ? null : v])) as User['profile'] };
      await saveProfile(uid, clean);
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function danger(kind: 'history' | 'account') {
    const q = kind === 'history' ? 'Delete all ended SOS events, trips and check-ins? An active SOS is kept.' : 'Delete your account and everything in it? Live links stop working and your contacts are unlinked. This cannot be undone.';
    if (!confirm(q)) return;
    setBusy(true);
    try {
      await api(kind === 'history' ? '/history/delete' : '/account/delete', {});
      if (kind === 'account') {
        invoke('clearDevice');
        await signOut(auth());
      }
      setMsg(kind === 'history' ? 'History deleted.' : 'Account deleted.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const callable = contacts.filter((c) => c.phone && c.channels.call);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 font-extrabold">You</h3>
        <div className="space-y-3">
          <Field label="Name shown in SOS alerts">
            <input className={inputCls} value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} maxLength={60} />
          </Field>
          <Field label="Your mobile number" hint="Lets your circle tap “Call” on the live view.">
            <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
          </Field>
          <Field label="Country for emergency numbers">
            <select className={inputCls} value={s.region} onChange={(e) => set({ region: e.target.value })}>
              {EmergencyNumberService.regions().map((r) => (
                <option key={r.region} value={r.region}>
                  {r.name} — {r.primary.number}
                </option>
              ))}
              <option value="XX">Other — 112</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-extrabold">SOS</h3>
        <div className="divide-y divide-line">
          <Toggle on={s.sound} onChange={(v) => set({ sound: v })} label="SOS siren" hint="Loud, distinct alarm when SOS starts. You can silence it on the SOS screen." />
          <Toggle on={s.vibration} onChange={(v) => set({ vibration: v })} label="Vibration" />
          <Toggle on={s.discreet} onChange={(v) => set({ discreet: v })} label="Discreet mode" hint="A calmer, minimal home screen. SOS stays one hold away. The app is still visible on your phone." />
        </div>
        <div className="mt-2 space-y-3">
          <Field label="Call automatically after SOS" hint="Android only lets apps open 112 in the dialer — you tap Call. A contact can be called automatically if you allow phone access.">
            <select className={inputCls} value={s.autoCallContactId ?? ''} onChange={(e) => set({ autoCallContactId: e.target.value || null })}>
              <option value="">Don&apos;t call automatically</option>
              {callable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </Field>
          <Field label="If nobody responds, alert again after">
            <select className={inputCls} value={s.escalateAfterMin} onChange={(e) => set({ escalateAfterMin: Number(e.target.value) })}>
              {[0, 3, 5, 10].map((m) => (
                <option key={m} value={m}>
                  {m ? `${m} minutes` : 'Never'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Live location updates">
            <select className={inputCls} value={s.trackingIntervalSec} onChange={(e) => set({ trackingIntervalSec: Number(e.target.value) })}>
              <option value={5}>Every 5 s while moving (most detail)</option>
              <option value={10}>Every 10 s while moving (balanced)</option>
              <option value={30}>Every 30 s (battery saver)</option>
            </select>
          </Field>
          <Field label="Keep precise location trails for">
            <select className={inputCls} value={s.retentionDays} onChange={(e) => set({ retentionDays: Number(e.target.value) })}>
              {[1, 7, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? 's' : ''} after an SOS ends
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-extrabold">Emergency profile (optional)</h3>
        <p className="text-sm text-ink-muted">Only shared during an active SOS, only with your circle, and only if you turn sharing on.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Age">
            <input className={inputCls} inputMode="numeric" value={u.profile.age ?? ''} onChange={(e) => setP({ age: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })} />
          </Field>
          <Field label="Blood group">
            <input className={inputCls} value={u.profile.bloodGroup ?? ''} onChange={(e) => setP({ bloodGroup: e.target.value.slice(0, 5) })} placeholder="B+" />
          </Field>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Allergies">
            <input className={inputCls} value={u.profile.allergies ?? ''} onChange={(e) => setP({ allergies: e.target.value })} maxLength={300} />
          </Field>
          <Field label="Important notes">
            <textarea className={cn(inputCls, 'h-20')} value={u.profile.medicalNotes ?? ''} onChange={(e) => setP({ medicalNotes: e.target.value })} maxLength={500} />
          </Field>
          <Toggle on={u.profile.shareMedical} onChange={(v) => setP({ shareMedical: v })} label="Share this during an SOS" />
        </div>
      </Card>

      {msg && <p className="text-sm font-semibold text-ink-soft">{msg}</p>}
      <Button big className="w-full" disabled={busy} onClick={save}>
        Save settings
      </Button>

      {hasNative() && native && (
        <Card>
          <h3 className="mb-1 font-extrabold">Permissions</h3>
          <p className="mb-2 text-sm text-ink-muted">Each one is asked only when a feature needs it.</p>
          <ul className="divide-y divide-line">
            {PERMS.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="block font-semibold">{p.label}</span>
                  <span className="text-xs text-ink-muted">{p.why}</span>
                </span>
                {native.permissions[p.name] ? (
                  <span className="text-xs font-extrabold text-safe-600">ON</span>
                ) : (
                  <button className="text-xs font-extrabold text-sos-600" onClick={async () => (await requestPermission(p.name), onNativeRefresh?.())}>
                    Allow
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!native.directSms && <p className="mt-2 text-xs text-ink-muted">This build sends SOS texts through your Messages app (you tap Send).</p>}
        </Card>
      )}

      {onDemo && (
        <Card>
          <Toggle on={!!demo} onChange={onDemo} label="Demo mode" hint="For presentations. Every screen shows DEMO and nothing is sent to anyone." />
        </Card>
      )}

      <Card>
        <div className="grid gap-2">
          <a href="/privacy" className="py-2 font-semibold text-ink-soft">
            Privacy: how location and alerts are handled →
          </a>
          <Button variant="white" onClick={() => (invoke('clearDevice'), signOut(auth()))}>
            Sign out
          </Button>
          <Button variant="soft" disabled={busy} onClick={() => danger('history')}>
            Delete history
          </Button>
          <button className="py-2 text-sm font-bold text-sos-700" disabled={busy} onClick={() => danger('account')}>
            Delete account
          </button>
        </div>
      </Card>
    </div>
  );
}

'use client';
import { useState } from 'react';
import type { User, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { signOut } from '@core/auth';
import { DEFAULT_SETTINGS, normalizePhone, saveProfile } from '@core/data';
import { hasNative } from '@core/native';
import { Header, Page, useApp, type Screen } from '@/ctx';
import { Btn, Card, Eyebrow, Field, Spinner, Toggle, cx, inputCls } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/icons';

export function Settings() {
  const { uid, user, profile, settings, demo, setDemo, nav, toast, readiness } = useApp();
  const [p, setP] = useState(() => ({
    name: profile?.name ?? user?.displayName ?? '',
    phone: profile?.phone ?? '',
    bloodGroup: profile?.profile.bloodGroup ?? '',
    allergies: profile?.profile.allergies ?? '',
    medicalNotes: profile?.profile.medicalNotes ?? '',
    shareMedical: profile?.profile.shareMedical ?? false,
  }));
  const [busy, setBusy] = useState(false);

  const write = async (next: { settings?: Partial<UserSettings>; fields?: Partial<User> }) => {
    if (!uid || demo) return toast('Sign in to save settings. Demo mode stores nothing.');
    const base: User = profile ?? { name: p.name || 'Me', phone: null, email: user?.email ?? null, profile: { shareMedical: false }, settings: DEFAULT_SETTINGS, createdAt: new Date().toISOString() };
    try {
      await saveProfile(uid, { ...base, ...next.fields, settings: { ...DEFAULT_SETTINGS, ...base.settings, ...next.settings } });
      return true;
    } catch (e) {
      toast(`Unable to save: ${(e as Error).message}`);
      return false;
    }
  };
  const set = (s: Partial<UserSettings>) => write({ settings: s });
  const saveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = p.phone.trim() ? normalizePhone(p.phone, settings.region) : null;
    if (p.phone.trim() && !/^\+[1-9]\d{6,14}$/.test(phone ?? '')) return toast('Enter your mobile number with country code.');
    setBusy(true);
    const ok = await write({ fields: { name: p.name.trim().slice(0, 60) || 'Me', phone, profile: { bloodGroup: p.bloodGroup.trim().slice(0, 5) || null, allergies: p.allergies.trim() || null, medicalNotes: p.medicalNotes.trim() || null, shareMedical: p.shareMedical } } });
    setBusy(false);
    if (ok) toast('Profile saved.');
  };

  const links: [Screen, string, IconName][] = [['ready', 'Emergency readiness', 'check'], ['nearby', 'Nearby help', 'pin'], ['vault', 'Evidence vault', 'vault'], ['privacy', 'Privacy & security', 'lock']];

  return (
    <>
      <Header title="Settings" sub={demo ? 'Demo mode' : user?.email ?? ''} />
      <Page>
        <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
          {links.map(([s, t, ic]) => (
            <button key={s} onClick={() => nav.go(s)} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-left font-bold text-ink shadow-card">
              <Icon name={ic} className="text-violet-700" />
              {t}
              <Icon name="next" size={18} className="ml-auto text-ink-faint" />
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Eyebrow>Alerts</Eyebrow>
            <div className="divide-y divide-line">
              <Toggle on={settings.sound} onChange={(v) => set({ sound: v })} label="Siren" hint="Loud alarm when an SOS starts (never for a discreet alert)" />
              <Toggle on={settings.vibration} onChange={(v) => set({ vibration: v })} label="Vibration" />
              {hasNative() && <Toggle on={!!settings.volumeTrigger} onChange={(v) => set({ volumeTrigger: v })} label="Volume-button discreet alert" hint="Press volume-down 4 times within 3 s while She Shield is open. Not available when the app is closed or the screen is locked." />}
            </div>
            <Choice label="If no one responds, text contacts again after" value={settings.escalateAfterMin} options={[[0, 'Never'], [5, '5 min'], [10, '10 min'], [15, '15 min']]} onChange={(v) => set({ escalateAfterMin: v })} />
            <Choice label="Delete location trails after" value={settings.retentionDays} options={[[7, '7 days'], [30, '30 days'], [90, '90 days']]} onChange={(v) => set({ retentionDays: v })} />
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-bold text-ink-soft">Emergency numbers for</span>
              <select className={inputCls} value={settings.region} onChange={(e) => set({ region: e.target.value })}>
                {EmergencyNumberService.regions().map((r) => <option key={r.region} value={r.region}>{r.name} — {r.primary.number}</option>)}
              </select>
            </label>
          </Card>

          <Card>
            <Eyebrow>Your profile</Eyebrow>
            <form onSubmit={saveProfileForm} className="mt-3 space-y-3">
              <Field label="Name (shown in alerts)"><input className={inputCls} maxLength={60} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
              <Field label="Your mobile"><input className={inputCls} type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <Field label="Blood group"><input className={inputCls} maxLength={5} value={p.bloodGroup} onChange={(e) => setP({ ...p, bloodGroup: e.target.value })} /></Field>
                <Field label="Allergies"><input className={inputCls} maxLength={300} value={p.allergies} onChange={(e) => setP({ ...p, allergies: e.target.value })} /></Field>
              </div>
              <Field label="Medical notes"><input className={inputCls} maxLength={500} value={p.medicalNotes} onChange={(e) => setP({ ...p, medicalNotes: e.target.value })} /></Field>
              <Toggle on={p.shareMedical} onChange={(v) => setP({ ...p, shareMedical: v })} label="Share medical details during an SOS" hint="Only your contacts' live view shows them, only while active" />
              <Btn type="submit" className="w-full" disabled={busy}>{busy && <Spinner />}Save profile</Btn>
            </form>
          </Card>
        </div>

        <Card>
          <Eyebrow>Account</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn tone="white" onClick={() => setDemo(!demo)}>{demo ? 'Exit demo mode' : 'Try demo mode'}</Btn>
            {!demo && user && <Btn tone="white" onClick={() => signOut()}>Sign out</Btn>}
            <Btn tone="ghost" onClick={() => nav.go('privacy')}>Delete data…</Btn>
          </div>
          <p className={cx('mt-3 text-xs text-ink-faint')}>She Shield {readiness.native?.version ?? 'web'} · She Shield is not an emergency service.</p>
        </Card>
      </Page>
    </>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: number; options: [number, string][]; onChange: (v: number) => void }) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-1.5 text-xs font-bold text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={cx('rounded-full px-3.5 py-2 text-sm font-bold', value === v ? 'bg-violet-800 text-white' : 'bg-violet-50 text-violet-800')}>{t}</button>
        ))}
      </div>
    </fieldset>
  );
}

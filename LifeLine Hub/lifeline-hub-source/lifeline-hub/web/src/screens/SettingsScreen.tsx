'use client';
/** SETTINGS — emergency numbers, Health Vault link behaviour, guidance voice, alerts, profile, account, demo mode. */
import { useState } from 'react';
import type { User, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { signOut } from '@core/auth';
import { DEFAULT_SETTINGS, normalizePhone, saveProfile } from '@core/data';
import { useApp } from '@/ctx';
import { Btn, Field, Kicker, Panel, Toggle, inputCls } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';

export function SettingsScreen() {
  const { uid, user, profile, settings, demo, setDemo, toast, prefs, savePrefs, region, nav, readiness } = useApp();
  const [nums, setNums] = useState({ ambulance: prefs.ambulance ?? '', police: prefs.police ?? '', fire: prefs.fire ?? '' });
  const [name, setName] = useState(profile?.name ?? user?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  const writeUser = async (next: { settings?: Partial<UserSettings>; fields?: Partial<User> }) => {
    if (!uid || demo) return toast('Demo mode — settings are not saved.');
    const base: User = profile ?? { name: name || 'Me', phone: null, email: user?.email ?? null, profile: { shareMedical: false }, settings: DEFAULT_SETTINGS, createdAt: new Date().toISOString() };
    try { await saveProfile(uid, { ...base, ...next.fields, settings: { ...DEFAULT_SETTINGS, ...base.settings, ...next.settings } }); toast('Saved.'); } catch (e) { toast(`Could not save: ${(e as Error).message}`); }
  };
  const valid = (n: string) => !n || /^[0-9+]{2,15}$/.test(n);

  return (
    <Page>
      <PageTitle kicker="Settings" title="Settings" sub={demo ? 'Demo mode' : user?.email ?? ''} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <Kicker>Emergency numbers</Kicker>
          <p className="mt-1 text-[13px] text-ink-muted">Defaults are the official public numbers for {region.name}. Override only if your area uses a different line.</p>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Region</span>
            <select className={inputCls} value={settings.region} onChange={(e) => writeUser({ settings: { region: e.target.value } })}>
              {EmergencyNumberService.regions().map((r) => <option key={r.region} value={r.region}>{r.name} — {r.primary.number}</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['ambulance', 'police', 'fire'] as const).map((k) => (
              <Field key={k} label={k === 'fire' ? 'Fire & rescue' : k[0].toUpperCase() + k.slice(1)}><input className={inputCls} inputMode="tel" value={nums[k]} placeholder="Default" onChange={(e) => setNums({ ...nums, [k]: e.target.value.trim() })} /></Field>
            ))}
          </div>
          <Btn className="mt-3" size="sm" disabled={!valid(nums.ambulance) || !valid(nums.police) || !valid(nums.fire)} onClick={() => savePrefs({ ambulance: nums.ambulance || null, police: nums.police || null, fire: nums.fire || null }).then(() => toast('Numbers saved.'))}>Save numbers</Btn>
        </Panel>
        <Panel className="p-5">
          <Kicker>Health Vault & guidance</Kicker>
          <div className="divide-y divide-line">
            <Toggle on={prefs.autoVaultLink} onChange={(v) => savePrefs({ autoVaultLink: v })} label="Create a responder link when SOS starts" hint="A temporary QR for responders is ready in emergency mode" />
            <label className="flex items-center justify-between gap-4 py-3"><span className="text-[14.5px] font-semibold text-ink">Responder link lasts</span>
              <select className={`${inputCls} w-32`} value={prefs.vaultLinkMinutes} onChange={(e) => savePrefs({ vaultLinkMinutes: Number(e.target.value) })}>{[5, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </label>
            <Toggle on={prefs.voiceGuidance} onChange={(v) => savePrefs({ voiceGuidance: v })} label="Voice guidance" hint="AI Guidance reads steps aloud" />
          </div>
        </Panel>
        <Panel className="p-5">
          <Kicker>Alerts</Kicker>
          <div className="divide-y divide-line">
            <Toggle on={settings.sound} onChange={(v) => writeUser({ settings: { sound: v } })} label="Siren on SOS" hint="Loud alarm on the phone when SOS starts" />
            <Toggle on={settings.vibration} onChange={(v) => writeUser({ settings: { vibration: v } })} label="Vibration" />
          </div>
          <p className="mt-2 text-[12px] text-ink-faint">Device: {readiness.items.map((i) => `${i.label} ${i.state}`).join(' · ')}</p>
        </Panel>
        <Panel className="p-5">
          <Kicker>Your profile</Kicker>
          <div className="mt-3 space-y-3">
            <Field label="Name (shown in alerts)"><input className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Your mobile"><input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></Field>
            <Btn size="sm" onClick={() => writeUser({ fields: { name: name.trim().slice(0, 60) || 'Me', phone: phone.trim() ? normalizePhone(phone, settings.region) : null } })}>Save profile</Btn>
          </div>
        </Panel>
        <Panel className="p-5 lg:col-span-2">
          <Kicker>Account</Kicker>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn tone="white" onClick={() => setDemo(!demo)}>{demo ? 'Exit demo mode' : 'Demo mode (for presentations)'}</Btn>
            {!demo && user && <Btn tone="white" icon="logout" onClick={() => signOut()}>Sign out</Btn>}
            <Btn tone="ghost" onClick={() => nav.tab('privacy')}>Privacy & delete data</Btn>
          </div>
          <p className="mt-3 text-[12px] text-ink-faint">LifeLine Hub · {readiness.native?.version ?? 'web'} · Not an emergency service.</p>
        </Panel>
      </div>
    </Page>
  );
}

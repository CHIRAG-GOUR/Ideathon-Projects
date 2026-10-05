'use client';
import { useState } from 'react';
import { api } from '@core/api';
import { signOut } from '@core/auth';
import { hasNative, invoke } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Kicker, Spinner } from '@/ui/kit';
import { Icon } from '@/ui/icons';

const STORED: [string, string][] = [
  ['Your profile', 'Name, phone, email, optional medical details and settings.'],
  ['Trusted contacts', 'Names, numbers, emails and how each wants to be alerted.'],
  ['Alerts', 'When an SOS or discreet alert started and ended, your locations during it, and who was alerted.'],
  ['Playbooks & toolkit', 'Built into the app. What you read is never recorded.'],
];

export function Privacy() {
  const { uid, demo, settings, toast, region } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (k: string, ask: string, fn: () => Promise<unknown>, done: string) => {
    if (!uid || demo) return toast('Sign in first. Demo mode stores nothing.');
    if (!confirm(ask)) return;
    setBusy(k);
    try {
      await fn();
      toast(done);
    } catch (e) {
      toast(`Unable to finish: ${(e as Error).message}`);
    }
    setBusy(null);
  };

  return (
    <>
      <Header title="Privacy center" sub="What Safety Warriors keeps, who can see it, and how to delete it" back />
      <Page>
        <Card className="flex items-center gap-4 !p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-700 text-tang-300"><Icon name="lock" size={26} /></span>
          <p className="text-sm text-ink-soft">Your data lives in Safety Warriors&apos;s own private database, protected by security rules: <b>only you</b> can read your account. Contacts see your location <b>only during an alert</b>, through a personal link that stops working when it ends. Nothing is sold or used for ads.</p>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Kicker>What is stored</Kicker>
            <ul className="mt-2 divide-y divide-line">
              {STORED.map(([t, d]) => (
                <li key={t} className="py-2.5"><p className="font-bold text-ink">{t}</p><p className="text-sm text-ink-muted">{d}</p></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">Location trails are deleted automatically {settings.retentionDays} days after an alert ends (change in Settings).</p>
          </Card>
          <div className="space-y-4">
            <Card>
              <Kicker>Who can see what</Kicker>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                <li>• <b>Trusted contacts</b> — the alert text, and your live location via their private link while an alert is active.</li>
                <li>• <b>Emergency services</b> — nothing automatically. Safety Warriors does not contact the police; call {region.primary.number} yourself.</li>
                <li>• <b>Location</b> — read only during an SOS, when you share it, or when you open Nearby help.</li>
                <li>• <b>Microphone & camera</b> — never used.</li>
              </ul>
              {hasNative() && <Btn tone="soft" className="mt-3 w-full" onClick={() => invoke('openAppSettings')}>Manage app permissions</Btn>}
            </Card>
            <Card>
              <Kicker>Delete your data</Kicker>
              <div className="mt-3 grid gap-2">
                <Btn tone="white" disabled={!!busy} onClick={() => act('h', 'Delete ended SOS history? An active alert is kept.', () => api('/history/delete', {}), 'History deleted.')}>{busy === 'h' && <Spinner />}Delete history</Btn>
                <Btn tone="sos" disabled={!!busy} onClick={() => act('a', 'Delete your account and ALL data — contacts and history? This cannot be undone.', async () => { await api('/account/delete', {}); await signOut().catch(() => undefined); }, 'Account deleted.')}>{busy === 'a' && <Spinner />}Delete account & all data</Btn>
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}

'use client';
import { useState } from 'react';
import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { api } from '@core/api';
import { signOut } from '@core/auth';
import { db } from '@core/firebase';
import { hasNative, invoke } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Label, Spinner } from '@/ui/kit';
import { Icon } from '@/ui/icons';

const STORED: [string, string][] = [
  ['Your profile', 'Name, phone, email, optional medical details and settings.'],
  ['Trusted contacts', 'Names, numbers, emails and how each wants to be alerted.'],
  ['Alerts', 'When an SOS or discreet alert started and ended, your locations during it, and who was alerted.'],
  ['Safety check-ins', 'Your schedules, each check-in, missed check-ins and escalations.'],
  ['Incident journal', 'Only what you write. Readable by you alone.'],
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
  const clearJournal = async () => {
    const snap = await getDocs(collection(db(), `users/${uid}/incidents`));
    for (const d of snap.docs) await deleteDoc(d.ref);
  };

  return (
    <>
      <Header title="Privacy & security" sub="What Fortiva keeps, who can see it, and how to delete it" back />
      <Page>
        <Card className="flex items-center gap-4 !p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-cobalt-600 text-white"><Icon name="lock" size={26} /></span>
          <p className="text-sm text-ink-soft">Your data lives in Fortiva&apos;s own private database, protected by security rules: <b>only you</b> can read your account. Contacts see your location <b>only during an alert</b>, through a personal link that stops working when it ends. Nothing is sold or used for ads.</p>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Label>What is stored</Label>
            <ul className="mt-2 divide-y divide-line">
              {STORED.map(([t, d]) => (
                <li key={t} className="py-2.5"><p className="font-bold text-ink">{t}</p><p className="text-sm text-ink-muted">{d}</p></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">Location trails are deleted automatically {settings.retentionDays} days after an alert ends (change in Settings).</p>
          </Card>
          <div className="space-y-4">
            <Card>
              <Label>Who can see what</Label>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                <li>• <b>Trusted contacts</b> — the alert text, and your live location via their private link while an alert is active.</li>
                <li>• <b>Emergency services</b> — nothing automatically. Fortiva does not contact the police; call {region.primary.number} yourself.</li>
                <li>• <b>Location</b> — read when you check in, during an alert, when you share it, or when you open Nearby help. Never tracked in the background between check-ins.</li>
                <li>• <b>Microphone & camera</b> — never used.</li>
              </ul>
              {hasNative() && <Btn tone="soft" className="mt-3 w-full" onClick={() => invoke('openAppSettings')}>Manage app permissions</Btn>}
            </Card>
            <Card>
              <Label>Delete your data</Label>
              <div className="mt-3 grid gap-2">
                <Btn tone="white" disabled={!!busy} onClick={() => act('h', 'Delete ended alerts and check-in history? An active alert is kept.', () => api('/history/delete', {}), 'History deleted.')}>{busy === 'h' && <Spinner />}Delete history</Btn>
                <Btn tone="white" disabled={!!busy} onClick={() => act('v', 'Delete every incident journal entry? This cannot be undone.', clearJournal, 'Journal emptied.')}>{busy === 'v' && <Spinner />}Delete incident journal</Btn>
                <Btn tone="coral" disabled={!!busy} onClick={() => act('a', 'Delete your account and ALL data — circle, check-ins, journal, history? This cannot be undone.', async () => { await api('/account/delete', {}); await signOut().catch(() => undefined); }, 'Account deleted.')}>{busy === 'a' && <Spinner />}Delete account & all data</Btn>
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}

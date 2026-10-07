'use client';
/** PRIVACY — exactly what is stored, who can see it, and how to delete it. */
import { useState } from 'react';
import { api } from '@core/api';
import { useApp } from '@/ctx';
import { Btn, Kicker, Panel } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';

const ROWS: [string, string][] = [
  ['Profile & contacts', 'Your name, mobile, emergency contacts. Only your account can read them.'],
  ['Health Vault', 'Medical profile in users/{you}/medicalProfile — readable by you only. Responders see scoped fields through a temporary link.'],
  ['Responder links & access log', 'Links are stored hashed and expire; every responder view is logged for you by the server.'],
  ['SOS events', 'Start/end time, status, alert results and a location trail while active. Trails are deleted after your retention period (default 30 days).'],
  ['Location outside SOS', 'Used on the device for Geo-Radar. Not stored.'],
  ['AI Guidance', 'Runs on the device. What you choose is not sent anywhere.'],
  ['Emergency services', 'Nothing is sent automatically. Calls are made by your phone.'],
];

export function PrivacyScreen() {
  const { demo, toast, uid } = useApp();
  const [confirm, setConfirm] = useState(false);
  const del = async (path: '/history/delete' | '/account/delete') => {
    if (demo || !uid) return toast('Demo mode — nothing is stored.');
    try { await api(path, {}); toast(path === '/history/delete' ? 'History deleted.' : 'Account deleted.'); } catch (e) { toast((e as Error).message); }
  };
  return (
    <Page>
      <PageTitle kicker="Privacy & data" title="Medical data deserves restraint." sub="LifeLine Hub keeps the minimum needed for an emergency, in its own private database." />
      <Panel className="p-5">
        <ul className="divide-y divide-line">{ROWS.map(([t, d]) => <li key={t} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[220px_1fr]"><b className="text-[14px] text-ink">{t}</b><span className="text-[13.5px] text-ink-muted">{d}</span></li>)}</ul>
      </Panel>
      <Panel className="mt-4 p-5">
        <Kicker tone="coral">Delete</Kicker>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="white" onClick={() => del('/history/delete')}>Delete SOS history & access log</Btn>
          {confirm ? <Btn tone="coral" onClick={() => del('/account/delete')}>Confirm: delete account and all data</Btn> : <Btn tone="ghost" onClick={() => setConfirm(true)}>Delete account…</Btn>}
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">Account deletion removes your profile, Health Vault, contacts, responder links, history and sign-in.</p>
      </Panel>
    </Page>
  );
}

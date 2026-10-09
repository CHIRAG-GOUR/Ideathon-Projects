'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { query, where } from 'firebase/firestore';
import type { SafetyTrip, SosEvent } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { ago } from '@shared/geo';
import { api } from '@/lib/api';
import { circleAlertsQuery, useAuthUser, useContacts, useList, useProfile } from '@/lib/data';
import { SignIn } from '@/components/SignIn';
import { Button, Card, E3d, Logo, Pill, cn } from '@/components/ui';
import { Circle } from '@/features/circle/Circle';
import { History } from '@/features/history/History';
import { Settings } from '@/features/settings/Settings';
import { LiveView } from '@/features/live/LiveView';

const TABS = [
  { id: 'people', label: 'People I protect' },
  { id: 'circle', label: 'My Safety Circle' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
] as const;

/** Companion dashboard. Management and contact views — not a substitute for the Android SOS app. */
export default function Dashboard() {
  const { user, ready } = useAuthUser();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('people');
  const [watch, setWatch] = useState<string | null>(null);
  const profile = useProfile(uid);
  const contacts = useContacts(uid) ?? [];
  const region = EmergencyNumberService.forRegion(profile?.settings?.region);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="page flex h-16 items-center justify-between">
          <Link href="/"><Logo size={30} /></Link>
          {uid && <span className="text-sm font-semibold text-ink-muted">{user?.phoneNumber ?? user?.email}</span>}
        </div>
      </header>
      <main className="page py-6">
        {!ready ? null : !uid ? (
          <div className="mx-auto max-w-md rounded-4xl bg-white p-6 shadow-soft">
            <SignIn intro="Sign in to manage your Safety Circle and see alerts from people who added you." />
          </div>
        ) : watch ? (
          <div className="mx-auto max-w-2xl">
            <button className="mb-4 text-sm font-bold text-ink-soft" onClick={() => setWatch(null)}>← Back</button>
            <LiveView sosId={watch} />
          </div>
        ) : (
          <>
            <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold', tab === t.id ? 'bg-ink text-white' : 'bg-white text-ink-soft shadow-soft')}>
                  {t.label}
                </button>
              ))}
            </nav>
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
              {tab === 'people' && <People uid={uid} onWatch={setWatch} />}
              {tab === 'circle' && <Circle uid={uid} contacts={contacts} region={region.region} />}
              {tab === 'history' && <History uid={uid} />}
              {tab === 'settings' && <Settings uid={uid} profile={profile ?? null} contacts={contacts} />}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}

function People({ uid, onWatch }: { uid: string; onWatch: (id: string) => void }) {
  const alerts = useList<SosEvent>('sosEvents', circleAlertsQuery(uid), [uid]) ?? [];
  const circles = useList<{ id: string; ownerName: string; contactId: string; since: string }>(`users/${uid}/circles`) ?? [];
  const [asked, setAsked] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      {alerts.map((e) => (
        <button key={e.id} onClick={() => onWatch(e.id)} className="w-full rounded-4xl bg-gradient-to-br from-sos-500 to-sos-700 p-5 text-left text-white shadow-glow">
          <p className="text-xs font-extrabold tracking-widest">🚨 SOS ALERT · {e.status === 'responding' ? 'HELP RESPONDING' : 'ACTIVE'}</p>
          <p className="mt-1 text-2xl font-extrabold">{e.ownerName} needs help</p>
          <p className="text-sm text-white/85">Started {ago(e.startedAt)} · View live location →</p>
        </button>
      ))}
      {circles.length === 0 && (
        <Card className="text-center">
          <E3d name="heart-hands" size={64} className="mx-auto" />
          <p className="mt-2 font-bold">No one has added you yet</p>
          <p className="text-sm text-ink-muted">When someone adds you to their Safety Circle, you verify through their invitation link.</p>
        </Card>
      )}
      {circles.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold">{c.ownerName}</p>
              <p className="text-sm text-ink-muted">You&apos;re in their Safety Circle since {new Date(c.since).toLocaleDateString()}</p>
            </div>
            <Pill tone="safe">Verified</Pill>
          </div>
          <SharedTrips ownerUid={c.id} contactId={c.contactId} />
          <Button
            variant="soft"
            className="mt-3"
            onClick={async () => {
              try {
                await api('/checkin/request', { ownerUid: c.id });
                setAsked((a) => ({ ...a, [c.id]: 'Asked — they will see it when they open Shevolution.' }));
              } catch (e) {
                setAsked((a) => ({ ...a, [c.id]: (e as Error).message }));
              }
            }}
          >
            Ask “Are you safe?”
          </Button>
          {asked[c.id] && <p className="mt-2 text-sm text-ink-muted">{asked[c.id]}</p>}
        </Card>
      ))}
    </div>
  );
}

function SharedTrips({ ownerUid, contactId }: { ownerUid: string; contactId: string }) {
  // Only trips this contact was chosen for (the security rules check the same thing).
  const trips = useList<SafetyTrip>(`users/${ownerUid}/safetyTrips`, (c) => query(c, where('contactIds', 'array-contains', contactId), where('status', 'in', ['active', 'overdue', 'escalated'])), [ownerUid, contactId]) ?? [];
  if (!trips.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {trips.map((t) => (
        <div key={t.id} className="rounded-2xl bg-blush-50 p-3 text-sm">
          <p className="font-bold">{t.kind === 'trip' ? 'Safe Trip' : 'Safety Timer'}: {t.label} <Pill tone={t.status === 'active' ? 'safe' : 'warn'} className="ml-1">{t.status.toUpperCase()}</Pill></p>
          <p className="text-ink-muted">Due {new Date(t.dueAt).toLocaleTimeString([], { timeStyle: 'short' })}{t.lastLocation ? ` · last seen ${ago(t.lastLocation.timestamp)}` : ''}</p>
        </div>
      ))}
    </div>
  );
}

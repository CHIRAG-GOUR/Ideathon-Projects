'use client';
import { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth, loadConfig } from '@/lib/firebase';
import { api } from '@/lib/api';
import { LiveView } from '@/features/live/LiveView';
import { E3d, Logo, Spinner } from '@/components/ui';

type Join = { sosId: string; status: string; endedAt: string | null; ownerName: string };

/** /e/<opaque token> — the live-location link a verified contact receives. Opens straight to the map. */
export default function EmergencyLink() {
  const [state, setState] = useState<{ join?: Join; error?: string }>({});
  useEffect(() => {
    const token = location.pathname.split('/')[2] || new URLSearchParams(location.search).get('t') || '';
    (async () => {
      if (!(await loadConfig())) return setState({ error: 'No connection. Live location needs internet — try again in a moment.' });
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return setState({ error: 'This link is incomplete. Open the full link from the SOS message.' });
      try {
        await auth().authStateReady();
        if (!auth().currentUser) await signInAnonymously(auth());
        setState({ join: await api<Join>('/track/join', { token }) });
      } catch (e) {
        setState({ error: (e as Error).message });
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-xl px-4 pb-10 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <Logo size={30} />
        <span className="text-xs font-bold text-ink-muted">Emergency live location</span>
      </header>
      {state.join && ['active', 'responding'].includes(state.join.status) && <LiveView sosId={state.join.sosId} />}
      {state.join && !['active', 'responding'].includes(state.join.status) && (
        <div className="rounded-4xl border border-line bg-white p-8 text-center shadow-soft">
          <E3d name={state.join.status === 'safe' ? 'check' : 'bell'} size={64} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">{state.join.status === 'safe' ? `${state.join.ownerName} is safe` : 'This SOS was cancelled'}</h1>
          <p className="mt-1 text-ink-muted">Live location sharing has stopped.</p>
        </div>
      )}
      {state.error && (
        <div className="rounded-4xl border border-line bg-white p-8 text-center shadow-soft">
          <E3d name="lock" size={56} className="mx-auto" />
          <p className="mt-3 text-lg font-bold">{state.error}</p>
          <p className="mt-1 text-sm text-ink-muted">If someone may be in danger, call them — or call 112 in India.</p>
          <a href="tel:112" className="mt-5 inline-flex min-h-[52px] items-center rounded-2xl bg-ink px-6 font-bold text-white">Call 112</a>
        </div>
      )}
      {!state.join && !state.error && (
        <div className="grid h-60 place-items-center text-ink-muted">
          <span className="inline-flex items-center gap-2 font-semibold"><Spinner /> Opening live location…</span>
        </div>
      )}
    </main>
  );
}

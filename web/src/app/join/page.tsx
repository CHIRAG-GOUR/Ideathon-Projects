'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { useAuthUser } from '@/lib/data';
import { SignIn } from '@/components/SignIn';
import { Button, Card, E3d, Logo, Spinner } from '@/components/ui';

interface Invite {
  ownerName: string;
  contactName: string;
  relationship: string;
  phoneHint: string | null;
  emailHint: string | null;
  verified: boolean;
}

/** /join/<token>: a contact proves they own the number/email before they can ever see live location. */
export default function Join() {
  const { user, ready } = useAuthUser();
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = location.pathname.split('/')[2] || new URLSearchParams(location.search).get('t') || '';
    setToken(t);
    api<Invite>(`/invite?token=${encodeURIComponent(t)}`).then(setInvite, (e) => setError((e as Error).message));
  }, []);

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-6">
      <Logo size={32} />
      {error && (
        <Card className="mt-8 text-center">
          <E3d name="lock" size={56} className="mx-auto" />
          <p className="mt-3 font-bold">{error}</p>
        </Card>
      )}
      {!invite && !error && (
        <p className="mt-16 flex items-center justify-center gap-2 text-ink-muted">
          <Spinner /> Loading invitation…
        </p>
      )}
      {invite && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mt-8 flex items-center gap-3">
            <E3d name="heart-hands" size={64} />
            <div>
              <p className="h-eyebrow">Safety Circle invitation</p>
              <h1 className="text-2xl font-extrabold leading-tight">{invite.ownerName} added you as a trusted contact</h1>
            </div>
          </div>
          <p className="mt-4 text-ink-soft">
            If {invite.ownerName} holds SOS, you&apos;ll get an alert and — once you verify it&apos;s really you — their live location while the SOS is active.
          </p>
          {done ? (
            <Card className="mt-6 text-center">
              <E3d name="check" size={64} className="mx-auto" />
              <h2 className="mt-2 text-xl font-extrabold">You&apos;re verified</h2>
              <p className="mt-1 text-sm text-ink-muted">You&apos;re now in {invite.ownerName}&apos;s Safety Circle.</p>
              <div className="mt-5 grid gap-3">
                <a href="/download/Shevolution.apk" className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-sos-500 font-bold text-white">
                  Get the Android app for loud SOS alerts
                </a>
                <a href="/dashboard" className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-line font-bold">
                  Open dashboard
                </a>
              </div>
            </Card>
          ) : !ready ? null : (
            <Card className="mt-6">
              {!user || user.isAnonymous || !user.phoneNumber ? (
                <SignIn intro="Verify your mobile number to join. Use the number the invitation was sent to." />
              ) : (
                <Accept token={token} phone={user.phoneNumber} onDone={() => setDone(true)} />
              )}
            </Card>
          )}
        </motion.div>
      )}
    </main>
  );
}

/** Signed in with a verified number: the server checks it matches the invited contact. */
function Accept({ token, phone, onDone }: { token: string; phone: string; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api('/invite/accept', { token }).then(onDone, (e) => setMsg((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return msg ? (
    <div>
      <p className="font-semibold text-sos-700">{msg}</p>
      <p className="mt-1 text-sm text-ink-muted">You are signed in as {phone}.</p>
      <Button variant="white" className="mt-3 w-full" onClick={() => signOut(auth())}>
        Use a different number
      </Button>
    </div>
  ) : (
    <p className="flex items-center gap-2 text-ink-muted">
      <Spinner /> Verifying {phone}…
    </p>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RecaptchaVerifier, linkWithPhoneNumber, sendEmailVerification, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { useAuthUser } from '@/lib/data';
import { SignIn, authMessage } from '@/components/SignIn';
import { Button, Card, E3d, Field, Logo, Spinner, inputCls } from '@/components/ui';

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
          ) : !ready ? null : !user || user.isAnonymous ? (
            <Card className="mt-6">
              <SignIn intro="Sign in or create an account. You'll verify your phone or email next." />
            </Card>
          ) : (
            <Verify invite={invite} token={token} onDone={() => setDone(true)} />
          )}
        </motion.div>
      )}
    </main>
  );
}

function Verify({ invite, token, onDone }: { invite: Invite; token: string; onDone: () => void }) {
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const captcha = useRef<RecaptchaVerifier>();
  const user = auth().currentUser!;

  const accept = async () => {
    await user.getIdToken(true);
    await api('/invite/accept', { token });
    onDone();
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const emailMatches = invite.emailHint && user.email;
  return (
    <div className="mt-6 space-y-4">
      {invite.phoneHint && (
        <Card>
          <h2 className="font-extrabold">Verify your phone number</h2>
          <p className="mt-1 text-sm text-ink-muted">Enter the number ending in {invite.phoneHint.slice(-3)}. We&apos;ll text you a code.</p>
          {!confirm ? (
            <div className="mt-3 space-y-3">
              <Field label="Mobile number (with country code)">
                <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} />
              </Field>
              <div id="recaptcha" />
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    captcha.current ??= new RecaptchaVerifier(auth(), 'recaptcha', { size: 'invisible' });
                    setConfirm(await linkWithPhoneNumber(user, phone, captcha.current));
                  })
                }
              >
                Send code
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <Field label="6-digit code">
                <input className={inputCls} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </Field>
              <Button className="w-full" disabled={busy || code.length !== 6} onClick={() => run(async () => {
                await confirm.confirm(code);
                await accept();
              })}>
                Verify and join
              </Button>
            </div>
          )}
        </Card>
      )}
      {invite.emailHint && (
        <Card>
          <h2 className="font-extrabold">Or verify by email</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Invitation email: {invite.emailHint}. You&apos;re signed in as {user.email ?? 'a phone account'}.
          </p>
          <div className="mt-3 grid gap-2">
            {emailMatches && !user.emailVerified && (
              <Button variant="white" disabled={busy} onClick={() => run(async () => {
                await sendEmailVerification(user);
                setMsg('Verification email sent. Open the link, then tap "I verified my email".');
              })}>
                Send verification email
              </Button>
            )}
            <Button disabled={busy} onClick={() => run(async () => {
              await user.reload();
              await accept();
            })}>
              I verified my email
            </Button>
          </div>
        </Card>
      )}
      {msg && <p className="text-sm font-semibold text-sos-700">{msg}</p>}
    </div>
  );
}

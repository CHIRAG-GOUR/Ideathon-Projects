'use client';
import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, updateProfile, getAdditionalUserInfo, type ConfirmationResult } from 'firebase/auth';
import { auth, loadConfig } from '@/lib/firebase';
import { Button, Field, inputCls } from './ui';

const MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'Enter your mobile number with country code, e.g. +91 98765 43210.',
  'auth/invalid-verification-code': 'That code is not right. Check the SMS and try again.',
  'auth/code-expired': 'The code expired. Send a new one.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/quota-exceeded': 'SMS limit reached for now. Try again later.',
};
export const authMessage = (e: unknown) => MESSAGES[(e as { code?: string }).code ?? ''] ?? (e as Error).message;

const normalize = (raw: string) => {
  const t = raw.replace(/[^\d+]/g, '');
  if (t.startsWith('+')) return t;
  const d = t.replace(/^0+/, '');
  return d.length === 10 ? `+91${d}` : `+${d}`;
};

/** Sign up / log in with your mobile number and a one-time code. */
export function SignIn({ intro, onDone }: { intro?: string; onDone?: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const captcha = useRef<RecaptchaVerifier>();
  useEffect(() => () => captcha.current?.clear(), []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (!(await loadConfig())) throw new Error('No connection. Sign-in needs internet — SOS on this phone still works.');
      captcha.current ??= new RecaptchaVerifier(auth(), 'recaptcha-box', { size: 'invisible' });
      setConfirm(await signInWithPhoneNumber(auth(), normalize(phone), captcha.current));
    } catch (err) {
      captcha.current?.clear();
      captcha.current = undefined;
      setMsg(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const cred = await confirm!.confirm(code);
      if (name.trim() && (getAdditionalUserInfo(cred)?.isNewUser || !cred.user.displayName)) await updateProfile(cred.user, { displayName: name.trim() });
      onDone?.();
    } catch (err) {
      setMsg(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {intro && <p className="text-ink-soft">{intro}</p>}
      {!confirm ? (
        <form onSubmit={send} className="space-y-4">
          <Field label="Your name" hint="Shown in your SOS messages. Needed only the first time.">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="e.g. Aanya Sharma" />
          </Field>
          <Field label="Mobile number">
            <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
          </Field>
          <Button big className="w-full" disabled={busy || phone.replace(/\D/g, '').length < 10}>
            {busy ? 'Sending code…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <Field label={`6-digit code sent to ${normalize(phone)}`}>
            <input className={inputCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          </Field>
          <Button big className="w-full" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Verify and continue'}
          </Button>
          <button type="button" className="w-full text-sm font-semibold text-ink-muted" onClick={() => (setConfirm(null), setCode(''))}>
            Change number
          </button>
        </form>
      )}
      {msg && <p className="text-sm font-semibold text-sos-700">{msg}</p>}
      <div id="recaptcha-box" />
    </div>
  );
}

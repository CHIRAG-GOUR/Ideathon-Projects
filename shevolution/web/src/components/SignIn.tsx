'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button, Field, inputCls } from './ui';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
};
export const authMessage = (e: unknown) => MESSAGES[(e as { code?: string }).code ?? ''] ?? (e as Error).message;

export function SignIn({ intro, onDone }: { intro?: string; onDone?: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ tone: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'up') {
        if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' });
        const c = await createUserWithEmailAndPassword(auth(), email.trim(), password);
        await updateProfile(c.user, { displayName: name.trim() });
        sendEmailVerification(c.user).catch(() => undefined);
      } else {
        await signInWithEmailAndPassword(auth(), email.trim(), password);
      }
      onDone?.();
    } catch (err) {
      setMsg({ tone: 'err', text: authMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {intro && <p className="text-ink-soft">{intro}</p>}
      <div className="grid grid-cols-2 rounded-2xl bg-blush-100 p-1 text-sm font-bold">
        {(['in', 'up'] as const).map((m) => (
          <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-xl py-2.5 ${mode === m ? 'bg-white text-ink shadow-soft' : 'text-ink-muted'}`}>
            {m === 'in' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      {mode === 'up' && (
        <Field label="Your name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'up' ? 8 : 1} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
      </Field>
      {msg && <p className={`text-sm font-semibold ${msg.tone === 'err' ? 'text-sos-700' : 'text-safe-600'}`}>{msg.text}</p>}
      <Button big className="w-full" disabled={busy}>
        {mode === 'in' ? 'Sign in' : 'Create account'}
      </Button>
      {mode === 'in' && (
        <button
          type="button"
          className="w-full text-sm font-semibold text-ink-muted"
          onClick={async () => {
            if (!email) return setMsg({ tone: 'err', text: 'Enter your email first.' });
            await sendPasswordResetEmail(auth(), email.trim()).catch(() => undefined);
            setMsg({ tone: 'ok', text: 'If an account exists, a reset link is on its way.' });
          }}
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}

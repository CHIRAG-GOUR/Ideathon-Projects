import { motion } from 'framer-motion';
import { useState } from 'react';
import { friendlyError } from '../data/repo';
import { useSession } from '../state/session';
import { CheckoutIllustration, StorefrontMini } from '../art/scenes';
import { IconArrowRight, Logo } from '../ui/icons';
import { Button, ErrorNote, Field, Input, Select, useToast } from '../ui/kit';

const inAndroidApp = () => /; wv\)/.test(navigator.userAgent) || 'BeyondLegacyApp' in window;

function Pipeline() {
  const steps = [
    ['Input', 'Stock · sales · expiry'],
    ['Analyse', 'Demand · velocity · coverage'],
    ['Predict', 'Stock-out · expiry · slow stock'],
    ['Action', 'Restock · Sell soon · Hold'],
  ];
  return (
    <ol className="mt-8 grid gap-2">
      {steps.map(([t, d], i) => (
        <motion.li key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
          className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-inset ring-white/10">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-[12px] font-bold tabular-nums text-yellow">{i + 1}</span>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white">{t}</p>
            <p className="text-[13px] text-white/65">{d}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-green-dark p-10 text-white lg:flex lg:flex-col">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-green-mid/40 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-3">
        <Logo size={44} onDark />
        <p className="font-display text-2xl font-extrabold">Beyond Legacy</p>
      </div>
      <CheckoutIllustration className="relative mx-auto mt-8 w-full max-w-[420px]" />
      <div className="relative mt-auto max-w-md">
        <p className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight">Don’t just track stock.<br />Predict what comes next.</p>
        <p className="mt-3 text-[15px] text-white/70">Every morning, one ordered list of what to restock, what to sell soon and what to hold — with the reasons behind each one.</p>
        <Pipeline />
      </div>
    </div>
  );
}

export function AuthScreen() {
  const s = useSession();
  const toast = useToast();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr('Enter your email address.');
    if (mode !== 'forgot' && pw.length < 6) return setErr('Use a password with at least 6 characters.');
    if (mode === 'up' && !name.trim()) return setErr('Enter your name.');
    setBusy(true);
    try {
      if (mode === 'in') await s.signIn(email, pw);
      else if (mode === 'up') await s.signUp(name, email, pw);
      else {
        await s.resetPassword(email);
        toast('Password reset email sent — check your inbox');
        setMode('in');
      }
    } catch (x) {
      setErr(friendlyError(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden"><Logo size={36} /><p className="font-display text-xl font-extrabold">Beyond Legacy</p></div>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">{mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create your account' : 'Reset your password'}</h1>
          <p className="mt-1 text-[14.5px] text-ink-muted">{mode === 'in' ? 'Welcome back. Your store’s next moves are waiting.' : mode === 'up' ? 'Set up your store in under a minute.' : 'We’ll email you a link to choose a new password.'}</p>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            {mode === 'up' && <Field label="Your name" htmlFor="a-name"><Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
            <Field label="Email" htmlFor="a-email"><Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></Field>
            {mode !== 'forgot' && (
              <Field label="Password" htmlFor="a-pw"><Input id="a-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} /></Field>
            )}
            {err && <ErrorNote>{err}</ErrorNote>}
            <Button tone="primary" size="lg" type="submit" busy={busy} className="w-full">
              {mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}<IconArrowRight size={18} />
            </Button>
          </form>
          {mode !== 'forgot' && !inAndroidApp() && (
            <>
              <div className="my-5 flex items-center gap-3 text-[12px] font-semibold text-ink-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
              <Button size="lg" className="w-full" onClick={async () => {
                setErr(null);
                try {
                  await s.signInWithGoogle();
                } catch (x) {
                  setErr(friendlyError(x));
                }
              }}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" /></svg>
                Continue with Google
              </Button>
            </>
          )}
          <div className="mt-6 space-y-2 text-center text-[14px] text-ink-muted">
            {mode === 'in' && <p><button className="font-semibold text-green hover:underline" onClick={() => (setMode('forgot'), setErr(null))}>Forgot password?</button></p>}
            <p>
              {mode === 'up' ? 'Already have an account? ' : mode === 'in' ? 'New to Beyond Legacy? ' : ''}
              <button className="font-semibold text-green hover:underline" onClick={() => (setMode(mode === 'up' ? 'in' : mode === 'in' ? 'up' : 'in'), setErr(null))}>
                {mode === 'up' ? 'Sign in' : mode === 'in' ? 'Create an account' : 'Back to sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STORE_TYPES = ['Convenience store', 'Kirana / family grocery', 'Mini-mart', 'Café with convenience counter', 'Pharmacy with convenience aisle', 'Other'];

export function StoreSetup() {
  const s = useSession();
  const [f, setF] = useState({ name: '', type: STORE_TYPES[0], area: '', managerName: s.user?.name ?? '' });
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim()) return setErr('Enter your store name.');
    if (!f.managerName.trim()) return setErr('Enter the manager’s name.');
    setBusy(true);
    try {
      await s.repo!.createStore(f, { demo });
    } catch (x) {
      setErr(friendlyError(x));
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[460px]">
        <div className="flex items-center gap-3"><Logo size={44} /><StorefrontMini className="w-28" /></div>
        <p className="mt-6 text-[12px] font-extrabold uppercase tracking-[0.14em] text-green">Step 1 of 1</p>
        <h1 className="mt-1 font-display text-[28px] font-extrabold tracking-tight text-ink">Create your store</h1>
        <p className="mt-1 text-[14.5px] text-ink-muted">This is the store Beyond Legacy will analyse. You can change it later.</p>
        {s.mode === 'local' && <p className="mt-4 rounded-xl bg-warn-bg px-3 py-2.5 text-[13.5px] text-warn-fg">This build has no Firebase project configured, so your store is saved <b>on this device only</b>. See FIREBASE_SETUP.md to enable accounts and sync.</p>}
        <form onSubmit={create} className="mt-6 space-y-4 rounded-xl3 border border-line bg-surface p-5 shadow-card" noValidate>
          <Field label="Store name" htmlFor="s-name"><Input id="s-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Corner Express — MG Road" maxLength={80} /></Field>
          <Field label="Store type" htmlFor="s-type"><Select id="s-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{STORE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Location / area" htmlFor="s-area"><Input id="s-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="e.g. Indiranagar, Bengaluru" maxLength={80} /></Field>
          <Field label="Manager name" htmlFor="s-mgr" hint="Used for your morning greeting and on completed actions."><Input id="s-mgr" value={f.managerName} onChange={(e) => setF({ ...f, managerName: e.target.value })} maxLength={60} /></Field>
          <label className="flex items-start gap-3 rounded-xl bg-canvas p-3 text-[14px] text-ink-2">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[rgb(var(--smart-green))]" />
            <span><b className="text-ink">Load the demo store</b> — 47 sample products with four weeks of sales, marked as demo data. Remove them any time in Settings.</span>
          </label>
          {err && <ErrorNote>{err}</ErrorNote>}
          <Button tone="primary" size="lg" type="submit" busy={busy} className="w-full">Create store<IconArrowRight size={18} /></Button>
        </form>
        {s.user && <p className="mt-4 text-center text-[13px] text-ink-muted">Signed in as {s.user.email} · <button className="font-semibold text-green" onClick={() => s.signOut()}>Sign out</button></p>}
      </motion.div>
    </div>
  );
}

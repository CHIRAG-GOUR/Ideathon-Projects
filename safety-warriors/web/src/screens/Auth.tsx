'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { RegionConfig } from '@shared/emergency';
import { authMessage, logIn, resetPassword, signUp } from '@core/auth';
import { dial } from '@core/native';
import { Btn, Field, Spinner, inputCls } from '@/ui/kit';
import { Logo, SceneToolkit } from '@/ui/art';

type Mode = 'login' | 'signup' | 'reset';

export function Auth({ onDemo, region }: { onDemo: () => void; region: RegionConfig }) {
  const [mode, setMode] = useState<Mode>('signup');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        if (!f.name.trim()) throw Object.assign(new Error('Enter your name — contacts see it in your alerts.'), { code: '' });
        await signUp(f.name, f.email, f.password);
      } else if (mode === 'login') await logIn(f.email, f.password);
      else {
        await resetPassword(f.email);
        setMsg({ ok: true, text: 'Reset link sent. Check your email.' });
      }
    } catch (err) {
      setMsg({ ok: false, text: authMessage(err) });
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-cream bg-geo lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-indigo-700 p-12 text-white lg:flex">
        <Logo light />
        <div>
          <div className="max-w-md"><SceneToolkit /></div>
          <h2 className="mt-6 text-4xl font-bold leading-tight">Prepared for anything.</h2>
          <p className="mt-3 max-w-md text-white/80">Emergency playbooks, a safety toolkit and quick actions — plus a real SOS that reaches the people you trust.</p>
        </div>
        <p className="text-sm text-white/60">Safety Warriors is not an emergency service. In danger, call {region.primary.number}.</p>
      </section>
      <section className="flex min-h-screen flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),1.5rem)] lg:min-h-0 lg:justify-center lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-indigo-800">{mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back' : 'Reset password'}</h1>
          <p className="mt-1 text-ink-muted">{mode === 'signup' ? 'Your contacts and history are stored privately in your account.' : mode === 'login' ? 'Log in to Safety Warriors.' : 'We will email you a reset link.'}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Field label="Your name"><input className={inputCls} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                </motion.div>
              )}
            </AnimatePresence>
            <Field label="Email"><input className={inputCls} type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            {mode !== 'reset' && (
              <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
                <input className={inputCls} type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              </Field>
            )}
            {msg && <p role="alert" className={msg.ok ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-sos-600'}>{msg.text}</p>}
            <Btn big type="submit" className="w-full" disabled={busy}>{busy && <Spinner />}{mode === 'signup' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send reset link'}</Btn>
          </form>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm font-bold">
            <button className="text-teal-700" onClick={() => (setMode(mode === 'signup' ? 'login' : 'signup'), setMsg(null))}>{mode === 'signup' ? 'I have an account' : 'Create an account'}</button>
            {mode === 'login' && <button className="text-ink-muted" onClick={() => (setMode('reset'), setMsg(null))}>Forgot password?</button>}
          </div>
          <div className="mt-10 space-y-3 border-t border-line pt-6">
            <Btn tone="sos" className="w-full" onClick={() => dial(region.primary.number)}>In danger now? Call {region.primary.number}</Btn>
            <Btn tone="ghost" className="w-full" onClick={onDemo}>Explore demo mode (sends nothing)</Btn>
          </div>
        </div>
      </section>
    </main>
  );
}

'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { RegionConfig } from '@shared/emergency';
import { authMessage, logIn, resetPassword, signUp } from '@core/auth';
import { dial } from '@core/native';
import { TAGLINE } from '@/ctx';
import { Logo } from '@/ui/brand';
import { Btn, Field, inputCls } from '@/ui/kit';
import { Icon } from '@/ui/icons';

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
        if (!f.name.trim()) throw Object.assign(new Error('Enter your name — your contacts see it in alerts.'), { code: '' });
        await signUp(f.name, f.email, f.password);
      } else if (mode === 'login') await logIn(f.email, f.password);
      else { await resetPassword(f.email); setMsg({ ok: true, text: 'Reset link sent. Check your email.' }); }
    } catch (err) { setMsg({ ok: false, text: authMessage(err) }); }
    setBusy(false);
  };
  return (
    <main className="min-h-screen canvas-calm lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden surface-clinical p-12 text-ink lg:flex">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <Logo light className="relative" />
        <div className="relative">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">From incident to care</p>
          <h2 className="mt-3 font-display text-[44px] font-semibold leading-[1.02] tracking-tight">Emergency care,<br />connected.</h2>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-2">
            {([['sos', 'SOS Push'], ['vault', 'Health Vault'], ['radar', 'Geo-Radar'], ['ai', 'AI Guidance']] as const).map(([i, t], k) => (
              <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + k * 0.08 }} className="flex items-center gap-2.5 rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line"><Icon name={i} size={18} className="text-cyan-600" /><span className="text-[14px] font-semibold">{t}</span></motion.div>
            ))}
          </div>
          <p className="mt-6 max-w-md font-display text-[17px] text-ink-muted">{TAGLINE}</p>
        </div>
        <p className="relative text-[12.5px] text-ink-faint">LifeLine Hub is not an emergency service. In danger, call {region.primary.number}.</p>
      </section>
      <section className="flex min-h-screen flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),1.5rem)] lg:min-h-0 lg:justify-center lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 font-display text-[30px] font-semibold tracking-tight text-ink">{mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back' : 'Reset password'}</h1>
          <p className="mt-1 text-ink-muted">{mode === 'signup' ? 'Your Health Vault and contacts are stored privately in your account.' : mode === 'login' ? 'Log in to LifeLine Hub.' : 'We’ll email you a reset link.'}</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Field label="Your name"><input className={inputCls} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                </motion.div>
              )}
            </AnimatePresence>
            <Field label="Email"><input className={inputCls} type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            {mode !== 'reset' && <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}><input className={inputCls} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>}
            {msg && <p className={msg.ok ? 'text-[13px] font-semibold text-vital-600' : 'text-[13px] font-semibold text-coral-600'}>{msg.text}</p>}
            <Btn type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send reset link'}</Btn>
          </form>
          <div className="mt-4 flex justify-between text-[13.5px] font-semibold text-teal-600">
            <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'I have an account' : 'Create an account'}</button>
            {mode === 'login' && <button onClick={() => setMode('reset')}>Forgot password?</button>}
          </div>
          <div className="mt-8 space-y-2 border-t border-line pt-6">
            <Btn tone="coral" className="w-full" icon="phone" onClick={() => dial(region.primary.number)}>In danger now? Call {region.primary.number}</Btn>
            <Btn tone="white" className="w-full" onClick={onDemo}>Explore demo mode — fictional data, sends nothing</Btn>
          </div>
        </div>
      </section>
    </main>
  );
}
